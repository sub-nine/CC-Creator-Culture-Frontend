import Image from 'next/image';
import Link from 'next/link';
import { safeGateway } from '@/lib/server';
import type { Page, Creator } from '@/lib/types';
import { Heading, State } from '@/components/ui';
import { pageIndex, hasNext } from '@/lib/utils';
export const metadata = { title: '창작자' };
export default async function Creators({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; page?: string }>;
}) {
  const { keyword = '', page: p } = await searchParams;
  const page = pageIndex(p);
  const { data, error } = await safeGateway<Page<Creator>>(
    `creators?${new URLSearchParams({ keyword, page: String(page), size: '20', sort: 'creatorName,asc' })}`,
  );
  const href = (n: number) =>
    `/creators?${new URLSearchParams({ keyword, page: String(n) })}`;
  return (
    <div className="container page">
      <Heading
        title="창작자의 작은 세계"
        description="만드는 사람의 이야기가 담긴 취향을 만나 보세요."
        eyebrow="Meet the creators"
      />
      <div className="toolbar">
        <form>
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="창작자 이름으로 찾기"
            aria-label="창작자 검색"
            maxLength={100}
          />
          <button className="button secondary">검색</button>
        </form>
      </div>
      {data?.content.length ? (
        <>
          <div className="form-grid">
            {data.content.map((c) => (
              <Link
                key={c.creatorId}
                href={`/creators/${c.creatorId}`}
                className="panel creator-card"
              >
                <Image
                  className="avatar"
                  src="/images/brand/default-avatar.png"
                  alt=""
                  width={64}
                  height={64}
                />
                <div className="stack-sm">
                  <h3>{c.creatorName}</h3>
                  <span className="text-link help">창작자 만나기 →</span>
                </div>
              </Link>
            ))}
          </div>
          <nav className="pagination">
            {page > 0 && (
              <Link href={href(page - 1)} className="button secondary">
                이전
              </Link>
            )}
            <span>{page + 1} 페이지</span>
            {hasNext(data, page) && (
              <Link href={href(page + 1)} className="button secondary">
                다음
              </Link>
            )}
          </nav>
        </>
      ) : (
        <State
          error={error}
          title="찾는 창작자가 없어요"
          description="다른 이름으로 검색해 보세요."
        />
      )}
    </div>
  );
}
