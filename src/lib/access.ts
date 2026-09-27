import type { Role } from './types';
const id = '[a-zA-Z0-9-]+';
const all: Role[] = ['CUSTOMER', 'CREATOR', 'MANAGER', 'MASTER'];
const customer: Role[] = ['CUSTOMER'];
const creator: Role[] = ['CREATOR'];
const admin: Role[] = ['MANAGER', 'MASTER'];
// 경로와 메서드를 함께 제한해 내부 API와 임의 프록시 사용을 막는다.
const routes: [string, string, Role[] | null][] = [
  ['GET', `products(?:/${id}(?:/reviews)?)?`, null],
  [
    'GET',
    `(?:categories(?:/${id}(?:/hashtags)?)?|hashtags|leaderboards/(?:categories|hashtags)|creators(?:/${id})?)`,
    null,
  ],
  ['GET|PATCH|DELETE', 'users/me', all],
  ['GET|PATCH', 'creators/me', creator],
  ['GET', 'creators/me/follower-count', creator],
  ['POST', 'products', creator],
  ['POST', 'images/presigned-url', creator],
  ['PATCH|DELETE', `products/${id}`, creator],
  ['PATCH', `products/${id}/status`, creator],
  ['POST', `products/${id}/skus`, creator],
  ['PATCH|DELETE', `products/${id}/skus/${id}`, creator],
  ['PATCH', `products/${id}/images`, creator],
  ['DELETE', `products/${id}/images/${id}`, creator],
  ['POST', `skus/${id}/stock/adjustments`, creator],
  ['GET|POST', 'cart/items', customer],
  ['POST', 'cart/items/delete', customer],
  ['PATCH', `cart/items/${id}`, customer],
  ['GET|POST', 'orders', customer],
  ['GET', `orders/${id}`, customer],
  ['POST', `orders/${id}/(?:cancel|payments)`, customer],
  ['GET', 'user-coupons', customer],
  ['GET', 'coupons', all],
  ['GET', `coupons/${id}`, all],
  ['POST', `coupons/${id}/issue`, customer],
  ['POST', 'coupons', admin],
  ['PATCH|DELETE', `coupons/${id}`, admin],
  ['GET|DELETE', 'wishlist', customer],
  ['POST', `wishlist/${id}`, customer],
  ['GET', 'follows', customer],
  ['GET|POST|DELETE', `follows/${id}`, customer],
  ['GET', 'reviews/me', customer],
  ['POST', 'reviews', customer],
  ['PATCH|DELETE', `reviews/${id}`, customer],
  ['GET', `notifications(?:/|/unread-count|/${id})`, all],
  ['PATCH', `notifications/(?:read-all|${id}/read)`, all],
  ['GET', `creator/order-items(?:/${id})?`, creator],
  ['PATCH', `creator/order-items/${id}/status`, creator],
  ['PATCH', `admin/creators/${id}/approval`, admin],
  ['PATCH', `admin/products/${id}/status`, admin],
  ['GET', `admin/orders(?:/${id})?`, admin],
  ['GET', 'admin/categories/merge-requests', admin],
  ['POST', `admin/categories/merge-requests/${id}/(?:approve|reject)`, admin],
  ['POST', 'admin/categories', ['MASTER']],
  ['POST', `admin/categories/${id}/hashtags/${id}`, ['MASTER']],
  ['DELETE', `admin/categories/${id}/hashtags/${id}`, admin],
  ['DELETE', `admin/hashtags/${id}`, admin],
  ['POST', 'admin/managers', ['MASTER']],
];
export function requiredRoles(
  path: string,
  method: string,
): Role[] | null | undefined {
  const clean = path.split('?')[0];
  // 개인 창작자 정보는 공개 프로필보다 먼저 처리한다.
  if (clean === 'creators/me' && ['GET', 'PATCH'].includes(method))
    return creator;
  return routes.find(
    ([verbs, pattern]) =>
      new RegExp(`^(?:${verbs})$`).test(method) &&
      new RegExp(`^(?:${pattern})$`).test(clean),
  )?.[2];
}
export function validOrigin(origin: string | null, expected: string) {
  return origin !== null && origin === new URL(expected).origin;
}
