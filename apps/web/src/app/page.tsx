'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      // Validate token - if valid go to dashboard, else login
      api.getCurrentUser()
        .then(() => router.replace('/dashboard'))
        .catch(() => {
          api.clearToken();
          router.replace('/login');
        });
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
