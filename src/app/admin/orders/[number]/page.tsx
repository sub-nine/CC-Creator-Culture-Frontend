import { Heading } from '@/components/ui';
import { OrderDetail } from '@/features/orders';
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  return (
    <>
      <Heading title="주문 상세" />
      <OrderDetail number={number} admin />
    </>
  );
}
