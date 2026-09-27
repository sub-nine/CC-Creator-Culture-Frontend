'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useResource,
  QueryState,
  Pager,
  Form,
  Action,
} from '@/components/client-ui';
import type { FormField } from '@/components/client-ui';
import { api, json } from '@/lib/api';
import { date, status } from '@/lib/utils';
import { signupSchema } from '@/lib/schemas';
import { accountFields } from '@/features/auth';
import type {
  Page,
  Product,
  ProductDetail,
  Coupon,
  Category,
  Hashtag,
  MergeRequest,
} from '@/lib/types';
export function CreatorApprovals() {
  const [done, setDone] = useState('');
  return (
    <section className="panel stack">
      <p className="muted">
        검토한 가입 신청의 창작자번호를 입력해 승인 또는 반려해 주세요.
      </p>
      <Form
        fields={[
          {
            name: 'creatorId',
            label: '창작자번호',
            required: true,
            wide: true,
            pattern: '[a-fA-F0-9\\-]{36}',
          },
          {
            name: 'approvalStatus',
            label: '검토 결과',
            required: true,
            options: [
              { value: 'APPROVED', label: '승인' },
              { value: 'REJECTED', label: '반려' },
            ],
          },
        ]}
        submit="검토 결과 반영"
        onSubmit={async (v) => {
          if (
            !window.confirm(
              `${v.creatorId} 창작자 신청을 ${v.approvalStatus === 'APPROVED' ? '승인' : '반려'}할까요?`,
            )
          )
            throw new Error('검토 결과를 반영하지 않았어요.');
          await api(
            `admin/creators/${v.creatorId}/approval`,
            json('PATCH', { approvalStatus: v.approvalStatus }),
          );
          setDone(v.creatorId);
        }}
      />
      {done && (
        <p role="status" className="success">
          {done} 신청을 처리했어요.
        </p>
      )}
    </section>
  );
}
function ProductModeration({ id }: { id: string }) {
  const q = useResource<ProductDetail>(`products/${id}`);
  return (
    <QueryState query={q}>
      {q.data && (
        <section className="panel stack">
          <h2>{q.data.name}</h2>
          <p>
            {q.data.creatorName} / {status(q.data.status)}
          </p>
          <p className="prose">{q.data.content}</p>
          {['ACTIVE', 'SUSPENDED'].includes(q.data.status) ? (
            <Action
              path={`admin/products/${id}/status`}
              method="PATCH"
              body={{
                status: q.data.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              }}
              confirmText="이 상품의 판매 제한 상태를 변경할까요?"
            >
              {q.data.status === 'ACTIVE' ? '판매 제한' : '판매 제한 해제'}
            </Action>
          ) : (
            <p className="help">
              이 상태의 상품은 판매 제한을 변경할 수 없어요.
            </p>
          )}
        </section>
      )}
    </QueryState>
  );
}
export function AdminProducts() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [id, setId] = useState('');
  const q = useResource<Page<Product>>(
    `products?${new URLSearchParams({ page: String(page), size: '10', keyword })}`,
  );
  return (
    <div className="stack">
      <section className="panel">
        <Form
          fields={[{ name: 'keyword', label: '상품 검색', wide: true }]}
          submit="검색"
          onSubmit={async (v) => {
            setKeyword(v.keyword);
            setPage(0);
          }}
        />
      </section>
      <QueryState query={q} empty={q.data?.content.length === 0}>
        {q.data && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>상품</th>
                    <th>창작자</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.content.map((p) => (
                    <tr key={p.productId}>
                      <td>{p.name}</td>
                      <td>{p.creatorName}</td>
                      <td>{status(p.status)}</td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setId(p.productId)}
                        >
                          상세 관리
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager data={q.data} page={page} onChange={setPage} />
          </>
        )}
      </QueryState>
      <section className="panel">
        <Form
          fields={[
            {
              name: 'productId',
              label: '상품번호로 찾기',
              required: true,
              wide: true,
              pattern: '[a-fA-F0-9\\-]{36}',
            },
          ]}
          submit="불러오기"
          onSubmit={async (v) => setId(v.productId)}
        />
      </section>
      {id && <ProductModeration key={id} id={id} />}
    </div>
  );
}
const couponFields: FormField[] = [
  {
    name: 'couponName',
    label: '쿠폰 이름',
    required: true,
    maxLength: 100,
    wide: true,
  },
  {
    name: 'discountRate',
    label: '할인율 (%)',
    type: 'number',
    required: true,
    min: 1,
    max: 100,
  },
  {
    name: 'totalQuantity',
    label: '총 발급 수량',
    type: 'number',
    required: true,
    min: 1,
  },
  {
    name: 'startedAt',
    label: '발급 시작',
    type: 'datetime-local',
    required: true,
  },
  {
    name: 'expiredAt',
    label: '만료 일시',
    type: 'datetime-local',
    required: true,
  },
];
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function CouponForm({ coupon }: { coupon?: Coupon }) {
  const client = useQueryClient();
  return (
    <Form
      fields={couponFields}
      initial={
        coupon
          ? {
              couponName: coupon.couponName,
              discountRate: coupon.discountRate,
              totalQuantity: coupon.totalQuantity,
              startedAt: localDate(coupon.startedAt),
              expiredAt: localDate(coupon.expiredAt),
            }
          : {}
      }
      submit={coupon ? '쿠폰 수정' : '쿠폰 생성'}
      onSubmit={async (v) => {
        if (new Date(v.startedAt) >= new Date(v.expiredAt))
          throw new Error('만료 일시는 시작 일시보다 늦어야 해요.');
        await api(
          coupon ? `coupons/${coupon.couponId}` : 'coupons',
          json(coupon ? 'PATCH' : 'POST', {
            couponName: v.couponName,
            discountRate: Number(v.discountRate),
            totalQuantity: Number(v.totalQuantity),
            startedAt: new Date(v.startedAt).toISOString(),
            expiredAt: new Date(v.expiredAt).toISOString(),
          }),
        );
        await client.invalidateQueries();
      }}
    />
  );
}
export function AdminCoupons() {
  const [page, setPage] = useState(0);
  const q = useResource<Page<Coupon>>(`coupons?page=${page}&size=20`);
  return (
    <div className="stack">
      <details className="panel">
        <summary>새 쿠폰 만들기</summary>
        <CouponForm />
      </details>
      <QueryState query={q} empty={q.data?.content.length === 0}>
        <div className="stack">
          {q.data?.content.map((c) => (
            <article className="panel stack" key={c.couponId}>
              <div className="row between">
                <h2>{c.couponName}</h2>
                <span className="badge benefit">{c.discountRate}%</span>
              </div>
              <p className="help">
                {date(c.startedAt)} ~ {date(c.expiredAt)} / 발급{' '}
                {c.issuedQuantity} / 전체 {c.totalQuantity}
              </p>
              <details>
                <summary>쿠폰 수정</summary>
                <CouponForm key={JSON.stringify(c)} coupon={c} />
              </details>
              <Action
                path={`coupons/${c.couponId}`}
                method="DELETE"
                confirmText="이 쿠폰을 삭제할까요?"
              >
                쿠폰 삭제
              </Action>
            </article>
          ))}
        </div>
        {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
      </QueryState>
    </div>
  );
}
function CategoryDetail({ id, master }: { id: string; master: boolean }) {
  const q = useResource<Category>(`categories/${id}`);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const tags = useResource<Page<Hashtag>>(
    `hashtags?${new URLSearchParams({ keyword, page: String(page), size: '10' })}`,
  );
  return (
    <section className="panel stack">
      <QueryState query={q}>
        {q.data && (
          <>
            <h2>{q.data.name}</h2>
            <p>{q.data.description}</p>
            <h3>연결된 해시태그</h3>
            {q.data.hashtags?.length ? (
              q.data.hashtags.map((t) => (
                <div className="row between" key={t.id}>
                  <span>#{t.name}</span>
                  <Action
                    path={`admin/categories/${id}/hashtags/${t.id}`}
                    method="DELETE"
                    confirmText="이 해시태그 연결을 해제할까요?"
                  >
                    연결 해제
                  </Action>
                </div>
              ))
            ) : (
              <p className="help">연결된 해시태그가 없어요.</p>
            )}
          </>
        )}
      </QueryState>
      <h3>해시태그 찾기</h3>
      <Form
        fields={[{ name: 'keyword', label: '해시태그 검색', wide: true }]}
        submit="검색"
        onSubmit={async (v) => {
          setKeyword(v.keyword);
          setPage(0);
        }}
      />
      <QueryState query={tags} empty={tags.data?.content.length === 0}>
        {tags.data?.content.map((t) => (
          <div className="row between" key={t.id}>
            <span>#{t.name}</span>
            <div className="row">
              {master && (
                <Action path={`admin/categories/${id}/hashtags/${t.id}`}>
                  연결
                </Action>
              )}
              <Action
                path={`admin/hashtags/${t.id}`}
                method="DELETE"
                confirmText="이 해시태그를 삭제할까요?"
              >
                태그 삭제
              </Action>
            </div>
          </div>
        ))}
        {tags.data && <Pager data={tags.data} page={page} onChange={setPage} />}
      </QueryState>
    </section>
  );
}
export function Categories({ master }: { master: boolean }) {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [id, setId] = useState('');
  const [mergePage, setMergePage] = useState(0);
  const client = useQueryClient();
  const q = useResource<Page<Category>>(
    `categories?${new URLSearchParams({ keyword, page: String(page), size: '10' })}`,
  );
  const merges = useResource<Page<MergeRequest>>(
    `admin/categories/merge-requests?page=${mergePage}&size=20`,
  );
  return (
    <div className="stack">
      {master && (
        <details className="panel">
          <summary>카테고리 만들기</summary>
          <Form
            fields={[
              { name: 'name', label: '카테고리명', required: true },
              {
                name: 'description',
                label: '설명',
                type: 'textarea',
                wide: true,
              },
            ]}
            submit="카테고리 생성"
            onSubmit={async (v) => {
              await api('admin/categories', json('POST', v));
              await client.invalidateQueries();
            }}
          />
        </details>
      )}
      <section className="panel stack">
        <Form
          fields={[{ name: 'keyword', label: '카테고리 검색', wide: true }]}
          submit="검색"
          onSubmit={async (v) => {
            setKeyword(v.keyword);
            setPage(0);
          }}
        />
        <QueryState query={q} empty={q.data?.content.length === 0}>
          {q.data?.content.map((c) => (
            <button
              className="button secondary full"
              key={c.id}
              onClick={() => setId(c.id)}
            >
              {c.name}
            </button>
          ))}
          {q.data && <Pager data={q.data} page={page} onChange={setPage} />}
        </QueryState>
      </section>
      {id && <CategoryDetail key={id} id={id} master={master} />}
      <section className="panel stack">
        <h2>태그 연결 검토</h2>
        <QueryState query={merges} empty={merges.data?.content.length === 0}>
          {merges.data?.content.map((m) => (
            <article key={m.id} className="stack-sm">
              <h3>
                {m.categoryName} ← #{m.hashtagName}
              </h3>
              <span className="help">
                {status(m.status)} / {date(m.createdAt)}
              </span>
              {m.status === 'PENDING_APPROVAL' && (
                <div className="row">
                  <Action
                    path={`admin/categories/merge-requests/${m.id}/approve`}
                    confirmText="이 연결을 승인할까요?"
                  >
                    승인
                  </Action>
                  <Action
                    path={`admin/categories/merge-requests/${m.id}/reject`}
                    confirmText="이 연결을 반려할까요?"
                  >
                    반려
                  </Action>
                </div>
              )}
              <hr className="line" />
            </article>
          ))}
          {merges.data && (
            <Pager
              data={merges.data}
              page={mergePage}
              onChange={setMergePage}
            />
          )}
        </QueryState>
      </section>
    </div>
  );
}
export function ManagerForm() {
  return (
    <div className="panel">
      <Form
        fields={accountFields}
        submit="운영자 계정 생성"
        onSubmit={async (values) => {
          const result = signupSchema.safeParse({
            ...values,
            kind: 'customer',
          });
          if (!result.success) throw new Error(result.error.issues[0].message);
          const body = { ...result.data };
          delete (body as { kind?: string }).kind;
          await api('admin/managers', json('POST', body));
        }}
      />
    </div>
  );
}
