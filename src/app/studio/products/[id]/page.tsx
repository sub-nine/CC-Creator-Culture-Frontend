import { requireUser } from '@/lib/server';
import { Heading } from '@/components/ui';
import { EditProduct } from '@/features/studio';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(['CREATOR']);
  const { id } = await params;
  return (
    <>
      <Heading title="상품 편집" />
      <EditProduct id={id} userId={user.userId} />
    </>
  );
}
