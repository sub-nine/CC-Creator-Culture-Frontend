import { requireUser } from '@/lib/server';
import { Heading } from '@/components/ui';
import { Categories } from '@/features/admin';
export default async function Page() {
  const user = await requireUser(['MANAGER', 'MASTER']);
  return (
    <>
      <Heading
        title="카테고리와 태그"
        description="상품 분류와 해시태그 연결을 관리해 주세요."
      />
      <Categories master={user.role === 'MASTER'} />
    </>
  );
}
