import { Login } from '@/features/auth';
export const metadata = {
  title: '로그인',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="auth-wrap">
      <span className="eyebrow">Welcome back</span>
      <h1>다시 만나 반가워요</h1>
      <p className="muted">나의 취향이 기다리는 곳, CC</p>
      <div className="panel">
        <Login next={next} />
      </div>
    </div>
  );
}
