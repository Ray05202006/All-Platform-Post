import { calculateLength } from '@/lib/platforms/twitter';
import { PLATFORM_LIMITS, type Platform, type SplitResult } from '@/lib/types';

export function splitForTwitter(text: string): string[] {
  const maxLength = 280 - 10; // Reserve space for numbering
  const chunks: string[] = [];

  const sentences = text.split(/([。！?？\n]+|[.!?]+\s+)/).filter((s) => s.trim());

  let current = '';
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    const testLength = calculateLength(current + sentence);

    if (testLength <= maxLength) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());

  if (chunks.length > 1) {
    return chunks.map((chunk, i) => `${chunk} (${i + 1}/${chunks.length})`);
  }
  return chunks;
}

export function splitForPlatform(text: string, platform: string): string[] {
  const maxLength = (PLATFORM_LIMITS[platform as Platform] || 500) - 10;
  const chunks: string[] = [];

  const sentences = text.split(/([。！?？\n]+|[.!?]+\s+)/).filter((s) => s.trim());

  let current = '';
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');

    if ((current + sentence).length <= maxLength) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());

  if (chunks.length > 1) {
    return chunks.map((chunk, i) => `${chunk} (${i + 1}/${chunks.length})`);
  }
  return chunks;
}

export function previewSplit(content: string, platforms: string[]): SplitResult[] {
  return platforms.map((platform) => {
    const maxLength = PLATFORM_LIMITS[platform as Platform] || 500;
    const contentLength = platform === 'twitter' ? calculateLength(content) : content.length;

    if (contentLength <= maxLength) {
      return { platform, chunks: [content], needsSplitting: false };
    }

    const chunks =
      platform === 'twitter'
        ? splitForTwitter(content)
        : splitForPlatform(content, platform);

    return { platform, chunks, needsSplitting: true };
  });
}
