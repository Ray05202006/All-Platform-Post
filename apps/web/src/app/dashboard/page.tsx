'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api, SplitResult, MediaFile } from '@/lib/api';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';

type Platform = 'facebook' | 'instagram' | 'twitter' | 'threads';

const PLATFORMS: { id: Platform; name: string; icon: string; maxLength: number }[] = [
  { id: 'facebook', name: 'Facebook', icon: '📘', maxLength: 63206 },
  { id: 'instagram', name: 'Instagram', icon: '📷', maxLength: 2200 },
  { id: 'twitter', name: 'Twitter', icon: '🐦', maxLength: 280 },
  { id: 'threads', name: 'Threads', icon: '🧵', maxLength: 500 },
];

export default function DashboardPage() {
  const { isLoading: authLoading } = useAuth();
  const { connections, isConnected } = useConnections();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [splitPreviews, setSplitPreviews] = useState<SplitResult[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [showScheduler, setShowScheduler] = useState(false);

  // 创建并发布贴文
  const publishMutation = useMutation({
    mutationFn: async () => {
      // 验证媒体类型一致性
      const mediaType =
        mediaFiles.length === 0
          ? undefined
          : mediaFiles.every((f) => f.mimetype.startsWith('video/'))
          ? 'video'
          : mediaFiles.every((f) => f.mimetype.startsWith('image/'))
          ? 'image'
          : undefined;

      if (mediaFiles.length > 0 && !mediaType) {
        throw new Error('不能混合上传图片和视频');
      }

      // 1. 创建贴文
      const post = await api.createPost({
        content,
        platforms: selectedPlatforms,
        mediaUrls: mediaFiles.map((f) => f.url),
        mediaType,
      });
      // 2. 立即发布
      return api.publishPost(post.id);
    },
    onSuccess: (data) => {
      alert('发布成功！');
      resetForm();
      console.log('Publish results:', data.results);
    },
    onError: (error: Error) => {
      alert(`发布失败：${error.message}`);
    },
  });

  // 排程发布
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      // 验证媒体类型一致性
      const mediaType =
        mediaFiles.length === 0
          ? undefined
          : mediaFiles.every((f) => f.mimetype.startsWith('video/'))
          ? 'video'
          : mediaFiles.every((f) => f.mimetype.startsWith('image/'))
          ? 'image'
          : undefined;

      if (mediaFiles.length > 0 && !mediaType) {
        throw new Error('不能混合上传图片和视频');
      }

      const post = await api.createPost({
        content,
        platforms: selectedPlatforms,
        mediaUrls: mediaFiles.map((f) => f.url),
        mediaType,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      return post;
    },
    onSuccess: () => {
      alert('已添加到排程！');
      resetForm();
    },
    onError: (error: Error) => {
      alert(`排程失败：${error.message}`);
    },
  });

  // 保存草稿
  const saveDraftMutation = useMutation({
    mutationFn: () => {
      // 验证媒体类型一致性
      const mediaType =
        mediaFiles.length === 0
          ? undefined
          : mediaFiles.every((f) => f.mimetype.startsWith('video/'))
          ? 'video'
          : mediaFiles.every((f) => f.mimetype.startsWith('image/'))
          ? 'image'
          : undefined;

      if (mediaFiles.length > 0 && !mediaType) {
        throw new Error('不能混合上传图片和视频');
      }

      return api.createPost({
        content,
        platforms: selectedPlatforms,
        mediaUrls: mediaFiles.map((f) => f.url),
        mediaType,
      });
    },
    onSuccess: () => {
      alert('草稿已保存！');
    },
    onError: (error: Error) => {
      alert(`保存失败：${error.message}`);
    },
  });

  // 重置表单
  const resetForm = () => {
    setContent('');
    setSelectedPlatforms([]);
    setSplitPreviews([]);
    setMediaFiles([]);
    setScheduledAt('');
    setShowScheduler(false);
  };

  // 上传媒体文件
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const result = await api.uploadMultipleMedia(Array.from(files));
      setMediaFiles((prev) => [...prev, ...result.files]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除媒体文件
  const handleRemoveMedia = async (index: number) => {
    const file = mediaFiles[index];
    try {
      await api.deleteMedia(file.filename);
      setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert(error instanceof Error ? error.message : '删除媒体文件失败，请稍后重试');
    }
  };

  // 获取最小排程时间（5 分钟后）
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // 预览分割结果（防抖）
  const previewSplit = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      setSplitPreviews([]);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const results = await api.previewSplit(content, selectedPlatforms);
      setSplitPreviews(results);
    } catch (error) {
      console.error('Preview split error:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [content, selectedPlatforms]);

  // Cleanup effect for file input ref when component unmounts
  useEffect(() => {
    const currentRef = fileInputRef.current;
    return () => {
      if (currentRef) {
        currentRef.value = '';
      }
    };
  }, []);

  // 内容或平台变化时更新预览
  useEffect(() => {
    const timer = setTimeout(previewSplit, 500);
    return () => clearTimeout(timer);
  }, [previewSplit]);

  // 切换平台选择
  const togglePlatform = (platformId: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  // 计算字符数（简化版）
  const getCharCount = (text: string, platform: Platform): number => {
    if (platform === 'twitter') {
      // Twitter 特殊计算
      let length = 0;
      for (const char of text) {
        length += char.codePointAt(0)! <= 0x10ff ? 1 : 2;
      }
      return length;
    }
    return text.length;
  };

  // 获取已连接的平台
  const connectedPlatforms = PLATFORMS.filter((p) => isConnected(p.id));
  const unconnectedPlatforms = PLATFORMS.filter((p) => !isConnected(p.id));

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和导航 */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">发文编辑器</h2>
          <p className="mt-1 text-sm text-gray-500">
            创建新贴文并发布到多个平台
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/scheduled"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            排程管理
          </Link>
          <Link
            href="/dashboard/history"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            发文历史
          </Link>
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            设置
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：编辑器 */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            {/* 内容输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                贴文内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="输入贴文内容..."
              />
              <div className="mt-1 text-sm text-gray-500 flex justify-between">
                <span>
                  {selectedPlatforms.map((p) => {
                    const platform = PLATFORMS.find((pl) => pl.id === p);
                    const count = getCharCount(content, p);
                    const isOver = count > (platform?.maxLength || 0);
                    return (
                      <span
                        key={p}
                        className={`mr-3 ${isOver ? 'text-red-500' : ''}`}
                      >
                        {platform?.icon} {count}/{platform?.maxLength}
                      </span>
                    );
                  })}
                </span>
              </div>
            </div>

            {/* 平台选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择平台
              </label>

              {connectedPlatforms.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {connectedPlatforms.map((platform) => (
                    <label
                      key={platform.id}
                      className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-lg">{platform.icon}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {platform.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                  尚未连接任何平台。
                  <a href="/dashboard/settings" className="text-yellow-800 underline ml-1">
                    前往设置连接
                  </a>
                </div>
              )}

              {unconnectedPlatforms.length > 0 && connectedPlatforms.length > 0 && (
                <div className="mt-3 text-sm text-gray-500">
                  未连接：
                  {unconnectedPlatforms.map((p) => (
                    <span key={p.id} className="ml-1">
                      {p.icon} {p.name}
                    </span>
                  ))}
                  <a href="/dashboard/settings" className="text-blue-600 ml-2">
                    连接更多
                  </a>
                </div>
              )}
            </div>

            {/* 媒体上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                媒体文件
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2 mb-2">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden">
                      {file.mimetype.startsWith('image/') ? (
                        <img
                          src={api.getMediaUrl(file.filename)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          🎬
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50"
                >
                  {isUploading ? '...' : '+'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                支持 JPG、PNG、GIF、MP4，最大 100MB
              </p>
            </div>

            {/* 排程设置 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  排程发布
                </label>
                <button
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showScheduler ? '取消排程' : '设置排程'}
                </button>
              </div>
              {showScheduler && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    选择发布时间（至少 5 分钟后）
                  </p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="pt-4 border-t flex justify-between items-center">
              <button
                onClick={() => saveDraftMutation.mutate()}
                disabled={!content.trim() || saveDraftMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {saveDraftMutation.isPending ? '保存中...' : '保存草稿'}
              </button>

              <div className="flex gap-2">
                {showScheduler && scheduledAt ? (
                  <button
                    onClick={() => scheduleMutation.mutate()}
                    disabled={
                      !content.trim() ||
                      selectedPlatforms.length === 0 ||
                      !scheduledAt ||
                      scheduleMutation.isPending
                    }
                    className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {scheduleMutation.isPending ? '排程中...' : '排程发布'}
                  </button>
                ) : (
                  <button
                    onClick={() => publishMutation.mutate()}
                    disabled={
                      !content.trim() ||
                      selectedPlatforms.length === 0 ||
                      publishMutation.isPending
                    }
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {publishMutation.isPending ? '发布中...' : '立即发布'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览 */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              分割预览
              {isPreviewLoading && (
                <span className="ml-2 text-sm text-gray-500">加载中...</span>
              )}
            </h3>

            {splitPreviews.length === 0 ? (
              <div className="text-gray-500 text-sm">
                选择平台并输入内容后，将显示各平台的分割预览
              </div>
            ) : (
              <div className="space-y-4">
                {splitPreviews.map((preview) => {
                  const platform = PLATFORMS.find((p) => p.id === preview.platform);
                  return (
                    <div key={preview.platform} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{platform?.icon}</span>
                          <span className="font-medium">{platform?.name}</span>
                        </div>
                        {preview.needsSplitting && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            将分割为 {preview.chunks.length} 条
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {preview.chunks.map((chunk, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap"
                          >
                            {chunk}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 使用提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">使用提示</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Twitter 限制 280 字符（中文算 2 字符）</li>
              <li>• Threads 限制 500 字符</li>
              <li>• Instagram 限制 2,200 字符（需要图片）</li>
              <li>• Facebook 限制 63,206 字符</li>
              <li>• 超出限制的内容将自动分割成多条</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
