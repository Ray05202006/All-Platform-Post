"use client";

import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScheduleControlProps {
  enabled: boolean;
  scheduledAt: string;
  minDateTime: string;
  onEnabledChange: (enabled: boolean) => void;
  onScheduledAtChange: (value: string) => void;
}

export function ScheduleControl({
  enabled,
  scheduledAt,
  minDateTime,
  onEnabledChange,
  onScheduledAtChange,
}: ScheduleControlProps) {
  return (
    <Collapsible open={enabled} onOpenChange={onEnabledChange}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Schedule</Label>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8">
            <CalendarClock className="h-4 w-4" />
            {enabled ? "Cancel schedule" : "Set schedule"}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-2">
        <div className="rounded-md bg-muted/50 p-3 space-y-2">
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            min={minDateTime}
          />
          <p className="text-xs text-muted-foreground">Must be at least 5 minutes from now</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
