import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from '@/components/providers';
import { Header, Footer } from '@/components/layout';
import './globals.css';
const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '100 900',
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000'),
  title: {
    default: 'CC | 취향을 발견하는 창작 굿즈 편집숍',
    template: '%s | CC',
  },
  description:
    '당신의 취향과 창작자의 이야기가 만나는 곳. 독립 창작 굿즈를 발견하고 좋아하는 것을 가까이 두세요.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'CC',
    images: [
      { url: '/images/brand/og-background.png', width: 1731, height: 909 },
    ],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={pretendard.variable}>
        <Providers>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
