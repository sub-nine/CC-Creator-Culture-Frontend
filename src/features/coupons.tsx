'use client';
import { useState } from 'react';
import {
  useResource,
  QueryState,
  Action,
  Pager,
  useNow,
} from '@/components/client-ui';
import { date } from '@/lib/utils';
import type { Page, Coupon, UserCoupon } from '@/lib/types';
export function Coupons({ owned = false }: { owned?: boolean }) {
  const [page, setPage] = useState(0);
  const now = useNow();
  const q = useResource<Page<Coupon & UserCoupon>>(
    `${owned ? 'user-coupons' : 'coupons'}?page=${page}&size=20`,
  );
  return (
    <QueryState query={q} empty={q.data?.content.length === 0}>
      <div className="stack">
        {q.data?.content.map((c) => (
          <article
            key={c.userCouponId ?? c.couponId}
            className="panel coupon-card"
          >
            <div className="stack-sm">
              <span className="coupon-rate">{c.discountRate}%</span>
              <h3>{c.couponName}</h3>
              <p className="help">{date(c.expiredAt)}까지</p>
              {!owned && (
                <p className="help">
                  {date(c.startedAt)}부터 /{' '}
                  {Math.max(0, c.totalQuantity - c.issuedQuantity)}개 남음
                </p>
              )}
            </div>
            {owned ? (
              <span className="badge">
                {c.expired
                  ? '기간 만료'
                  : c.status === 'USED'
                    ? '사용 완료'
                    : '사용 가능'}
              </span>
            ) : (
              <Action
                path={`coupons/${c.couponId}/issue`}
                disabled={
                  now === 0 ||
                  c.issuedQuantity >= c.totalQuantity ||
                  now < new Date(c.startedAt).getTime() ||
                  now >= new Date(c.expiredAt).getTime()
                }
              >
                {now === 0
                  ? '확인 중'
                  : now < new Date(c.startedAt).getTime()
                    ? '발급 예정'
                    : now >= new Date(c.expiredAt).getTime()
                      ? '기간 만료'
                      : c.issuedQuantity >= c.totalQuantity
                        ? '쿠폰 소진'
                        : '쿠폰 받기'}
              </Action>
            )}
          </article>
        ))}
      </div>
      {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
    </QueryState>
  );
}
