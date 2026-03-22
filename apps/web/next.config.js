/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@all-platform-post/shared', '@all-platform-post/text-splitter'],

  // Base path for GitHub Pages (repo name as subdirectory)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Asset prefix must match basePath so JS/CSS chunks load from the correct path
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:3001',
  },

  // Static export requires unoptimized images
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
