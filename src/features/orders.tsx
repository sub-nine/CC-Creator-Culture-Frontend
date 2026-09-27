'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResource, QueryState, Pager, Action } from '@/components/client-ui';
import { api } from '@/lib/api';
import { money, date, canCancel, message, status } from '@/lib/utils';
import { intentKey } from '@/lib/order-intent';
import type { Page, Order, CreatorOrder, Address } from '@/lib/types';
export function Orders({
  mode = 'customer',
}: {
  mode?: 'customer' | 'admin' | 'creator';
}) {
  const [page, setPage] = useState(0);
  const path =
    mode === 'admin'
      ? 'admin/orders'
      : mode === 'creator'
        ? 'creator/order-items'
        : 'orders';
  const q = useResource<Page<Order & CreatorOrder>>(
    `${path}?page=${page}&size=20`,
  );
  const target =
    mode === 'admin'
      ? '/admin/orders'
      : mode === 'creator'
        ? '/studio/orders'
        : '/account/orders';
  return (
    <QueryState query={q} empty={q.data?.content.length === 0}>
      {q.data && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>주문</th>
                  <th>상태</th>
                  <th>금액</th>
                  <th>주문일</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {q.data.content.map((o) => (
                  <tr key={o.orderItemId ?? o.orderNumber}>
                    <td>
                      {mode === 'creator' ? (
                        <>
                          <strong>{o.productName}</strong>
                          <br />
                          <small>
                            {o.skuName} / {o.quantity}개
                          </small>
                        </>
                      ) : (
                        o.orderNumber
                      )}
                    </td>
                    <td>
                      <span className="badge">{status(o.status)}</span>
                      {mode === 'creator' && (
                        <p className="help">{status(o.orderStatus)}</p>
                      )}
                    </td>
                    <td>{money(o.paymentAmount)}</td>
                    <td>{date(o.createdAt)}</td>
                    <td>
                      <Link
                        href={`${target}/${o.orderItemId ?? o.orderNumber}`}
                      >
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager data={q.data} page={page} onChange={setPage} />
        </>
      )}
    </QueryState>
  );
}
export function Shipping({ address }: { address: Address }) {
  return (
    <dl className="definition">
      <dt>수령인</dt>
      <dd>{address.recipientName}</dd>
      <dt>연락처</dt>
      <dd>{address.recipientPhone}</dd>
      <dt>주소</dt>
      <dd>
        ({address.postalCode}) {address.addressLine1} {address.addressLine2}
      </dd>
    </dl>
  );
}
export function OrderDetail({
  number,
  admin = false,
}: {
  number: string;
  admin?: boolean;
}) {
  const q = useResource<Order>(`${admin ? 'admin/' : ''}orders/${number}`);
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: async () =>
      api(`orders/${number}/cancel`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': await intentKey('cancel-order', { number }),
        },
      }),
    onSuccess: () => client.invalidateQueries(),
  });
  const order = q.data;
  return (
    <QueryState query={q}>
      {order && (
        <div className="two-column">
          <div className="stack">
            <section className="panel stack">
              <div className="row between">
                <h2>주문 정보</h2>
                <span className="badge">{status(order.status)}</span>
              </div>
              <p className="help">
                {number} / {date(order.createdAt)}
              </p>
              {order.creatorGroups.map((group, index) => (
                <div className="stack-sm" key={group.creatorId}>
                  <h3>판매자별 상품 묶음 {index + 1}</h3>
                  {group.items.map((i) => (
                    <div className="item-row" key={i.orderItemId}>
                      <div className="item-content">
                        <Link
                          href={`/products/${i.productId}`}
                          prefetch={false}
                        >
                          <h3>{i.productName}</h3>
                        </Link>
                        <p className="help">
                          {i.skuName} / {i.quantity}개
                        </p>
                        <div className="row between">
                          <span className="badge">{status(i.status)}</span>
                          <strong>{money(i.paymentAmount)}</strong>
                        </div>
                        {!admin && i.status === 'COMPLETED' && (
                          <Link
                            className="text-link"
                            href={`/account/reviews/new?item=${i.orderItemId}`}
                          >
                            구매 후기 작성
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
            <section className="panel stack">
              <h2>배송지</h2>
              <Shipping address={order.shippingAddress} />
            </section>
          </div>
          <aside className="panel summary">
            <h2>결제 정보</h2>
            <dl>
              <div>
                <dt>상품 금액</dt>
                <dd>{money(order.originalAmount)}</dd>
              </div>
              <div>
                <dt>할인 금액</dt>
                <dd>−{money(order.discountAmount)}</dd>
              </div>
              <div>
                <dt>결제 금액</dt>
                <dd className="price">{money(order.paymentAmount)}</dd>
              </div>
            </dl>
            {!admin && order.status === 'PENDING_PAYMENT' && (
              <Link className="button" href={`/payment/${number}`}>
                모의 결제하기
              </Link>
            )}
            {!admin && canCancel(order) && (
              <>
                <button
                  className="button secondary"
                  disabled={cancel.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        '이 주문의 모든 상품을 취소할까요? 사용한 쿠폰은 복구되지 않아요.',
                      )
                    )
                      cancel.mutate();
                  }}
                >
                  전체 주문 취소
                </button>
                <p className="help">
                  배송이 시작되기 전 전체 주문만 취소할 수 있어요.
                </p>
              </>
            )}
            {cancel.error && (
              <p className="error" role="alert">
                {message(cancel.error)}
              </p>
            )}
            <button className="button ghost" onClick={() => q.refetch()}>
              최신 상태 확인
            </button>
          </aside>
        </div>
      )}
    </QueryState>
  );
}
const nextStatus: Record<string, string> = {
  ORDERED: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: 'COMPLETED',
};
export function CreatorOrderDetail({ id }: { id: string }) {
  const q = useResource<CreatorOrder>(`creator/order-items/${id}`);
  const item = q.data;
  return (
    <QueryState query={q}>
      {item && (
        <div className="stack">
          <section className="panel stack">
            <div className="row between">
              <h2>{item.productName}</h2>
              <span className="badge">{status(item.status)}</span>
            </div>
            <p>
              {item.skuName} / {item.quantity}개 / {money(item.paymentAmount)}
            </p>
            <p className="help">
              주문 {item.orderNumber} / {status(item.orderStatus)}
            </p>
            {nextStatus[item.status] &&
              ['PAID', 'PROCESSING'].includes(item.orderStatus) && (
                <Action
                  path={`creator/order-items/${id}/status`}
                  method="PATCH"
                  body={{ status: nextStatus[item.status] }}
                  confirmText={`${status(nextStatus[item.status])} 상태로 변경할까요?`}
                >
                  {status(nextStatus[item.status])} 처리
                </Action>
              )}
          </section>
          <section className="panel stack">
            <h2>배송지</h2>
            <Shipping address={item.shippingAddress} />
          </section>
        </div>
      )}
    </QueryState>
  );
}
