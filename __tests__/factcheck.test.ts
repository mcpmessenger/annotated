import { describe, it, expect } from 'vitest';

describe('Fact Check AI Response Parser', () => {
  function sanitizeGeminiResponse(rawText: string) {
    let text = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(text);
  }

  function generateTweetIntent(note: string, sourceUrl: string) {
    const trimmed = note.length > 200 ? note.slice(0, 197) + '...' : note;
    const tweetText = `𝕏 Community Note via @Annotated:\n${trimmed}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(sourceUrl)}`;
  }

  it('correctly strips markdown code fences from Gemini responses', () => {
    const rawWithFence = '```json\n{"verdict": "VERIFIED", "headline": "Claim is supported by NASA data"}\n```';
    const parsed = sanitizeGeminiResponse(rawWithFence);
    expect(parsed.verdict).toBe('VERIFIED');
    expect(parsed.headline).toBe('Claim is supported by NASA data');
  });

  it('correctly extracts json embedded in conversational AI text', () => {
    const rawConversational = 'Here is the fact check output: {"verdict": "FALSE", "confidence": "HIGH"} Hope this helps!';
    const parsed = sanitizeGeminiResponse(rawConversational);
    expect(parsed.verdict).toBe('FALSE');
    expect(parsed.confidence).toBe('HIGH');
  });

  it('formats tweet intent URL with Community Note character truncation', () => {
    const longNote = 'A'.repeat(300);
    const intentUrl = generateTweetIntent(longNote, 'https://example.com/post');
    expect(intentUrl).toContain('https://twitter.com/intent/tweet?text=');
    expect(intentUrl).toContain(encodeURIComponent('...'));
    expect(intentUrl).toContain(encodeURIComponent('https://example.com/post'));
  });

  describe('Fact Check Target Resolution', () => {
    function resolveFactCheckTarget(params: {
      quote?: string;
      commentary?: string;
      sourceTitle?: string;
      isVideoClip?: boolean;
      timestamp?: number | null;
      videoStartTs?: number | null;
      videoEndTs?: number | null;
    }) {
      const trimmedQuote = (params.quote || '').trim();
      const hasQuote = trimmedQuote.length > 0;
      const isVideo = params.isVideoClip || params.timestamp != null || params.videoStartTs != null;

      if (hasQuote) {
        return {
          type: 'QUOTE',
          target: trimmedQuote,
          isUserCommentEvaluated: false,
        };
      }
      if (isVideo) {
        const start = params.videoStartTs ?? params.timestamp ?? 0;
        const end = params.videoEndTs ?? (start + 15);
        return {
          type: 'VIDEO_CLIP',
          target: `Video claim in "${params.sourceTitle || 'video'}" at ${start}s-${end}s`,
          isUserCommentEvaluated: false,
        };
      }
      return {
        type: 'MEDIA',
        target: params.sourceTitle || 'Annotated content',
        isUserCommentEvaluated: false,
      };
    }

    it('prioritizes highlighted quote over user comment', () => {
      const resolved = resolveFactCheckTarget({
        quote: 'Mars has liquid water rivers today',
        commentary: 'lol is this true or fake news?',
      });
      expect(resolved.type).toBe('QUOTE');
      expect(resolved.target).toBe('Mars has liquid water rivers today');
      expect(resolved.isUserCommentEvaluated).toBe(false);
    });

    it('prioritizes video clip timestamp over user comment when no quote exists', () => {
      const resolved = resolveFactCheckTarget({
        quote: '',
        commentary: 'Crazy discovery by NASA',
        sourceTitle: 'NASA Press Conference',
        isVideoClip: true,
        videoStartTs: 45,
        videoEndTs: 60,
      });
      expect(resolved.type).toBe('VIDEO_CLIP');
      expect(resolved.target).toContain('NASA Press Conference');
      expect(resolved.target).toContain('45s-60s');
      expect(resolved.isUserCommentEvaluated).toBe(false);
    });
  });
});
