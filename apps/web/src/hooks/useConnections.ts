'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, PlatformConnection } from '@/lib/api';

export function useConnections() {
  const queryClient = useQueryClient();

  const {
    data: connections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.getConnections(),
  });

  const disconnectMutation = useMutation({
    mutationFn: (platform: string) => api.disconnectPlatform(platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const isConnected = (platform: string): boolean => {
    return connections.some(
      (conn) => conn.platform === platform && conn.isActive
    );
  };

  const getConnection = (platform: string): PlatformConnection | undefined => {
    return connections.find((conn) => conn.platform === platform);
  };

  const connectPlatform = (platform: string) => {
    window.location.href = api.getOAuthUrl(platform);
  };

  return {
    connections,
    isLoading,
    error,
    refetch,
    isConnected,
    getConnection,
    connectPlatform,
    disconnectPlatform: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
