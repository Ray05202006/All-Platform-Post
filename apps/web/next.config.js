/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // GitHub Pages deploys to https://Ray05202006.github.io/All-Platform-Post/
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  reactStrictMode: true,
  transpilePackages: ['@all-platform-post/shared', '@all-platform-post/text-splitter'],

  // Required for static export: disable image optimization (not supported in static mode)
  images: {
    unoptimized: true,
  },

  // Environment variables passed to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071',
  },
};

module.exports = nextConfig;
