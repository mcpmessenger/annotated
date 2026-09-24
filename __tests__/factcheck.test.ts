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
});
