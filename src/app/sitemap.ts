import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return ['/', '/products', '/creators', '/trends'].map((path) => ({
    url: new URL(path, origin).href,
    changeFrequency: 'daily',
    priority: path === '/' ? 1 : 0.7,
  }));
}
