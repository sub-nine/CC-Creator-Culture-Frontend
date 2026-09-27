import { requireUser } from '@/lib/server';
import { SideNav } from '@/components/client-ui';
export const metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const items: [string, string][] =
    user.role === 'CUSTOMER'
      ? [
          ['/account/orders', '주문 내역'],
          ['/account/coupons', '내 쿠폰'],
          ['/account/wishlist', '찜한 상품'],
          ['/account/follows', '팔로우한 창작자'],
          ['/account/reviews', '내 후기'],
        ]
      : [];
  return (
    <div className="container page workspace">
      <aside className="sidebar">
        <h2>마이페이지</h2>
        <p className="help">{user.nickname}님, 반가워요.</p>
        <SideNav
          items={[
            ...items,
            ['/account/notifications', '알림'],
            ['/account/profile', '내 정보'],
          ]}
        />
      </aside>
      <div className="workspace-main">{children}</div>
    </div>
  );
}
