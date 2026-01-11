/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@all-platform-post/shared', '@all-platform-post/text-splitter'],

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:3001',
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.zeabur.app' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
