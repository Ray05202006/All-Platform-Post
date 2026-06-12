import type { Platform } from "@/lib/types";
import { getPlatformMeta } from "@/lib/platforms";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { cn } from "@/lib/utils";

interface PlatformBadgeProps {
  platform: Platform | string;
  showLabel?: boolean;
  className?: string;
}

export function PlatformBadge({ platform, showLabel = false, className }: PlatformBadgeProps) {
  const meta = getPlatformMeta(platform as Platform);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 px-2 py-0.5 font-medium", className)}
    >
      <PlatformIcon platform={platform} size="sm" className="w-4 h-4" />
      {showLabel && <span>{meta?.shortName ?? String(platform).toUpperCase()}</span>}
      {!showLabel && <span>{meta?.shortName ?? String(platform).toUpperCase()}</span>}
    </Badge>
  );
}
