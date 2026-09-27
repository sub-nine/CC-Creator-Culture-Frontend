import Link from 'next/link';
import { safeGateway } from '@/lib/server';
import { Heading, ProductCard, State } from '@/components/ui';
import { Search, ArrowUpRight } from 'lucide-react';
import { pageIndex, hasNext } from '@/lib/utils';
import type { Page, Product } from '@/lib/types';
export const metadata = { title: '상품 탐색' };
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; page?: string; sort?: string }>;
}) {
  const s = await searchParams;
  const page = pageIndex(s.page);
  const keyword = (s.keyword ?? '').slice(0, 100);
  const sort = ['createdAt,desc', 'name,asc'].includes(s.sort ?? '')
    ? s.sort!
    : 'createdAt,desc';
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    size: '12',
    sort,
  });
  const { data, error } = await safeGateway<Page<Product>>(
    `products?${params}`,
  );
  const href = (p: number) =>
    `/products?${new URLSearchParams({ keyword, page: String(p), sort })}`;
  return (
    <div className="container page catalogue">
      <nav className="breadcrumbs" aria-label="현재 위치">
        <Link href="/">홈</Link>
        <span>/</span>
        <span>상품 탐색</span>
      </nav>
      <Heading
        title={keyword ? `“${keyword}” 검색 결과` : '상품 탐색'}
        description="창작자의 개성이 담긴 물건, 나만의 취향을 찾아보세요."
      />
      <nav className="catalogue-tabs" aria-label="탐색 메뉴">
        <Link className="active" aria-current="page" href="/products">
          전체 상품
        </Link>
        <Link href="/trends">
          주간 트렌드 <ArrowUpRight size={14} />
        </Link>
        <Link href="/creators">
          창작자별로 둘러보기 <ArrowUpRight size={14} />
        </Link>
      </nav>
      <div className="catalogue-toolbar">
        <p className="result-count">
          {data?.totalElements != null ? (
            <>
              전체 <strong>{data.totalElements.toLocaleString('ko-KR')}</strong>
              개
            </>
          ) : (
            '상품 목록'
          )}
        </p>
        <form action="/products" className="catalogue-search">
          <div className="search-field">
            <input
              name="keyword"
              defaultValue={keyword}
              placeholder="상품 이름으로 검색해 보세요"
              aria-label="상품 검색어"
              maxLength={100}
            />
            <button className="icon-button" aria-label="검색">
              <Search size={18} />
            </button>
          </div>
          <select name="sort" defaultValue={sort} aria-label="정렬">
            <option value="createdAt,desc">최신 등록순</option>
            <option value="name,asc">상품명순</option>
          </select>
          <button className="button secondary" type="submit">
            적용
          </button>
        </form>
      </div>
      {keyword && (
        <div className="search-summary">
          <span>
            검색어 <strong>{keyword}</strong>
          </span>
          <Link href="/products">검색 초기화 ×</Link>
        </div>
      )}
      {data?.content.length ? (
        <>
          <div className="product-grid">
            {data.content.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
          <nav className="pagination" aria-label="페이지 선택">
            {page > 0 && (
              <Link className="button secondary" href={href(page - 1)}>
                이전
              </Link>
            )}
            <span>{page + 1} 페이지</span>
            {hasNext(data, page) && (
              <Link className="button secondary" href={href(page + 1)}>
                다음
              </Link>
            )}
          </nav>
        </>
      ) : (
        <State
          error={error}
          title={keyword ? '검색 결과가 없어요' : '아직 등록된 상품이 없어요'}
          description="다른 검색어로 다시 찾아보세요."
        />
      )}
    </div>
  );
}
