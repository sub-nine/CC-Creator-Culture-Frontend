import Link from 'next/link';
import { Signup } from '@/features/auth';
export const metadata = {
  title: '회원가입',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind: k } = await searchParams;
  const kind = k === 'creator' ? 'creator' : 'customer';
  return (
    <div className="auth-wrap">
      <h1>CC와 함께하기</h1>
      <p className="muted">좋아하는 것으로 연결되는 일상을 시작해요.</p>
      <div className="panel">
        <nav className="tabs">
          <Link className={kind === 'customer' ? 'active' : ''} href="/signup">
            구매자 가입
          </Link>
          <Link
            className={kind === 'creator' ? 'active' : ''}
            href="/signup?kind=creator"
          >
            창작자 가입
          </Link>
        </nav>
        <Signup kind={kind} />
      </div>
    </div>
  );
}
