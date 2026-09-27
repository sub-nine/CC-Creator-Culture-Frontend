import { it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { intentKey, estimateDiscount } from '@/lib/order-intent';
import { canCancel } from '@/lib/utils';
import type { Order } from '@/lib/types';
it('동일 주문 재시도는 같은 멱등 키를 유지하고 변경 주문은 다른 키를 쓴다', async () => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const first = await intentKey('order', { cartItemId: 'a' }, storage);
  expect(await intentKey('order', { cartItemId: 'a' }, storage)).toBe(first);
  expect(await intentKey('order', { cartItemId: 'b' }, storage)).not.toBe(
    first,
  );
  expect([...values.keys()].join('')).not.toContain('cartItemId');
});
it('할인은 항목 금액의 정수 원 단위로 계산한다', () => {
  expect(estimateDiscount(1999, 15)).toBe(299);
  expect(estimateDiscount(20000, 100)).toBe(20000);
});
it('결제 완료와 모든 상품 주문 접수 상태에서만 취소할 수 있다', () => {
  const order = {
    status: 'PAID',
    creatorGroups: [{ items: [{ status: 'ORDERED' }] }],
  } as Order;
  expect(canCancel(order)).toBe(true);
  expect(canCancel({ ...order, status: 'FAILED' })).toBe(false);
  order.creatorGroups[0].items[0].status = 'PREPARING';
  expect(canCancel(order)).toBe(false);
});
