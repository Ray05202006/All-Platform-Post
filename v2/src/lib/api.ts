export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { json, body, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {};
  if (json !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...rest,
    headers: requestHeaders,
    body: json !== undefined ? JSON.stringify(json) : body,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(
      err.message || `HTTP ${res.status}`,
      res.status,
      err
    );
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return undefined as T;
}

export interface MediaFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

export async function uploadMedia(
  files: FileList | File[]
): Promise<{ files: MediaFile[] }> {
  const uploadedFiles = await Promise.all(
    Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new ApiError(err.message || "Upload failed", res.status, err);
      }

      const uploaded = await res.json() as { filename: string; url: string };
      return {
        filename: uploaded.filename,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
        url: uploaded.url,
      };
    })
  );

  return { files: uploadedFiles };
}
