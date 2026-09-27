import { Heading } from '@/components/ui';
import { NewProduct } from '@/features/studio';
export default function Page() {
  return (
    <>
      <Heading
        title="상품 등록"
        description="상품의 이야기와 옵션을 등록해 주세요."
      />
      <NewProduct />
    </>
  );
}
