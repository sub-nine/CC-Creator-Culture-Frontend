import { requireUser } from '@/lib/server';
import { Notifications } from '@/features/account';
import { Heading } from '@/components/ui';
export default async function Page() {
  await requireUser();
  return (
    <>
      <Heading title="알림" />
      <Notifications />
    </>
  );
}
