"use client";

import type { PostStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { StatusBadge } from "@/components/posts/status-badge";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { MediaThumbnails } from "@/components/posts/media-thumbnails";
import { formatDateTime } from "@/lib/datetime";
import { truncateText } from "@/lib/text";

interface PostListItem {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  scheduledAt?: string;
  publishedAt?: string;
  status: PostStatus;
  results?: Record<string, { postId?: string; error?: string }>;
  createdAt: string;
}

interface PostCardProps {
  post: PostListItem;
  onDelete?: (postId: string) => void;
  onRetry?: (postId: string) => void;
  onPublishNow?: (postId: string) => void;
}

export function PostCard({ post, onDelete, onRetry, onPublishNow }: PostCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          {post.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
        <time className="text-xs text-muted-foreground shrink-0">{formatDateTime(post.createdAt)}</time>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap">
        {truncateText(post.content, 150)}
      </p>

      {post.mediaUrls.length > 0 && <MediaThumbnails urls={post.mediaUrls} />}

      <div className="text-xs text-muted-foreground space-y-0.5">
        {post.scheduledAt && <div>Scheduled: {formatDateTime(post.scheduledAt)}</div>}
        {post.publishedAt && <div>Published: {formatDateTime(post.publishedAt)}</div>}
      </div>

      {post.results && (
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <div className="font-medium text-foreground mb-1">Results</div>
          {Object.entries(post.results).map(([platform, result]) => (
            <div key={platform} className="flex items-center gap-2">
              <PlatformBadge platform={platform} />
              {result.error ? (
                <span className="text-destructive">{result.error}</span>
              ) : result.postId ? (
                <span className="text-emerald-600 dark:text-emerald-400">Success</span>
              ) : (
                <span className="text-muted-foreground">{JSON.stringify(result)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="flex gap-2">
        {(post.status === "draft" || post.status === "scheduled") && onPublishNow && (
          <Button size="sm" onClick={() => onPublishNow(post.id)}>
            Publish Now
          </Button>
        )}
        {(post.status === "failed" || post.status === "partial") && onRetry && (
          <Button size="sm" variant="secondary" onClick={() => onRetry(post.id)}>
            Retry
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(post.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
