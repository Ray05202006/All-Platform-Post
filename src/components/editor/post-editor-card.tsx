"use client";

import type { Platform } from "@/lib/types";
import type { PlatformMeta } from "@/lib/platforms";
import type { MediaFile } from "@/lib/media";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PlatformSelector } from "@/components/platforms/platform-selector";
import { CharacterCounts } from "@/components/editor/character-counts";
import { MediaDropzone } from "@/components/editor/media-dropzone";
import { ScheduleControl } from "@/components/editor/schedule-control";

interface ConnectionSummary {
  platform: string;
  isActive: boolean;
  platformUsername?: string;
}

interface PostEditorCardProps {
  content: string;
  onContentChange: (value: string) => void;
  selectedPlatforms: Platform[];
  connections: ConnectionSummary[];
  platforms: PlatformMeta[];
  mediaFiles: MediaFile[];
  scheduledAt: string;
  showScheduler: boolean;
  minDateTime: string;
  busyState?: "saving" | "publishing" | "scheduling" | "uploading";
  onSelectedPlatformsChange: (platforms: Platform[]) => void;
  onMediaUpload: (files: FileList | File[]) => void;
  onRemoveMedia: (index: number) => void;
  onScheduledAtChange: (value: string) => void;
  onShowSchedulerChange: (value: boolean) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSchedule: () => void;
}

export function PostEditorCard({
  content,
  onContentChange,
  selectedPlatforms,
  connections,
  platforms,
  mediaFiles,
  scheduledAt,
  showScheduler,
  minDateTime,
  busyState,
  onSelectedPlatformsChange,
  onMediaUpload,
  onRemoveMedia,
  onScheduledAtChange,
  onShowSchedulerChange,
  onSaveDraft,
  onPublish,
  onSchedule,
}: PostEditorCardProps) {
  const canPublish = content.trim().length > 0 && selectedPlatforms.length > 0;
  const canSchedule = canPublish && showScheduler && scheduledAt.length > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Compose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="post-content">Content</Label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your post content…"
            className="min-h-[10rem] resize-none"
            disabled={!!busyState}
          />
          <CharacterCounts content={content} platforms={selectedPlatforms} />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label>Platforms</Label>
          <PlatformSelector
            platforms={platforms}
            selected={selectedPlatforms}
            connections={connections}
            onChange={onSelectedPlatformsChange}
            disabled={!!busyState}
          />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label>Media</Label>
          <MediaDropzone
            files={mediaFiles}
            isUploading={busyState === "uploading"}
            onFilesSelected={onMediaUpload}
            onRemove={onRemoveMedia}
          />
        </div>

        <Separator />

        <ScheduleControl
          enabled={showScheduler}
          scheduledAt={scheduledAt}
          minDateTime={minDateTime}
          onEnabledChange={onShowSchedulerChange}
          onScheduledAtChange={onScheduledAtChange}
        />
      </CardContent>

      <CardFooter className="flex justify-between gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={!content.trim() || busyState === "saving"}
          size="sm"
        >
          {busyState === "saving" ? "Saving…" : "Save Draft"}
        </Button>
        <div className="flex gap-2">
          {showScheduler && scheduledAt ? (
            <Button
              onClick={onSchedule}
              disabled={!canSchedule || busyState === "scheduling"}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {busyState === "scheduling" ? "Scheduling…" : "Schedule"}
            </Button>
          ) : (
            <Button
              onClick={onPublish}
              disabled={!canPublish || busyState === "publishing"}
            >
              {busyState === "publishing" ? "Publishing…" : "Publish Now"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
