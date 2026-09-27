import { requireUser } from '@/lib/server';
import { Profile } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser();
  return (
    <>
      <Heading title="내 정보" />
      <Profile />
    </>
  );
}
