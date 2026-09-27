import Image from 'next/image';
import { safeGateway } from '@/lib/server';
import type { Creator } from '@/lib/types';
import { State } from '@/components/ui';
import { FollowButton } from '@/features/creators';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await safeGateway<Creator>(
    `creators/${encodeURIComponent(id)}`,
  );
  return (
    <div className="container page">
      {data ? (
        <section className="panel creator-card">
          <Image
            className="avatar"
            src="/images/brand/default-avatar.png"
            width={100}
            height={100}
            alt=""
          />
          <div className="stack">
            <div>
              <span className="eyebrow">Independent creator</span>
              <h1>{data.creatorName}</h1>
            </div>
            <p className="muted">
              팔로우하고 이 창작자의 새로운 소식을 만나 보세요.
            </p>
            <FollowButton id={id} />
          </div>
        </section>
      ) : (
        <State error={error} />
      )}
    </div>
  );
}
