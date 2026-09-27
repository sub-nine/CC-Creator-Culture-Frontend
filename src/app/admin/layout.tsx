import { requireUser } from '@/lib/server';
import { SideNav } from '@/components/client-ui';
export const metadata = {
  title: '운영 콘솔',
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(['MANAGER', 'MASTER']);
  const items: [string, string][] = [
    ['/admin/creators', '창작자 승인'],
    ['/admin/products', '상품 관리'],
    ['/admin/categories', '카테고리와 태그'],
    ['/admin/coupons', '쿠폰 관리'],
    ['/admin/orders', '주문 조회'],
  ];
  if (user.role === 'MASTER') items.push(['/admin/managers', '운영자 계정']);
  return (
    <div className="container page workspace">
      <aside className="sidebar">
        <span className="eyebrow">CC administration</span>
        <h2>운영 콘솔</h2>
        <SideNav items={items} />
      </aside>
      <div className="workspace-main">{children}</div>
    </div>
  );
}
