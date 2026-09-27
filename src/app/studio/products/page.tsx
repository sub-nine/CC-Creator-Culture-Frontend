import { Heading } from '@/components/ui';
import { ProductLookup } from '@/features/studio';
export default function Page() {
  return (
    <>
      <Heading title="상품 관리" />
      <ProductLookup />
    </>
  );
}
