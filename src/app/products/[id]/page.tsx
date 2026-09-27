import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { currentUser, gateway } from '@/lib/server';
import { ApiError } from '@/lib/api';
import type { ProductDetail } from '@/lib/types';
import { State, SectionHeading } from '@/components/ui';
import { ProductPurchase, ProductReviews } from '@/features/product';
const load = cache(async (id: string) => {
  try {
    return {
      product: await gateway<ProductDetail>(
        `products/${encodeURIComponent(id)}`,
      ),
      error: null,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return {
      product: null,
      error: e instanceof Error ? e.message : '상품을 불러오지 못했어요.',
    };
  }
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { product } = await load(id);
  return {
    title: product?.name ?? '상품 상세',
    description: product?.content.slice(0, 160),
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ product, error }, user] = await Promise.all([
    load(id),
    currentUser().catch(() => null),
  ]);
  return (
    <div className="container page product-detail">
      {product ? (
        <>
          <nav className="breadcrumbs" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href="/products">상품 탐색</Link>
            <span>/</span>
            <span>{product.name}</span>
          </nav>
          <ProductPurchase product={product} signedIn={!!user} />
          <nav className="detail-tabs" aria-label="상품 상세 메뉴">
            <a href="#product-story">상품 정보</a>
            <a href="#product-reviews">구매 후기</a>
          </nav>
          <section id="product-story" className="section product-story">
            <SectionHeading title="상품 이야기" />
            <p className="prose">{product.content}</p>
            <div className="row" style={{ marginTop: 24 }}>
              {product.hashtags.map((tag) => (
                <Link
                  className="badge"
                  href={`/products?keyword=${encodeURIComponent(tag.name)}`}
                  key={tag.hashtagId}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </section>
          <section id="product-reviews" className="section">
            <SectionHeading
              title="구매 후기"
              description="상품을 받아 본 구매자의 이야기를 확인하세요."
            />
            <ProductReviews id={id} />
          </section>
        </>
      ) : (
        <State error={error} />
      )}
    </div>
  );
}
