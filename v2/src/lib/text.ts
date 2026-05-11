import type { Platform } from "@/lib/types";

function isCJK(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x20000 && code <= 0x2fa1f)
  );
}

export function getPlatformCharacterCount(text: string, platform: Platform): number {
  if (platform === "twitter") {
    const urls = text.match(/https?:\/\/\S+/g) || [];
    let textWithoutUrls = text;
    urls.forEach((url) => (textWithoutUrls = textWithoutUrls.replace(url, "")));
    let length = urls.length * 23;
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0);
      length += code !== undefined && isCJK(code) ? 2 : 1;
    }
    return length;
  }
  return text.length;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
