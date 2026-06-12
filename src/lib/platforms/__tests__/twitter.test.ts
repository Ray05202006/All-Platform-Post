import { describe, it, expect } from 'vitest';
import { calculateLength } from '@/lib/platforms/twitter';

describe('calculateLength', () => {
  describe('ASCII only', () => {
    it('counts each ASCII character as 1', () => {
      expect(calculateLength('hello')).toBe(5);
      expect(calculateLength('Hello World!')).toBe(12);
    });

    it('empty string is 0', () => {
      expect(calculateLength('')).toBe(0);
    });
  });

  describe('CJK characters', () => {
    it('counts each CJK unified ideograph as 2', () => {
      // '你好' = 2 CJK chars → length 4
      expect(calculateLength('你好')).toBe(4);
    });

    it('mixed ASCII and CJK', () => {
      // 'Hi你好' = 2 ASCII + 2 CJK = 2 + 4 = 6
      expect(calculateLength('Hi你好')).toBe(6);
    });

    it('Korean Hangul counts as CJK (0xac00–0xd7af)', () => {
      // '안녕' = 2 Hangul chars → length 4
      expect(calculateLength('안녕')).toBe(4);
    });

    it('Japanese CJK unified ideographs count as 2', () => {
      // '日本語' = 3 chars → length 6
      expect(calculateLength('日本語')).toBe(6);
    });
  });

  describe('URL substitution', () => {
    it('a single URL counts as exactly 23 chars regardless of length', () => {
      expect(calculateLength('https://x.com')).toBe(23);
      expect(calculateLength('https://example.com/' + 'a'.repeat(100))).toBe(23);
    });

    it('http URLs also count as 23', () => {
      expect(calculateLength('http://example.com')).toBe(23);
    });

    it('two URLs count as 46 plus surrounding text', () => {
      // 'https://a.com https://b.com' → two URLs (46) + one space (1) = 47
      expect(calculateLength('https://a.com https://b.com')).toBe(47);
    });

    it('text + URL: URL weight is 23 plus the surrounding text weight', () => {
      // 'Hello ' = 6, 'https://x.com' = 23 → total 29
      expect(calculateLength('Hello https://x.com')).toBe(6 + 23);
    });
  });

  describe('emoji (surrogate pairs)', () => {
    it('emoji outside BMP counts as 1 (not in CJK range)', () => {
      // 😀 is U+1F600 = 128512, not in any CJK range → counts as 1
      expect(calculateLength('😀')).toBe(1);
    });

    it('emoji does not corrupt surrounding text count', () => {
      // 'Hi😀' = 2 ASCII + 1 emoji code point = 3
      expect(calculateLength('Hi😀')).toBe(3);
    });
  });
});
