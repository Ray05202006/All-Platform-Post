export function formatDateTime(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMinScheduleDateTime(minutesFromNow = 5): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesFromNow);
  return now.toISOString().slice(0, 16);
}

export function getTimeUntil(dateString: string, now = Date.now()): string {
  const diff = new Date(dateString).getTime() - now;
  if (diff < 0) return "Overdue";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
