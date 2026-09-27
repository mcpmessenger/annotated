import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
// Allow up to 60 seconds for ffmpeg transcoding on Vercel Pro (max 60s on Hobby)
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dajadbvlldrmgzztdksn.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU";

const supabase = createClient(supabaseUrl, supabaseKey);

// Transcode a WebM buffer to MP4 using @ffmpeg/ffmpeg (WASM, runs in Node).
// This approach works on Vercel without any system ffmpeg dependency.
async function transcodeWebmToMp4(webmBuffer: ArrayBuffer): Promise<Buffer> {
  // Dynamically import to avoid bundling issues
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  // Load the ffmpeg WASM core from CDN (cached by Vercel edge network)
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  await ffmpeg.writeFile("input.webm", new Uint8Array(webmBuffer));

  await ffmpeg.exec([
    "-i", "input.webm",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-f", "mp4",
    "output.mp4",
  ]);

  const outputData = await ffmpeg.readFile("output.mp4");
  return Buffer.from(outputData as Uint8Array);
}

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
      return NextResponse.json({ error: "Missing annotation id" }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Look up the annotation to get its raw media_url
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
      return NextResponse.json({ error: "No media attached to this annotation" }, { status: 404, headers: CORS_HEADERS });
    }

    // 2. If it's already an MP4, redirect directly — no transcoding needed.
    const lower = rawUrl.split("?")[0].toLowerCase();
    if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) {
      return NextResponse.redirect(rawUrl, { headers: CORS_HEADERS });
    }

    // 3. Check if Supabase already has a pre-transcoded mp4 alongside the webm.
    //    Convention: if webm is stored as video_123.webm, look for video_123.mp4
    if (rawUrl.includes("annotation-media/")) {
      const mp4Url = rawUrl.replace(/\.webm(\?.*)?$/, ".mp4");
      const checkRes = await fetch(mp4Url, { method: "HEAD" });
      if (checkRes.ok) {
        // Pre-transcoded MP4 already exists — redirect to it directly.
        return NextResponse.redirect(mp4Url, { headers: CORS_HEADERS });
      }
    }

    // 4. Download the WebM and transcode on the fly.
    const webmRes = await fetch(rawUrl);
    if (!webmRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source media", upstream_status: webmRes.status },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const webmBuffer = await webmRes.arrayBuffer();
    const mp4Buffer = await transcodeWebmToMp4(webmBuffer);

    return new NextResponse(mp4Buffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "video/mp4",
        "Content-Length": String(mp4Buffer.byteLength),
        // Cache the transcoded result at the CDN for 7 days
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (err: any) {
    console.error("[/api/media/clip] Error:", err);
    return NextResponse.json(
      { error: err.message || "Transcoding failed" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
