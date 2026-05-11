'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PLATFORMS } from '@/lib/platforms';
import type { Platform } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { toastApiError } from '@/lib/toast';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionCard } from '@/components/platforms/connection-card';

interface Connection {
  id: string;
  platform: string;
  platformUsername?: string;
  isActive: boolean;
}

function SettingsContent() {
  useSession();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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

  useEffect(() => { fetchConnections(); }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      toast.success(`Successfully connected ${connected}!`);
      fetchConnections();
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, ' ')}`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [searchParams]);

  const handleConnect = (platformId: Platform) => {
    window.location.href = `/api/oauth/${platformId}`;
  };

  const handleDisconnect = async (platformId: Platform) => {
    setIsDisconnecting(true);
    try {
      await apiFetch(`/connections/${platformId}`, { method: 'DELETE' });
      await fetchConnections();
      toast.success(`Disconnected ${platformId}`);
    } catch (err) {
      toastApiError(err, 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getConnection = (platformId: string) =>
    connections.find((c) => c.platform === platformId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage platform connections and account settings"
      />

      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>Connect your social media accounts to enable auto-posting</CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))
          ) : (
            PLATFORMS.map((platform) => (
              <ConnectionCard
                key={platform.id}
                platform={platform}
                connection={getConnection(platform.id)}
                isDisconnecting={isDisconnecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Connected: {connections.filter((c) => c.isActive).length} / {PLATFORMS.length} platforms
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
