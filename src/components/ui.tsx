import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Retry, ProductPicture } from './client-ui';
import { money, status } from '@/lib/utils';
import type { Product } from '@/lib/types';
export function Heading({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <header className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p className="muted">{description}</p>}
    </header>
  );
}
export function State({
  error,
  title = '아직 상품이 없어요',
  description = '새로운 상품을 준비하고 있어요.',
  compact = false,
}: {
  error?: string | null;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <Image
        src={`/images/brand/${error ? 'error' : 'empty'}-state.png`}
        width={140}
        height={140}
        alt=""
      />
      <h3>{error ? '정보를 불러오지 못했어요' : title}</h3>
      <p>{error ?? description}</p>
      {error ? (
        <Retry />
      ) : (
        <Link className="button secondary" href="/products">
          상품 둘러보기 <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${['CANCELED', 'FAILED', 'EXPIRED', 'INACTIVE', 'SUSPENDED'].includes(value) ? 'neutral' : ''}`}
    >
      {status(value)}
    </span>
  );
}
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link
        className="product-visual"
        href={`/products/${product.productId}`}
        prefetch={false}
        aria-label={`${product.name} 상세 보기`}
      >
        <ProductPicture src={product.imageUrl} name={product.name} />
        {product.quantity === 0 && <span className="sold-out">품절</span>}
        <span className="product-visual-action">
          상품 자세히 보기 <ArrowRight size={15} />
        </span>
      </Link>
      <div className="card-top">
        <span className="creator">{product.creatorName}</span>
        {product.status !== 'ACTIVE' && <Badge value={product.status} />}
      </div>
      <Link href={`/products/${product.productId}`} prefetch={false}>
        <h3>{product.name}</h3>
      </Link>
      <p className="price">{money(product.price)}</p>
      {product.quantity === 0 && <small className="muted">품절</small>}
    </article>
  );
}
export function SectionHeading({
  title,
  description,
  href,
  label = '전체 보기',
}: {
  title: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link href={href}>
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Banner({
  kind,
  showLink = true,
}: {
  kind: 'coupon' | 'trend';
  showLink?: boolean;
}) {
  return (
    <div className="banner">
      <Image
        src={`/images/brand/${kind}-banner.png`}
        width={2172}
        height={724}
        alt=""
        sizes="(max-width:767px) 100vw,1280px"
      />
      <div className="banner-copy">
        <span className="eyebrow">
          {kind === 'coupon' ? 'A little extra joy' : 'Weekly inspiration'}
        </span>
        <h2>
          {kind === 'coupon'
            ? '좋아하는 마음에, 작은 혜택'
            : '이번 주, 마음이 모인 곳'}
        </h2>
        <p>
          {kind === 'coupon'
            ? '취향을 담는 즐거움에 쿠폰을 더해 보세요.'
            : '지금 주목받는 취향을 만나 보세요.'}
        </p>
        {kind === 'coupon' && showLink && (
          <Link className="button secondary" href="/coupons">
            쿠폰 둘러보기 <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
