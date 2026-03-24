'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Platform, PLATFORM_LIMITS, SplitResult } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PLATFORMS: { id: Platform; name: string; icon: string; maxLength: number }[] = [
  { id: 'facebook', name: 'Facebook', icon: 'FB', maxLength: PLATFORM_LIMITS.facebook },
  { id: 'instagram', name: 'Instagram', icon: 'IG', maxLength: PLATFORM_LIMITS.instagram },
  { id: 'twitter', name: 'Twitter', icon: 'X', maxLength: PLATFORM_LIMITS.twitter },
  { id: 'threads', name: 'Threads', icon: 'TH', maxLength: PLATFORM_LIMITS.threads },
];

interface Connection {
  platform: string;
  platformUsername?: string;
  isActive: boolean;
}

interface MediaFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function DashboardPage() {
  const { data: _session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [splitPreviews, setSplitPreviews] = useState<SplitResult[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch<Connection[]>('/auth/connections').then(setConnections).catch(console.error);
  }, []);

  const isConnected = (platform: string) =>
    connections.some((c) => c.platform === platform && c.isActive);

  const connectedPlatforms = PLATFORMS.filter((p) => isConnected(p.id));
  const unconnectedPlatforms = PLATFORMS.filter((p) => !isConnected(p.id));

  const getCharCount = (text: string, platform: Platform): number => {
    if (platform === 'twitter') {
      const isCJK = (code: number) =>
        (code >= 0x1100 && code <= 0x11ff) ||
        (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xac00 && code <= 0xd7af) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff00 && code <= 0xffef) ||
        (code >= 0x20000 && code <= 0x2fa1f);
      const urls = text.match(/https?:\/\/\S+/g) || [];
      let textWithoutUrls = text;
      urls.forEach((url) => (textWithoutUrls = textWithoutUrls.replace(url, '')));
      let length = urls.length * 23;
      for (const char of textWithoutUrls) {
        length += isCJK(char.codePointAt(0)!) ? 2 : 1;
      }
      return length;
    }
    return text.length;
  };

  const previewSplit = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      setSplitPreviews([]);
      return;
    }
    setIsPreviewLoading(true);
    try {
      const results = await apiFetch<SplitResult[]>('/posts/preview-split', {
        method: 'POST',
        body: JSON.stringify({ content, platforms: selectedPlatforms }),
      });
      setSplitPreviews(results);
    } catch (error) {
      console.error('Preview split error:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [content, selectedPlatforms]);

  useEffect(() => {
    const timer = setTimeout(previewSplit, 500);
    return () => clearTimeout(timer);
  }, [previewSplit]);

  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const getMediaType = (): 'image' | 'video' | undefined => {
    if (mediaFiles.length === 0) return undefined;
    if (mediaFiles.every((f) => f.mimetype.startsWith('video/'))) return 'video';
    if (mediaFiles.every((f) => f.mimetype.startsWith('image/'))) return 'image';
    return undefined;
  };

  const handlePublish = async () => {
    const mediaType = getMediaType();
    if (mediaFiles.length > 0 && !mediaType) {
      alert('Cannot mix image and video uploads.');
      return;
    }
    setIsPublishing(true);
    try {
      const post = await apiFetch<{ id: string }>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          mediaUrls: mediaFiles.map((f) => f.url),
          mediaType,
        }),
      });
      await apiFetch(`/posts/${post.id}/publish`, { method: 'POST' });
      alert('Published successfully!');
      resetForm();
    } catch (error) {
      alert(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    const mediaType = getMediaType();
    if (mediaFiles.length > 0 && !mediaType) {
      alert('Cannot mix image and video uploads.');
      return;
    }
    setIsScheduling(true);
    try {
      await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          mediaUrls: mediaFiles.map((f) => f.url),
          mediaType,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      alert('Scheduled successfully!');
      resetForm();
    } catch (error) {
      alert(`Schedule failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSaveDraft = async () => {
    const mediaType = getMediaType();
    if (mediaFiles.length > 0 && !mediaType) {
      alert('Cannot mix image and video uploads.');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          mediaUrls: mediaFiles.map((f) => f.url),
          mediaType,
        }),
      });
      alert('Draft saved!');
    } catch (error) {
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const res = await fetch(`${API_URL}/api/media/upload-multiple`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message);
      }
      const result = await res.json();
      setMediaFiles((prev) => [...prev, ...result.files]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = async (index: number) => {
    const file = mediaFiles[index];
    try {
      await apiFetch(`/media/${file.filename}`, { method: 'DELETE' });
      setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    } catch {
      alert('Failed to delete media file.');
    }
  };

  const resetForm = () => {
    setContent('');
    setSelectedPlatforms([]);
    setSplitPreviews([]);
    setMediaFiles([]);
    setScheduledAt('');
    setShowScheduler(false);
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Post Editor</h2>
        <p className="mt-1 text-sm text-gray-500">Create and publish to multiple platforms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Write your post content..."
              />
              <div className="mt-1 text-sm text-gray-500">
                {selectedPlatforms.map((p) => {
                  const platform = PLATFORMS.find((pl) => pl.id === p);
                  const count = getCharCount(content, p);
                  const isOver = count > (platform?.maxLength || 0);
                  return (
                    <span key={p} className={`mr-3 ${isOver ? 'text-red-500 font-medium' : ''}`}>
                      {platform?.icon} {count}/{platform?.maxLength}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
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
                      <span className="text-sm font-medium text-gray-600">{platform.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                  No platforms connected.{' '}
                  <Link href="/dashboard/settings" className="text-yellow-800 underline">
                    Connect platforms
                  </Link>
                </div>
              )}
              {unconnectedPlatforms.length > 0 && connectedPlatforms.length > 0 && (
                <div className="mt-3 text-sm text-gray-500">
                  Not connected: {unconnectedPlatforms.map((p) => p.name).join(', ')}{' '}
                  <Link href="/dashboard/settings" className="text-blue-600">
                    Connect more
                  </Link>
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
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
                          src={`${API_URL}/uploads/media/${file.filename}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                          V
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      x
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
              <p className="text-xs text-gray-500">JPG, PNG, GIF, MP4 supported. Max 100MB.</p>
            </div>

            {/* Schedule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Schedule</label>
                <button
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showScheduler ? 'Cancel schedule' : 'Set schedule'}
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
                  <p className="mt-1 text-xs text-gray-500">Must be at least 5 minutes from now</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t flex justify-between items-center">
              <button
                onClick={handleSaveDraft}
                disabled={!content.trim() || isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <div className="flex gap-2">
                {showScheduler && scheduledAt ? (
                  <button
                    onClick={handleSchedule}
                    disabled={!content.trim() || selectedPlatforms.length === 0 || !scheduledAt || isScheduling}
                    className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isScheduling ? 'Scheduling...' : 'Schedule'}
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    disabled={!content.trim() || selectedPlatforms.length === 0 || isPublishing}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Split Preview
              {isPreviewLoading && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
            </h3>
            {splitPreviews.length === 0 ? (
              <div className="text-gray-500 text-sm">
                Select platforms and enter content to see split preview
              </div>
            ) : (
              <div className="space-y-4">
                {splitPreviews.map((preview) => {
                  const platform = PLATFORMS.find((p) => p.id === preview.platform);
                  return (
                    <div key={preview.platform} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-gray-500">{platform?.icon}</span>
                          <span className="font-medium">{platform?.name}</span>
                        </div>
                        {preview.needsSplitting && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Will split into {preview.chunks.length} posts
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {preview.chunks.map((chunk, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Platform Limits</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>Twitter: 280 chars (CJK = 2 chars each)</li>
              <li>Threads: 500 chars</li>
              <li>Instagram: 2,200 chars (requires image)</li>
              <li>Facebook: 63,206 chars</li>
              <li>Content exceeding limits will be auto-split</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
