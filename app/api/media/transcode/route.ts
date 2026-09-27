import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dajadbvlldrmgzztdksn.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/media/transcode
 * 
 * Query params:
 *   - url: The raw media URL to resolve (required)
 *   - id:  Annotation ID as an alternative to raw url (optional)
 *
 * Returns a JSON object with the best playable URL for a given media source.
 * For WebM files in Supabase Storage, it checks if a pre-transcoded MP4 
 * already exists (uploaded by the extension's upload-time transcoder).
 * If not, it returns the clip proxy URL pointing to /api/media/clip/[id].
 *
 * This endpoint is lightweight and fast — it never does the transcoding itself.
 * Think of it as a URL resolver / routing layer.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");
    const annotationId = searchParams.get("id");
    const baseUrl = req.nextUrl.origin;

    if (!rawUrl && !annotationId) {
      return NextResponse.json(
        { error: "Provide either ?url= or ?id= parameter" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let mediaUrl = rawUrl;
    let resolvedId = annotationId;

    // If only an ID was provided, look up the annotation to get its media_url
    if (!mediaUrl && resolvedId) {
      const { data: row } = await supabase
        .from("annotations")
        .select("id, media_url, media_type")
        .eq("id", resolvedId)
        .maybeSingle();

      if (!row || !row.media_url) {
        return NextResponse.json(
          { error: "Annotation not found or has no media" },
          { status: 404, headers: CORS_HEADERS }
        );
      }
      mediaUrl = row.media_url;
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "No media URL resolved" }, { status: 400, headers: CORS_HEADERS });
    }

    const trimmed = mediaUrl.trim();
    const lower = trimmed.split("?")[0].toLowerCase();

    // Already a natively playable format
    if (lower.endsWith(".mp4") || lower.endsWith(".m4v") || lower.endsWith(".m3u8")) {
      return NextResponse.json(
        { playable_url: trimmed, format: "mp4", source: "direct" },
        { headers: CORS_HEADERS }
      );
    }

    // WebM in Supabase Storage — check if a pre-transcoded MP4 already exists
    if (trimmed.includes("annotation-media/")) {
      const mp4Url = trimmed.replace(/\.webm(\?.*)?$/, ".mp4");

      try {
        const headRes = await fetch(mp4Url, { method: "HEAD" });
        if (headRes.ok) {
          return NextResponse.json(
            { playable_url: mp4Url, format: "mp4", source: "pretranscoded" },
            { headers: CORS_HEADERS }
          );
        }
      } catch {
        // HEAD check failed — fall through to proxy
      }

      // No pre-transcoded MP4 — route through the on-demand transcoding proxy
      if (resolvedId) {
        const proxyUrl = `${baseUrl}/api/media/clip/${encodeURIComponent(resolvedId)}`;
        return NextResponse.json(
          { playable_url: proxyUrl, format: "mp4", source: "proxy" },
          { headers: CORS_HEADERS }
        );
      }

      // We have a raw webm URL but no ID — extract filename and return a direct
      // transcoding hint for the caller to handle
      return NextResponse.json(
        {
          playable_url: null,
          format: "webm",
          source: "unsuported",
          hint: "Provide ?id= to enable proxy transcoding",
          raw_url: trimmed,
        },
        { headers: CORS_HEADERS }
      );
    }

    // Unrecognized format
    return NextResponse.json(
      { playable_url: trimmed, format: "unknown", source: "passthrough" },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
