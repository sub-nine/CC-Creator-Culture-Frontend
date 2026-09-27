'use client';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useResource,
  QueryState,
  Pager,
  Action,
  Form,
  Logout,
} from '@/components/client-ui';
import type { FormField } from '@/components/client-ui';
import type {
  Page,
  Wishlist,
  Follow,
  Review,
  Notice,
  User,
  Creator,
} from '@/lib/types';
import { api, json } from '@/lib/api';
import { date, money } from '@/lib/utils';
import { profileSchema } from '@/lib/schemas';
export function WishlistPage() {
  const [page, setPage] = useState(0);
  const q = useResource<Page<Wishlist>>(`wishlist?pageNum=${page}`);
  return (
    <QueryState query={q}>
      {q.data?.content.length ? (
        <>
          <div className="product-grid">
            {q.data.content.map((i) => (
              <article className="panel stack-sm" key={i.wishlistId}>
                <Link href={`/products/${i.productId}`} prefetch={false}>
                  <h3>{i.productName}</h3>
                </Link>
                <strong>{money(i.price)}</strong>
                <Action path="wishlist" method="DELETE" body={[i.wishlistId]}>
                  찜 해제
                </Action>
              </article>
            ))}
          </div>
          <Pager data={q.data} page={page} onChange={setPage} />
        </>
      ) : (
        <div className="empty-state">
          <Image
            src="/images/brand/empty-state.png"
            width={140}
            height={140}
            alt=""
          />
          <h2>마음에 드는 상품을 모아 보세요</h2>
          <Link className="button" href="/products">
            상품 둘러보기
          </Link>
        </div>
      )}
    </QueryState>
  );
}
export function Follows() {
  const [page, setPage] = useState(0);
  const q = useResource<Page<Follow>>(`follows?page=${page}&size=20`);
  return (
    <QueryState query={q} empty={q.data?.content.length === 0}>
      <div className="stack">
        {q.data?.content.map((c) => (
          <article className="panel row between" key={c.creatorId}>
            <div className="creator-card">
              <Image
                className="avatar"
                src="/images/brand/default-avatar.png"
                width={56}
                height={56}
                alt=""
              />
              <div>
                <Link href={`/creators/${c.creatorId}`}>
                  <h3>{c.creatorName}</h3>
                </Link>
                <p className="help">{date(c.followedAt)}부터 팔로우</p>
              </div>
            </div>
            <Action path={`follows/${c.creatorId}`} method="DELETE">
              팔로우 해제
            </Action>
          </article>
        ))}
      </div>
      {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
    </QueryState>
  );
}
const reviewFields: FormField[] = [
  {
    name: 'rating',
    label: '별점',
    required: true,
    options: [5, 4, 3, 2, 1].map((n) => ({
      value: String(n),
      label: `${n}점`,
    })),
  },
  {
    name: 'content',
    label: '후기',
    type: 'textarea',
    maxLength: 1000,
    wide: true,
  },
];
export function ReviewForm({
  item,
  review,
}: {
  item?: string;
  review?: Review;
}) {
  const client = useQueryClient();
  const router = useRouter();
  return (
    <Form
      fields={reviewFields}
      initial={{ rating: review?.rating ?? 5, content: review?.content ?? '' }}
      submit={review ? '후기 수정' : '후기 등록'}
      onSubmit={async (values) => {
        if (!review && !item)
          throw new Error('주문 상세에서 후기 작성을 시작해 주세요.');
        await api(
          review ? `reviews/${review.reviewId}` : 'reviews',
          json(review ? 'PATCH' : 'POST', {
            rating: Number(values.rating),
            content: values.content,
            ...(!review ? { orderItemId: item } : {}),
          }),
        );
        await client.invalidateQueries();
        if (!review) router.push('/account/reviews');
      }}
    />
  );
}
export function Reviews() {
  const [page, setPage] = useState(0);
  const q = useResource<Page<Review>>(`reviews/me?pageNum=${page}`);
  return (
    <QueryState query={q} empty={q.data?.content.length === 0}>
      <div className="stack">
        {q.data?.content.map((r) => (
          <article className="panel stack" key={r.reviewId}>
            <div className="row between">
              <span className="badge">{r.rating} / 5점</span>
              <span className="help">{date(r.createdAt)}</span>
            </div>
            <p className="prose">{r.content}</p>
            <Link
              className="text-link"
              href={`/products/${r.productId}`}
              prefetch={false}
            >
              상품 보기
            </Link>
            <details>
              <summary>후기 수정</summary>
              <ReviewForm review={r} />
            </details>
            <Action
              path={`reviews/${r.reviewId}`}
              method="DELETE"
              confirmText="작성한 후기를 삭제할까요?"
            >
              후기 삭제
            </Action>
          </article>
        ))}
      </div>
      {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
    </QueryState>
  );
}
export function Notifications() {
  const [page, setPage] = useState(0);
  const q = useResource<Page<Notice>>(`notifications/?page=${page}&size=20`);
  return (
    <div className="stack">
      <div className="row between">
        <p className="help">새로운 소식을 확인해 보세요.</p>
        <Action path="notifications/read-all" method="PATCH">
          모두 읽음 처리
        </Action>
      </div>
      <QueryState query={q} empty={q.data?.content.length === 0}>
        <div className="stack">
          {q.data?.content.map((n) => (
            <article className="panel stack-sm" key={n.id}>
              <div className="row between">
                <h3>{n.title}</h3>
                <span className="badge">{n.read ? '읽음' : '새 알림'}</span>
              </div>
              <p className="prose">{n.content}</p>
              <p className="help">{date(n.createdAt)}</p>
              {!n.read && (
                <Action path={`notifications/${n.id}/read`} method="PATCH">
                  읽음 처리
                </Action>
              )}
            </article>
          ))}
        </div>
        {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
      </QueryState>
    </div>
  );
}
const profileFields: FormField[] = [
  { name: 'nickname', label: '닉네임', required: true, maxLength: 50 },
  {
    name: 'phone',
    label: '연락처',
    type: 'tel',
    required: true,
    maxLength: 20,
  },
  {
    name: 'address',
    label: '주소',
    required: true,
    maxLength: 255,
    wide: true,
  },
  { name: 'slackId', label: 'Slack ID (선택)', maxLength: 100, wide: true },
];
export function Profile() {
  const router = useRouter();
  const q = useResource<User>('users/me');
  const client = useQueryClient();
  return (
    <QueryState query={q}>
      {q.data && (
        <div className="stack">
          <section className="panel stack">
            <p className="muted">{q.data.email}</p>
            <Form
              key={JSON.stringify(q.data)}
              fields={profileFields}
              initial={{
                nickname: q.data.nickname,
                phone: q.data.phone,
                address: q.data.address,
                slackId: q.data.slackId ?? '',
              }}
              onSubmit={async (v) => {
                const result = profileSchema.safeParse(v);
                if (!result.success)
                  throw new Error(result.error.issues[0].message);
                await api('users/me', json('PATCH', result.data));
                await client.invalidateQueries();
              }}
            />
          </section>
          <section className="panel row between">
            <div>
              <h3>계정 관리</h3>
              <p className="help">
                탈퇴하면 이 계정으로 서비스를 이용할 수 없어요.
              </p>
            </div>
            <div className="row">
              <Logout />
              <Action
                path="users/me"
                method="DELETE"
                confirmText="정말 회원 탈퇴할까요? 이 계정으로 더 이상 로그인할 수 없어요."
                onSuccess={() => {
                  client.clear();
                  router.replace('/');
                  router.refresh();
                }}
              >
                회원 탈퇴
              </Action>
            </div>
          </section>
        </div>
      )}
    </QueryState>
  );
}
export function CreatorProfile() {
  const q = useResource<Creator>('creators/me');
  const count = useResource<{ followerCount: number }>(
    'creators/me/follower-count',
  );
  const client = useQueryClient();
  return (
    <QueryState query={q}>
      {q.data && (
        <div className="stack">
          <div className="panel">
            <Form
              key={JSON.stringify(q.data)}
              fields={[
                {
                  name: 'creatorName',
                  label: '상호명',
                  required: true,
                  maxLength: 100,
                },
                {
                  name: 'businessRegistrationNumber',
                  label: '사업자등록번호',
                  required: true,
                  maxLength: 20,
                  pattern: '[0-9\\-]+',
                },
              ]}
              initial={{
                creatorName: q.data.creatorName,
                businessRegistrationNumber:
                  q.data.businessRegistrationNumber ?? '',
              }}
              onSubmit={async (v) => {
                await api('creators/me', json('PATCH', v));
                await client.invalidateQueries();
              }}
            />
          </div>
          <div className="panel">
            <h3>팔로워</h3>
            <QueryState query={count}>
              {count.data && (
                <p className="price">{count.data.followerCount}명</p>
              )}
            </QueryState>
          </div>
        </div>
      )}
    </QueryState>
  );
}
