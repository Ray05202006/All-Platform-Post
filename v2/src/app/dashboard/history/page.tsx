'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { PostStatus } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { toastApiError } from '@/lib/toast';
import { PageHeader } from '@/components/page-header';
import { StatusFilter } from '@/components/history/status-filter';
import { PostCard } from '@/components/posts/post-card';
import { LoadingState } from '@/components/loading-state';
import { EmptyState } from '@/components/empty-state';
import { ErrorCallout } from '@/components/error-callout';

interface Post {
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

export default function HistoryPage() {
  useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const data = await apiFetch<Post[]>(`/posts${query}`);
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (postId: string) => {
    try {
      await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted');
    } catch (err) {
      toastApiError(err, 'Failed to delete post');
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      const updated = await apiFetch<Post>(`/posts/${postId}/publish`, { method: 'POST' });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      toast.success('Retry queued');
    } catch (err) {
      toastApiError(err, 'Failed to retry');
    }
  };

  const canDeletePost = (status: PostStatus) => status !== 'published';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post History"
        description="View and manage all your posts"
      />

      <StatusFilter value={filter} onValueChange={setFilter} />

      {error && <ErrorCallout message={error} />}

      {loading ? (
        <LoadingState variant="card-list" rows={3} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts found"
          description={filter === 'all' ? 'Create your first post from the editor.' : `No ${filter} posts.`}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={canDeletePost(post.status) ? handleDelete : undefined}
              onRetry={(post.status === 'failed' || post.status === 'partial') ? handleRetry : undefined}
              onPublishNow={(post.status === 'draft' || post.status === 'scheduled') ? handleRetry : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
