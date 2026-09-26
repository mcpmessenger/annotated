import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  initials,
  formatSeconds,
  extractTimestamp,
  extractTimestampRange,
  extractYouTubeVideoId,
  pageKey,
} from '../extension-src/shared/utils';

describe('Shared Utilities Unit Tests', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml("John's & Jane's")).toBe('John&#039;s &amp; Jane&#039;s');
    });

    it('handles empty or null values gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('initials', () => {
    it('extracts two uppercase initials', () => {
      expect(initials('Elon Musk')).toBe('EM');
      expect(initials('Satya Nadella')).toBe('SN');
      expect(initials('Linus')).toBe('L');
    });

    it('handles null, undefined, or empty names', () => {
      expect(initials(null)).toBe('?');
      expect(initials('')).toBe('?');
    });
  });

  describe('formatSeconds', () => {
    it('formats seconds into mm:ss', () => {
      expect(formatSeconds(0)).toBe('00:00');
      expect(formatSeconds(45)).toBe('00:45');
      expect(formatSeconds(75)).toBe('01:15');
      expect(formatSeconds(599)).toBe('09:59');
    });

    it('formats hours into h:mm:ss', () => {
      expect(formatSeconds(3600)).toBe('1:00:00');
      expect(formatSeconds(3665)).toBe('1:01:05');
      expect(formatSeconds(7322)).toBe('2:02:02');
    });

    it('returns empty string for null, undefined, or NaN', () => {
      expect(formatSeconds(null)).toBe('');
      expect(formatSeconds(undefined)).toBe('');
      expect(formatSeconds(NaN)).toBe('');
    });
  });

  describe('extractTimestamp', () => {
    it('extracts pure numeric t= seconds from URL', () => {
      expect(extractTimestamp('https://youtube.com/watch?v=abc&t=120')).toBe(120);
      expect(extractTimestamp('https://youtu.be/abc?t=45')).toBe(45);
    });

    it('extracts h/m/s composite times from URL', () => {
      expect(extractTimestamp('https://youtube.com/watch?v=abc&t=1m30s')).toBe(90);
      expect(extractTimestamp('https://youtube.com/watch?v=abc&t=1h2m3s')).toBe(3723);
      expect(extractTimestamp('https://youtube.com/watch?v=abc&t=45s')).toBe(45);
    });

    it('extracts bracketed timestamps from comments', () => {
      expect(extractTimestamp(null, 'Check this point [01:24] right here')).toBe(84);
      expect(extractTimestamp(null, 'Timestamp: [⏱️ 02:10]')).toBe(130);
      expect(extractTimestamp(null, 'Long video: [1:15:20]')).toBe(4520);
    });

    it('returns null when no timestamp is found', () => {
      expect(extractTimestamp('https://example.com/article', 'Great article!')).toBeNull();
    });
  });

  describe('extractTimestampRange', () => {
    it('extracts range from comment format [mm:ss - mm:ss]', () => {
      const range = extractTimestampRange(null, 'Crucial segment [01:10 - 01:40]');
      expect(range).toEqual({ start: 70, end: 100 });
    });

    it('extracts range from URL query format t=start-end', () => {
      const range = extractTimestampRange('https://youtube.com/watch?v=abc&t=30-60', null);
      expect(range).toEqual({ start: 30, end: 60 });
    });

    it('falls back to start + 15s for single timestamp', () => {
      const range = extractTimestampRange('https://youtube.com/watch?v=abc&t=45', null);
      expect(range).toEqual({ start: 45, end: 60 });
    });
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts video ID from standard watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=45s')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from youtu.be shortlinks', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-youtube URLs', () => {
      expect(extractYouTubeVideoId('https://vimeo.com/123456')).toBeNull();
      expect(extractYouTubeVideoId(null)).toBeNull();
    });
  });

  describe('pageKey', () => {
    it('creates canonical page key stripping query parameters and hashes', () => {
      expect(pageKey('https://example.com/blog/post-1?utm_source=twitter#heading')).toBe(
        'page:https://example.com/blog/post-1'
      );
    });

    it('handles root URLs correctly', () => {
      expect(pageKey('https://example.com')).toBe('page:https://example.com/');
    });
  });
});
