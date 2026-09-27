export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = '',
    public fields: Record<string, string>[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      body?.message ??
        (response.status === 401
          ? '로그인이 필요해요.'
          : response.status === 403
            ? '이 기능을 이용할 권한이 없어요.'
            : '서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'),
      response.status,
      body?.errorCode,
      body?.errors,
    );
  if (!body || !('data' in body))
    throw new ApiError('서버 응답을 확인하지 못했어요.', 502);
  return body.data as T;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api/backend/${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      '네트워크 연결을 확인해 주세요. 처리 결과는 다시 조회해 주세요.',
      0,
    );
  }
  return parseResponse<T>(response);
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
