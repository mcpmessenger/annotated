// ─── Server-side content moderation ──────────────────────────────────────────
// Used by /api/moderate (pre-publish screening) and the admin scan tool.
// Layer 1: local hard rules (always on, no network, fail-closed for minors/sexual).
// Layer 2: Gemini classifier for text + image/video (when GEMINI_API_KEY is set).

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const REPORT_REASONS = [
  "sexual",
  "minors",
  "violence",
  "hate",
  "harassment",
  "self_harm",
  "illegal",
  "spam",
  "misinformation",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  categories: string[];
  reason?: string;
  source: "local" | "gemini";
}

const MODEL_CANDIDATES = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"];

const MINOR_TERMS = "(child|children|kid|kids|minor|minors|underage|under-age|preteen|pre-teen|toddler|infant|loli|lolita|shota|schoolgirl|schoolboy|jailbait|\\d{1,2}\\s?(?:yo|y/o|yr old|year old|years old|year-old|years-old))";
const SEXUAL_TERMS = "(porn|porno|pornography|nude|nudes|naked|sex|sexual|sexually|rape|molest|molesting|erotic|nsfw|explicit|cp|csam|fetish)";

const LOCAL_BLOCK_RULES: { re: RegExp; category: string; reason: string }[] = [
  {
    re: new RegExp(`\\b${MINOR_TERMS}\\b.{0,60}\\b${SEXUAL_TERMS}\\b`, "i"),
    category: "minors",
    reason: "Sexual content involving minors is never allowed.",
  },
  {
    re: new RegExp(`\\b${SEXUAL_TERMS}\\b.{0,60}\\b${MINOR_TERMS}\\b`, "i"),
    category: "minors",
    reason: "Sexual content involving minors is never allowed.",
  },
  {
    re: /\b(kill yourself|kys|go die|i('| a)?ll (kill|murder|rape) you)\b/i,
    category: "harassment",
    reason: "Threats and harassment are not allowed.",
  },
];

export function moderateTextLocal(text: string): ModerationResult {
  const t = (text || "").slice(0, 8000);
  for (const rule of LOCAL_BLOCK_RULES) {
    if (rule.re.test(t)) {
      return { allowed: false, flagged: true, categories: [rule.category], reason: rule.reason, source: "local" };
    }
  }
  return { allowed: true, flagged: false, categories: [], source: "local" };
}

interface MediaInput {
  mimeType: string;
  base64: string;
}

const MAX_MEDIA_BYTES = 14 * 1024 * 1024;

export async function fetchMediaForModeration(url: string): Promise<MediaInput | null> {
  try {
    if (url.startsWith("data:")) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      if (m[2].length * 0.75 > MAX_MEDIA_BYTES) return null;
      return { mimeType: m[1], base64: m[2] };
    }
    if (!/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!/^(image|video)\//.test(mimeType)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_MEDIA_BYTES) return null;
    return { mimeType, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

const CLASSIFIER_PROMPT = `You are a strict trust-and-safety moderator for "Annotated", a public app where users post commentary on web pages, tweets and video clips. The app is distributed through app stores that require removal of objectionable user-generated content.

Review the submitted content (text and/or attached image/video) and answer ONLY with JSON:
{
  "sexual_minors": boolean,   // any sexual or sexualized content involving anyone under 18 (zero tolerance)
  "sexual_explicit": boolean, // pornography, explicit nudity or explicit sexual acts
  "graphic_violence": boolean,// gore, graphic injury/death, torture, glorification of violence
  "hate": boolean,            // hate speech or slurs targeting protected groups, harassment campaigns
  "harassment": boolean,      // threats, targeted abuse, doxxing
  "self_harm": boolean,       // promotion or instructions for suicide/self-harm
  "illegal": boolean,         // instructions or promotion of serious illegal activity (weapons, drugs trafficking, etc.)
  "reason": string            // one short sentence for the user explaining the problem, or ""
}
Important:
- Discussing, quoting or criticizing news events, politics or controversial topics is ALLOWED. Only flag content that itself is objectionable.
- Mild profanity is allowed. Do not flag it.
- When unsure about anything involving minors and sexual content, set sexual_minors true.`;

async function classifyWithGemini(text: string, media: MediaInput | null): Promise<ModerationResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const parts: any[] = [{ text: CLASSIFIER_PROMPT }];
  parts.push({ text: `SUBMITTED TEXT:\n"""${(text || "").slice(0, 6000)}"""` });
  if (media) parts.push({ inline_data: { mime_type: media.mimeType, data: media.base64 } });

  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0 },
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const textPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought);
      let raw: string = textPart?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      raw = raw.replace(/```(?:json)?/gi, "").trim();
      const s = raw.indexOf("{");
      const e = raw.lastIndexOf("}");
      if (s === -1 || e === -1) continue;
      const parsed = JSON.parse(raw.slice(s, e + 1));

      const categories: string[] = [];
      if (parsed.sexual_minors) categories.push("minors");
      if (parsed.sexual_explicit) categories.push("sexual");
      if (parsed.graphic_violence) categories.push("violence");
      if (parsed.hate) categories.push("hate");
      if (parsed.harassment) categories.push("harassment");
      if (parsed.self_harm) categories.push("self_harm");
      if (parsed.illegal) categories.push("illegal");

      return {
        allowed: categories.length === 0,
        flagged: categories.length > 0,
        categories,
        reason: categories.length ? parsed.reason || "This content violates our community guidelines." : undefined,
        source: "gemini",
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Screen text and optional media. Local hard rules run first; if the content passes
 * and Gemini is available it is classified by the model. If Gemini is unreachable the
 * local result is used (text rules still block the most severe categories).
 */
export async function moderateContent(input: { text?: string; mediaUrl?: string | null }): Promise<ModerationResult> {
  const text = (input.text || "").trim();
  const local = moderateTextLocal(text);
  if (!local.allowed) return local;

  const media = input.mediaUrl ? await fetchMediaForModeration(input.mediaUrl) : null;
  if (!text && !media) return local;

  const ai = await classifyWithGemini(text, media);
  return ai || local;
}

// ─── Supabase helpers (service role) ─────────────────────────────────────────

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dajadbvlldrmgzztdksn.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dajadbvlldrmgzztdksn.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU";
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Tiny in-memory rate limiter (per server instance) ───────────────────────

const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || "unknown";
}
