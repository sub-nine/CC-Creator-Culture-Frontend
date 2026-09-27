import { requireUser } from '@/lib/server';
import { Heading } from '@/components/ui';
import { Checkout } from '@/features/checkout';
export const metadata = {
  title: '주문서',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
  const user = await requireUser(['CUSTOMER']);
  const { items } = await searchParams;
  return (
    <div className="container page">
      <nav className="stepper">
        <span>장바구니</span>
        <span>→</span>
        <span className="current">주문서</span>
        <span>→</span>
        <span>모의 결제</span>
      </nav>
      <Heading
        title="주문서"
        description="배송지와 상품별 쿠폰을 확인해 주세요."
      />
      <Checkout
        ids={[...new Set((items ?? '').split(',').filter(Boolean))]}
        user={user}
      />
    </div>
  );
}
