'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PostStatus } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  publishing: { label: 'Publishing', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Published', color: 'bg-green-100 text-green-700' },
  partial: { label: 'Partial', color: 'bg-orange-100 text-orange-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  twitter: 'X',
  threads: 'TH',
};

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

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function HistoryPage() {
  const { data: _session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
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
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      const updated = await apiFetch<Post>(`/posts/${postId}/publish`, { method: 'POST' });
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const FILTER_OPTIONS = ['all', 'draft', 'scheduled', 'published', 'partial', 'failed'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Post History</h2>
        <p className="mt-1 text-sm text-gray-500">View and manage all your posts</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No posts found</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_CONFIG[post.status]?.color || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_CONFIG[post.status]?.label || post.status}
                  </span>
                  <div className="flex gap-1">
                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                      >
                        {PLATFORM_LABELS[platform] || platform}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-400">{formatDate(post.createdAt)}</div>
              </div>

              <div className="text-gray-600 mb-4 whitespace-pre-wrap text-sm">
                {post.content.length > 100 ? post.content.slice(0, 100) + '...' : post.content}
              </div>

              {/* Media thumbnails */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {post.mediaUrls.slice(0, 4).map((url, index) => (
                    <div key={index} className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {post.mediaUrls.length > 4 && (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                      +{post.mediaUrls.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="text-sm text-gray-400 mb-4 space-y-1">
                {post.scheduledAt && <div>Scheduled: {formatDate(post.scheduledAt)}</div>}
                {post.publishedAt && <div>Published: {formatDate(post.publishedAt)}</div>}
              </div>

              {/* Per-platform results */}
              {post.results && (
                <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                  <div className="font-medium text-gray-700 mb-2">Results:</div>
                  <div className="space-y-1">
                    {Object.entries(post.results).map(([platform, result]) => (
                      <div key={platform} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {PLATFORM_LABELS[platform] || platform}
                        </span>
                        {result.error ? (
                          <span className="text-red-600 text-xs">{result.error}</span>
                        ) : result.postId ? (
                          <span className="text-green-600 text-xs">Success</span>
                        ) : (
                          <span className="text-gray-400 text-xs">{JSON.stringify(result)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {(post.status === 'draft' || post.status === 'scheduled') && (
                  <>
                    <button
                      onClick={() => handleRetry(post.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Publish Now
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </>
                )}
                {(post.status === 'failed' || post.status === 'partial') && (
                  <button
                    onClick={() => handleRetry(post.id)}
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
