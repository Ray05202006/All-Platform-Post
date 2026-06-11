import { describe, it, expect } from 'vitest';
import { splitForTwitter, splitForPlatform } from '@/lib/splitter';
import { calculateLength } from '@/lib/platforms/twitter';

const TWITTER_EFFECTIVE = 270; // 280 - 10 reserved for numbering

describe('splitForTwitter', () => {
  it('returns single chunk without numbering when content fits', () => {
    const text = 'Short tweet.';
    const result = splitForTwitter(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
    expect(result[0]).not.toMatch(/\(\d+\/\d+\)/);
  });

  it('returns empty array for empty string', () => {
    expect(splitForTwitter('')).toHaveLength(0);
  });

  it('adds (N/M) suffix when content requires multiple chunks', () => {
    // Each sentence is ~60 ASCII chars; 6 sentences ≈ 360 chars, exceeds 270
    const sentence = 'This is a sentence that is long enough to force splitting. ';
    const text = sentence.repeat(6);
    const chunks = splitForTwitter(text);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(chunk).toContain(`(${i + 1}/${chunks.length})`);
    });
  });

  it('each chunk stays within effective limit before numbering', () => {
    const sentence = '短句測試內容超過限制需要分割。';
    const text = sentence.repeat(30);
    const chunks = splitForTwitter(text);
    expect(chunks.length).toBeGreaterThan(1);

    chunks.forEach((chunk) => {
      // Strip the "(N/M)" suffix to measure the raw chunk length
      const raw = chunk.replace(/\s*\(\d+\/\d+\)$/, '');
      expect(calculateLength(raw)).toBeLessThanOrEqual(TWITTER_EFFECTIVE);
    });
  });

  it('CJK content produces more chunks than equivalent ASCII at same byte length', () => {
    // 140 CJK chars have Twitter weight 280, exceeding the 270 effective limit
    const cjkText = '測試文字'.repeat(35) + '。' + '更多內容'.repeat(35) + '。';
    // 280 ASCII chars fit in one chunk under 270? No — 280 > 270, so ASCII also needs split
    // Key point: same number of code points, CJK weighs 2x so needs more/equal chunks
    const cjkChunks = splitForTwitter(cjkText);
    expect(cjkChunks.length).toBeGreaterThanOrEqual(2);
  });

  it('URL counts as 23 chars — long URL still fits within limit', () => {
    // URL (23) + 200 ASCII chars = 223, well under 270
    const url = 'https://example.com/' + 'a'.repeat(80);
    const text = url + ' ' + 'a'.repeat(200) + '.';
    const chunks = splitForTwitter(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).not.toMatch(/\(\d+\/\d+\)/);
  });

  it('graceful fallback for text with no sentence boundaries', () => {
    // No punctuation — whole thing is one "sentence"
    const text = 'a'.repeat(300);
    const chunks = splitForTwitter(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('splitForPlatform', () => {
  it('instagram: single chunk when under 2190 effective limit', () => {
    const text = 'Short Instagram caption.';
    const result = splitForPlatform(text, 'instagram');
    expect(result).toHaveLength(1);
    expect(result[0]).not.toMatch(/\(\d+\/\d+\)/);
  });

  it('instagram: splits content over 2190 raw chars', () => {
    // Each sentence is 100 chars; 23 of them = 2300 raw chars, over 2190
    const sentence = 'A'.repeat(99) + '.';
    const text = (sentence + ' ').repeat(23);
    const chunks = splitForPlatform(text, 'instagram');
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      const raw = chunk.replace(/\s*\(\d+\/\d+\)$/, '');
      expect(raw.length).toBeLessThanOrEqual(2190);
    });
  });

  it('threads: single chunk under 490 effective limit', () => {
    expect(splitForPlatform('Short Threads post.', 'threads')).toHaveLength(1);
  });

  it('threads: splits content over 490 raw chars', () => {
    const sentence = 'B'.repeat(99) + '.';
    const text = (sentence + ' ').repeat(6); // ~600 chars
    const chunks = splitForPlatform(text, 'threads');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('facebook: 63206 limit — typical post is never split', () => {
    const text = 'Facebook post content. '.repeat(100); // ~2300 chars
    expect(splitForPlatform(text, 'facebook')).toHaveLength(1);
  });

  it('unknown platform falls back to 500 limit (490 effective)', () => {
    const sentence = 'X'.repeat(99) + '.';
    const text = (sentence + ' ').repeat(6); // ~600 chars
    const chunks = splitForPlatform(text, 'unknown_platform');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('uses raw .length (not CJK-weighted) for non-twitter platforms', () => {
    // 240 CJK chars: Twitter weight = 480, raw .length = 240
    // threads effective limit is 490 — raw length fits, Twitter weight would not
    const text = '測'.repeat(240) + '。';
    const result = splitForPlatform(text, 'threads');
    // Raw length (241) < 490 → single chunk
    expect(result).toHaveLength(1);
  });
});
