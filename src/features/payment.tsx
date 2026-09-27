'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3 } from 'lucide-react';
import { useResource, QueryState } from '@/components/client-ui';
import { api, json } from '@/lib/api';
import { money, status, message } from '@/lib/utils';
import type { Order } from '@/lib/types';
export function Payment({
  number,
  result = false,
}: {
  number: string;
  result?: boolean;
}) {
  const q = useResource<Order>(`orders/${number}`);
  const router = useRouter();
  const client = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const m = useMutation({
    mutationFn: (value: 'SUCCESS' | 'FAILED') =>
      api(`orders/${number}/payments`, json('POST', { result: value })),
    onSettled: async () => {
      await client.invalidateQueries();
      const order = await q.refetch();
      if (order.data && order.data.status !== 'PENDING_PAYMENT')
        router.replace(`/payment/${number}/result`);
    },
  });
  const order = q.data;
  const remaining =
    order && now !== null
      ? Math.max(
          0,
          Math.ceil((new Date(order.expiresAt).getTime() - now) / 1000),
        )
      : null;
  return (
    <QueryState query={q}>
      {order && (
        <div className="panel result stack">
          <div className="result-icon">
            {['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status) ? (
              <Check size={32} />
            ) : (
              <Clock3 size={32} />
            )}
          </div>
          <h1>
            {order.status === 'PENDING_PAYMENT'
              ? '주문이 준비되었어요'
              : status(order.status)}
          </h1>
          <p className="muted">주문번호 {number}</p>
          <p className="price">{money(order.paymentAmount)}</p>
          {order.status === 'PENDING_PAYMENT' && !result ? (
            <>
              <p>
                남은 시간{' '}
                {remaining === null
                  ? '확인 중'
                  : `${Math.floor(remaining / 60)}분 ${remaining % 60}초`}
              </p>
              <div className="notice">
                이 서비스는 모의 결제를 사용해요. 실제 금액이 청구되지 않아요.
              </div>
              <button
                className="button full"
                disabled={m.isPending || remaining === 0}
                onClick={() => m.mutate('SUCCESS')}
              >
                모의 결제 성공 처리
              </button>
              <button
                className="button secondary full"
                disabled={m.isPending || remaining === 0}
                onClick={() => m.mutate('FAILED')}
              >
                모의 결제 실패 처리
              </button>
              {remaining === 0 && (
                <p className="error">
                  결제 기한이 지났어요. 주문 내역에서 최신 상태를 확인해 주세요.
                </p>
              )}
            </>
          ) : (
            <p className="muted">
              {order.status === 'FAILED'
                ? '결제가 완료되지 않았어요. 재고와 쿠폰은 서버 처리 결과에 따라 복구돼요.'
                : order.status === 'EXPIRED'
                  ? '결제 기한이 지나 주문이 만료되었어요.'
                  : order.status === 'CANCELED'
                    ? '주문이 취소되었어요.'
                    : '내 주문에서 처리 상태를 확인할 수 있어요.'}
            </p>
          )}
          {m.error && (
            <p className="error" role="alert">
              {message(m.error)}
            </p>
          )}
          <Link className="button secondary" href={`/account/orders/${number}`}>
            주문 상세 확인
          </Link>
          <Link className="text-link" href="/products">
            상품 둘러보기
          </Link>
        </div>
      )}
    </QueryState>
  );
}
