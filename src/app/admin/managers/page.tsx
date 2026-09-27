import { requireUser } from '@/lib/server';
import { Heading } from '@/components/ui';
import { ManagerForm } from '@/features/admin';
export default async function Page() {
  await requireUser(['MASTER']);
  return (
    <>
      <Heading
        title="운영자 계정 생성"
        description="운영 업무를 담당할 계정을 등록해 주세요."
      />
      <ManagerForm />
    </>
  );
}
