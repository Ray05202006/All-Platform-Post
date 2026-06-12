export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/api/posts/:path*', '/api/connections/:path*', '/api/media/:path*'],
};
