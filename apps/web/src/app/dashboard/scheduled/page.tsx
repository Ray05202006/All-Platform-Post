'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, Post } from '@/lib/api';
import { extractFilenameFromUrl } from '@/lib/utils';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  twitter: '🐦',
  threads: '🧵',
};

export default function ScheduledPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState<string>('');

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getPosts('scheduled');
      // 按排程时间排序
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
    if (!confirm('确定要取消这个排程吗？贴文将转为草稿。')) return;

    try {
      await api.cancelSchedule(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel schedule');
    }
  };

  const handleUpdateSchedule = async (postId: string) => {
    if (!newScheduleTime) {
      alert('请选择新的排程时间');
      return;
    }

    const scheduledAt = new Date(newScheduleTime);
    if (scheduledAt <= new Date()) {
      alert('排程时间必须是未来时间');
      return;
    }

    try {
      const updated = await api.updateSchedule(postId, scheduledAt);
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
    if (!confirm('确定要立即发布这个贴文吗？')) return;

    try {
      await api.publishPost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish post');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff < 0) return '已过期';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} 天后`;
    }
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟后`;
    }
    return `${minutes} 分钟后`;
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // 至少 5 分钟后
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">排程管理</h1>
          <div className="flex gap-2">
            <Link
              href="/dashboard/history"
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              发文历史
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              新增贴文
            </Link>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded p-4 mb-6">
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">暂无排程贴文</div>
            <Link
              href="/dashboard"
              className="text-blue-400 hover:underline"
            >
              创建新贴文
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {/* 平台图标 */}
                    <div className="flex gap-1">
                      {post.platforms.map((platform) => (
                        <span key={platform} title={platform} className="text-xl">
                          {PLATFORM_ICONS[platform] || '📝'}
                        </span>
                      ))}
                    </div>

                    {/* 倒计时 */}
                    <span className="text-blue-400 text-sm">
                      {post.scheduledAt && getTimeUntil(post.scheduledAt)}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-400">排程时间</div>
                    <div className="font-medium">
                      {formatDate(post.scheduledAt)}
                    </div>
                  </div>
                </div>

                {/* 贴文内容 */}
                <div className="text-gray-300 mb-4 whitespace-pre-wrap bg-gray-900/50 rounded p-3">
                  {truncateContent(post.content)}
                </div>

                {/* 媒体预览 */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {post.mediaUrls.slice(0, 4).map((url, index) => (
                      <div
                        key={index}
                        className="w-12 h-12 bg-gray-700 rounded overflow-hidden"
                      >
                        <img
                          src={api.getMediaUrl(extractFilenameFromUrl(url))}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {post.mediaUrls.length > 4 && (
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm">
                        +{post.mediaUrls.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* 编辑排程时间 */}
                {editingPost === post.id ? (
                  <div className="bg-gray-900/50 rounded p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">修改排程时间</div>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={newScheduleTime}
                        onChange={(e) => setNewScheduleTime(e.target.value)}
                        min={getMinDateTime()}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                      <button
                        onClick={() => handleUpdateSchedule(post.id)}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => {
                          setEditingPost(null);
                          setNewScheduleTime('');
                        }}
                        className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
                  >
                    立即发布
                  </button>
                  <button
                    onClick={() => {
                      setEditingPost(post.id);
                      setNewScheduleTime(
                        post.scheduledAt
                          ? new Date(post.scheduledAt).toISOString().slice(0, 16)
                          : ''
                      );
                    }}
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                  >
                    修改时间
                  </button>
                  <button
                    onClick={() => handleCancelSchedule(post.id)}
                    className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                  >
                    取消排程
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
