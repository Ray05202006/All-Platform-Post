import type { PostStatus } from "@/lib/types";

export interface PostStatusMeta {
  value: PostStatus | "all";
  label: string;
  badgeClassName: string;
}

export const POST_STATUS_META: Record<PostStatus, PostStatusMeta> = {
  draft: {
    value: "draft",
    label: "Draft",
    badgeClassName: "bg-secondary text-secondary-foreground",
  },
  scheduled: {
    value: "scheduled",
    label: "Scheduled",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  publishing: {
    value: "publishing",
    label: "Publishing",
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  published: {
    value: "published",
    label: "Published",
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  partial: {
    value: "partial",
    label: "Partial",
    badgeClassName: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  },
  failed: {
    value: "failed",
    label: "Failed",
    badgeClassName: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export const POST_STATUS_FILTERS: Array<"all" | PostStatus> = [
  "all",
  "draft",
  "scheduled",
  "published",
  "partial",
  "failed",
];

export function getPostStatusMeta(status: PostStatus | string): PostStatusMeta {
  return (
    POST_STATUS_META[status as PostStatus] ?? {
      value: status as PostStatus,
      label: status,
      badgeClassName: "bg-secondary text-secondary-foreground",
    }
  );
}
