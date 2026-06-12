'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { toastApiError } from '@/lib/toast';
import { getMinScheduleDateTime } from '@/lib/datetime';
import { PageHeader } from '@/components/page-header';
import { ScheduledPostCard } from '@/components/posts/scheduled-post-card';
import { LoadingState } from '@/components/loading-state';
import { EmptyState } from '@/components/empty-state';
import { ErrorCallout } from '@/components/error-callout';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  scheduledAt?: string;
  status: string;
}

function sortBySchedule(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const tA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const tB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return tA - tB;
  });
}

export default function ScheduledPage() {
  useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => { fetchScheduledPosts(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setPosts((prev) => [...prev]), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Post[]>('/posts?status=scheduled');
      setPosts(sortBySchedule(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    try {
      await apiFetch(`/posts/${postId}/schedule`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Schedule cancelled — post moved to drafts');
    } catch (err) {
      toastApiError(err, 'Failed to cancel schedule');
    }
  };

  const handleUpdateSchedule = async (postId: string) => {
    if (!newScheduleTime) { toast.error('Please select a new schedule time.'); return; }
    const scheduledAt = new Date(newScheduleTime);
    if (scheduledAt <= new Date()) { toast.error('Schedule time must be in the future.'); return; }
    try {
      const updated = await apiFetch<Post>(`/posts/${postId}/schedule`, {
        method: 'PUT',
        json: { scheduledAt: scheduledAt.toISOString() },
      });
      setPosts((prev) => sortBySchedule(prev.map((p) => (p.id === postId ? updated : p))));
      setEditingPostId(null);
      setNewScheduleTime('');
      toast.success('Schedule updated');
    } catch (err) {
      toastApiError(err, 'Failed to update schedule');
    }
  };

  const handlePublishNow = async (postId: string) => {
    try {
      await apiFetch(`/posts/${postId}/publish`, { method: 'POST' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post published!');
    } catch (err) {
      toastApiError(err, 'Failed to publish');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Posts"
        description="Manage your upcoming scheduled posts"
      />

      {error && <ErrorCallout message={error} />}

      {loading ? (
        <LoadingState variant="card-list" rows={3} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled posts"
          description="Schedule a post from the editor to see it here."
          action={
            <Button asChild>
              <Link href="/dashboard">Create a post</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ScheduledPostCard
              key={post.id}
              post={post}
              editing={editingPostId === post.id}
              newScheduleTime={newScheduleTime}
              minDateTime={getMinScheduleDateTime()}
              onEditStart={(p) => {
                setEditingPostId(p.id);
                setNewScheduleTime(p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : '');
              }}
              onEditCancel={() => { setEditingPostId(null); setNewScheduleTime(''); }}
              onScheduleTimeChange={setNewScheduleTime}
              onUpdateSchedule={handleUpdateSchedule}
              onPublishNow={handlePublishNow}
              onCancelSchedule={handleCancelSchedule}
            />
          ))}
        </div>
      )}
    </div>
  );
}
