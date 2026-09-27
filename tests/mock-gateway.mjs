import http from 'node:http';
import { readFileSync } from 'node:fs';
// E2E 전용 대역. 실제 서비스나 사용자 데이터를 읽거나 변경하지 않는다.
const ids = {
  product: '01999999-0000-7000-8000-000000000001',
  sku: '01999999-0000-7000-8000-000000000002',
  user: '01999999-0000-7000-8000-000000000003',
  creator: '01999999-0000-7000-8000-000000000004',
  coupon: '01999999-0000-7000-8000-000000000005',
  userCoupon: '01999999-0000-7000-8000-000000000006',
  cart: '01999999-0000-7000-8000-000000000007',
  item: '01999999-0000-7000-8000-000000000008',
  category: '01999999-0000-7000-8000-000000000009',
  tag: '01999999-0000-7000-8000-000000000010',
};
const address = {
  recipientName: '테스트 구매자',
  recipientPhone: '010-0000-0000',
  postalCode: '00000',
  addressLine1: '테스트 배송지',
  addressLine2: '테스트 호',
};
const page = (content) => ({
  content,
  totalPages: 1,
  totalElements: content.length,
  pageSize: 20,
  pageNumber: 0,
  hasNext: false,
  last: true,
});
let state;
function reset(scenario = '') {
  state = {
    scenario,
    calls: [],
    uploads: [],
    cart: [],
    orders: {},
    keys: {},
    reviews: [],
    wishlist: [],
    follows: [],
    notices: [
      {
        id: ids.item,
        title: '새로운 소식',
        content: '테스트 알림입니다.',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
    product: {
      productId: ids.product,
      creatorId: ids.user,
      creatorName: '작은 정원',
      name: '식물 드로잉 노트',
      content: '손으로 그린 식물의 이야기를 담은 노트입니다.',
      status: 'ACTIVE',
      viewCount: 0,
      averageRating: 0,
      reviewCount: 0,
      categories: [],
      hashtags: [{ hashtagId: ids.tag, name: '문구' }],
      skus: [
        {
          skuId: ids.sku,
          name: '기본',
          price: 18000,
          isDefault: true,
          quantity: 10,
        },
      ],
      images: [],
    },
    coupon: {
      couponId: ids.coupon,
      couponName: '취향 발견 쿠폰',
      discountRate: 10,
      totalQuantity: 100,
      issuedQuantity: 1,
      startedAt: '2026-01-01T00:00:00Z',
      expiredAt: '2036-01-01T00:00:00Z',
    },
  };
  if (scenario === 'options')
    state.product.skus.push(
      {
        skuId: ids.tag,
        name: '라벤더',
        price: 23000,
        quantity: 2,
        isDefault: false,
      },
      {
        skuId: ids.category,
        name: '차콜',
        price: 25000,
        quantity: 0,
        isDefault: false,
      },
    );
  if (scenario === 'images')
    state.product.images = [
      {
        imageId: ids.item,
        imageUrl: 'http://localhost:18181/fixture.png',
        sortOrder: 0,
      },
      {
        imageId: ids.tag,
        imageUrl: 'http://localhost:18181/fixture.png',
        sortOrder: 1,
      },
    ];
  for (const [number, status] of [
    ['ORDER-PAID', 'PAID'],
    ['ORDER-FAILED', 'FAILED'],
    ['ORDER-EXPIRED', 'EXPIRED'],
    ['ORDER-DONE', 'COMPLETED'],
  ])
    state.orders[number] = makeOrder(number, status);
}
function makeOrder(number, status = 'PENDING_PAYMENT', body = {}) {
  return {
    orderNumber: number,
    status,
    originalAmount: 18000,
    discountAmount: 1800,
    paymentAmount: 16200,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + (status === 'EXPIRED' ? -1000 : 600000),
    ).toISOString(),
    shippingAddress: body.shippingAddress ?? address,
    creatorGroups: [
      {
        creatorId: ids.user,
        items: [
          {
            orderItemId: ids.item,
            productId: ids.product,
            skuId: ids.sku,
            productName: state.product.name,
            skuName: '기본',
            unitPrice: 18000,
            quantity: 1,
            discountAmount: 1800,
            paymentAmount: 16200,
            status: status === 'COMPLETED' ? 'COMPLETED' : 'ORDERED',
          },
        ],
      },
    ],
  };
}
reset();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:18181');
  const path = url.pathname.replace('/api/v1/', '');
  const method = req.method;
  const reply = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data }));
  };
  const error = (message, status = 400, code = 'TEST_ERROR') => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message, errorCode: code }));
  };
  if (url.pathname === '/fixture.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(readFileSync(new URL('./fixtures/upload.png', import.meta.url)));
    return;
  }
  if (url.pathname === '/__reset') {
    reset(url.searchParams.get('scenario') ?? '');
    return reply(ids);
  }
  if (url.pathname === '/__state') return reply(state);
  // S3 presigned URL 대역. 브라우저가 다른 출처로 직접 PUT하므로 CORS 사전 요청에 응답한다.
  if (url.pathname.startsWith('/__upload/')) {
    const cors = {
      'Access-Control-Allow-Origin': req.headers.origin ?? '*',
      'Access-Control-Allow-Methods': 'PUT',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    for await (const chunk of req) void chunk;
    state.uploads.push({
      uploadId: url.pathname.slice('/__upload/'.length),
      method,
      contentType: req.headers['content-type'],
    });
    res.writeHead(state.scenario === 'upload-fail' ? 500 : 200, cors);
    return res.end();
  }
  let raw = Buffer.alloc(0);
  for await (const chunk of req) raw = Buffer.concat([raw, chunk]);
  let body = {};
  if (req.headers['content-type']?.startsWith('application/json')) {
    try {
      body = JSON.parse(raw.toString());
    } catch {
      return error('잘못된 요청');
    }
  }
  const role = req.headers.authorization?.replace('Bearer access-', '');
  if (path === 'auth/login')
    return reply({
      accessToken: `access-${body.email?.split('@')[0].toUpperCase()}`,
      refreshToken: `refresh-${body.email?.split('@')[0].toUpperCase()}`,
      expiresIn: 3600,
    });
  if (path === 'auth/reissue')
    return reply({
      accessToken: body.refreshToken?.replace('refresh-', 'access-'),
      expiresIn: 3600,
    });
  if (path.startsWith('auth/signup/'))
    return reply({ creatorId: ids.creator }, 201);
  if (
    !['CUSTOMER', 'CREATOR', 'MANAGER', 'MASTER'].includes(role) &&
    !(
      method === 'GET' &&
      /^(products|creators|categories|hashtags|leaderboards)/.test(path)
    )
  )
    return error('로그인이 필요해요.', 401);
  if (method !== 'GET' && !path.startsWith('auth/'))
    state.calls.push({
      path,
      method,
      body: path === 'admin/managers' ? {} : body,
      key: req.headers['idempotency-key'],
      trusted: req.headers['x-user-role'],
    });
  if (path === 'auth/logout') return reply(null);
  if (path === 'users/me') {
    if (method === 'DELETE') return reply(null);
    return reply({
      userId: ids.user,
      email: `${role?.toLowerCase()}@example.test`,
      nickname: '테스트 사용자',
      phone: '010-0000-0000',
      address: '테스트 배송지',
      slackId: '',
      role,
      ...(method === 'PATCH' ? body : {}),
    });
  }
  if (path === 'products' && method === 'GET')
    return reply(
      page(
        url.searchParams.get('keyword') === '없는상품'
          ? []
          : [
              {
                ...state.product,
                price: state.product.skus[0].price,
                quantity: state.product.skus[0].quantity,
                imageUrl: null,
              },
            ],
      ),
    );
  if (path === 'products' && method === 'POST') {
    state.product = {
      ...state.product,
      ...body,
      skus: body.skus.map((s, i) => ({
        ...s,
        skuId: i ? ids.tag : ids.sku,
      })),
    };
    return reply({ productId: ids.product }, 201);
  }
  if (path === 'images/presigned-url' && method === 'POST')
    return reply(
      {
        uploadId: ids.item,
        uploadUrl: `http://127.0.0.1:18181/__upload/${ids.item}`,
      },
      201,
    );
  if (path === `products/${ids.product}`) {
    if (method === 'GET') return reply(state.product);
    if (method === 'PATCH') Object.assign(state.product, body);
    return reply(null);
  }
  if (path.endsWith('/reviews') && method === 'GET')
    return reply(page(state.reviews));
  if (
    path === `products/${ids.product}/status` ||
    path === `admin/products/${ids.product}/status`
  ) {
    state.product.status = body.status;
    return reply(null);
  }
  if (path.includes('/skus') && path.startsWith('products/')) {
    if (method === 'PATCH') {
      Object.assign(
        state.product.skus.find((s) => path.endsWith(s.skuId)),
        body,
      );
    } else if (method === 'POST') {
      state.product.skus.push({ ...body, skuId: ids.tag });
    } else {
      state.product.skus = state.product.skus.filter(
        (s) => !path.endsWith(s.skuId),
      );
    }
    return reply(null);
  }
  if (path.startsWith('skus/')) {
    state.product.skus[0].quantity += body.quantity;
    return reply(null);
  }
  if (path.includes('/images')) {
    if (method === 'PATCH')
      state.product.images = body.imageIds.map((id, index) => ({
        ...state.product.images.find((i) => i.imageId === id),
        sortOrder: index,
      }));
    if (method === 'DELETE')
      state.product.images = state.product.images.filter(
        (i) => !path.endsWith(i.imageId),
      );
    return reply(null);
  }
  if (path === 'cart/items') {
    if (method === 'GET') return reply(state.cart);
    const found = state.cart.find((item) => item.skuId === body.skuId);
    if (found) {
      found.quantity += Number(body.quantity) || 1;
      return reply(found.cartId);
    }
    state.cart.push({
      cartId: ids.cart,
      skuId: body.skuId,
      creatorName: '작은 정원',
      productName: state.product.name,
      skuName: body.skuId === ids.tag ? '라벤더' : '기본',
      productStatus: 'ACTIVE',
      quantity: body.quantity,
      price: body.skuId === ids.tag ? 23000 : 18000,
    });
    return reply(ids.cart);
  }
  if (path === 'cart/items/delete') {
    state.cart = state.cart.filter((i) => !body.cartIds.includes(i.cartId));
    return reply(null);
  }
  if (path.startsWith('cart/items/')) {
    const cartId = path.slice('cart/items/'.length);
    const item =
      state.cart.find((entry) => entry.cartId === cartId) ?? state.cart[0];
    item.quantity = body.quantity;
    return reply(null);
  }
  if (path === 'user-coupons')
    return reply(
      page([
        {
          ...state.coupon,
          userCouponId: ids.userCoupon,
          status: 'ISSUED',
          expired: false,
        },
      ]),
    );
  if (path === 'coupons') {
    if (method === 'GET') return reply(page([state.coupon]));
    Object.assign(state.coupon, body);
    return reply(state.coupon);
  }
  if (path.startsWith('coupons/')) {
    if (path.endsWith('/issue')) {
      if (state.issued)
        return error('이미 받은 쿠폰이에요.', 409, 'COUPON_0004');
      state.issued = true;
      return reply({ userCouponId: ids.userCoupon });
    }
    if (method === 'PATCH') Object.assign(state.coupon, body);
    return reply(method === 'GET' ? state.coupon : null);
  }
  if (path === 'orders' && method === 'POST') {
    const key = req.headers['idempotency-key'];
    if (!key) return error('요청 키가 필요해요.');
    if (state.keys[key]) return reply(state.orders[state.keys[key]]);
    const number = `ORDER-NEW-${Object.keys(state.keys).length + 1}`;
    state.keys[key] = number;
    state.orders[number] = makeOrder(number, 'PENDING_PAYMENT', body);
    if (state.scenario === 'uncertain' && !state.failedOnce) {
      state.failedOnce = true;
      return error('결과를 확인하지 못했어요.', 503);
    }
    return reply(state.orders[number], 201);
  }
  if (path === 'orders' || path === 'admin/orders')
    return reply(page(Object.values(state.orders)));
  const orderMatch = path.match(
    /^(?:admin\/)?orders\/([^/]+)(?:\/(payments|cancel))?$/,
  );
  if (orderMatch) {
    const order = state.orders[orderMatch[1]];
    if (!order) return error('주문을 찾을 수 없어요.', 404);
    if (orderMatch[2] === 'payments') {
      order.status = body.result === 'SUCCESS' ? 'PAID' : 'FAILED';
      if (order.status === 'PAID') state.cart = [];
      else return error('모의 결제에 실패했어요.', 400, 'PAYMENT_0001');
    }
    if (orderMatch[2] === 'cancel') order.status = 'CANCELED';
    return reply(
      path.startsWith('admin/')
        ? {
            ...order,
            shippingAddress: {
              ...address,
              recipientPhone: '****',
              postalCode: '****',
              addressLine1: '****',
              addressLine2: '****',
            },
          }
        : order,
    );
  }
  if (path.startsWith('creator/order-items')) {
    const order = state.orders['ORDER-PAID'];
    const item = order.creatorGroups[0].items[0];
    if (method === 'PATCH') {
      item.status = body.status;
      order.status = 'PROCESSING';
    }
    const value = {
      ...item,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shippingAddress: address,
      createdAt: order.createdAt,
    };
    return reply(path === 'creator/order-items' ? page([value]) : value);
  }
  if (path === 'wishlist') {
    if (method === 'DELETE') state.wishlist = [];
    return reply(page(state.wishlist));
  }
  if (path.startsWith('wishlist/')) {
    state.wishlist = [
      {
        wishlistId: ids.item,
        productId: ids.product,
        productName: state.product.name,
        price: 18000,
        status: 'ACTIVE',
      },
    ];
    return reply(null);
  }
  if (path === 'follows') return reply(page(state.follows));
  if (path.startsWith('follows/')) {
    if (method === 'POST')
      state.follows = [
        {
          creatorId: ids.creator,
          creatorName: '작은 정원',
          followedAt: new Date().toISOString(),
        },
      ];
    if (method === 'DELETE') state.follows = [];
    return reply({ following: state.follows.length > 0 });
  }
  if (path === 'reviews/me') return reply(page(state.reviews));
  if (path === 'reviews' && method === 'POST') {
    state.reviews.push({
      ...body,
      reviewId: ids.item,
      productId: ids.product,
      userId: ids.user,
      createdAt: new Date().toISOString(),
    });
    return reply(ids.item);
  }
  if (path.startsWith('reviews/')) {
    if (method === 'DELETE') state.reviews = [];
    else Object.assign(state.reviews[0], body);
    return reply(null);
  }
  if (path.startsWith('notifications')) {
    if (method === 'PATCH') state.notices[0].read = true;
    return reply(
      path.endsWith('unread-count') ? { unreadCount: 1 } : page(state.notices),
    );
  }
  if (path === 'creators/me/follower-count') return reply({ followerCount: 3 });
  if (path.startsWith('creators')) {
    const creator = {
      creatorId: ids.creator,
      creatorName: '작은 정원',
      businessRegistrationNumber: '0000000000',
      ...body,
    };
    return reply(path === 'creators' ? page([creator]) : creator);
  }
  if (path.startsWith('leaderboards/'))
    return reply({
      period: 'WEEKLY',
      startDate: '2026-09-14',
      endDate: '2026-09-21',
      items: [{ ranking: 1, targetId: ids.category, name: '문구', score: 10 }],
    });
  if (path === 'categories')
    return reply(
      page([
        { id: ids.category, name: '문구', description: '일상을 기록하는 물건' },
      ]),
    );
  if (path.startsWith('categories/'))
    return reply({
      id: ids.category,
      name: '문구',
      description: '일상을 기록하는 물건',
      hashtags: [{ id: ids.tag, name: '노트', usageCount: 1 }],
    });
  if (path === 'hashtags')
    return reply(page([{ id: ids.tag, name: '노트', usageCount: 1 }]));
  if (path === 'admin/categories/merge-requests')
    return reply(
      page([
        {
          id: ids.item,
          categoryId: ids.category,
          categoryName: '문구',
          hashtagId: ids.tag,
          hashtagName: '노트',
          status: 'PENDING_APPROVAL',
          createdAt: new Date().toISOString(),
        },
      ]),
    );
  if (path.startsWith('admin/')) return reply(null);
  return error('테스트 대역에 없는 요청입니다.', 404);
});
server.listen(18181, '127.0.0.1', () =>
  console.log('Test-only gateway listening on 18181'),
);
