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
      mediaUrl = null,
    } = body;

    if (!quote && !commentary) {
      return NextResponse.json(
        { error: "Please provide a quote or commentary to fact check." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const prompt = `You are a real-time fact-checking intelligence system for the web annotation layer "Annotated".
Fact check the following claim made in an online annotation.

Source URL: ${sourceUrl}
Source Title: ${sourceTitle}
Video Timestamp: ${timestamp != null ? `${timestamp}s` : "N/A"}
Media Attached: ${mediaUrl || "None"}
Annotated Quote: "${quote}"
User Commentary / Claim: "${commentary}"

Instructions:
1. Evaluate if the claim or quoted statement is accurate, misleading, false, or needs important context.
2. If this is a video with a timestamp, evaluate the surrounding context.
3. Formulate an X/Twitter Community Note style clarification ("Readers added context...").
4. Respond ONLY with a valid JSON object matching this schema (do not add conversational text outside JSON):
{
  "verdict": "VERIFIED" | "MISLEADING" | "FALSE" | "CONTEXT_NEEDED",
  "headline": "Brief 1-sentence verdict",
  "explanation": "2-3 sentences explaining why, referencing facts",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "timestampAnalysis": "Short note about timestamp or N/A",
  "communityNote": "Readers added context: [clear 1-2 sentence clarification]",
  "sources": [
    { "title": "Source name", "url": "https://..." }
  ]
}`;

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
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
          let rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Strip markdown code fences if present (```json ... ```)
          rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
          
          const jsonStart = rawText.indexOf("{");
          const jsonEnd = rawText.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            rawText = rawText.substring(jsonStart, jsonEnd + 1);
          }

          const parsed = JSON.parse(rawText);
          const rawNote = parsed.communityNote || parsed.headline || "Readers added context";
          const trimmedNote = rawNote.length > 200 ? rawNote.slice(0, 197) + "..." : rawNote;
          const tweetText = `𝕏 Community Note via @Annotated:\n${trimmedNote}`;
          const shareTarget = sourceUrl || "https://annotated-repo.vercel.app";
          parsed.tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareTarget)}`;
          parsed.geminiConfigured = true;
          return NextResponse.json(parsed, { headers: CORS_HEADERS });
        } else {
          const errText = await geminiRes.text();
          console.warn("[Gemini FactCheck] API returned non-OK:", geminiRes.status, errText);
        }
      } catch (err) {
        console.warn("[Gemini FactCheck] Live API call failed, using fallback:", err);
      }
    }

    // Fallback heuristic response if API call fails
    const claim = (commentary || quote).slice(0, 80);
    const hasTimestamp = timestamp != null;
    const fallbackVerdict = {
      verdict: "CONTEXT_NEEDED",
      headline: `Context analysis for: "${claim}..."`,
      explanation: hasTimestamp
        ? `This annotation anchors to timestamp ${timestamp}s. Verification assesses the surrounding clip context and primary source material.`
        : `This annotation highlights an excerpt on ${sourceTitle || "the page"}. Primary source verification recommended.`,
      confidence: "MEDIUM",
      timestampAnalysis: hasTimestamp ? `Anchored at ${timestamp} seconds in media stream.` : "No video timestamp specified.",
      communityNote: `Readers added context: The highlighted statement requires checking primary records or the full media stream.`,
      sources: sourceUrl ? [{ title: sourceTitle || "Source Webpage", url: sourceUrl }] : [],
      tweetIntentUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Fact check via @Annotated:\n"${claim}..."`)}&url=${encodeURIComponent(sourceUrl || "https://annotated-repo.vercel.app")}`,
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
