import { NextRequest, NextResponse } from "next/server";
import { moderateContent, rateLimit, clientIp } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/moderate
 * body: { text?: string, mediaUrl?: string (https url or data: url) }
 * returns: { allowed, flagged, categories, reason, source }
 * Clients call this BEFORE publishing an annotation or comment.
 */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`moderate:${clientIp(req)}`, 40)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
    }
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl : null;

    if (!text.trim() && !mediaUrl) {
      return NextResponse.json(
        { allowed: true, flagged: false, categories: [], source: "local" },
        { headers: CORS_HEADERS }
      );
    }

    const result = await moderateContent({ text, mediaUrl });
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err: any) {
    // Never block publishing because of a moderation outage on the server itself;
    // the report/removal pipeline is the safety net.
    return NextResponse.json(
      { allowed: true, flagged: false, categories: [], source: "local", error: err?.message },
      { headers: CORS_HEADERS }
    );
  }
}
