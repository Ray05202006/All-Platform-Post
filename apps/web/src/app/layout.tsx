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
      <head>
        {/* GitHub Pages SPA routing: restore path encoded by 404.html */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var p = window.location.search.match(/[?&]p=([^&]*)/);
  if (p) {
    var path = decodeURIComponent(p[1].replace(/~and~/g, '&'));
    var q = window.location.search.match(/[?&]q=([^&]*)/);
    var query = q ? '?' + decodeURIComponent(q[1].replace(/~and~/g, '&')) : '';
    window.history.replaceState(null, null,
      window.location.pathname.slice(0, window.location.pathname.indexOf('/', 1) + 1) +
      path + query + window.location.hash
    );
  }
})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
