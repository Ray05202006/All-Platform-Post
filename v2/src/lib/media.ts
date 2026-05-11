import { API_URL } from "@/lib/api";

export interface MediaFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

export function getMediaType(files: MediaFile[]): "image" | "video" | undefined {
  if (files.length === 0) return undefined;
  if (files.every((f) => f.mimetype.startsWith("video/"))) return "video";
  if (files.every((f) => f.mimetype.startsWith("image/"))) return "image";
  return undefined;
}

export function validateHomogeneousMedia(
  files: MediaFile[]
): { ok: true } | { ok: false; message: string } {
  if (files.length === 0) return { ok: true };
  const type = getMediaType(files);
  if (!type) return { ok: false, message: "Cannot mix image and video uploads." };
  return { ok: true };
}

export function getMediaPreviewUrl(file: MediaFile): string {
  return `${API_URL}/uploads/media/${file.filename}`;
}
