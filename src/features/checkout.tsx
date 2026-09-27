'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useResource, QueryState } from '@/components/client-ui';
import { api, json, ApiError } from '@/lib/api';
import { addressSchema } from '@/lib/schemas';
import { money, message } from '@/lib/utils';
import { intentKey, estimateDiscount } from '@/lib/order-intent';
import type { Address, CartItem, UserCoupon, Page, User } from '@/lib/types';
interface OrderInput {
  items: { cartItemId: string; userCouponId?: string }[];
  shippingAddress: Address;
}
export function Checkout({ ids, user }: { ids: string[]; user: User }) {
  const cart = useResource<CartItem[]>('cart/items');
  const coupons = useResource<Page<UserCoupon>>(
    'user-coupons?status=ISSUED&size=100',
  );
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<{
    body: OrderInput;
    key: string;
  } | null>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipientName: user.nickname,
      recipientPhone: user.phone,
      addressLine1: user.address,
      addressLine2: '',
      postalCode: '',
    },
  });
  const items = (cart.data ?? []).filter((i) => ids.includes(i.cartId));
  const availableCoupons = (coupons.data?.content ?? []).filter(
    (c) => !c.expired && c.status === 'ISSUED',
  );
  const original = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = items.reduce(
    (sum, i) =>
      sum +
      estimateDiscount(
        i.price * i.quantity,
        availableCoupons.find((c) => c.userCouponId === chosen[i.cartId])
          ?.discountRate ?? 0,
      ),
    0,
  );
  async function submit(shippingAddress: Address) {
    setError('');
    try {
      const body = attempt?.body ?? {
        items: items.map((i) => ({
          cartItemId: i.cartId,
          ...(chosen[i.cartId] ? { userCouponId: chosen[i.cartId] } : {}),
        })),
        shippingAddress,
      };
      const key = attempt?.key ?? (await intentKey('create-order', body));
      setAttempt({ body, key });
      const order = await api<{ orderNumber: string }>('orders', {
        ...json('POST', body),
        headers: { 'Idempotency-Key': key },
      });
      router.push(`/payment/${order.orderNumber}`);
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && e.status >= 400 && e.status < 500)
        setAttempt(null);
    }
  }
  return (
    <QueryState query={cart}>
      {items.length !== ids.length || items.length === 0 ? (
        <div className="notice">
          선택한 장바구니 항목을 다시 확인해 주세요.{' '}
          <Link className="text-link" href="/cart">
            장바구니로
          </Link>
        </div>
      ) : (
        <form className="two-column" onSubmit={handleSubmit(submit)}>
          <div className="stack">
            <fieldset
              disabled={isSubmitting || !!attempt}
              className="panel stack"
              style={{ minWidth: 0 }}
            >
              <h2>배송지</h2>
              <div className="form-grid">
                {(
                  [
                    { name: 'recipientName', label: '수령인', max: 50 },
                    { name: 'recipientPhone', label: '연락처', max: 20 },
                    { name: 'postalCode', label: '우편번호', max: 10 },
                    { name: 'addressLine1', label: '기본 주소', max: 200 },
                    {
                      name: 'addressLine2',
                      label: '상세 주소 (선택)',
                      max: 200,
                    },
                  ] as const
                ).map((f) => (
                  <label
                    className={`field ${f.name.startsWith('address') ? 'wide' : ''}`}
                    key={f.name}
                  >
                    <span>{f.label}</span>
                    <input
                      {...register(f.name)}
                      maxLength={f.max}
                      required={f.name !== 'addressLine2'}
                      autoComplete={
                        f.name === 'recipientName'
                          ? 'shipping name'
                          : f.name === 'recipientPhone'
                            ? 'shipping tel'
                            : f.name === 'postalCode'
                              ? 'shipping postal-code'
                              : f.name === 'addressLine1'
                                ? 'shipping address-line1'
                                : 'shipping address-line2'
                      }
                    />
                    {errors[f.name] && (
                      <small className="error">{errors[f.name]?.message}</small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset
              disabled={isSubmitting || !!attempt}
              className="panel stack"
              style={{ minWidth: 0 }}
            >
              <h2>주문 상품과 쿠폰</h2>
              {coupons.error && (
                <p className="notice">
                  쿠폰을 불러오지 못했어요. 쿠폰 없이 주문하거나{' '}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => coupons.refetch()}
                  >
                    다시 조회
                  </button>
                  해 주세요.
                </p>
              )}
              {items.map((i) => (
                <article key={i.cartId} className="stack-sm">
                  <p className="help">{i.creatorName}</p>
                  <h3>{i.productName}</h3>
                  <div className="row between">
                    <span className="help">
                      {i.skuName} / {i.quantity}개
                    </span>
                    <strong>{money(i.price * i.quantity)}</strong>
                  </div>
                  <label className="field">
                    <span>{i.productName} 쿠폰</span>
                    <select
                      value={chosen[i.cartId] ?? ''}
                      onChange={(e) =>
                        setChosen((v) => ({ ...v, [i.cartId]: e.target.value }))
                      }
                    >
                      <option value="">쿠폰 사용 안 함</option>
                      {availableCoupons.map((c) => (
                        <option
                          key={c.userCouponId}
                          value={c.userCouponId}
                          disabled={Object.entries(chosen).some(
                            ([id, value]) =>
                              id !== i.cartId && value === c.userCouponId,
                          )}
                        >
                          {c.couponName} / {c.discountRate}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <hr className="line" />
                </article>
              ))}
            </fieldset>
          </div>
          <aside className="panel summary">
            <h2>주문 확인</h2>
            <dl>
              <div>
                <dt>상품 금액</dt>
                <dd>{money(original)}</dd>
              </div>
              <div>
                <dt>예상 할인</dt>
                <dd>−{money(discount)}</dd>
              </div>
            </dl>
            <hr className="line" />
            <div className="row between">
              <span>예상 결제 금액</span>
              <strong className="price">{money(original - discount)}</strong>
            </div>
            <p className="help">
              최종 금액은 주문이 생성된 뒤 확정돼요. 생성 후 10분 안에 모의
              결제를 완료해 주세요.
            </p>
            {attempt && (
              <div className="notice">
                주문 처리 결과를 확인하고 있어요. 오류가 발생했다면 같은
                주문으로 재시도하거나 내 주문을 확인해 주세요.
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button full"
              disabled={
                isSubmitting || items.some((i) => i.productStatus !== 'ACTIVE')
              }
            >
              {isSubmitting
                ? '주문 확인 중…'
                : attempt
                  ? '같은 주문 다시 확인'
                  : '주문 생성하기'}
            </button>
            <Link href="/account/orders" className="text-link">
              내 주문 확인
            </Link>
          </aside>
        </form>
      )}
    </QueryState>
  );
}
