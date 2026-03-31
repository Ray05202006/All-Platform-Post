'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'facebook', name: 'Facebook', description: 'Publish to Facebook Pages', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', description: 'Publish to Instagram Business', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'twitter', name: 'Twitter / X', description: 'Publish tweets and threads', color: 'bg-black' },
  { id: 'threads', name: 'Threads', description: 'Publish to Threads', color: 'bg-gray-900' },
];

interface Connection {
  id: string;
  platform: string;
  platformUsername?: string;
  isActive: boolean;
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

function SettingsContent() {
  const { data: _session } = useSession();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setNotification({ type: 'success', message: `Successfully connected ${connected}!` });
      fetchConnections();
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (error) {
      setNotification({ type: 'error', message: `Connection failed: ${error.replace(/_/g, ' ')}` });
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [searchParams]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Connection[]>('/connections');
      setConnections(data);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = (platformId: string) =>
    connections.some((c) => c.platform === platformId && c.isActive);

  const getConnection = (platformId: string) =>
    connections.find((c) => c.platform === platformId);

  const handleConnect = (platformId: string) => {
    window.location.href = `/api/oauth/${platformId}`;
  };

  const handleDisconnect = async (platformId: string) => {
    if (!confirm(`Disconnect ${platformId}?`)) return;
    setIsDisconnecting(true);
    try {
      await apiFetch(`/connections/${platformId}`, { method: 'DELETE' });
      await fetchConnections();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Manage platform connections and account settings</p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Platform Connections</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your social media accounts to enable auto-posting
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="divide-y">
            {PLATFORMS.map((platform) => {
              const connected = isConnected(platform.id);
              const connection = getConnection(platform.id);

              return (
                <div key={platform.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-white text-sm font-bold`}
                    >
                      {platform.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-gray-900">{platform.name}</h4>
                      <p className="text-sm text-gray-500">{platform.description}</p>
                      {connected && connection?.platformUsername && (
                        <p className="text-sm text-green-600 mt-1">
                          Connected: @{connection.platformUsername}
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
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700">Info</h4>
        <div className="mt-2 text-sm text-gray-500 space-y-1">
          <p>API: {API_URL}</p>
          <p>Connected: {connections.filter((c) => c.isActive).length} / {PLATFORMS.length}</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
