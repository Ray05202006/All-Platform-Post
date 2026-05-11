'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { Platform, SplitResult } from '@/lib/types';
import { PLATFORMS } from '@/lib/platforms';
import { apiFetch, uploadMedia } from '@/lib/api';
import type { MediaFile } from '@/lib/media';
import { validateHomogeneousMedia, getMediaType } from '@/lib/media';
import { getMinScheduleDateTime } from '@/lib/datetime';
import { toastApiError } from '@/lib/toast';
import { PageHeader } from '@/components/page-header';
import { PostEditorCard } from '@/components/editor/post-editor-card';
import { SplitPreviewCard } from '@/components/editor/split-preview-card';
import { PlatformLimitsCard } from '@/components/editor/platform-limits-card';

interface Connection {
  platform: string;
  platformUsername?: string;
  isActive: boolean;
}

export default function DashboardPage() {
  useSession();

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [splitPreviews, setSplitPreviews] = useState<SplitResult[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busyState, setBusyState] = useState<'saving' | 'publishing' | 'scheduling' | 'uploading' | undefined>();

  useEffect(() => {
    apiFetch<Connection[]>('/connections').then(setConnections).catch(console.error);
  }, []);

  const previewSplit = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      setSplitPreviews([]);
      return;
    }
    setIsPreviewLoading(true);
    try {
      const results = await apiFetch<SplitResult[]>('/posts/preview-split', {
        method: 'POST',
        json: { content, platforms: selectedPlatforms },
      });
      setSplitPreviews(results);
    } catch {
      // silent — preview errors don't need user feedback
    } finally {
      setIsPreviewLoading(false);
    }
  }, [content, selectedPlatforms]);

  useEffect(() => {
    const timer = setTimeout(previewSplit, 500);
    return () => clearTimeout(timer);
  }, [previewSplit]);

  const resetForm = () => {
    setContent('');
    setSelectedPlatforms([]);
    setSplitPreviews([]);
    setMediaFiles([]);
    setScheduledAt('');
    setShowScheduler(false);
  };

  const buildPostPayload = (extra?: object) => {
    const mediaType = getMediaType(mediaFiles);
    return {
      content,
      platforms: selectedPlatforms,
      mediaUrls: mediaFiles.map((f) => f.url),
      mediaType,
      ...extra,
    };
  };

  const handlePublish = async () => {
    const validation = validateHomogeneousMedia(mediaFiles);
    if (!validation.ok) { toast.error(validation.message); return; }
    setBusyState('publishing');
    try {
      const post = await apiFetch<{ id: string }>('/posts', { method: 'POST', json: buildPostPayload() });
      await apiFetch(`/posts/${post.id}/publish`, { method: 'POST' });
      toast.success('Published successfully!');
      resetForm();
    } catch (err) {
      toastApiError(err, 'Publish failed');
    } finally {
      setBusyState(undefined);
    }
  };

  const handleSchedule = async () => {
    const validation = validateHomogeneousMedia(mediaFiles);
    if (!validation.ok) { toast.error(validation.message); return; }
    setBusyState('scheduling');
    try {
      await apiFetch('/posts', {
        method: 'POST',
        json: buildPostPayload({ scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined }),
      });
      toast.success('Scheduled successfully!');
      resetForm();
    } catch (err) {
      toastApiError(err, 'Schedule failed');
    } finally {
      setBusyState(undefined);
    }
  };

  const handleSaveDraft = async () => {
    const validation = validateHomogeneousMedia(mediaFiles);
    if (!validation.ok) { toast.error(validation.message); return; }
    setBusyState('saving');
    try {
      await apiFetch('/posts', { method: 'POST', json: buildPostPayload() });
      toast.success('Draft saved!');
    } catch (err) {
      toastApiError(err, 'Save failed');
    } finally {
      setBusyState(undefined);
    }
  };

  const handleMediaUpload = async (files: FileList | File[]) => {
    if (!files || Array.from(files).length === 0) return;
    setBusyState('uploading');
    try {
      const result = await uploadMedia(files instanceof FileList ? files : files);
      setMediaFiles((prev) => [...prev, ...result.files]);
    } catch (err) {
      toastApiError(err, 'Upload failed');
    } finally {
      setBusyState(undefined);
    }
  };

  const handleRemoveMedia = async (index: number) => {
    const file = mediaFiles[index];
    try {
      await apiFetch(`/media/${file.filename}`, { method: 'DELETE' });
      setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    } catch {
      toast.error('Failed to delete media file.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post Editor"
        description="Create and publish to multiple platforms"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PostEditorCard
          content={content}
          onContentChange={setContent}
          selectedPlatforms={selectedPlatforms}
          connections={connections}
          platforms={PLATFORMS}
          mediaFiles={mediaFiles}
          scheduledAt={scheduledAt}
          showScheduler={showScheduler}
          minDateTime={getMinScheduleDateTime()}
          busyState={busyState}
          onSelectedPlatformsChange={setSelectedPlatforms}
          onMediaUpload={handleMediaUpload}
          onRemoveMedia={handleRemoveMedia}
          onScheduledAtChange={setScheduledAt}
          onShowSchedulerChange={setShowScheduler}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onSchedule={handleSchedule}
        />

        <div className="space-y-4">
          <SplitPreviewCard previews={splitPreviews} isLoading={isPreviewLoading} />
          <PlatformLimitsCard />
        </div>
      </div>
    </div>
  );
}
