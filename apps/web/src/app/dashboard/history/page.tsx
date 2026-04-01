'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, Post } from '@/lib/api';
import { extractFilenameFromUrl, getResultError, getResultPostId, PostResult } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-500' },
  scheduled: { label: '已排程', color: 'bg-blue-500' },
  publishing: { label: '釋出中', color: 'bg-yellow-500' },
  published: { label: '已釋出', color: 'bg-green-500' },
  partial: { label: '部分成功', color: 'bg-orange-500' },
  failed: { label: '失敗', color: 'bg-red-500' },
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  twitter: '🐦',
  threads: '🧵',
};

export default function HistoryPage() {
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
      const status = filter === 'all' ? undefined : filter;
      const data = await api.getPosts(status);
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('確定要刪除這個貼文嗎？')) return;

    try {
      await api.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      const updated = await api.publishPost(postId);
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
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

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">發文歷史</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            新增貼文
          </Link>
        </div>

        {/* 過濾器 */}
        <div className="flex gap-2 mb-6">
          {['all', 'draft', 'scheduled', 'published', 'partial', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded ${
                filter === status
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? '全部' : STATUS_LABELS[status]?.label || status}
            </button>
          ))}
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded p-4 mb-6">
            {error}
          </div>
        )}

        {/* 載入狀態 */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">載入中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暫無貼文記錄
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
                    {/* 狀態標籤 */}
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        STATUS_LABELS[post.status]?.color || 'bg-gray-500'
                      }`}
                    >
                      {STATUS_LABELS[post.status]?.label || post.status}
                    </span>

                    {/* 平臺圖示 */}
                    <div className="flex gap-1">
                      {post.platforms.map((platform) => (
                        <span key={platform} title={platform}>
                          {PLATFORM_ICONS[platform] || '📝'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-400">
                    {formatDate(post.createdAt)}
                  </div>
                </div>

                {/* 貼文內容 */}
                <div className="text-gray-300 mb-4 whitespace-pre-wrap">
                  {truncateContent(post.content)}
                </div>

                {/* 媒體預覽 */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {post.mediaUrls.slice(0, 4).map((url, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 bg-gray-700 rounded overflow-hidden"
                      >
                        <img
                          src={api.getMediaUrl(extractFilenameFromUrl(url))}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {post.mediaUrls.length > 4 && (
                      <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                        +{post.mediaUrls.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* 排程/釋出時間 */}
                <div className="text-sm text-gray-400 mb-4 space-y-1">
                  {post.scheduledAt && (
                    <div>排程時間：{formatDate(post.scheduledAt)}</div>
                  )}
                  {post.publishedAt && (
                    <div>釋出時間：{formatDate(post.publishedAt)}</div>
                  )}
                </div>

                {/* 釋出結果 */}
                {post.results && (
                  <div className="bg-gray-900/50 rounded p-3 mb-4 text-sm">
                    <div className="font-medium mb-2">釋出結果：</div>
                    <div className="space-y-1">
                      {Object.entries(post.results).map(([platform, result]) => {
                        const error = getResultError(result);
                        const postId = getResultPostId(result);
                        return (
                          <div key={platform} className="flex items-center gap-2">
                            <span>{PLATFORM_ICONS[platform] || '📝'}</span>
                            <span>{platform}:</span>
                            {error ? (
                              <span className="text-red-400">{error}</span>
                            ) : postId ? (
                              <span className="text-green-400">成功</span>
                            ) : (
                              <span className="text-gray-400">
                                {JSON.stringify(result)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <>
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
                      >
                        立即釋出
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                      >
                        刪除
                      </button>
                    </>
                  )}
                  {(post.status === 'failed' || post.status === 'partial') && (
                    <button
                      onClick={() => handlePublish(post.id)}
                      className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm"
                    >
                      重試釋出
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
