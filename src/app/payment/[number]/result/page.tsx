import { requireUser } from '@/lib/server';
import { Payment } from '@/features/payment';
export const metadata = {
  title: '결제 결과',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requireUser(['CUSTOMER']);
  const { number } = await params;
  return (
    <div className="container page">
      <Payment number={number} result />
    </div>
  );
}
