import Link from 'next/link';
export const metadata = {
  title: '창작자 승인 안내',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="auth-wrap stack">
      <span className="eyebrow">Creator registration</span>
      <h1>당신의 이야기를 기다려요</h1>
      <p className="muted">
        창작자 계정은 운영자의 가입 검토와 승인이 완료된 뒤 로그인할 수 있어요.
        승인 대기와 반려 상태에서는 판매 기능을 이용할 수 없어요.
      </p>
      <div className="notice">
        현재 계정의 승인 여부는 로그인할 때 확인할 수 있어요.
      </div>
      <Link className="button" href="/login">
        로그인으로 확인
      </Link>
    </div>
  );
}
