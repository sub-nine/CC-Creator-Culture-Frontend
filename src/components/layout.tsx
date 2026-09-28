import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  ArrowUpRight,
} from 'lucide-react';
import { currentUser, safeGateway } from '@/lib/server';
import type { Category, Page } from '@/lib/types';
import { StoreNavigation } from './store-navigation';
export async function Header() {
  const user = await currentUser().catch(() => null);
  const categoryResponse = await safeGateway<Page<Category>>(
    'categories?size=30&page=0',
  );
  const categoryLinks = (categoryResponse.data?.content ?? [])
    .slice(0, 18)
    .map((category) => ({
      href: `/products?keyword=${encodeURIComponent(category.name)}`,
      label: category.name,
    }));
  const workspace =
    user?.role === 'CREATOR'
      ? { href: '/studio/products', label: '창작자 센터' }
      : ['MASTER', 'MANAGER'].includes(user?.role ?? '')
        ? { href: '/admin/orders', label: '운영 콘솔' }
        : { href: '/signup?kind=creator', label: '창작자로 함께하기' };
  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 바로가기
      </a>
      <div className="top-note">
        <Link href="/creators">
          당신의 취향과 창작자의 이야기가 만나는 곳 <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <div className="container">
          <div className="header-utility">
            <span>작은 취향이 모이는 곳, CC</span>
            <div>
              <Link href={workspace.href}>{workspace.label}</Link>
              <Link href={user ? '/account/profile' : '/login'}>
                {user ? '내 정보' : '로그인'}
              </Link>
              {!user && <Link href="/signup">회원가입</Link>}
            </div>
          </div>
          <div className="header-main">
            <Link href="/" className="wordmark" aria-label="CC 홈">
              cc
              <span>
                CREATORS
                <br />
                COLLECTION
              </span>
            </Link>
            <form action="/products" className="search">
              <input
                name="keyword"
                placeholder="어떤 취향을 찾고 있나요?"
                aria-label="상품 검색"
                maxLength={100}
              />
              <button aria-label="검색">
                <Search size={20} strokeWidth={1.5} />
              </button>
            </form>
            <div className="header-actions">
              <Link href="/account/wishlist">
                <Heart size={22} strokeWidth={1.5} />
                <span>찜</span>
              </Link>
              <Link href="/cart">
                <ShoppingBag size={22} strokeWidth={1.5} />
                <span>장바구니</span>
              </Link>
              <Link href={user ? '/account/profile' : '/login'}>
                <UserRound size={22} strokeWidth={1.5} />
                <span>{user ? '마이페이지' : '로그인'}</span>
              </Link>
            </div>
          </div>
          <StoreNavigation
            workspaceHref={workspace.href}
            workspaceLabel={workspace.label}
            categories={categoryLinks}
          />
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="wordmark">
            cc
            <span>
              CREATORS
              <br />
              COLLECTION
            </span>
          </Link>
          <p>취향을 발견하고, 좋아하는 것을 가까이.</p>
          <p>창작자의 이야기가 일상이 되는 곳.</p>
        </div>
        <nav className="footer-column" aria-label="상점 안내">
          <h3>CC 둘러보기</h3>
          <Link href="/products">상품 탐색</Link>
          <Link href="/trends">주간 트렌드</Link>
          <Link href="/creators">창작자 만나기</Link>
        </nav>
        <nav className="footer-column" aria-label="쇼핑 안내">
          <h3>나의 쇼핑</h3>
          <Link href="/account/orders">내 주문</Link>
          <Link href="/account/wishlist">찜한 상품</Link>
          <Link href="/coupons">쿠폰 혜택</Link>
        </nav>
        <nav className="footer-column" aria-label="창작자 안내">
          <h3>함께 만드는 CC</h3>
          <Link href="/signup?kind=creator">
            창작자 가입 <ArrowUpRight size={13} />
          </Link>
          <Link href="/studio">창작자 센터</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <p>각 창작자의 상품 정보와 구매 조건을 확인해 주세요.</p>
        <p>© CC Creators Collection</p>
      </div>
    </footer>
  );
}
