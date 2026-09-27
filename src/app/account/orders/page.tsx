import { requireUser } from '@/lib/server';
import { Orders } from '@/features/orders';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <>
      <Heading title="주문 내역" />
      <Orders />
    </>
  );
}
