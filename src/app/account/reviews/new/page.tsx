import { requireUser } from '@/lib/server';
import { ReviewForm } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  await requireUser(['CUSTOMER']);
  const { item } = await searchParams;
  return (
    <>
      <Heading
        title="구매 후기 작성"
        description="직접 사용한 경험을 나누어 주세요."
      />
      <div className="panel">
        <ReviewForm item={item} />
      </div>
    </>
  );
}
