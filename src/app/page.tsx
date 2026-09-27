import Image, { getImageProps } from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Palette,
  Ticket,
  Heart,
  PackageCheck,
} from 'lucide-react';
import { safeGateway } from '@/lib/server';
import type { Page, Product, Leaderboard } from '@/lib/types';
import { ProductCard, SectionHeading, State, Banner } from '@/components/ui';
export default async function Home() {
  const [products, trend] = await Promise.all([
    safeGateway<Page<Product>>('products?size=10&sort=createdAt,desc'),
    safeGateway<Leaderboard>('leaderboards/categories?period=WEEKLY&limit=10'),
  ]);
  const common = {
    alt: '따뜻한 석재 위에 놓인 창작 오브제 컬렉션',
    sizes: '(max-width:767px) 85vw, (max-width:1199px) 55vw, 640px',
    fetchPriority: 'high' as const,
  };
  const { props: desktop } = getImageProps({
    ...common,
    src: '/images/brand/home-desktop.png',
    width: 1672,
    height: 941,
  });
  const { props: mobile } = getImageProps({
    ...common,
    src: '/images/brand/home-mobile.png',
    width: 1122,
    height: 1402,
  });
  return (
    <div className="container storefront">
      <div className="promotion-grid" aria-label="CC 컬렉션 소개">
        <section className="hero">
          <picture>
            <source media="(max-width:767px)" srcSet={mobile.srcSet} />
            <img {...desktop} alt={common.alt} />
          </picture>
          <div className="hero-copy">
            <span className="eyebrow">Objects with a story</span>
            <h1>
              취향을 발견하고,
              <br />
              좋아하는 것을 가까이.
            </h1>
            <p>
              창작자의 작은 세계가
              <br />
              당신의 일상에 닿는 순간.
            </p>
            <Link href="/products" className="button">
              나의 취향 찾기 <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <Link href="/trends" className="promotion-card promotion-trend">
          <div>
            <span className="eyebrow">Weekly collection</span>
            <h2>
              지금 마음이 가는
              <br />
              작은 발견들
            </h2>
            <p>이번 주의 취향을 만나보세요</p>
            <span className="promotion-link">
              주간 트렌드 <ArrowUpRight size={16} />
            </span>
          </div>
          <Image
            src="/images/brand/trend-banner.png"
            width={2172}
            height={724}
            alt=""
            sizes="(max-width:767px) 80vw,320px"
          />
        </Link>
        <Link href="/coupons" className="promotion-card promotion-coupon">
          <div>
            <span className="eyebrow">A little extra joy</span>
            <h2>
              좋아하는 마음에
              <br />
              작은 혜택을 더해요
            </h2>
            <p>내 취향을 담을 때, CC 쿠폰</p>
            <span className="promotion-link">
              혜택 둘러보기 <ArrowUpRight size={16} />
            </span>
          </div>
          <Image
            src="/images/brand/empty-state.png"
            width={1254}
            height={1254}
            alt=""
            sizes="(max-width:767px) 80vw,320px"
          />
        </Link>
      </div>
      <nav className="quick-links" aria-label="쇼핑 바로가기">
        {[
          {
            href: '/products?sort=createdAt,desc',
            label: '신상품',
            Icon: Sparkles,
            tone: 'dark',
          },
          {
            href: '/trends',
            label: '주간 트렌드',
            Icon: TrendingUp,
            tone: 'lavender',
          },
          { href: '/creators', label: '창작자', Icon: Palette, tone: 'cream' },
          { href: '/coupons', label: '쿠폰 혜택', Icon: Ticket, tone: 'lime' },
          {
            href: '/account/wishlist',
            label: '찜한 상품',
            Icon: Heart,
            tone: 'pink',
          },
          {
            href: '/account/orders',
            label: '주문 내역',
            Icon: PackageCheck,
            tone: 'cream',
          },
        ].map(({ href, label, Icon, tone }) => (
          <Link key={href} href={href}>
            <span className={`quick-icon ${tone}`}>
              <Icon size={27} strokeWidth={1.4} />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <section className="section">
        <SectionHeading
          title="새롭게 만나는 취향"
          description="창작자의 이야기가 담긴 새로운 상품을 둘러보세요."
          href="/products"
        />
        {products.data?.content.length ? (
          <div className="product-grid">
            {products.data.content.slice(0, 8).map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        ) : (
          <State error={products.error} compact />
        )}
      </section>
      <section className="section">
        <SectionHeading
          title="이번 주, 마음이 모인 곳"
          description="많은 관심을 받은 카테고리에서 취향을 발견해 보세요."
          href="/trends"
          label="트렌드 보기"
        />
        <div className="trend-layout">
          <div className="trend-intro">
            <div className="copy">
              <span className="eyebrow">Weekly collection</span>
              <h2>
                지금 우리를 설레게 하는
                <br />
                작은 발견들.
              </h2>
              <Link href="/trends" className="button secondary trend-cta">
                주간 트렌드 살펴보기
                <ArrowRight size={16} />
              </Link>
            </div>
            <Image
              src="/images/brand/trend-banner.png"
              width={2172}
              height={724}
              alt=""
              sizes="(max-width:767px) 100vw,600px"
            />
          </div>
          <div>
            {trend.data?.items.length ? (
              <div className="rank-list">
                {trend.data.items.slice(0, 5).map((item) => (
                  <Link
                    key={item.targetId}
                    href={`/products?keyword=${encodeURIComponent(item.name)}`}
                    className="rank-item"
                  >
                    <span className="rank">{item.ranking}</span>
                    <span>{item.name}</span>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
              </div>
            ) : (
              <State
                error={trend.error}
                title="이번 주 트렌드가 아직 없어요"
                description="관심이 모이면 주간 순위에서 확인할 수 있어요."
                compact
              />
            )}
          </div>
        </div>
      </section>
      <section className="section">
        <Banner kind="coupon" />
      </section>
      <section className="section panel">
        <div className="row between">
          <div className="stack-sm">
            <span className="eyebrow">Made by creators</span>
            <h2>물건 너머의 이야기를 만나요.</h2>
            <p className="muted">저마다의 시선으로 일상을 만드는 창작자들.</p>
          </div>
          <Link href="/creators" className="button secondary">
            창작자 만나기 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
