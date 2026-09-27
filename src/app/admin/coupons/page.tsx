import { Heading } from '@/components/ui';
import { AdminCoupons } from '@/features/admin';
export default function Page() {
  return (
    <>
      <Heading title="쿠폰 관리" />
      <AdminCoupons />
    </>
  );
}
