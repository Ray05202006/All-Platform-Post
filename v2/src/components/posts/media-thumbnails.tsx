import { cn } from "@/lib/utils";

interface MediaThumbnailsProps {
  urls: string[];
  size?: "sm" | "md";
  maxVisible?: number;
}

const SIZE_CLASS = {
  sm: "size-12",
  md: "size-16",
};

export function MediaThumbnails({ urls, size = "md", maxVisible = 4 }: MediaThumbnailsProps) {
  if (urls.length === 0) return null;
  const visible = urls.slice(0, maxVisible);
  const overflow = urls.length - maxVisible;

  return (
    <div className="flex gap-2">
      {visible.map((url, i) => (
        <div key={i} className={cn("rounded-md overflow-hidden bg-muted flex-shrink-0", SIZE_CLASS[size])}>
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn("rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0", SIZE_CLASS[size])}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
