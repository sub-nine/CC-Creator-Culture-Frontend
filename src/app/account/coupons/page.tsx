import { requireUser } from '@/lib/server';
import { Coupons } from '@/features/coupons';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <>
      <Heading title="내 쿠폰" />
      <Coupons owned />
    </>
  );
}
