import type { NextConfig } from 'next';
const remotePatterns = (process.env.PRODUCT_IMAGE_ORIGINS ?? '')
  .split(',')
  .filter(Boolean)
  .map((origin) => {
    const url = new URL(origin.trim());
    if (url.protocol !== 'https:')
      throw new Error('Product images require HTTPS');
    return {
      protocol: 'https' as const,
      hostname: url.hostname,
      port: url.port,
      pathname: '/**',
    };
  });
const config: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_PRODUCT_IMAGE_ORIGINS: process.env.PRODUCT_IMAGE_ORIGINS ?? '',
  },
  experimental: { proxyClientMaxBodySize: '30mb' },
  images: { remotePatterns },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
