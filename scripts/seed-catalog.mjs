import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// 실수로 공유 환경에 실행하지 않도록 목적지를 로컬 Gateway로 고정한다.
const base = 'http://127.0.0.1:8080/api/v1';
const root = new URL('../', import.meta.url);
const stateFile = new URL('.local/catalog-state.json', root);
const catalog = JSON.parse(
  await readFile(new URL('catalog.json', import.meta.url), 'utf8'),
);
const mode = process.argv[2];
assert(
  [undefined, '--apply', '--verify'].includes(mode),
  '지원하는 옵션은 --apply, --verify입니다.',
);
assert.equal(catalog.products.length, 12);
assert.equal(new Set(catalog.products.map((p) => p.slug)).size, 12);
for (const product of catalog.products) {
  assert(catalog.creators.some((c) => c.slug === product.creator));
  assert(product.name.length <= 100 && product.content.length <= 5000);
  assert(product.hashTags.every((tag) => /^[\p{L}\p{N}]{1,10}$/u.test(tag)));
  assert(
    product.options.every(
      ([name, price, quantity]) =>
        name.length <= 25 &&
        Number.isSafeInteger(price) &&
        price > 0 &&
        Number.isInteger(quantity) &&
        quantity > 0,
    ),
  );
  assert(
    (await readFile(new URL(`public/images/catalog/${product.slug}.png`, root)))
      .length > 0,
  );
}
if (!mode) {
  console.log(
    '카탈로그 12개와 이미지 검증 완료. --apply로 로컬 등록, --verify로 등록 결과를 확인합니다.',
  );
  process.exit(0);
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`${base}/${path}`, {
    method,
    body,
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `${method} ${path}: HTTP ${response.status} ${result.errorCode ?? ''}`,
    );
  return result.data;
}
const login = async (email, password) =>
  (await request('auth/login', { method: 'POST', body: { email, password } }))
    .accessToken;
let state;
try {
  state = JSON.parse(await readFile(stateFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT' || mode === '--verify') throw error;
  state = { creators: {}, products: {} };
}
async function save() {
  await mkdir(new URL('.local/', root), { recursive: true, mode: 0o700 });
  await writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
}
if (mode === '--apply') {
  const master = await login(
    process.env.LOCAL_MASTER_EMAIL ?? 'k6-test-master@example.com',
    process.env.LOCAL_MASTER_PASSWORD ?? 'Passw0rd!',
  );
  const tokens = {};
  for (const [index, creator] of catalog.creators.entries()) {
    let account = state.creators[creator.slug];
    if (!account) {
      account = {
        email: `cc-catalog-${creator.slug}@example.com`,
        password: `Cc!${randomBytes(20).toString('hex')}`,
      };
      const result = await request('auth/signup/creator', {
        method: 'POST',
        body: {
          ...account,
          nickname: `CC카탈로그${creator.slug}`,
          phone: `010-0000-09${21 + index}`,
          address: '로컬 예시 상점',
          creatorName: creator.name,
          businessRegistrationNumber: `000-00-009${21 + index}`,
        },
      });
      account.creatorId = result.creatorId;
      state.creators[creator.slug] = account;
      await save();
    }
    if (!account.approved) {
      await request(`admin/creators/${account.creatorId}/approval`, {
        method: 'PATCH',
        token: master,
        body: { approvalStatus: 'APPROVED' },
      });
      account.approved = true;
      await save();
    }
    tokens[creator.slug] = await login(account.email, account.password);
  }
  // 최신순 목록에서 카탈로그에 정의한 순서대로 보이게 등록한다.
  for (const product of [...catalog.products].reverse()) {
    if (state.products[product.slug]) continue;
    const token = tokens[product.creator];
    const creatorName = catalog.creators.find(
      (c) => c.slug === product.creator,
    ).name;
    const existing = await request(
      `products?keyword=${encodeURIComponent(product.name)}&size=50`,
    );
    const match = existing.content.find(
      (p) => p.name === product.name && p.creatorName === creatorName,
    );
    if (match) {
      state.products[product.slug] = match.productId;
      await save();
      continue;
    }
    const body = new FormData();
    body.append(
      'request',
      new Blob(
        [
          JSON.stringify({
            name: product.name,
            content: product.content,
            hashTags: product.hashTags,
            skus: product.options.map(([name, price, quantity], index) => ({
              name,
              price,
              quantity,
              isDefault: index === 0,
            })),
          }),
        ],
        { type: 'application/json' },
      ),
      'request.json',
    );
    body.append(
      'images',
      new Blob(
        [
          await readFile(
            new URL(`public/images/catalog/${product.slug}.png`, root),
          ),
        ],
        { type: 'image/png' },
      ),
      `${product.slug}.png`,
    );
    const result = await request('products', { method: 'POST', token, body });
    state.products[product.slug] = result.productId;
    await save();
    console.log(`등록 완료: ${product.name}`);
  }
}
for (const product of catalog.products) {
  const id = state.products[product.slug];
  assert(id, `미등록 상품: ${product.name}`);
  const detail = await request(`products/${id}`);
  assert.equal(detail.name, product.name);
  assert.equal(detail.content, product.content);
  assert.equal(detail.skus.length, product.options.length);
  for (const [name, price] of product.options)
    assert(detail.skus.some((sku) => sku.name === name && sku.price === price));
  assert.equal(detail.images.length, 1);
  const image = await fetch(detail.images[0].imageUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(20000),
  });
  assert(
    image.ok && image.headers.get('content-type')?.startsWith('image/'),
    `${product.name} 이미지 로딩 실패`,
  );
}
const firstPage = await request('products?sort=createdAt,desc');
assert(
  firstPage.content.every((p) =>
    Object.values(state.products).includes(p.productId),
  ),
  '최신 목록에 기존 상품이 섞여 있습니다.',
);
console.log(
  '검증 완료: 예시 상품 12개, 옵션 24개, 이미지 12개, 최신 상품 목록',
);
