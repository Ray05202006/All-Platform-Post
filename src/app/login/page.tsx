'use client';

import { useEffect, useState, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginCard } from '@/components/auth/login-card';
import { LoadingState } from '@/components/loading-state';

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: 'Error starting sign in flow.',
  OAuthCallback: 'Error during OAuth callback.',
  OAuthAccountNotLinked: 'This email is already linked to another account.',
  Default: 'An error occurred during sign in.',
};

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsStaging(
        window.location.hostname.includes('staging') ||
        window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1')
      );
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setLoginError(ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    setLoginError(null);
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleBypassLogin = () => {
    setLoginError(null);
    signIn('credentials', { email: 'ray95@gmail.com', callbackUrl: '/dashboard' });
  };

  return (
    <LoginCard
      error={loginError}
      onGoogleLogin={handleGoogleLogin}
      onBypassLogin={handleBypassLogin}
      isStaging={isStaging}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <LoginContent />
    </Suspense>
  );
}
