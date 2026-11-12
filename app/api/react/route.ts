import { NextRequest, NextResponse } from "next/server";
import {
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

/**
 * The allowed emoji reactions matching the Roku TV action bar slots (indexes 0–4).
 */
export const ALLOWED_EMOJIS = ["🔥", "🤔", "💡", "💯", "👎"] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/react
 * body: {
 *   annotationId: string,
 *   emoji: "🔥" | "🤔" | "💡" | "💯" | "👎",
 *   client?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`react:${ip}`, 60)) {
      return NextResponse.json(
        { error: "Too many reactions. Please try again later." },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const annotationId = typeof body?.annotationId === "string" ? body.annotationId.trim() : "";
    const emoji = typeof body?.emoji === "string" ? body.emoji : "";
    const client = typeof body?.client === "string" ? body.client.slice(0, 30) : "web";

    if (!annotationId) {
      return NextResponse.json(
        { error: "annotationId is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!ALLOWED_EMOJIS.includes(emoji as AllowedEmoji)) {
      return NextResponse.json(
        { error: "Invalid emoji." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const service = getServiceClient();
    const db = service || getAnonClient();

    // Insert identical row shape to what clients expect ({ annotation_id, emoji })
    const { error: insertError } = await db.from("annotation_reactions").insert({
      annotation_id: annotationId,
      emoji,
    });

    if (insertError) {
      console.error("[react] insert error:", insertError.message);
      return NextResponse.json(
        { error: "Could not save reaction.", details: insertError.message, hasService: !!service },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
