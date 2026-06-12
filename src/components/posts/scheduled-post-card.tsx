"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { MediaThumbnails } from "@/components/posts/media-thumbnails";
import { formatDateTime, getTimeUntil } from "@/lib/datetime";
import { truncateText } from "@/lib/text";

interface ScheduledPostListItem {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  scheduledAt?: string;
}

interface ScheduledPostCardProps {
  post: ScheduledPostListItem;
  editing: boolean;
  newScheduleTime: string;
  minDateTime: string;
  onEditStart: (post: ScheduledPostListItem) => void;
  onEditCancel: () => void;
  onScheduleTimeChange: (value: string) => void;
  onUpdateSchedule: (postId: string) => void;
  onPublishNow: (postId: string) => void;
  onCancelSchedule: (postId: string) => void;
}

export function ScheduledPostCard({
  post,
  editing,
  newScheduleTime,
  minDateTime,
  onEditStart,
  onEditCancel,
  onScheduleTimeChange,
  onUpdateSchedule,
  onPublishNow,
  onCancelSchedule,
}: ScheduledPostCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {post.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          {post.scheduledAt && (
            <span className="text-sm font-medium text-primary">
              {getTimeUntil(post.scheduledAt)}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Scheduled for</div>
          <div className="text-sm font-medium">{formatDateTime(post.scheduledAt)}</div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap">
        {truncateText(post.content, 150)}
      </div>

      {post.mediaUrls.length > 0 && <MediaThumbnails urls={post.mediaUrls} size="sm" />}

      {editing && (
        <div className="rounded-md bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Reschedule</p>
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={newScheduleTime}
              onChange={(e) => onScheduleTimeChange(e.target.value)}
              min={minDateTime}
              className="flex-1"
            />
            <Button size="sm" onClick={() => onUpdateSchedule(post.id)}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={onEditCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm">Publish Now</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish immediately?</AlertDialogTitle>
              <AlertDialogDescription>
                This post will be published right away instead of at the scheduled time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onPublishNow(post.id)}>
                Publish Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!editing && (
          <Button size="sm" variant="outline" onClick={() => onEditStart(post)}>
            Reschedule
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this scheduled post?</AlertDialogTitle>
              <AlertDialogDescription>
                The post will become a draft and will not be published automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep scheduled</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onCancelSchedule(post.id)}
              >
                Cancel post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
