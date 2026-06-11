import { Info } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PlatformLimitsCard() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <ul className="text-sm space-y-0.5 mt-1">
          {PLATFORMS.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.name}:</span> {p.maxLength.toLocaleString()} chars
              {p.id === "twitter" && " (CJK = 2 chars, URLs = 23 chars)"}
              {p.id === "instagram" && " (requires image)"}
            </li>
          ))}
          <li className="text-muted-foreground text-xs mt-1">
            Content exceeding limits will be auto-split into multiple posts.
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
