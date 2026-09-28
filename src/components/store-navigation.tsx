'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
const links = [
  ['/products', '상품 탐색'],
  ['/trends', '주간 트렌드'],
  ['/creators', '창작자'],
  ['/coupons', '쿠폰 혜택'],
];
const searchHref = (keyword: string) =>
  `/products?keyword=${encodeURIComponent(keyword)}`;
const fallbackCategories = [
  {
    title: '문구 / 아트',
    items: [
      { href: searchHref('노트'), label: '노트' },
      { href: searchHref('스티커'), label: '스티커' },
      { href: searchHref('아트 프린트'), label: '아트 프린트' },
    ],
  },
  {
    title: '패션 / 패브릭',
    items: [
      { href: searchHref('캔버스 백'), label: '캔버스 백' },
      { href: searchHref('파우치'), label: '파우치' },
      { href: searchHref('쿠션'), label: '쿠션' },
    ],
  },
  {
    title: '리빙',
    items: [
      { href: searchHref('머그'), label: '머그' },
      { href: searchHref('트레이'), label: '트레이' },
      { href: searchHref('화병'), label: '화병' },
    ],
  },
  {
    title: '오브제 / 소품',
    items: [
      { href: searchHref('문진'), label: '문진' },
      { href: searchHref('키링'), label: '키링' },
      { href: searchHref('인센스 홀더'), label: '인센스 홀더' },
    ],
  },
];
const collections = [
  {
    label: '가방 끝의 반짝임',
    description: '작지만 확실한 취향',
    keyword: '키링',
    image: 'star-keyring',
    tone: 'pink',
  },
  {
    label: '일상에 초록 한 조각',
    description: '산책을 함께하는 가방',
    keyword: '캔버스 백',
    image: 'garden-tote',
    tone: 'green',
  },
  {
    label: '손끝에 남는 기록',
    description: '오늘을 담는 문구',
    keyword: '노트',
    image: 'daily-notebook',
    tone: 'lavender',
  },
  {
    label: '나만의 홈카페',
    description: '느긋한 아침의 시작',
    keyword: '머그',
    image: 'cloud-mug',
    tone: 'cream',
  },
];
export function StoreNavigation({
  workspaceHref,
  workspaceLabel,
  categories,
}: {
  workspaceHref: string;
  workspaceLabel: string;
  categories: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const visibleCategories = categories.slice(0, 16);
  const hasMoreCategories = categories.length > visibleCategories.length;
  const categoryGroups = categories.length
    ? [
        {
          title: '카테고리',
          items: [
            ...visibleCategories,
            ...(hasMoreCategories
              ? [{ href: '/products', label: '전체 카테고리 →' }]
              : []),
          ],
        },
      ]
    : fallbackCategories;
  return (
    <nav className="navigation" aria-label="주요 메뉴">
      <details
        ref={menu}
        className="browse-menu"
        onPointerEnter={(e) => {
          if (
            e.pointerType === 'mouse' &&
            window.matchMedia('(hover: hover) and (pointer: fine)').matches
          )
            e.currentTarget.open = true;
        }}
        onPointerLeave={(e) => {
          if (
            e.pointerType === 'mouse' &&
            !e.currentTarget.contains(document.activeElement)
          )
            e.currentTarget.open = false;
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            e.currentTarget.open = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && menu.current) {
            e.preventDefault();
            menu.current.open = false;
            menu.current.querySelector('summary')?.focus();
          }
        }}
      >
        <summary>
          <Menu size={18} /> 전체 메뉴
        </summary>
        <div
          className="browse-popover"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a') && menu.current)
              menu.current.open = false;
          }}
        >
          <div className="container browse-content">
            <div className="browse-columns">
              <section className="browse-column">
                <h3>취향 둘러보기</h3>
                {links.map(([href, label]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </section>
              {categoryGroups.map(({ title, items }) => (
                <section className="browse-column browse-category-column" key={title}>
                  <h3>{title}</h3>
                  <div className="browse-category-grid">
                    {items.map((item) => (
                      <Link key={item.href} href={item.href}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              <section className="browse-column">
                <h3>나의 쇼핑</h3>
                <Link href="/account/wishlist">찜한 상품</Link>
                <Link href="/cart">장바구니</Link>
                <Link href="/account/orders">주문 내역</Link>
                <Link href="/account/coupons">내 쿠폰</Link>
              </section>
            </div>
            <div className="browse-collections">
              {collections.map(
                ({ label, description, keyword, image, tone }) => (
                  <Link
                    className={`browse-promo ${tone}`}
                    href={searchHref(keyword)}
                    key={keyword}
                  >
                    <div>
                      <span>{description}</span>
                      <strong>{label}</strong>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </div>
                    <Image
                      src={`/images/catalog/${image}.png`}
                      alt=""
                      width={240}
                      height={240}
                      sizes="(max-width:767px) 120px,160px"
                    />
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      </details>
      <div className="nav-links">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || pathname.startsWith(`${href}/`)
                ? 'page'
                : undefined
            }
          >
            {label}
            {href === '/coupons' && (
              <span className="nav-dot" aria-hidden="true" />
            )}
          </Link>
        ))}
      </div>
      <Link className="end" href={workspaceHref}>
        {workspaceLabel}
        <ArrowUpRight size={14} />
      </Link>
    </nav>
  );
}
