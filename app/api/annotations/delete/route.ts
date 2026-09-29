import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dajadbvlldrmgzztdksn.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    let id: string | null = null;
    const { searchParams } = new URL(req.url);
    id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || null;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json(
        { error: "Annotation ID is required for deletion." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Clean up dependent tables first if foreign keys are not cascade
    await Promise.allSettled([
      supabase.from("annotation_reactions").delete().eq("annotation_id", id),
      supabase.from("comments").delete().eq("annotation_id", id),
      supabase.from("notifications").delete().eq("annotation_id", id),
    ]);

    // Delete the primary annotation
    const { error } = await supabase
      .from("annotations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[API Delete Annotation] Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, deleted_id: id },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("[API Delete Annotation] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
