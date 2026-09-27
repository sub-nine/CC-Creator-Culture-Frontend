import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requiredRoles, validOrigin } from '@/lib/access';
import { gateway, clearSession } from '@/lib/server';
import { ApiError } from '@/lib/api';
import type { User } from '@/lib/types';
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  let path = parts.join('/');
  if (path === 'notifications') path += '/';
  const roles = requiredRoles(path, request.method);
  if (roles === undefined)
    return NextResponse.json(
      { message: '허용하지 않은 요청입니다.' },
      { status: 404 },
    );
  if (
    !['GET', 'HEAD'].includes(request.method) &&
    !validOrigin(
      request.headers.get('origin'),
      process.env.APP_ORIGIN ?? request.nextUrl.origin,
    )
  )
    return NextResponse.json(
      { message: '요청 출처를 확인할 수 없습니다.' },
      { status: 403 },
    );
  try {
    if (roles) {
      const user = await gateway<User>('users/me', {}, true);
      if (!roles.includes(user.role))
        throw new ApiError('이 기능을 이용할 권한이 없어요.', 403);
    }
    const headers = new Headers();
    const type = request.headers.get('content-type');
    if (type) {
      if (!/^(application\/json|multipart\/form-data)/.test(type))
        throw new ApiError('지원하지 않는 요청 형식입니다.', 415);
      headers.set('Content-Type', type);
    }
    const key = request.headers.get('Idempotency-Key');
    if (key) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(key))
        throw new ApiError('요청 식별자가 올바르지 않아요.', 400);
      headers.set('Idempotency-Key', key);
    }
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    if (body && body.byteLength > 30 * 1024 * 1024)
      throw new ApiError('첨부 파일이 너무 커요.', 413);
    const data = await gateway<unknown>(
      `${path}${request.nextUrl.search}`,
      { method: request.method, headers, body },
      true,
    );
    if (path === 'users/me' && request.method === 'DELETE')
      await clearSession();
    return NextResponse.json(
      { data: data ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    const error =
      e instanceof ApiError
        ? e
        : new ApiError('요청을 처리하지 못했어요.', 500);
    if (error.status === 401 && (await cookies()).has('cc_access'))
      await clearSession();
    return NextResponse.json(
      { message: error.message, errorCode: error.code, errors: error.fields },
      { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
