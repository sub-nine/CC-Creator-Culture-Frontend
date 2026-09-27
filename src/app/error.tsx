'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container page empty-state">
      <h1>잠시 연결이 끊겼어요</h1>
      <p>입력한 정보를 확인하고 다시 시도해 주세요.</p>
      <button className="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
