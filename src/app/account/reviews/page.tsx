import { requireUser } from '@/lib/server';
import { Reviews } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <>
      <Heading title="내 후기" />
      <Reviews />
    </>
  );
}
