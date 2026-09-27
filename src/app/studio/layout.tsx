import { requireUser } from '@/lib/server';
import { SideNav } from '@/components/client-ui';
export const metadata = {
  title: '창작자 센터',
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser(['CREATOR']);
  return (
    <div className="container page workspace">
      <aside className="sidebar">
        <span className="eyebrow">Creator studio</span>
        <h2>창작자 센터</h2>
        <SideNav
          items={[
            ['/studio/products', '상품 관리'],
            ['/studio/orders', '주문과 배송'],
            ['/studio/profile', '창작자 정보'],
            ['/account/profile', '계정 관리'],
          ]}
        />
      </aside>
      <div className="workspace-main">{children}</div>
    </div>
  );
}
