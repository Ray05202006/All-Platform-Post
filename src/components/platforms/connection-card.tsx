"use client";

import type { Platform } from "@/lib/types";
import type { PlatformMeta } from "@/lib/platforms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlatformIcon } from "@/components/platforms/platform-icon";

interface ConnectionSummary {
  platform: string;
  isActive: boolean;
  platformUsername?: string;
}

interface ConnectionCardProps {
  platform: PlatformMeta;
  connection?: ConnectionSummary;
  isDisconnecting?: boolean;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}

export function ConnectionCard({
  platform,
  connection,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const isConnected = connection?.isActive;

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <PlatformIcon platform={platform.id} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{platform.name}</h4>
            {isConnected && (
              <Badge variant="secondary" className="text-xs text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
                Connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{platform.description}</p>
          {isConnected && connection?.platformUsername && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              @{connection.platformUsername}
            </p>
          )}
        </div>
      </div>

      {isConnected ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isDisconnecting} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {platform.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                You will no longer be able to post to {platform.name} until you reconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDisconnect(platform.id)}
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" onClick={() => onConnect(platform.id)}>
          Connect
        </Button>
      )}
    </div>
  );
}
