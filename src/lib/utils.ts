import type { Order, Page } from './types';
export const money = (value: number | null | undefined) =>
  value == null
    ? '가격 확인 필요'
    : `${new Intl.NumberFormat('ko-KR').format(value)}원`;
export const date = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
export const statusLabels: Record<string, string> = {
  ACTIVE: '판매 중',
  INACTIVE: '판매 중지',
  SUSPENDED: '판매 제한',
  DELETED: '삭제됨',
  PENDING_PAYMENT: '결제 대기',
  PAID: '결제 완료',
  PROCESSING: '배송 진행 중',
  COMPLETED: '완료',
  EXPIRED: '기한 만료',
  FAILED: '결제 실패',
  CANCELED: '취소 완료',
  ORDERED: '주문 접수',
  PREPARING: '배송 준비 중',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
  ISSUED: '사용 가능',
  USED: '사용 완료',
  PENDING: '검토 대기',
  PENDING_APPROVAL: '승인 대기',
  ANALYZING: '분류 확인 중',
  MERGED: '연결 완료',
  APPROVED: '승인',
  REJECTED: '반려',
};
export const status = (value: string) => statusLabels[value] ?? value;
export const hasNext = (data: Page<unknown>, page: number) =>
  data.hasNext ??
  (data.last !== undefined ? !data.last : page + 1 < (data.totalPages ?? 0));
export const canCancel = (order: Order) =>
  order.status === 'PAID' &&
  order.creatorGroups.every((group) =>
    group.items.every((item) => item.status === 'ORDERED'),
  );
export function safeReturn(value: string | null | undefined) {
  if (!value?.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return '/';
  const base = 'https://cc.invalid';
  try {
    const url = new URL(value, base);
    if (
      url.origin !== base ||
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/login')
    )
      return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
export function pageIndex(value: string | undefined) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 && n < 100000 ? n : 0;
}
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : '요청을 처리하지 못했어요. 다시 시도해 주세요.';
