import { requireUser } from '@/lib/server';
import { WishlistPage } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <>
      <Heading title="찜한 상품" />
      <WishlistPage />
    </>
  );
}
