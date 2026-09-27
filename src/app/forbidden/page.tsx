import Link from 'next/link';
export default function Page() {
  return (
    <div className="container page empty-state">
      <h1>접근 권한을 확인해 주세요</h1>
      <p>현재 계정으로는 이 화면을 이용할 수 없어요.</p>
      <Link className="button" href="/account/profile">
        계정 확인
      </Link>
    </div>
  );
}
