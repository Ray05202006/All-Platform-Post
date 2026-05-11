import type { Platform } from "@/lib/types";
import { PLATFORMS } from "@/lib/platforms";
import { getPlatformCharacterCount } from "@/lib/text";
import { cn } from "@/lib/utils";

interface CharacterCountsProps {
  content: string;
  platforms: Platform[];
}

export function CharacterCounts({ content, platforms }: CharacterCountsProps) {
  if (platforms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-1">
      {platforms.map((p) => {
        const meta = PLATFORMS.find((pl) => pl.id === p);
        const count = getPlatformCharacterCount(content, p);
        const isOver = count > (meta?.maxLength ?? 0);
        return (
          <span
            key={p}
            className={cn(
              "text-xs font-medium",
              isOver ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {meta?.shortName} {count}/{meta?.maxLength}
          </span>
        );
      })}
    </div>
  );
}
