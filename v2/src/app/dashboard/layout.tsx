'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { LoadingState } from '@/components/loading-state';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LoadingState variant="page" />;
  }

  if (!session) return null;

  return (
    <AppShell
      user={session.user}
      onSignOut={() => signOut({ callbackUrl: '/login' })}
    >
      {children}
    </AppShell>
  );
}
