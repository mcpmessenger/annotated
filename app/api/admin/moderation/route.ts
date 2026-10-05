import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, moderateContent } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

function authorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${token}`;
}

function guard(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "ADMIN_TOKEN is not configured on the server." }, { status: 500, headers: HEADERS });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
  }
  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500, headers: HEADERS });
  }
  return service;
}

/** GET → pending reports joined with a preview of the reported content. */
export async function GET(req: NextRequest) {
  const service = guard(req);
  if (service instanceof NextResponse) return service;

  const status = new URL(req.url).searchParams.get("status") || "pending";
  const { data: reports, error } = await service
    .from("content_reports")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });

  const annotationIds = [...new Set((reports || []).filter((r: any) => r.content_type === "annotation").map((r: any) => r.content_id))];
  const commentIds = [...new Set((reports || []).filter((r: any) => r.content_type === "comment").map((r: any) => r.content_id))];

  const [{ data: anns }, { data: comments }] = await Promise.all([
    annotationIds.length
      ? service.from("annotations").select("id, user_id, url, quote, comment, media_url, moderation_status").in("id", annotationIds)
      : Promise.resolve({ data: [] as any[] }),
    commentIds.length
      ? service.from("comments").select("id, user_id, text, moderation_status").in("id", commentIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const previewMap: Record<string, any> = {};
  (anns || []).forEach((a: any) => (previewMap[`annotation:${a.id}`] = a));
  (comments || []).forEach((c: any) => (previewMap[`comment:${c.id}`] = c));

  const items = (reports || []).map((r: any) => ({ ...r, content: previewMap[`${r.content_type}:${r.content_id}`] || null }));
  return NextResponse.json({ items }, { headers: HEADERS });
}

/**
 * POST actions:
 *  { action: 'remove', contentType, contentId, reportId? }   hide content permanently (status=removed)
 *  { action: 'restore', contentType, contentId, reportId? }  re-approve content
 *  { action: 'dismiss', reportId }                           close report, no action
 *  { action: 'ban', userId, reason? }                        ban user (their content disappears, they can't post)
 *  { action: 'unban', userId }
 *  { action: 'scan', limit? }                                AI-scan recent annotations & hide objectionable ones
 */
export async function POST(req: NextRequest) {
  const service = guard(req);
  if (service instanceof NextResponse) return service;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const table = body?.contentType === "comment" ? "comments" : "annotations";

  const closeReports = async (status: string) => {
    if (body?.reportId) {
      await service.from("content_reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", body.reportId);
    } else if (body?.contentId) {
      await service
        .from("content_reports")
        .update({ status, resolved_at: new Date().toISOString() })
        .eq("content_type", body.contentType || "annotation")
        .eq("content_id", body.contentId)
        .eq("status", "pending");
    }
  };

  switch (action) {
    case "remove": {
      const { error } = await service
        .from(table)
        .update({ moderation_status: "removed", moderation_reason: body?.reason || "removed by moderator" })
        .eq("id", body.contentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });
      await closeReports("actioned");
      return NextResponse.json({ success: true }, { headers: HEADERS });
    }
    case "restore": {
      const { error } = await service
        .from(table)
        .update({ moderation_status: "approved", moderation_reason: null })
        .eq("id", body.contentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });
      await closeReports("dismissed");
      return NextResponse.json({ success: true }, { headers: HEADERS });
    }
    case "dismiss": {
      await closeReports("dismissed");
      return NextResponse.json({ success: true }, { headers: HEADERS });
    }
    case "ban": {
      if (!body?.userId) return NextResponse.json({ error: "userId required" }, { status: 400, headers: HEADERS });
      const { error } = await service
        .from("banned_users")
        .upsert({ user_id: body.userId, reason: body?.reason || "Violation of community guidelines" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });
      await closeReports("actioned");
      return NextResponse.json({ success: true }, { headers: HEADERS });
    }
    case "unban": {
      if (!body?.userId) return NextResponse.json({ error: "userId required" }, { status: 400, headers: HEADERS });
      const { error } = await service.from("banned_users").delete().eq("user_id", body.userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });
      return NextResponse.json({ success: true }, { headers: HEADERS });
    }
    case "scan": {
      const limit = Math.min(Number(body?.limit) || 100, 300);
      const { data: rows, error } = await service
        .from("annotations")
        .select("id, quote, comment, media_url, media_type, moderation_status")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: HEADERS });

      const flagged: { id: string; categories: string[] }[] = [];
      for (const row of rows || []) {
        const isImage = row.media_type === "image" || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(row.media_url || "");
        const result = await moderateContent({
          text: `${row.quote || ""}\n${row.comment || ""}`,
          mediaUrl: isImage ? row.media_url : null,
        });
        if (!result.allowed) {
          await service
            .from("annotations")
            .update({ moderation_status: "hidden", moderation_reason: `ai-scan: ${result.categories.join(", ")}` })
            .eq("id", row.id);
          flagged.push({ id: row.id, categories: result.categories });
        }
      }
      return NextResponse.json({ scanned: rows?.length || 0, flagged }, { headers: HEADERS });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: HEADERS });
  }
}
