import { requireUser } from '@/lib/server';
import { Heading } from '@/components/ui';
import { Cart } from '@/features/cart';
export const metadata = {
  title: '장바구니',
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <div className="container page">
      <Heading
        title="장바구니"
        eyebrow="Your collection"
        description="좋아하는 것들을 한곳에 모았어요."
      />
      <Cart />
    </div>
  );
}
