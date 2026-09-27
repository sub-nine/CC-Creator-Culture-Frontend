import { test, expect, type Page } from '@playwright/test';
const product = '01999999-0000-7000-8000-000000000001';
const item = '01999999-0000-7000-8000-000000000008';
const coupon = '01999999-0000-7000-8000-000000000006';
const origin = 'http://localhost:3101';
async function login(page: Page, role = 'customer') {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel('비밀번호', { exact: true }).fill('Test1234!');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(
    role === 'creator'
      ? /studio\/products/
      : role === 'manager' || role === 'master'
        ? /admin\/orders/
        : /localhost:3101\/$/,
  );
}
async function checkout(page: Page) {
  await login(page);
  await page.goto(`/products/${product}`);
  await page.getByRole('button', { name: '장바구니 담기' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '장바구니에 담았어요' }),
  ).toContainText('장바구니에 담았어요');
  await page
    .locator('.header-actions')
    .getByRole('link', { name: '장바구니' })
    .click();
  await page.getByRole('link', { name: '주문하기' }).click();
  await page.getByLabel('우편번호', { exact: true }).fill('00000');
  await page.getByLabel('식물 드로잉 노트 쿠폰').selectOption(coupon);
}
test.beforeEach(async ({ request }) => {
  await request.get('http://127.0.0.1:18181/__reset');
});
test('공개 상품 SSR, 검색 빈 상태와 반응형 레이아웃', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(await response.text()).toContain('식물 드로잉 노트');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '취향을 발견하고',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect
      .poll(() =>
        page
          .locator('.hero img')
          .evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
      )
      .toBe(true);
    await page.locator('.banner').scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator('.banner img')
          .evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
      )
      .toBe(true);
    await page.locator('.site-header').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto('/products?keyword=없는상품');
  await expect(
    page.getByRole('heading', { name: '검색 결과가 없어요' }),
  ).toBeVisible();
});
test('인증 세션은 HttpOnly 쿠키이며 변경 요청과 운영자 접근을 제한한다', async ({
  page,
  context,
}) => {
  await page.goto('/cart');
  await expect(page).toHaveURL(/login\?next=/);
  await login(page);
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'cc_access')).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain('cc_access');
  expect(
    (
      await page.request.post('/api/backend/cart/items', {
        headers: { Origin: 'https://evil.example' },
        data: { skuId: product, quantity: 1 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/backend/admin/managers', {
        headers: { Origin: origin, 'X-User-Role': 'MASTER' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get('/api/backend/internal/users')).status()).toBe(
    404,
  );
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/forbidden/);
});
test('토큰이 만료되면 보관된 갱신 토큰으로 화면 진입을 복구한다', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'cc_refresh',
      value: 'refresh-CUSTOMER',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/account/profile');
  await expect(page.getByRole('heading', { name: '내 정보' })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === 'cc_access')).toBe(
    true,
  );
});
test('옵션, 장바구니, 쿠폰, 배송지, 주문과 결제 성공이 연결된다', async ({
  page,
  request,
}) => {
  await checkout(page);
  await page.getByRole('button', { name: '주문 생성하기' }).click();
  await expect(page).toHaveURL(/payment\/ORDER-NEW-1$/);
  await expect(page.getByText('16,200원', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '모의 결제 성공 처리' }).click();
  await expect(page).toHaveURL(/result$/);
  await expect(
    page.getByRole('heading', { name: '결제 완료', exact: true }),
  ).toBeVisible();
  const state = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data;
  expect(
    state.calls.find((c: { path: string }) => c.path === 'orders'),
  ).toMatchObject({
    key: expect.any(String),
    body: {
      items: [{ userCouponId: coupon }],
      shippingAddress: { postalCode: '00000' },
    },
  });
  expect(state.cart).toHaveLength(0);
});
test('주문 응답이 유실되면 입력을 고정하고 동일한 요청 키로 재시도한다', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:18181/__reset?scenario=uncertain');
  await checkout(page);
  await page.getByRole('button', { name: '주문 생성하기' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    '결과를 확인하지 못했어요',
  );
  await expect(page.getByLabel('수령인', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '같은 주문 다시 확인' }).click();
  await expect(page).toHaveURL(/payment\/ORDER-NEW-1$/);
  const calls = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data.calls.filter((c: { path: string }) => c.path === 'orders');
  expect(calls).toHaveLength(2);
  expect(calls[0].key).toBe(calls[1].key);
  expect(calls[0].body).toEqual(calls[1].body);
});
test('결제 실패와 주문 만료를 구분한다', async ({ page }) => {
  await checkout(page);
  await page.getByRole('button', { name: '주문 생성하기' }).click();
  await page.getByRole('button', { name: '모의 결제 실패 처리' }).click();
  await expect(
    page.getByRole('heading', { name: '결제 실패', exact: true }),
  ).toBeVisible();
  await page.goto('/payment/ORDER-EXPIRED/result');
  await expect(
    page.getByRole('heading', { name: '기한 만료', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '모의 결제 성공 처리' }),
  ).toHaveCount(0);
});
test('배송 전 전체 주문 취소에 멱등 키를 보낸다', async ({ page, request }) => {
  await login(page);
  await page.goto('/account/orders/ORDER-PAID');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '전체 주문 취소' }).click();
  await expect(page.getByText('취소 완료', { exact: true })).toBeVisible();
  const calls = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data.calls;
  expect(
    calls.find((c: { path: string }) => c.path.endsWith('/cancel')).key,
  ).toBeTruthy();
});
test('찜, 팔로우, 후기와 알림을 관리한다', async ({ page }) => {
  await login(page);
  await page.goto(`/products/${product}`);
  const wish = page.getByRole('button', { name: '찜하기' });
  await wish.click();
  await expect(wish).toHaveAttribute('aria-pressed', 'true');
  await wish.click();
  await expect(wish).toHaveAttribute('aria-pressed', 'false');
  await wish.click();
  await expect(wish).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/account/wishlist');
  await expect(
    page.getByRole('heading', { name: '식물 드로잉 노트' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '찜 해제' }).click();
  await expect(
    page.getByRole('heading', { name: '마음에 드는 상품을 모아 보세요' }),
  ).toBeVisible();
  await page.goto('/creators/01999999-0000-7000-8000-000000000004');
  await page.getByRole('button', { name: '팔로우', exact: true }).click();
  await page.goto('/account/follows');
  await expect(page.getByRole('heading', { name: '작은 정원' })).toBeVisible();
  await page.goto('/account/orders/ORDER-DONE');
  await page.getByRole('link', { name: '구매 후기 작성' }).click();
  await page.getByLabel('후기', { exact: true }).fill('정성스러운 상품이에요.');
  await page.getByRole('button', { name: '후기 등록' }).click();
  await expect(page).toHaveURL(/account\/reviews$/);
  await expect(
    page.getByText('정성스러운 상품이에요.', { exact: true }).first(),
  ).toBeVisible();
  await page.goto('/account/notifications');
  await page.getByRole('button', { name: '모두 읽음 처리' }).click();
  await expect(page.getByText('읽음', { exact: true })).toBeVisible();
});
test('창작자는 상품과 옵션, 재고, 배송 상태를 관리한다', async ({
  page,
  request,
}) => {
  await login(page, 'creator');
  await page.goto(`/studio/products/${product}`);
  await page.getByLabel('상품명 *', { exact: true }).fill('수정한 식물 노트');
  await page.getByRole('button', { name: '저장', exact: true }).first().click();
  await expect(page.getByLabel('상품명 *', { exact: true })).toHaveValue(
    '수정한 식물 노트',
  );
  await page.getByText('재고 조정', { exact: true }).click();
  await page.getByLabel('변경 수량 *').fill('5');
  await page.getByRole('button', { name: '재고 반영' }).click();
  await expect(page.getByText('현재 재고 15개 / 대표 옵션')).toBeVisible();
  await page.goto(`/studio/orders/${item}`);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '배송 준비 중 처리' }).click();
  await expect(page.getByText('배송 준비 중', { exact: true })).toBeVisible();
  const calls = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data.calls;
  expect(
    calls.find((c: { path: string }) => c.path.includes('stock/adjustments'))
      .body,
  ).toEqual({ quantity: 5 });
});
async function fillNewProduct(page: Page) {
  await login(page, 'creator');
  await page.goto('/studio/products/new');
  await page.getByLabel('상품명 *', { exact: true }).fill('새로운 드로잉 노트');
  await page.getByLabel('상품 설명 *').fill('새로운 상품 설명');
  await page.getByLabel('해시태그 *').fill('문구,노트');
  await page.getByLabel('가격 (원) *').fill('12000');
  await page.getByLabel('초기 재고 *').fill('10');
  await page
    .getByLabel('JPG 또는 PNG, 최대 5개')
    .setInputFiles('tests/fixtures/upload.png');
  await page.getByRole('button', { name: '상품 등록', exact: true }).click();
}
test('상품 등록은 이미지를 먼저 올리고 업로드 ID를 JSON으로 전송한다', async ({
  page,
  request,
}) => {
  await fillNewProduct(page);
  await expect(page).toHaveURL(new RegExp(`studio/products/${product}$`));
  await expect(page.getByLabel('상품명 *', { exact: true })).toHaveValue(
    '새로운 드로잉 노트',
  );
  const state = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data;
  const presigned = state.calls.find(
    (c: { path: string }) => c.path === 'images/presigned-url',
  );
  expect(presigned.body).toEqual({
    contentType: 'image/png',
    fileSize: expect.any(Number),
  });
  expect(state.uploads).toEqual([
    { uploadId: item, method: 'PUT', contentType: 'image/png' },
  ]);
  const created = state.calls.find(
    (c: { path: string; method: string }) =>
      c.path === 'products' && c.method === 'POST',
  );
  expect(created.body.imageUploadIds).toEqual([item]);
});
test('이미지 업로드가 실패하면 상품 등록을 요청하지 않는다', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:18181/__reset?scenario=upload-fail');
  await fillNewProduct(page);
  await expect(page.locator('p.error[role="alert"]')).toContainText(
    '이미지를 올리지 못했어요.',
  );
  const state = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data;
  expect(
    state.calls.some(
      (c: { path: string; method: string }) =>
        c.path === 'products' && c.method === 'POST',
    ),
  ).toBe(false);
});
test('운영자는 분류를 승인하고 최고 관리자만 계정 생성 화면에 접근한다', async ({
  page,
  request,
}) => {
  await login(page, 'manager');
  await page.goto('/admin/categories');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '승인', exact: true }).click();
  await expect(page.getByText('처리했어요.').first()).toBeVisible();
  await page.goto('/admin/managers');
  await expect(page).toHaveURL(/forbidden/);
  await login(page, 'master');
  await page.goto('/admin/managers');
  await expect(
    page.getByRole('heading', { name: '운영자 계정 생성' }),
  ).toBeVisible();
  await page.goto('/admin/orders/ORDER-PAID');
  await expect(page.getByText('****', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: '전체 주문 취소' }),
  ).toHaveCount(0);
  const calls = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data.calls;
  expect(
    calls.some(
      (c: { path: string }) =>
        c.path.includes('merge-requests') && c.path.endsWith('approve'),
    ),
  ).toBe(true);
});
test('서버 조회 실패 시 오류와 재시도 행동을 제공한다', async ({ page }) => {
  await login(page);
  await page.route('**/api/backend/wishlist*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: '잠시 연결되지 않아요.' }),
    }),
  );
  await page.goto('/account/wishlist');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    '잠시 연결되지 않아요.',
  );
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('각 역할의 주요 화면이 모바일에서 가로 넘침 없이 열린다', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const routes: Record<string, string[]> = {
    customer: [
      '/cart',
      '/checkout',
      '/coupons',
      '/account/orders',
      '/account/orders/ORDER-DONE',
      '/account/coupons',
      '/account/follows',
      '/account/reviews',
      '/account/notifications',
      '/account/profile',
      '/payment/ORDER-PAID/result',
    ],
    creator: [
      '/studio/products',
      '/studio/products/new',
      `/studio/products/${product}`,
      '/studio/orders',
      `/studio/orders/${item}`,
      '/studio/profile',
    ],
    master: [
      '/admin/creators',
      '/admin/products',
      '/admin/categories',
      '/admin/coupons',
      '/admin/orders',
      '/admin/orders/ORDER-PAID',
      '/admin/managers',
    ],
  };
  for (const [role, paths] of Object.entries(routes)) {
    await login(page, role);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      for (const path of paths) {
        await page.goto(path);
        await expect(
          page.getByRole('main').getByRole('heading', { level: 1 }),
        ).toBeVisible();
        await expect(
          page.getByRole('main').getByText('정보를 불러오고 있어요.'),
        ).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} at ${width}`,
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});
test('가입 폼의 유효성 검사와 창작자 승인 안내가 연결된다', async ({
  page,
}) => {
  await page.goto('/signup?kind=creator');
  await page
    .getByLabel('이메일 *', { exact: true })
    .fill('newcreator@example.test');
  await page.getByLabel('비밀번호 *').fill('Test1234!');
  await page.getByLabel('닉네임 *').fill('새 창작자');
  await page.getByLabel('연락처 *').fill('010-0000-0000');
  await page.getByLabel('주소 *', { exact: true }).fill('테스트 가입 주소');
  await page.getByLabel('상호명 *').fill('새 창작 상점');
  await page.getByLabel('사업자등록번호 *').fill('000-00-00000');
  await page.getByRole('button', { name: '창작자 가입 신청' }).click();
  await expect(
    page.getByRole('heading', { name: '창작자 가입을 신청했어요' }),
  ).toBeVisible();
  await expect(page.getByText(/창작자번호 0199/)).toBeVisible();
});

test('상품 이미지 순서 변경과 삭제를 실제 요청 형식으로 전송한다', async ({
  page,
  request,
}) => {
  await request.get('http://127.0.0.1:18181/__reset?scenario=images');
  await login(page, 'creator');
  await page.goto(`/studio/products/${product}`);
  const reordered = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/products/${product}/images`) &&
      response.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: '앞으로', exact: true }).click();
  expect((await reordered).ok()).toBe(true);
  let state = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data;
  expect(state.product.images[0].imageId).toBe(
    '01999999-0000-7000-8000-000000000010',
  );
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '삭제', exact: true }).first().click();
  await expect(
    page.getByRole('button', { name: '삭제', exact: true }),
  ).toHaveCount(1);
  state = (await (await request.get('http://127.0.0.1:18181/__state')).json())
    .data;
  expect(state.product.images).toHaveLength(1);
});

test('상점 메뉴의 키보드 조작과 검색 및 상세 이동이 연결된다', async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products');
    await expect(
      page
        .getByRole('navigation', { name: '주요 메뉴' })
        .getByRole('link', { name: '상품 탐색', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const menu = page.locator('.browse-menu summary');
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.browse-popover')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.browse-popover')).toBeHidden();
    await expect(menu).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/products-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel('상품 검색어').fill('없는상품');
  await page.getByLabel('정렬', { exact: true }).selectOption('name,asc');
  await page.getByRole('button', { name: '적용', exact: true }).click();
  await expect(page).toHaveURL(/keyword=.*&sort=name%2Casc/);
  await expect(
    page.getByRole('heading', { name: '검색 결과가 없어요' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '검색 초기화' }).click();
  await page.getByRole('link', { name: '식물 드로잉 노트 상세 보기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '식물 드로잉 노트',
  );
  await page
    .getByRole('navigation', { name: '상품 상세 메뉴' })
    .getByRole('link', { name: '구매 후기' })
    .click();
  await expect(page).toHaveURL(/#product-reviews$/);
  await expect(page.locator('#product-reviews')).toBeInViewport();
});

test('상품 옵션 선택과 수량 제한이 키보드와 모바일에서 유지된다', async ({
  page,
  request,
}) => {
  await login(page);
  await request.get('http://127.0.0.1:18181/__reset?scenario=options');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/products/${product}`);
    const picker = page.locator('.option-picker summary');
    await picker.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/purchase-${width}.png`,
      fullPage: true,
    });
    await picker.click();
    await expect(page.getByRole('radio', { name: /기본/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /차콜/ })).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/options-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(picker).toBeFocused();
    await expect(page.locator('.option-list')).toBeHidden();
  }
  const picker = page.locator('.option-picker summary');
  await page.getByRole('button', { name: '수량 늘리기', exact: true }).click();
  await expect(page.getByLabel('선택 수량')).toHaveText('2');
  await picker.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: /기본/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /라벤더/ })).toBeChecked();
  await expect(page.getByLabel('선택 수량')).toHaveText('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.option-list')).toBeHidden();
  await expect(picker).toBeFocused();
  await expect(page.locator('.purchase-total')).toContainText('23,000원');
  await page.getByRole('button', { name: '수량 늘리기', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '수량 늘리기', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.purchase-total')).toContainText('46,000원');
  await picker.click();
  await page.getByRole('radio', { name: /기본/ }).check();
  await expect(page.locator('.option-list')).toBeHidden();
  await expect(page.getByLabel('선택 수량')).toHaveText('1');
  await expect(
    page.getByRole('button', { name: '수량 줄이기', exact: true }),
  ).toBeDisabled();
  await picker.click();
  await page.getByRole('radio', { name: /라벤더/ }).check();
  await page.getByRole('button', { name: '수량 늘리기', exact: true }).click();
  await page.getByRole('button', { name: '장바구니 담기' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '장바구니에 담았어요' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '담았어요' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '장바구니에 담았어요' }),
  ).toBeVisible();
  const state = (
    await (await request.get('http://127.0.0.1:18181/__state')).json()
  ).data;
  expect(
    state.calls.find((call: { path: string }) => call.path === 'cart/items')
      .body,
  ).toEqual({ skuId: '01999999-0000-7000-8000-000000000010', quantity: 2 });
  expect(
    state.calls.find(
      (call: { path: string; method: string }) =>
        call.path.endsWith('000000000007') && call.method === 'PATCH',
    ).body,
  ).toEqual({ quantity: 4 });
});

test('전체 메뉴가 호버로 펼쳐지고 상품 분류와 터치 탐색이 연결된다', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1276, height: 1196 });
  await page.goto('/products');
  const trigger = page.locator('.browse-menu summary');
  const panel = page.locator('.browse-popover');
  await trigger.hover();
  await expect(panel).toBeVisible();
  expect((await panel.boundingBox())!.width).toBe(1276);
  await panel.getByRole('link', { name: '스티커', exact: true }).hover();
  await expect(panel).toBeVisible();
  await expect(panel.locator('.browse-column')).toHaveCount(6);
  await expect(panel.locator('.browse-promo')).toHaveCount(4);
  await expect
    .poll(() =>
      panel
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/mega-menu-desktop.png' });
  await page.getByRole('textbox', { name: '상품 검색', exact: true }).hover();
  await expect(panel).toBeHidden();
  await trigger.hover();
  await panel.getByRole('link', { name: '노트', exact: true }).click();
  await expect(page).toHaveURL(/\/products\?keyword=%EB%85%B8%ED%8A%B8/);
  await expect(panel).toBeHidden();

  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 850 },
  });
  const touchPage = await touchContext.newPage();
  try {
    await touchPage.goto(`${origin}/products`);
    await touchPage.locator('.browse-menu summary').tap();
    await expect(touchPage.locator('.browse-popover')).toBeVisible();
    expect(
      await touchPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await touchPage.screenshot({ path: 'test-results/mega-menu-mobile.png' });
    await touchPage
      .locator('.browse-popover')
      .getByRole('link', { name: '키링', exact: true })
      .tap();
    await expect(touchPage).toHaveURL(/keyword=%ED%82%A4%EB%A7%81/);
    await expect(touchPage.locator('.browse-popover')).toBeHidden();
  } finally {
    await touchContext.close();
  }
});
