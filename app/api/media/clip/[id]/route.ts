import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing annotation id" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { data: row, error } = await supabase
      .from("annotations")
      .select("id, media_url, media_type")
      .eq("id", id)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404, headers: CORS_HEADERS });
    }

    const rawUrl: string = (row.media_url || "").trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "No media attached" }, { status: 404, headers: CORS_HEADERS });
    }

    const lower = rawUrl.split("?")[0].toLowerCase();
    if (lower.endsWith(".mp4") || lower.endsWith(".m4v") || lower.endsWith(".m3u8")) {
      return NextResponse.redirect(rawUrl, { headers: CORS_HEADERS });
    }

    // Proxy the raw stream (handles WebM bypass)
    const rangeHeader = req.headers.get("range");
    const upstreamHeaders: Record<string, string> = { "Accept": "*/*" };
    if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

    const upstreamRes = await fetch(rawUrl, { headers: upstreamHeaders });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch source media", upstream_status: upstreamRes.status },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const sourceContentType = upstreamRes.headers.get("content-type") || "video/webm";
    const responseHeaders: Record<string, string> = {
      ...CORS_HEADERS,
      "Content-Type": sourceContentType,
      "Cache-Control": "public, max-age=86400",
      "Accept-Ranges": "bytes",
    };

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}
