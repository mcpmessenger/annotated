import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function extractTimestampRangeFromContext(
  url?: string | null,
  text?: string | null
): { start: number | null; end: number | null } {
  const urlStr = String(url || "");
  const textStr = String(text || "");

  // Range in text: [01:24 - 01:40] or [⏱️ 01:24 - 01:40]
  const rangeMatch = textStr.match(
    /\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?\]/
  );
  if (rangeMatch) {
    let s1 = parseInt(rangeMatch[1], 10) * 60 + parseInt(rangeMatch[2], 10);
    if (rangeMatch[3]) s1 = parseInt(rangeMatch[1], 10) * 3600 + parseInt(rangeMatch[2], 10) * 60 + parseInt(rangeMatch[3], 10);
    let s2 = parseInt(rangeMatch[4], 10) * 60 + parseInt(rangeMatch[5], 10);
    if (rangeMatch[6]) s2 = parseInt(rangeMatch[4], 10) * 3600 + parseInt(rangeMatch[5], 10) * 60 + parseInt(rangeMatch[6], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // Single timestamp in text: [01:24]
  const singleMatch = textStr.match(/\[(?:⏱️\s*)?(\d+):(\d+)(?::(\d+))?\]/);
  if (singleMatch) {
    let s1 = parseInt(singleMatch[1], 10) * 60 + parseInt(singleMatch[2], 10);
    if (singleMatch[3]) s1 = parseInt(singleMatch[1], 10) * 3600 + parseInt(singleMatch[2], 10) * 60 + parseInt(singleMatch[3], 10);
    return { start: s1, end: s1 + 15 };
  }

  // Range in URL: t=84s-100s or t=84-100
  const urlRangeMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?-(\d+)(?:s)?/i);
  if (urlRangeMatch) {
    const s1 = parseInt(urlRangeMatch[1], 10);
    const s2 = parseInt(urlRangeMatch[2], 10);
    return { start: s1, end: Math.max(s1 + 5, s2) };
  }

  // Single in URL: t=84s or t=84
  const urlSingleMatch = urlStr.match(/[?&#]t=(\d+)(?:s)?/i);
  if (urlSingleMatch) {
    const s = parseInt(urlSingleMatch[1], 10);
    return { start: s, end: s + 15 };
  }

  return { start: null, end: null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      quote = "",
      commentary = "",
      sourceUrl = "",
      sourceTitle = "",
      timestamp = null,
      videoStartTs = null,
      videoEndTs = null,
      isVideoClip = false,
      videoCaptions = "",
      mediaUrl = null,
      mediaBase64 = null,
      mediaMimeType = null,
    } = body;

    const trimmedQuote = (quote || "").trim();
    const trimmedTitle = (sourceTitle || "").trim();
    const trimmedCommentary = (commentary || "").trim();

    // Distinguish genuine highlighted text vs echoing the page/video title or generic placeholder
    const isTitleEcho =
      trimmedQuote.length > 0 &&
      trimmedTitle.length > 0 &&
      trimmedQuote.toLowerCase() === trimmedTitle.toLowerCase();
    const isPlaceholderClipQuote = /^video clip \([^)]+\) from/i.test(trimmedQuote);
    const hasGenuineQuote = trimmedQuote.length > 0 && !isTitleEcho && !isPlaceholderClipQuote;

    // Detect timestamps if not explicitly supplied
    const extractedTimes = extractTimestampRangeFromContext(sourceUrl, trimmedCommentary || trimmedQuote);
    const timeStart = videoStartTs ?? timestamp ?? extractedTimes.start;
    const timeEnd = videoEndTs ?? (timeStart != null ? extractedTimes.end ?? timeStart + 15 : null);

    const isVideo =
      isVideoClip ||
      timeStart != null ||
      (sourceUrl &&
        (sourceUrl.includes("youtube.com") ||
          sourceUrl.includes("youtu.be") ||
          sourceUrl.includes("vimeo.com") ||
          sourceUrl.includes("tiktok.com")));

    if (!hasGenuineQuote && !isVideo && !mediaUrl && !mediaBase64 && !trimmedCommentary) {
      return NextResponse.json(
        { error: "Please highlight text or attach a video clip to fact check." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    const formatTs = (s: number | null) => {
      if (s == null) return null;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const videoTimeRange =
      timeStart != null && timeEnd != null
        ? `${formatTs(timeStart)} - ${formatTs(timeEnd)} (${timeStart}s - ${timeEnd}s)`
        : timeStart != null
        ? `${formatTs(timeStart)} (${timeStart}s)`
        : "Annotated clip segment";

    if (geminiKey) {
      let inlineData = mediaBase64;
      let inlineMime = mediaMimeType || "video/webm";

      if (!inlineData && mediaUrl && typeof mediaUrl === "string") {
        try {
          const fetchRes = await fetch(mediaUrl);
          if (fetchRes.ok) {
            const buf = await fetchRes.arrayBuffer();
            if (buf.byteLength < 12 * 1024 * 1024) {
              inlineData = Buffer.from(buf).toString("base64");
              inlineMime = fetchRes.headers.get("content-type") || inlineMime;
            }
          }
        } catch (_) {}
      }

      let promptTarget = "";

      if (isVideo) {
        promptTarget = `TARGET TO FACT-CHECK:
Type: Specific Video Clip Segment (${videoTimeRange})
Source Video: "${sourceTitle || "Online Video"}"
Video URL: ${sourceUrl}
Clip Timestamp: ${videoTimeRange}
${inlineData ? "Attached Video Clip: The user recorded and provided the exact audio/video of this clip. Listen to the speech and view the clip carefully to identify the actual statements made.\n" : ""}
${videoCaptions ? `Spoken Dialogue / Captions in this clip: "${videoCaptions}"\n` : ""}
${hasGenuineQuote ? `Highlighted Excerpt from clip: "${trimmedQuote}"\n` : ""}
${trimmedCommentary ? `Annotation Note / Claim for this clip: "${trimmedCommentary}"\n` : ""}

CRITICAL STRICT RULES - EXCLUSIVELY EVALUATE THIS SPECIFIC VIDEO:
1. FOCUS EXCLUSIVELY ON THIS VIDEO: You are verifying "${sourceTitle}".
2. DO NOT confuse this video with any other video, show, or unrelated topic.
3. NEVER fabricate or hallucinate dialogue from an unrelated video or subject.
4. If this is a comedy or satire program (e.g. Saturday Night Live / Weekend Update) or political commentary, recognize the comedic/satirical context, distinguish jokes from factual claims, and evaluate any underlying factual claims made about the subject matter.
5. You are strictly verifying the specific annotated moment / clip segment: ${videoTimeRange}.
6. HEADLINE RULE: In your headline, state the verdict specifically about the clip's claim or segment (e.g., "Clip at ${formatTs(timeStart) || "segment"}: [...]"), NEVER reviewing the whole channel or an unrelated video.`;
      } else {
        const targetExcerpt = hasGenuineQuote ? trimmedQuote : trimmedCommentary;
        promptTarget = `TARGET TO FACT-CHECK:
Type: Specific Annotated Web Excerpt / Highlighted Text
Source Webpage: "${sourceTitle || "Online Page"}"
Source URL: ${sourceUrl}
${inlineData ? "Attached Image/Media: The user has attached an image or screenshot for this annotation.\n" : ""}
Highlighted Excerpt: "${targetExcerpt}"
${trimmedCommentary && hasGenuineQuote ? `Annotation Note / Context: "${trimmedCommentary}"\n` : ""}

CRITICAL STRICT RULES - DO NOT VERIFY THE ENTIRE WEBPAGE:
1. DO NOT evaluate or review the entire website, domain, publisher, or broad article topic.
2. You are verifying ONLY the specific factual assertion made in the highlighted excerpt: "${targetExcerpt}".
3. Determine whether that specific statement is factually accurate, false, misleading, or requires context based on reliable evidence.
4. HEADLINE RULE: Summarize the verdict on the specific highlighted claim, NEVER reviewing the entire webpage, site, or publisher.`;
      }

      const prompt = `You are a real-time fact-checking intelligence system for the web annotation layer "Annotated".

${promptTarget}

Respond ONLY with a valid JSON object matching this schema (do not add markdown code fences or explanatory text outside the JSON):
{
  "verdict": "VERIFIED" | "MISLEADING" | "FALSE" | "CONTEXT_NEEDED",
  "headline": "Brief 1-sentence verdict on the specific clip claim or highlighted excerpt",
  "explanation": "2-3 sentences explaining why based on scientific or journalistic evidence",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "timestampAnalysis": "${isVideo ? `Context for clip segment ${videoTimeRange}` : "N/A"}",
  "sources": [
    { "title": "Source name", "url": "https://..." }
  ]
}`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
      ];

      const parts: any[] = [];
      if (inlineData) {
        parts.push({
          inlineData: {
            mimeType: inlineMime,
            data: inlineData,
          },
        });
      }
      parts.push({ text: prompt });

      for (const model of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
              }),
            }
          );

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const partWithText = gData?.candidates?.[0]?.content?.parts?.find((p: any) => p.text && !p.thought);
            let rawText = partWithText?.text || gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            // Strip markdown code fences if present (```json ... ```)
            rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

            const jsonStart = rawText.indexOf("{");
            const jsonEnd = rawText.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              rawText = rawText.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(rawText);
            parsed.geminiConfigured = true;
            return NextResponse.json(parsed, { headers: CORS_HEADERS });
          } else {
            const errText = await geminiRes.text();
            console.warn(`[Gemini FactCheck] Model ${model} returned non-OK:`, geminiRes.status, errText);
          }
        } catch (err) {
          console.warn(`[Gemini FactCheck] Model ${model} failed:`, err);
        }
      }
    }

    // Fallback heuristic response if API call fails or no API key
    let headline = "";
    let explanation = "";

    if (isVideo) {
      headline = `Clip at ${videoTimeRange}: Fact check for annotated claim`;
      explanation = `Evaluating the specific statement or demonstration in this video clip (${videoTimeRange}). Verification focuses exclusively on the annotated excerpt rather than the entire video.`;
    } else {
      const excerpt = hasGenuineQuote ? trimmedQuote : trimmedCommentary || "Highlighted excerpt";
      const snippet = excerpt.length > 60 ? `${excerpt.slice(0, 57)}...` : excerpt;
      headline = `Fact check for excerpt: "${snippet}"`;
      explanation = `Evaluating the factual accuracy of the specific highlighted statement from ${sourceTitle || "the page"}. Verification is strictly scoped to this excerpt.`;
    }

    const fallbackVerdict = {
      verdict: "CONTEXT_NEEDED",
      headline,
      explanation,
      confidence: "MEDIUM",
      timestampAnalysis: isVideo ? `Anchored at video clip range ${videoTimeRange}.` : "N/A",
      sources: sourceUrl ? [{ title: sourceTitle || "Source Link", url: sourceUrl }] : [],
      geminiConfigured: !!geminiKey,
    };

    return NextResponse.json(fallbackVerdict, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute fact check" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
