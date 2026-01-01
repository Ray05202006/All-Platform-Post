'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useConnections } from '@/hooks/useConnections';

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    description: '发布到 Facebook 粉丝专页',
    icon: '📘',
    color: 'bg-blue-600',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: '发布到 Instagram 商业帐号',
    icon: '📷',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: '发布推文和串文',
    icon: '🐦',
    color: 'bg-black',
  },
  {
    id: 'threads',
    name: 'Threads',
    description: '发布到 Threads',
    icon: '🧵',
    color: 'bg-gray-900',
  },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">加载中...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    connections,
    isLoading,
    isConnected,
    getConnection,
    connectPlatform,
    disconnectPlatform,
    isDisconnecting,
    refetch,
  } = useConnections();

  // 处理 OAuth 回调通知
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      setNotification({
        type: 'success',
        message: `已成功连接 ${connected}！`,
      });
      refetch();
      // 清除 URL 参数
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (error) {
      setNotification({
        type: 'error',
        message: `连接失败：${error.replace(/_/g, ' ')}`,
      });
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [searchParams, refetch]);

  // 自动隐藏通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnect = (platformId: string) => {
    connectPlatform(platformId);
  };

  const handleDisconnect = (platformId: string) => {
    if (confirm(`确定要断开 ${platformId} 的连接吗？`)) {
      disconnectPlatform(platformId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">设置</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理你的平台连接和账号设置
        </p>
      </div>

      {/* 通知横幅 */}
      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 平台连接卡片 */}
      <div className="bg-white shadow rounded-lg divide-y">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">平台连接</h3>
          <p className="mt-1 text-sm text-gray-500">
            连接你的社交媒体账号以启用自动发文功能
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">加载中...</div>
        ) : (
          <div className="divide-y">
            {PLATFORMS.map((platform) => {
              const connected = isConnected(platform.id);
              const connection = getConnection(platform.id);

              return (
                <div
                  key={platform.id}
                  className="p-6 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-white text-2xl`}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-gray-900">
                        {platform.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {platform.description}
                      </p>
                      {connected && connection?.platformUsername && (
                        <p className="text-sm text-green-600 mt-1">
                          已连接：@{connection.platformUsername}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {connected ? (
                      <button
                        onClick={() => handleDisconnect(platform.id)}
                        disabled={isDisconnecting}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                      >
                        {isDisconnecting ? '断开中...' : '断开连接'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        连接
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* API 配置提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              需要配置 API 密钥
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>在连接平台之前，请确保已在 <code>.env</code> 文件中配置以下内容：</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Facebook/Instagram/Threads</strong>：FACEBOOK_APP_ID 和 FACEBOOK_APP_SECRET
                </li>
                <li>
                  <strong>Twitter</strong>：TWITTER_CLIENT_ID 和 TWITTER_CLIENT_SECRET
                </li>
              </ul>
              <p className="mt-2">
                详细申请步骤请参考{' '}
                <a href="/README.md" className="text-yellow-800 underline">
                  README.md
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 开发者信息 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700">开发者信息</h4>
        <div className="mt-2 text-sm text-gray-500 space-y-1">
          <p>API 地址：{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</p>
          <p>已连接平台：{connections.filter((c) => c.isActive).length} / 4</p>
        </div>
      </div>
    </div>
  );
}
