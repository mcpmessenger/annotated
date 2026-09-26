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
    } = body;

    const trimmedQuote = (quote || "").trim();
    const hasQuote = trimmedQuote.length > 0;
    const isVideo =
      isVideoClip ||
      timestamp != null ||
      videoStartTs != null ||
      (sourceUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be") || sourceUrl.includes("vimeo.com") || sourceUrl.includes("tiktok.com")));

    if (!hasQuote && !isVideo && !mediaUrl) {
      return NextResponse.json(
        { error: "Please highlight text or attach a video clip to fact check." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // Build format time helper for prompt
    const formatTs = (s: number | null) => {
      if (s == null) return null;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const timeStart = videoStartTs ?? timestamp;
    const timeEnd = videoEndTs ?? (timeStart != null ? timeStart + 15 : null);
    const videoTimeRange =
      timeStart != null && timeEnd != null
        ? `${formatTs(timeStart)} - ${formatTs(timeEnd)} (${timeStart}s - ${timeEnd}s)`
        : timeStart != null
        ? `${formatTs(timeStart)} (${timeStart}s)`
        : "Active clip segment";

    if (geminiKey) {
      let promptTarget = "";
      if (hasQuote) {
        promptTarget = `TARGET TO FACT CHECK:
Subject: Highlighted Webpage Text (Quote)
Source Webpage: ${sourceTitle || "Online Page"}
Source URL: ${sourceUrl}
${isVideo ? `Video Timestamp: ${videoTimeRange}` : ""}
Highlighted Quote from Source: "${trimmedQuote}"

USER CONTEXT:
User Note / Reaction: "${(commentary || "").trim() || "None"}"
(CRITICAL: The user note is only their personal reaction or question. DO NOT fact-check the user's note. Focus 100% of your verification on the Highlighted Quote from the webpage).

Instructions:
1. Evaluate whether the claim or statement made in the Highlighted Quote from the webpage is accurate, misleading, false, or needs important context.
2. In your headline and explanation, refer to the claim made in the highlighted text or article, NEVER the user.`;
      } else {
        promptTarget = `TARGET TO FACT CHECK:
Subject: Video Clip / Video Content
Source Video: ${sourceTitle || "Online Video"}
Source URL: ${sourceUrl}
Video Timestamp / Segment: ${videoTimeRange}
${videoCaptions ? `Spoken Words / Captions at this moment: "${videoCaptions}"` : ""}

USER CONTEXT:
User Note / Reaction: "${(commentary || "").trim() || "None"}"
(CRITICAL: The user note is only their personal reaction or question. DO NOT fact-check the user's note. Focus 100% of your verification on the claims or presentation in the Video Clip at ${videoTimeRange}).

Instructions:
1. Evaluate whether the claims or presentation made in this Video Clip are accurate, misleading, false, or need important context based on authoritative evidence.
2. In your headline and explanation, refer to the video's claim or thesis, NEVER the user.`;
      }

      const prompt = `You are a real-time fact-checking intelligence system for the web annotation layer "Annotated".

${promptTarget}

3. Respond ONLY with a valid JSON object matching this schema (do not add conversational text or markdown code fences outside JSON):
{
  "verdict": "VERIFIED" | "MISLEADING" | "FALSE" | "CONTEXT_NEEDED",
  "headline": "Brief 1-sentence verdict on the highlighted text or video claim",
  "explanation": "2-3 sentences explaining why based on scientific or journalistic evidence",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "timestampAnalysis": "${isVideo ? `Short note about context at ${videoTimeRange}` : "N/A"}",
  "sources": [
    { "title": "Source name", "url": "https://..." }
  ]
}`;

      const candidateModels = [
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
      ];

      for (const model of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
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
    let targetClaim = "";
    if (hasQuote) {
      targetClaim = trimmedQuote.length > 70 ? `${trimmedQuote.slice(0, 67)}...` : trimmedQuote;
    } else if (isVideo) {
      targetClaim = `claims in "${sourceTitle || 'video'}" at ${videoTimeRange}`;
    } else {
      targetClaim = sourceTitle || "Annotated content";
    }

    const fallbackVerdict = {
      verdict: "CONTEXT_NEEDED",
      headline: hasQuote
        ? `Fact check for highlighted text: "${targetClaim}"`
        : `Fact check for ${targetClaim}`,
      explanation: hasQuote
        ? `Evaluating the accuracy of the highlighted excerpt from ${sourceTitle || "the page"}. Primary source verification recommended.`
        : `Evaluating content and claims presented in the video clip (${videoTimeRange}) from "${sourceTitle || "the source"}". Primary source context recommended.`,
      confidence: "MEDIUM",
      timestampAnalysis: isVideo ? `Anchored at video clip range ${videoTimeRange}.` : "N/A",
      sources: sourceUrl ? [{ title: sourceTitle || "Source Webpage", url: sourceUrl }] : [],
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
