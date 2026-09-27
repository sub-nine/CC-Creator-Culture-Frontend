import { Heading } from '@/components/ui';
import { Orders } from '@/features/orders';
export default function Page() {
  return (
    <>
      <Heading
        title="주문과 배송"
        description="주문 상품별로 준비와 배송 상태를 관리해 주세요."
      />
      <Orders mode="creator" />
    </>
  );
}
