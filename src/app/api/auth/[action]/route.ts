import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rawGateway, saveSession, clearSession, gateway } from '@/lib/server';
import { parseResponse, ApiError } from '@/lib/api';
import { validOrigin } from '@/lib/access';
import { signupSchema } from '@/lib/schemas';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  if (
    !validOrigin(
      request.headers.get('origin'),
      process.env.APP_ORIGIN ?? request.nextUrl.origin,
    )
  )
    return NextResponse.json(
      { message: '요청 출처를 확인할 수 없습니다.' },
      { status: 403 },
    );
  const { action } = await params;
  try {
    if (action === 'logout') {
      try {
        await gateway('auth/logout', { method: 'POST' }, true);
      } finally {
        await clearSession();
      }
      return NextResponse.json({ data: null });
    }
    if (action === 'login') {
      const body = z
        .object({
          email: z.email().max(255),
          password: z.string().min(1).max(64),
        })
        .parse(await request.json());
      const data = await parseResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>(
        await rawGateway('auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      await saveSession(data.accessToken, data.expiresIn, data.refreshToken);
      return NextResponse.json(
        { data: { authenticated: true } },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (action === 'signup') {
      const body = signupSchema.parse(await request.json());
      const { kind, ...input } = body;
      const data = await parseResponse<unknown>(
        await rawGateway(`auth/signup/${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      );
      return NextResponse.json({ data }, { status: 201 });
    }
    return NextResponse.json(
      { message: '찾을 수 없는 요청입니다.' },
      { status: 404 },
    );
  } catch (e) {
    const error =
      e instanceof ApiError
        ? e
        : new ApiError(
            e instanceof z.ZodError
              ? '입력한 내용을 확인해 주세요.'
              : '요청을 처리하지 못했어요.',
            e instanceof z.ZodError ? 400 : 500,
          );
    return NextResponse.json(
      { message: error.message, errorCode: error.code, errors: error.fields },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
