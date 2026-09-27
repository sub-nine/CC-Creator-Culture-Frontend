import { requireUser } from '@/lib/server';
import { OrderDetail } from '@/features/orders';
import { Heading } from '@/components/ui';
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requireUser(['CUSTOMER']);
  const { number } = await params;
  return (
    <>
      <Heading title="주문 상세" />
      <OrderDetail number={number} />
    </>
  );
}
