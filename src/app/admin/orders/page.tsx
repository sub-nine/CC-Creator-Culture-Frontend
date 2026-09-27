import { Heading } from '@/components/ui';
import { Orders } from '@/features/orders';
export default function Page() {
  return (
    <>
      <Heading
        title="주문 조회"
        description="주문 상태와 결제 내역을 확인할 수 있어요."
      />
      <Orders mode="admin" />
    </>
  );
}
