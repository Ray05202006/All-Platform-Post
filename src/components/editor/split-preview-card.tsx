import type { SplitResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformBadge } from "@/components/platforms/platform-badge";

interface SplitPreviewCardProps {
  previews: SplitResult[];
  isLoading?: boolean;
}

export function SplitPreviewCard({ previews, isLoading }: SplitPreviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Split Preview
          {isLoading && (
            <span className="text-xs font-normal text-muted-foreground">Loading…</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : previews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select platforms and enter content to see split preview
          </p>
        ) : (
          <div className="space-y-4">
            {previews.map((preview) => (
              <div key={preview.platform} className="rounded-md border p-4">
                <div className="flex items-center justify-between mb-3">
                  <PlatformBadge platform={preview.platform} showLabel />
                  {preview.needsSplitting && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      {preview.chunks.length} posts
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {preview.chunks.map((chunk, i) => (
                    <div key={i} className="rounded bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap">
                      {chunk}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
