import type { PostStatus } from "@/lib/types";
import { getPostStatusMeta } from "@/lib/post-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PostStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = getPostStatusMeta(status);
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium border-0", meta.badgeClassName, className)}
    >
      {meta.label}
    </Badge>
  );
}
