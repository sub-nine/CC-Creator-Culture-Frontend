import { describe, it, expect } from 'vitest';
import { requiredRoles, validOrigin } from '@/lib/access';
import { safeReturn, hasNext } from '@/lib/utils';
import { signupSchema, productSchema, addressSchema } from '@/lib/schemas';
describe('요청과 입력 경계', () => {
  it('내부 경로와 미구현 이미지 추가를 차단한다', () => {
    for (const path of [
      'internal/users',
      '../users/me',
      'products/../auth/logout',
      'products/id/images',
    ])
      expect(requiredRoles(path, 'POST')).toBeUndefined();
  });
  it('역할별 변경 기능과 내 창작자 정보를 보호한다', () => {
    expect(requiredRoles('creators/me', 'GET')).toEqual(['CREATOR']);
    expect(requiredRoles('products', 'GET')).toBeNull();
    expect(requiredRoles('products', 'POST')).toEqual(['CREATOR']);
    expect(requiredRoles('admin/managers', 'POST')).toEqual(['MASTER']);
    expect(requiredRoles('admin/orders/id', 'PATCH')).toBeUndefined();
  });
  it('동일 출처의 변경 요청만 허용한다', () => {
    expect(validOrigin('https://cc.example', 'https://cc.example')).toBe(true);
    expect(validOrigin(null, 'https://cc.example')).toBe(false);
    expect(validOrigin('https://evil.example', 'https://cc.example')).toBe(
      false,
    );
  });
  it('로그인 반환 주소로 외부 사이트와 API를 허용하지 않는다', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/api/auth/logout',
      '/login',
      '/\t/evil.example',
      '/foo/../api/auth/logout',
      '/x\nLocation:evil',
    ])
      expect(safeReturn(value)).toBe('/');
    expect(safeReturn('/checkout?items=abc')).toBe('/checkout?items=abc');
  });
  it('가입과 주문 필수값, 대표 옵션을 검증한다', () => {
    expect(
      signupSchema.safeParse({
        kind: 'customer',
        email: 'bad',
        password: '1234',
      }).success,
    ).toBe(false);
    expect(addressSchema.safeParse({}).success).toBe(false);
    expect(
      productSchema.safeParse({
        name: '상품',
        content: '설명',
        hashTags: ['문구'],
        skus: [{ name: '옵션', price: 1000, quantity: 3, isDefault: false }],
      }).success,
    ).toBe(false);
  });
  it('Spring Page와 Slice의 다음 페이지 유무를 구분한다', () => {
    expect(hasNext({ content: [], last: false }, 0)).toBe(true);
    expect(hasNext({ content: [], hasNext: false }, 0)).toBe(false);
    expect(hasNext({ content: [], totalPages: 3 }, 1)).toBe(true);
  });
});
