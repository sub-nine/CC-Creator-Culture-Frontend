'use client';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, ArrowRight } from 'lucide-react';
import { useResource, QueryState } from '@/components/client-ui';
import { api, json } from '@/lib/api';
import { money, message } from '@/lib/utils';
import type { CartItem } from '@/lib/types';
export function Cart() {
  const q = useResource<CartItem[]>('cart/items');
  const client = useQueryClient();
  const [excluded, setExcluded] = useState<string[]>([]);
  const items = q.data ?? [];
  const selected = items.filter(
    (i) => !excluded.includes(i.cartId) && i.productStatus === 'ACTIVE',
  );
  const total = selected.reduce((s, i) => s + i.price * i.quantity, 0);
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: string;
      body: unknown;
    }) => api(path, json(method, body)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart/items'] }),
  });
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const group = groups.get(item.creatorName) ?? [];
    group.push(item);
    groups.set(item.creatorName, group);
  }
  const checked = (id: string) => selected.some((i) => i.cartId === id);
  return (
    <QueryState query={q}>
      {items.length ? (
        <div className="two-column">
          <div className="stack">
            <div className="row between">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={
                    selected.length ===
                      items.filter((i) => i.productStatus === 'ACTIVE')
                        .length && selected.length > 0
                  }
                  onChange={(e) =>
                    setExcluded(
                      e.target.checked ? [] : items.map((i) => i.cartId),
                    )
                  }
                />
                전체 선택 ({selected.length}/{items.length})
              </label>
              <button
                className="button ghost"
                disabled={!selected.length || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    path: 'cart/items/delete',
                    method: 'POST',
                    body: { cartIds: selected.map((i) => i.cartId) },
                  })
                }
              >
                선택 삭제
              </button>
            </div>
            {[...groups.entries()].map(([creator, entries]) => (
              <section className="panel stack" key={creator}>
                <h2 style={{ fontSize: 18 }}>{creator}</h2>
                <div>
                  {entries?.map((item) => (
                    <div className="item-row" key={item.cartId}>
                      <label className="check-label">
                        <input
                          aria-label={`${item.productName} 선택`}
                          type="checkbox"
                          disabled={
                            item.productStatus !== 'ACTIVE' ||
                            mutation.isPending
                          }
                          checked={checked(item.cartId)}
                          onChange={(e) =>
                            setExcluded((v) =>
                              e.target.checked
                                ? v.filter((id) => id !== item.cartId)
                                : [...v, item.cartId],
                            )
                          }
                        />
                      </label>
                      <div className="item-content">
                        <h3>{item.productName}</h3>
                        <p className="help">{item.skuName}</p>
                        {item.productStatus !== 'ACTIVE' && (
                          <p className="error">
                            현재 구매할 수 없는 상품이에요.
                          </p>
                        )}
                        <div className="row between">
                          <div className="quantity">
                            <button
                              aria-label={`${item.productName} 수량 줄이기`}
                              disabled={
                                item.quantity <= 1 || mutation.isPending
                              }
                              onClick={() =>
                                mutation.mutate({
                                  path: `cart/items/${item.cartId}`,
                                  method: 'PATCH',
                                  body: { quantity: item.quantity - 1 },
                                })
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <output>{item.quantity}</output>
                            <button
                              aria-label={`${item.productName} 수량 늘리기`}
                              disabled={
                                mutation.isPending || item.quantity >= 99
                              }
                              onClick={() =>
                                mutation.mutate({
                                  path: `cart/items/${item.cartId}`,
                                  method: 'PATCH',
                                  body: { quantity: item.quantity + 1 },
                                })
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <strong>{money(item.price * item.quantity)}</strong>
                          <button
                            className="button ghost"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                path: 'cart/items/delete',
                                method: 'POST',
                                body: { cartIds: [item.cartId] },
                              })
                            }
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {mutation.error && (
              <p role="alert" className="error">
                {message(mutation.error)}
              </p>
            )}
          </div>
          <aside className="panel summary">
            <h2 style={{ fontSize: 20 }}>주문 금액</h2>
            <dl>
              <div>
                <dt>선택 상품</dt>
                <dd>{selected.length}개</dd>
              </div>
              <div>
                <dt>상품 금액</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
            <hr className="line" />
            <div className="row between">
              <span>예상 합계</span>
              <strong className="price">{money(total)}</strong>
            </div>
            {selected.length ? (
              <Link
                className="button full"
                href={`/checkout?items=${selected.map((i) => i.cartId).join(',')}`}
              >
                주문하기 <ArrowRight size={16} />
              </Link>
            ) : (
              <button className="button" disabled>
                상품을 선택해 주세요
              </button>
            )}
            <p className="help">쿠폰은 다음 단계에서 상품별로 선택해 주세요.</p>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <Image
            src="/images/brand/empty-state.png"
            width={160}
            height={160}
            alt=""
          />
          <h2>아직 담은 상품이 없어요</h2>
          <p>마음에 드는 취향을 장바구니에 담아 보세요.</p>
          <Link className="button" href="/products">
            상품 둘러보기
          </Link>
        </div>
      )}
    </QueryState>
  );
}
