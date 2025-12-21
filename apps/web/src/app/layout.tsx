import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'All-Platform-Post | 多平台发文系统',
  description: '自建的多平台社交媒体发文系统，支持 Facebook、Instagram、Twitter、Threads',
  keywords: ['社交媒体', '自动发文', 'Facebook', 'Instagram', 'Twitter', 'Threads'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
