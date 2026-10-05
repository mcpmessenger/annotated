import { NextRequest, NextResponse } from "next/server";
import {
  REPORT_REASONS,
  getAnonClient,
  getServiceClient,
  rateLimit,
  clientIp,
} from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Reports needed (from distinct reporters) before content is auto-hidden pending review.
const AUTO_HIDE_THRESHOLD = 3;
// Severe categories hide content immediately on the first report.
const SEVERE_REASONS = new Set(["minors", "sexual", "violence"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/report
 * body: {
 *   contentType: 'annotation' | 'comment' | 'user',
 *   contentId: string,
 *   reportedUserId?: string,
 *   reporterId?: string,
 *   client?: 'web' | 'extension' | 'android' | 'roku' | ...,
 *   reason: one of REPORT_REASONS,
 *   details?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`report:${ip}`, 20)) {
      return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429, headers: CORS_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const contentType = String(body?.contentType || "annotation");
    const contentId = String(body?.contentId || "").trim();
    const reason = String(body?.reason || "other");
    const details = typeof body?.details === "string" ? body.details.slice(0, 1000) : null;
    const reporterId = typeof body?.reporterId === "string" ? body.reporterId : null;
    const reportedUserId = typeof body?.reportedUserId === "string" ? body.reportedUserId : null;
    const reporterClient = typeof body?.client === "string" ? body.client.slice(0, 30) : "web";

    if (!["annotation", "comment", "user"].includes(contentType) || !contentId) {
      return NextResponse.json({ error: "contentType and contentId are required." }, { status: 400, headers: CORS_HEADERS });
    }
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
      return NextResponse.json({ error: "Invalid reason." }, { status: 400, headers: CORS_HEADERS });
    }

    const service = getServiceClient();
    const db = service || getAnonClient();

    const { error: insertError } = await db.from("content_reports").insert({
      content_type: contentType,
      content_id: contentId,
      reported_user_id: reportedUserId,
      reporter_id: reporterId,
      reporter_client: reporterClient,
      reporter_ip: ip,
      reason,
      details,
    });

    if (insertError) {
      console.error("[report] insert error:", insertError.message);
      return NextResponse.json(
        { error: "Could not submit report. Please email support." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Auto-hide logic requires the service role key.
    let hidden = false;
    if (service && contentType !== "user") {
      const { data: rows } = await service
        .from("content_reports")
        .select("reporter_id, reporter_ip")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .eq("status", "pending");

      const distinct = new Set((rows || []).map((r: any) => r.reporter_id || r.reporter_ip || Math.random()));
      const shouldHide = SEVERE_REASONS.has(reason) || distinct.size >= AUTO_HIDE_THRESHOLD;

      if (shouldHide) {
        const table = contentType === "comment" ? "comments" : "annotations";
        const { error: hideErr } = await service
          .from(table)
          .update({ moderation_status: "hidden", moderation_reason: `auto-hidden: reported for ${reason}` })
          .eq("id", contentId);
        hidden = !hideErr;
      }
    }

    // Optional alert to a Slack/Discord-compatible webhook so reports get reviewed quickly.
    const webhook = process.env.MODERATION_ALERT_WEBHOOK;
    if (webhook) {
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚩 Annotated report (${reporterClient}): ${contentType} ${contentId} — ${reason}${hidden ? " [auto-hidden]" : ""}${details ? `\n${details}` : ""}`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, hidden }, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500, headers: CORS_HEADERS });
  }
}
