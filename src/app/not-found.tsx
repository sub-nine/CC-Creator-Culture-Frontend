import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container page empty-state">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소가 변경되었거나 더 이상 제공하지 않는 페이지예요.</p>
      <Link className="button" href="/">
        홈으로
      </Link>
    </div>
  );
}
