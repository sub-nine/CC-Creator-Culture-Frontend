import { NextRequest, NextResponse } from 'next/server';
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-cc-path', request.nextUrl.pathname + request.nextUrl.search);
  const updates: { name: string; value: string; maxAge: number }[] = [];
  if (
    !/^guest:[a-f0-9-]{36}$/i.test(
      request.cookies.get('visitor_cookie')?.value ?? '',
    )
  )
    updates.push({
      name: 'visitor_cookie',
      value: `guest:${crypto.randomUUID()}`,
      maxAge: 2592000,
    });
  if (
    !request.cookies.has('cc_access') &&
    request.cookies.has('cc_refresh') &&
    !request.nextUrl.pathname.startsWith('/api/')
  ) {
    try {
      const r = await fetch(
        `${(process.env.GATEWAY_URL ?? 'http://localhost:8080').replace(/\/$/, '')}/api/v1/auth/reissue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: request.cookies.get('cc_refresh')!.value,
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        },
      );
      if (r.ok) {
        const { data } = await r.json();
        updates.push({
          name: 'cc_access',
          value: data.accessToken,
          maxAge: Math.max(1, data.expiresIn - 5),
        });
      } else if (r.status === 401 || r.status === 400)
        updates.push({ name: 'cc_refresh', value: '', maxAge: 0 });
    } catch {
      /* 연결 실패 시 세션을 버리지 않고 화면에서 재시도할 수 있게 한다. */
    }
  }
  updates.forEach((c) => request.cookies.set(c.name, c.value));
  headers.set('cookie', request.cookies.toString());
  const response = NextResponse.next({ request: { headers } });
  updates.forEach((c) =>
    response.cookies.set(c.name, c.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: c.maxAge,
    }),
  );
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|fonts/).*)'],
};
