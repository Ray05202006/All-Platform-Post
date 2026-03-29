'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
  status: string;
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

export default function ScheduledPage() {
  const { data: _session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((prev) => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Post[]>('/posts?status=scheduled');
      data.sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeA - timeB;
      });
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    if (!confirm('Cancel this scheduled post? It will become a draft.')) return;
    try {
      await apiFetch(`/posts/${postId}/schedule`, { method: 'DELETE' });
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel schedule');
    }
  };

  const handleUpdateSchedule = async (postId: string) => {
    if (!newScheduleTime) {
      alert('Please select a new schedule time.');
      return;
    }
    const scheduledAt = new Date(newScheduleTime);
    if (scheduledAt <= new Date()) {
      alert('Schedule time must be in the future.');
      return;
    }
    try {
      const updated = await apiFetch<Post>(`/posts/${postId}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
      });
      setPosts(
        posts
          .map((p) => (p.id === postId ? updated : p))
          .sort((a, b) => {
            const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
            const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
            return timeA - timeB;
          })
      );
      setEditingPost(null);
      setNewScheduleTime('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update schedule');
    }
  };

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Publish this post immediately?')) return;
    try {
      await apiFetch(`/posts/${postId}/publish`, { method: 'POST' });
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
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

  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Scheduled Posts</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your upcoming scheduled posts</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No scheduled posts</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Create a new post
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {PLATFORM_LABELS[platform] || platform}
                      </span>
                    ))}
                  </div>
                  <span className="text-blue-600 text-sm font-medium">
                    {post.scheduledAt && getTimeUntil(post.scheduledAt)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Scheduled for</div>
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(post.scheduledAt)}
                  </div>
                </div>
              </div>

              <div className="text-gray-600 mb-4 whitespace-pre-wrap bg-gray-50 rounded p-3 text-sm">
                {post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}
              </div>

              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {post.mediaUrls.slice(0, 4).map((url, index) => (
                    <div key={index} className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {post.mediaUrls.length > 4 && (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                      +{post.mediaUrls.length - 4}
                    </div>
                  )}
                </div>
              )}

              {editingPost === post.id && (
                <div className="bg-gray-50 rounded p-4 mb-4">
                  <div className="text-sm text-gray-500 mb-2">Reschedule</div>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                      min={getMinDateTime()}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleUpdateSchedule(post.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setEditingPost(null); setNewScheduleTime(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handlePublishNow(post.id)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Publish Now
                </button>
                <button
                  onClick={() => {
                    setEditingPost(post.id);
                    setNewScheduleTime(
                      post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''
                    );
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleCancelSchedule(post.id)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
