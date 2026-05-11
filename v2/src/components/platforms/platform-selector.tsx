import Link from "next/link";
import type { Platform } from "@/lib/types";
import type { PlatformMeta } from "@/lib/platforms";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformIcon } from "@/components/platforms/platform-icon";
import { cn } from "@/lib/utils";

interface ConnectionSummary {
  platform: string;
  isActive: boolean;
  platformUsername?: string;
}

interface PlatformSelectorProps {
  platforms: PlatformMeta[];
  selected: Platform[];
  connections: ConnectionSummary[];
  onChange: (platforms: Platform[]) => void;
  settingsHref?: string;
  disabled?: boolean;
}

export function PlatformSelector({
  platforms,
  selected,
  connections,
  onChange,
  settingsHref = "/dashboard/settings",
  disabled,
}: PlatformSelectorProps) {
  const connected = platforms.filter((p) =>
    connections.some((c) => c.platform === p.id && c.isActive)
  );
  const unconnected = platforms.filter(
    (p) => !connections.some((c) => c.platform === p.id && c.isActive)
  );

  const toggle = (id: Platform) => {
    onChange(
      selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id]
    );
  };

  if (connected.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 text-sm text-amber-700 dark:text-amber-300">
        No platforms connected.{" "}
        <Link href={settingsHref} className="underline font-medium">
          Connect platforms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {connected.map((platform) => {
          const isSelected = selected.includes(platform.id);
          return (
            <label
              key={platform.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors select-none",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent",
                disabled && "opacity-50 pointer-events-none"
              )}
            >
              <Checkbox
                id={`platform-${platform.id}`}
                checked={isSelected}
                onCheckedChange={() => toggle(platform.id)}
                disabled={disabled}
              />
              <PlatformIcon platform={platform.id} size="sm" />
              <span className="text-sm font-medium">{platform.name}</span>
            </label>
          );
        })}
      </div>
      {unconnected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Not connected: {unconnected.map((p) => p.name).join(", ")}{" "}
          <Link href={settingsHref} className="text-primary hover:underline">
            Connect more
          </Link>
        </p>
      )}
    </div>
  );
}
