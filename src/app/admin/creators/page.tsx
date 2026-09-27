import { Heading } from '@/components/ui';
import { CreatorApprovals } from '@/features/admin';
export default function Page() {
  return (
    <>
      <Heading title="창작자 승인" />
      <CreatorApprovals />
    </>
  );
}
