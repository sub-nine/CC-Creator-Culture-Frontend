import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ApiError, parseResponse } from './api';
import type { User, Role } from './types';
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export async function rawGateway(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(
      `${(process.env.GATEWAY_URL ?? 'http://localhost:8080').replace(/\/$/, '')}/api/v1/${path}`,
      {
        ...options,
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        redirect: 'manual',
      },
    );
  } catch {
    throw new ApiError(
      '서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      503,
      'GATEWAY_UNAVAILABLE',
    );
  }
}
export async function saveSession(
  accessToken: string,
  expiresIn: number,
  refreshToken?: string,
) {
  const jar = await cookies();
  jar.set('cc_access', accessToken, {
    ...cookieOptions,
    maxAge: Math.max(1, expiresIn - 5),
  });
  if (refreshToken)
    jar.set('cc_refresh', refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
}
export async function clearSession() {
  const jar = await cookies();
  for (const key of ['cc_access', 'cc_refresh'])
    jar.set(key, '', { ...cookieOptions, maxAge: 0 });
}
export async function refreshSession() {
  const refreshToken = (await cookies()).get('cc_refresh')?.value;
  if (!refreshToken) throw new ApiError('다시 로그인해 주세요.', 401);
  const response = await rawGateway('auth/reissue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (response.status === 400 || response.status === 401) {
    await clearSession();
    throw new ApiError('다시 로그인해 주세요.', 401);
  }
  const result = await parseResponse<{
    accessToken: string;
    expiresIn: number;
  }>(response);
  await saveSession(result.accessToken, result.expiresIn);
  return result.accessToken;
}
export async function gateway<T>(
  path: string,
  options: RequestInit = {},
  refresh = false,
): Promise<T> {
  const jar = await cookies();
  const headers = new Headers(options.headers);
  const visitor = jar.get('visitor_cookie')?.value;
  if (visitor && /^guest:[a-f0-9-]{36}$/i.test(visitor))
    headers.set('Cookie', `visitor_cookie=${visitor}`);
  let response = await rawGateway(
    path,
    { ...options, headers },
    jar.get('cc_access')?.value,
  );
  if (response.status === 401 && refresh && jar.has('cc_refresh'))
    response = await rawGateway(
      path,
      { ...options, headers },
      await refreshSession(),
    );
  return parseResponse<T>(response);
}
export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  if (!jar.has('cc_access')) return null;
  try {
    return await gateway<User>('users/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent((await headers()).get('x-cc-path') ?? '/')}`,
    );
  if (roles && !roles.includes(user.role)) redirect('/forbidden');
  return user;
}
export async function safeGateway<T>(
  path: string,
): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await gateway<T>(path), error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : '조회하지 못했어요.',
    };
  }
}
