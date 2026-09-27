import { Heading } from '@/components/ui';
import { AdminProducts } from '@/features/admin';
export default function Page() {
  return (
    <>
      <Heading title="상품 관리" />
      <AdminProducts />
    </>
  );
}
