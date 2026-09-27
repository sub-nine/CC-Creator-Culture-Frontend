import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { safeGateway } from '@/lib/server';
import type { Leaderboard } from '@/lib/types';
import { Banner, Heading, SectionHeading, State } from '@/components/ui';
export const metadata = { title: '주간 트렌드' };
export default async function Page() {
  const results = await Promise.all(
    ['categories', 'hashtags'].map((type) =>
      safeGateway<Leaderboard>(`leaderboards/${type}?period=WEEKLY&limit=10`),
    ),
  );
  return (
    <div className="container page">
      <Heading title="주간 트렌드" />
      <Banner kind="trend" />
      <div className="trend-layout section">
        {results.map(({ data, error }, i) => (
          <section key={i}>
            <SectionHeading
              title={i === 0 ? '주간 카테고리 Top 10' : '주간 해시태그 Top 10'}
              description={
                data
                  ? `${data.startDate} ~ ${data.endDate}`
                  : '최근 7일의 관심을 모았어요.'
              }
            />
            {data?.items.length ? (
              data.items.map((item) => (
                <Link
                  key={item.targetId}
                  href={`/products?keyword=${encodeURIComponent(item.name)}`}
                  className="rank-item"
                >
                  <span className="rank">{item.ranking}</span>
                  <span>
                    {i === 1 ? '#' : ''}
                    {item.name}
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <State
                error={error}
                title="아직 순위가 없어요"
                description="관심이 모이면 이곳에서 확인할 수 있어요."
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
