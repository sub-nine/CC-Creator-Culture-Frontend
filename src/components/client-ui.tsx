'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { LoaderCircle, Package, ArrowRight } from 'lucide-react';
import { api, json, ApiError } from '@/lib/api';
import { message, hasNext } from '@/lib/utils';
import type { Page } from '@/lib/types';
export function useResource<T>(path: string, enabled = true) {
  return useQuery({ queryKey: [path], queryFn: () => api<T>(path), enabled });
}
export function Loading() {
  return (
    <div className="loading" role="status" aria-label="불러오는 중">
      <div className="skeleton" />
      <span className="help">정보를 불러오고 있어요.</span>
    </div>
  );
}
export function Retry() {
  const router = useRouter();
  return (
    <button className="button secondary" onClick={() => router.refresh()}>
      다시 시도
    </button>
  );
}
export function QueryState({
  query,
  empty = false,
  children,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
  empty?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <div className="empty-state">
        <Image
          src="/images/brand/error-state.png"
          alt=""
          width={140}
          height={140}
        />
        <h3>정보를 불러오지 못했어요</h3>
        <p role="alert">{query.error.message}</p>
        {query.error instanceof ApiError && query.error.status === 401 ? (
          <Link
            className="button"
            href={`/login?next=${encodeURIComponent(pathname)}`}
          >
            로그인
          </Link>
        ) : (
          <button className="button secondary" onClick={() => query.refetch()}>
            다시 시도
          </button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="empty-state">
        <Image
          src="/images/brand/empty-state.png"
          alt=""
          width={140}
          height={140}
        />
        <h3>아직 표시할 내용이 없어요</h3>
        <p>새로운 소식이 생기면 이곳에서 확인할 수 있어요.</p>
      </div>
    );
  return children;
}
export function Action({
  path,
  method = 'POST',
  body,
  children,
  confirmText,
  onSuccess,
  secondary = true,
  disabled = false,
  hideSuccess = false,
  pressed = false,
}: {
  path: string;
  method?: string;
  body?: unknown;
  children: React.ReactNode;
  confirmText?: string;
  onSuccess?: (data: unknown) => void;
  secondary?: boolean;
  disabled?: boolean;
  hideSuccess?: boolean;
  pressed?: boolean;
}) {
  const pathname = usePathname();
  const client = useQueryClient();
  const router = useRouter();
  const m = useMutation({
    mutationFn: () => api(path, json(method, body)),
    onSuccess: async (data) => {
      await client.invalidateQueries();
      router.refresh();
      onSuccess?.(data);
    },
  });
  return (
    <div className="stack-sm">
      <button
        disabled={disabled || m.isPending}
        className={`button ${secondary ? 'secondary' : ''}`}
        aria-pressed={pressed || undefined}
        onClick={() => {
          if (!confirmText || window.confirm(confirmText)) m.mutate();
        }}
      >
        {m.isPending ? <LoaderCircle size={16} className="spinner" /> : null}
        {children}
      </button>
      {m.error && (
        <p className="error" role="alert">
          {message(m.error)}
        </p>
      )}
      {m.error instanceof ApiError && m.error.status === 401 && (
        <Link
          className="text-link"
          href={`/login?next=${encodeURIComponent(pathname)}`}
        >
          로그인하고 계속하기
        </Link>
      )}
      {m.isSuccess && !hideSuccess && (
        <p className="success" role="status">
          처리했어요.
        </p>
      )}
    </div>
  );
}
export interface FormField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  wide?: boolean;
}
export function Form({
  fields,
  initial = {},
  onSubmit,
  submit = '저장',
  children,
}: {
  fields: FormField[];
  initial?: Record<string, string | number>;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  submit?: string;
  children?: React.ReactNode;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, String(v)]),
    ),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        setSuccess(false);
        try {
          await onSubmit(values);
          setSuccess(true);
        } catch (e) {
          setError(message(e));
        }
      })}
    >
      <div className="form-grid">
        {fields.map((field) => (
          <label
            className={`field ${field.wide ? 'wide' : ''}`}
            key={field.name}
          >
            <span>
              {field.label}
              {field.required ? ' *' : ''}
            </span>
            {field.options ? (
              <select {...register(field.name)} required={field.required}>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                {...register(field.name)}
                required={field.required}
                maxLength={field.maxLength}
              />
            ) : (
              <input
                {...register(field.name)}
                type={field.type ?? 'text'}
                required={field.required}
                maxLength={field.maxLength}
                min={field.min}
                max={field.max}
                pattern={field.pattern}
                autoComplete={
                  field.type === 'password' ? 'new-password' : undefined
                }
              />
            )}{' '}
            {field.hint && <small className="muted">{field.hint}</small>}
          </label>
        ))}
      </div>
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          저장했어요.
        </p>
      )}
      <div>
        <button className="button" disabled={isSubmitting}>
          {isSubmitting ? '처리 중…' : submit}
        </button>
      </div>
    </form>
  );
}
export function Pager({
  data,
  page,
  onChange,
}: {
  data: Page<unknown>;
  page: number;
  onChange: (value: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="페이지 선택">
      <button
        className="button secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        이전
      </button>
      <span>{page + 1} 페이지</span>
      <button
        className="button secondary"
        disabled={!hasNext(data, page)}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}
export function SideNav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  return (
    <nav>
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={
            path === href || path.startsWith(href + '/') ? 'active' : ''
          }
          aria-current={path === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
const imageOrigins = (process.env.NEXT_PUBLIC_PRODUCT_IMAGE_ORIGINS ?? '')
  .split(',')
  .map((v) => v.trim());
export function ProductPicture({
  src,
  name,
  className = 'product-photo',
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed && /^https?:\/\//.test(src) ? (
    <div className={className}>
      <Image
        src={src}
        alt={name}
        width={600}
        height={600}
        sizes="(max-width:767px) 100vw,600px"
        unoptimized={!imageOrigins.includes(new URL(src).origin)}
        onError={() => setFailed(true)}
      />
    </div>
  ) : (
    <div className={`${className} placeholder`}>
      <Package size={40} strokeWidth={1} />
      <p>이미지 준비 중</p>
    </div>
  );
}
export function Logout() {
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState('');
  return (
    <div>
      <button
        className="button secondary"
        onClick={async () => {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
          }).catch(() => null);
          client.clear();
          if (!response) {
            setError('연결을 확인한 뒤 다시 시도해 주세요.');
            return;
          }
          router.replace('/login');
          router.refresh();
        }}
      >
        로그아웃 <ArrowRight size={16} />
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
