import { Heading } from '@/components/ui';
import { CreatorOrderDetail } from '@/features/orders';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Heading title="배송 처리" />
      <CreatorOrderDetail id={id} />
    </>
  );
}
