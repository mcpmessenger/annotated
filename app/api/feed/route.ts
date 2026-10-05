import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dajadbvlldrmgzztdksn.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU";

const supabase = createClient(supabaseUrl, supabaseKey);

// Resolve the best playable video URL for a given annotation row.
// Roku and Apple TV need mp4/m3u8. WebM files cannot be decoded by Roku hardware.
function resolvePlayableUrl(row: any, baseUrl: string, client?: string | null): string | null {
  const raw: string = (row.media_url || "").trim();
  if (!raw) {
    return null;
  }

  // Reject images explicitly
  const ext = raw.split("?")[0].toLowerCase();
  if (
    row.media_type === "image" ||
    row.media_type === "text" ||
    ext.endsWith(".png") ||
    ext.endsWith(".jpg") ||
    ext.endsWith(".jpeg") ||
    ext.endsWith(".webp") ||
    ext.endsWith(".gif")
  ) {
    return null;
  }

  // Already a natively playable format — return directly.
  if (ext.endsWith(".mp4") || ext.endsWith(".m4v") || ext.endsWith(".m3u8")) {
    return raw;
  }

  // WebM in Supabase Storage — use the native H.264 MP4 companion
  if (raw.includes("annotation-media/") && ext.endsWith(".webm")) {
    return null;
  }

  // If client cannot play the raw stream and there is no transcoded MP4, return null (never placeholder)
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const videoOnly = searchParams.get("video_only") === "true";
    const client = searchParams.get("client") || "web"; // "web" | "roku" | "appletv" | "mobile"

    // Build the query - exclude hidden or removed content
    let query = supabase
      .from("annotations")
      .select("*")
      .or("moderation_status.is.null,moderation_status.eq.approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (videoOnly) {
      query = query.eq("media_type", "video").not("media_url", "is", null);
    }

    const { data: rows, error } = await query;

    if (error || !rows) {
      return NextResponse.json(
        { error: "Failed to fetch feed", details: error?.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Enrich with profiles and real organic reactions in single batch queries.
    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];
    const annotationIds = rows.map((r: any) => r.id).filter(Boolean);

    const [{ data: profiles }, { data: reactionsData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds),
      supabase
        .from("annotation_reactions")
        .select("annotation_id, emoji")
        .in("annotation_id", annotationIds),
    ]);

    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => (profileMap[p.id] = p));

    const reactionsMap: Record<string, Record<string, number>> = {};
    if (reactionsData) {
      for (const r of reactionsData) {
        if (!reactionsMap[r.annotation_id]) reactionsMap[r.annotation_id] = {};
        reactionsMap[r.annotation_id][r.emoji] = (reactionsMap[r.annotation_id][r.emoji] || 0) + 1;
      }
    }

    const baseUrl = req.nextUrl.origin;

    const sanitizeRoku = (str: string | null) => {
      if (!str || client !== "roku") return str;
      return str.replace(/[^\x00-\x7F]/g, " ");
    };

    const items = rows.map((row: any) => {
      const profile = profileMap[row.user_id] || {};
      const email: string = profile.email || "";
      const username = email.split("@")[0] || "annotated";

      // Parse timestamp from comment if present e.g. "[? 00:26 - 01:03]"
      let mediaTimestamp: string | null = null;
      const tsMatch = (row.comment || "").match(/\[.*?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\]/);
      if (tsMatch) mediaTimestamp = `${tsMatch[1]}-${tsMatch[2]}`;

      const noteSlug = row.slug || row.id;
      const passUrl = `https://annotated-repo.vercel.app/n/${noteSlug}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=${encodeURIComponent(passUrl)}`;

      return {
        id: row.id,
        slug: noteSlug,
        pass_url: passUrl,
        qr_url: qrUrl,
        // Author
        author: {
          username: sanitizeRoku(username),
          display_name: sanitizeRoku(profile.full_name || username),
          avatar_url: profile.avatar_url || null,
        },
        // Source content
        source: {
          url: row.url,
          title: sanitizeRoku(row.page_title || row.hostname || "Webpage"),
          domain: row.hostname || "",
        },
        // Annotation body
        quote: sanitizeRoku(row.quote) || null,
        comment: sanitizeRoku(row.comment) || null,
        intent: sanitizeRoku(row.intent) || null,
        // Media
        media: (() => {
          const rawUrl = (row.media_url || "").trim();
          const ext = rawUrl.split("?")[0].toLowerCase();
          const isImage =
            row.media_type === "image" ||
            ext.endsWith(".png") ||
            ext.endsWith(".jpg") ||
            ext.endsWith(".jpeg") ||
            ext.endsWith(".webp") ||
            ext.endsWith(".gif");
          const isVideo =
            row.media_type === "video" ||
            (!isImage && (ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".m4v") || ext.endsWith(".m3u8")));
          const detectedType = isImage ? "image" : isVideo ? "video" : (row.media_type || "text");

          return {
            type: detectedType,
            raw_url: rawUrl || null,
            image_url: isImage ? rawUrl : null,
            playable_url: isVideo ? resolvePlayableUrl(row, baseUrl, client) : null,
            audio_url: row.audio_url || null,
            timestamp: mediaTimestamp,
          };
        })(),
        // Metadata
        is_disputed: row.is_disputed || false,
        reactions: client === "roku" ? {} : (reactionsMap[row.id] || {}),
        created_at: row.created_at,
      };
    });

    return NextResponse.json(
      {
        items,
        meta: {
          limit,
          offset,
          count: items.length,
          client,
          video_only: videoOnly,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
