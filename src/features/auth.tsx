'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api, parseResponse } from '@/lib/api';
import { signupSchema } from '@/lib/schemas';
import { message, safeReturn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { Form, type FormField } from '@/components/client-ui';
const loginSchema = z.object({
  email: z.email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});
export function Login({ next }: { next?: string }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (body) => {
        setError('');
        try {
          await parseResponse(
            await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
          );
          let target = safeReturn(next);
          if (target === '/') {
            const user = await api<User>('users/me');
            target =
              user.role === 'CREATOR'
                ? '/studio/products'
                : ['MANAGER', 'MASTER'].includes(user.role)
                  ? '/admin/orders'
                  : '/';
          }
          window.location.assign(target);
        } catch (e) {
          setError(message(e));
        }
      })}
    >
      <label className="field">
        <span>이메일</span>
        <input
          {...register('email')}
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
        />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input
          {...register('password')}
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <span className="error">{errors.password.message}</span>
        )}
      </label>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <button className="button full" disabled={isSubmitting}>
        {isSubmitting ? '로그인 중…' : '로그인'}
      </button>
      <div className="row between help">
        <Link className="text-link" href="/signup">
          회원가입
        </Link>
        <Link href="/approval">창작자 승인 안내</Link>
      </div>
    </form>
  );
}
export const accountFields: FormField[] = [
  {
    name: 'email',
    label: '이메일',
    type: 'email',
    required: true,
    maxLength: 255,
    wide: true,
  },
  {
    name: 'password',
    label: '비밀번호',
    type: 'password',
    required: true,
    maxLength: 64,
    pattern: '(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s]).{8,64}',
    hint: '영문, 숫자, 특수문자를 포함한 8~64자',
    wide: true,
  },
  { name: 'nickname', label: '닉네임', required: true, maxLength: 50 },
  {
    name: 'phone',
    label: '연락처',
    type: 'tel',
    required: true,
    maxLength: 20,
    pattern: '[0-9\\-]+',
  },
  {
    name: 'address',
    label: '주소',
    required: true,
    maxLength: 255,
    wide: true,
  },
  { name: 'slackId', label: 'Slack ID (선택)', maxLength: 100, wide: true },
];
export function Signup({ kind }: { kind: 'creator' | 'customer' }) {
  const [created, setCreated] = useState(false);
  const [creatorId, setCreatorId] = useState('');
  const fields =
    kind === 'creator'
      ? [
          ...accountFields,
          {
            name: 'creatorName',
            label: '상호명',
            required: true,
            maxLength: 100,
          },
          {
            name: 'businessRegistrationNumber',
            label: '사업자등록번호',
            required: true,
            maxLength: 20,
          },
        ]
      : accountFields;
  if (created)
    return (
      <div className="stack">
        <h2>
          {kind === 'creator' ? '창작자 가입을 신청했어요' : '가입을 환영해요'}
        </h2>
        <p>
          {kind === 'creator'
            ? '운영자의 승인이 완료되면 로그인할 수 있어요.'
            : '로그인하고 나의 취향을 찾아보세요.'}
        </p>
        {creatorId && <p className="help">창작자번호 {creatorId}</p>}
        <Link
          className="button"
          href={kind === 'creator' ? '/approval' : '/login'}
        >
          {kind === 'creator' ? '승인 안내 보기' : '로그인'}
        </Link>
      </div>
    );
  return (
    <Form
      key={kind}
      fields={fields}
      submit={kind === 'creator' ? '창작자 가입 신청' : '회원가입'}
      onSubmit={async (values) => {
        const result = signupSchema.safeParse({ ...values, kind });
        if (!result.success) throw new Error(result.error.issues[0].message);
        const data = await parseResponse<{ creatorId?: string }>(
          await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.data),
          }),
        );
        setCreatorId(data?.creatorId ?? '');
        setCreated(true);
      }}
    />
  );
}
