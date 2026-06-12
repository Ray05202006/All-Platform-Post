import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'All Platform Post',
  description: 'Multi-platform social media posting system',
};

const isStaging = process.env.NEXT_PUBLIC_APP_URL?.includes('staging');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {isStaging && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-black text-center text-xs font-bold py-1">
            ⚠️ STAGING 測試環境 — 此處變更不影響正式版
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
