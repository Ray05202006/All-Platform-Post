import { toast } from "sonner";
import { ApiError } from "@/lib/api";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function toastApiError(error: unknown, fallback: string): void {
  toast.error(getErrorMessage(error, fallback));
}
