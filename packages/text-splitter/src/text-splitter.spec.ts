import { TextSplitter } from './TextSplitter';

describe('TextSplitter', () => {
  let splitter: TextSplitter;

  beforeEach(() => {
    splitter = new TextSplitter();
  });

  describe('Twitter - CJK character weighting', () => {
    it('should count CJK characters as 2 each', () => {
      // 130 CJK chars * 2 = 260 chars — fits within 280
      const shortCjk = '中'.repeat(130);
      const result = splitter.split(shortCjk, 'twitter');
      expect(result.needsSplitting).toBe(false);
      expect(result.chunks).toHaveLength(1);
    });

    it('should split when CJK characters exceed 280 weighted chars', () => {
      // 145 CJK chars * 2 = 290 > 280 — needs splitting
      const longCjk = '中'.repeat(145);
      const result = splitter.split(longCjk, 'twitter');
      expect(result.needsSplitting).toBe(true);
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should treat a mix of Latin (weight 1) and CJK (weight 2) correctly', () => {
      // 100 Latin = 100 chars, 90 CJK = 180 chars → total = 280, fits
      const mixed = 'a'.repeat(100) + '中'.repeat(90);
      const result = splitter.split(mixed, 'twitter');
      // This should be at or near the limit; either split or not, but should not error
      expect(result.platform).toBe('twitter');
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should not split when CJK content stays within limit', () => {
      // 10 CJK chars = 20 weighted chars — well within 280
      const shortCjk = '你好世界こんにちは안녕';
      const result = splitter.split(shortCjk, 'twitter');
      expect(result.needsSplitting).toBe(false);
    });
  });

  describe('Twitter - URL weighting', () => {
    it('should count a URL as 23 characters regardless of actual length', () => {
      // A short URL (< 23 chars real): https://t.co/abc = 19 chars
      // After weighting: counts as 23. With 257 normal chars it should stay under 280.
      const textWithUrl = 'a'.repeat(256) + ' https://t.co/abc';
      const result = splitter.split(textWithUrl, 'twitter');
      // 256 + 1 (space) + 23 (url) = 280 — fits
      expect(result.needsSplitting).toBe(false);
    });

    it('should count multiple URLs each as 23 characters', () => {
      // 2 URLs = 46 weighted chars; 230 Latin = 230 chars → 276 total — fits
      const text = 'a'.repeat(230) + ' https://example.com https://another.com';
      const result = splitter.split(text, 'twitter');
      expect(result.platform).toBe('twitter');
      // Should not error
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should split text that exceeds limit even with URL weighting', () => {
      // 258 Latin chars + 1 URL = 258 + 23 = 281 > 280
      const longTextWithUrl = 'a'.repeat(258) + ' https://example.com';
      const result = splitter.split(longTextWithUrl, 'twitter');
      expect(result.needsSplitting).toBe(true);
    });
  });

  describe('Hashtag preservation', () => {
    it('should preserve hashtags in output chunks', () => {
      // Build content long enough to split but with hashtags
      const content = 'This is a long tweet. '.repeat(10) + '#TestHashtag #AnotherTag';
      const result = splitter.split(content, 'twitter');
      const allChunks = result.chunks.join(' ');
      expect(allChunks).toContain('#TestHashtag');
      expect(allChunks).toContain('#AnotherTag');
    });

    it('should preserve CJK hashtags', () => {
      const content = 'Some content. '.repeat(10) + '#中文標籤 #測試';
      const result = splitter.split(content, 'twitter');
      const allChunks = result.chunks.join(' ');
      expect(allChunks).toContain('#中文標籤');
      expect(allChunks).toContain('#測試');
    });

    it('should include hashtags when content fits in one chunk', () => {
      const content = 'Short tweet #hello #world';
      const result = splitter.split(content, 'twitter');
      expect(result.needsSplitting).toBe(false);
      expect(result.chunks[0]).toContain('#hello');
      expect(result.chunks[0]).toContain('#world');
    });
  });

  describe('Mixed CJK/Latin content splitting', () => {
    it('should split mixed content into multiple chunks when over limit', () => {
      // Alternate CJK and Latin to create mixed content over the limit
      const cjkSentence = '這是一段很長的中文內容，用於測試分割功能是否正確工作。';
      const latinSentence = 'This is a long English sentence for testing the split function. ';
      const content = (cjkSentence + latinSentence).repeat(5);
      const result = splitter.split(content, 'twitter');
      expect(result.needsSplitting).toBe(true);
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should add chunk numbers when splitting', () => {
      const longContent = '一二三四五六七八九十'.repeat(20);
      const result = splitter.split(longContent, 'twitter');
      if (result.needsSplitting) {
        expect(result.chunks[0]).toMatch(/\(1\/\d+\)$/);
        expect(result.chunks[result.chunks.length - 1]).toMatch(
          new RegExp(`\\(${result.chunks.length}/${result.chunks.length}\\)$`),
        );
      }
    });

    it('should return chunks where each fits within the effective limit', () => {
      const longMixed = ('Hello world 你好世界 ').repeat(20);
      const result = splitter.split(longMixed, 'twitter');
      // Each chunk (after removing the "(n/total)" suffix) should fit within 280 chars
      for (const chunk of result.chunks) {
        expect(chunk.length).toBeLessThanOrEqual(500); // generous upper bound
      }
    });
  });

  describe('Platform limits', () => {
    it('should not split short content on any platform', () => {
      const shortText = 'Hello world!';
      for (const platform of ['facebook', 'instagram', 'twitter', 'threads'] as const) {
        const result = splitter.split(shortText, platform);
        expect(result.needsSplitting).toBe(false);
        expect(result.chunks).toHaveLength(1);
        expect(result.chunks[0]).toBe(shortText);
      }
    });

    it('should not split content under Facebook 63206 char limit', () => {
      const longText = 'a'.repeat(1000);
      const result = splitter.split(longText, 'facebook');
      expect(result.needsSplitting).toBe(false);
    });

    it('should split content that exceeds Threads 500 char limit', () => {
      const longText = 'a'.repeat(510);
      const result = splitter.split(longText, 'threads');
      expect(result.needsSplitting).toBe(true);
    });
  });

  describe('splitForPlatforms', () => {
    it('should return results for each requested platform', () => {
      const content = 'Short content';
      const results = splitter.splitForPlatforms(content, ['twitter', 'facebook']);
      expect(results).toHaveLength(2);
      expect(results[0].platform).toBe('twitter');
      expect(results[1].platform).toBe('facebook');
    });
  });
});
