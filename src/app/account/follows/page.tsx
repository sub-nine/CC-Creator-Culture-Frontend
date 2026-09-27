import { requireUser } from '@/lib/server';
import { Follows } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser(['CUSTOMER']);
  return (
    <>
      <Heading title="팔로우한 창작자" />
      <Follows />
    </>
  );
}
