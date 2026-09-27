'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { api, json } from '@/lib/api';
import { productSchema } from '@/lib/schemas';
import { message, money, status } from '@/lib/utils';
import { useResource, QueryState, Form, Action } from '@/components/client-ui';
import type { ProductDetail, Sku, ProductImage } from '@/lib/types';
interface ProductInput {
  name: string;
  content: string;
  tags: string;
  skus: { name: string; price: number; quantity: number; isDefault: boolean }[];
}
export function ProductLookup() {
  const router = useRouter();
  return (
    <div className="stack">
      <div className="row between">
        <p className="muted">
          새로운 상품을 등록하거나 상품번호로 관리해 주세요.
        </p>
        <Link href="/studio/products/new" className="button">
          <Plus size={17} />
          상품 등록
        </Link>
      </div>
      <section className="panel stack">
        <h2>내 상품 관리</h2>
        <p className="help">
          등록 완료 화면의 상품번호를 입력해 주세요. 현재는 상품별 관리 기능을
          제공해요.
        </p>
        <Form
          fields={[
            {
              name: 'id',
              label: '상품번호',
              required: true,
              wide: true,
              pattern: '[a-fA-F0-9\\-]{36}',
            },
          ]}
          submit="상품 불러오기"
          onSubmit={async (v) => {
            router.push(`/studio/products/${encodeURIComponent(v.id)}`);
          }}
        />
      </section>
    </div>
  );
}
export function NewProduct() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<ProductInput>({
    defaultValues: {
      name: '',
      content: '',
      tags: '',
      skus: [{ name: '기본', price: 0, quantity: 0, isDefault: true }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'skus' });
  const skus = useWatch({ control, name: 'skus' });
  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          const result = productSchema.safeParse({
            ...values,
            hashTags: values.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          });
          if (!result.success) throw new Error(result.error.issues[0].message);
          if (files.length > 5)
            throw new Error('이미지는 최대 5개까지 등록할 수 있어요.');
          for (const file of files) {
            if (
              !['image/jpeg', 'image/png'].includes(file.type) ||
              file.size > 5 * 1024 * 1024
            )
              throw new Error(
                '이미지는 5MB 이하의 JPG 또는 PNG 파일로 등록해 주세요.',
              );
            const bitmap = await createImageBitmap(file).catch(() => {
              throw new Error(
                '이미지 파일을 읽을 수 없어요. 다른 JPG 또는 PNG 파일을 선택해 주세요.',
              );
            });
            const pixels = bitmap.width * bitmap.height;
            bitmap.close();
            if (pixels > 9000000)
              throw new Error(
                '이미지는 가로와 세로의 곱이 900만 픽셀 이하여야 해요.',
              );
          }
          // 파일은 발급받은 S3 주소로 브라우저가 직접 올리고, 상품 등록에는 업로드 ID만 보낸다.
          const imageUploadIds: string[] = [];
          for (const file of files) {
            const { uploadId, uploadUrl } = await api<{
              uploadId: string;
              uploadUrl: string;
            }>(
              'images/presigned-url',
              json('POST', { contentType: file.type, fileSize: file.size }),
            );
            const uploaded = await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': file.type },
              body: file,
            }).then(
              (response) => response.ok,
              () => false,
            );
            if (!uploaded)
              throw new Error(
                '이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
              );
            imageUploadIds.push(uploadId);
          }
          const created = await api<{ productId: string }>(
            'products',
            json('POST', { ...result.data, imageUploadIds }),
          );
          router.push(`/studio/products/${created.productId}`);
        } catch (e) {
          setError(message(e));
        }
      })}
    >
      <section className="panel stack">
        <h2>상품 이야기</h2>
        <label className="field">
          <span>상품명 *</span>
          <input {...register('name')} required maxLength={100} />
        </label>
        <label className="field">
          <span>상품 설명 *</span>
          <textarea {...register('content')} required maxLength={5000} />
        </label>
        <label className="field">
          <span>해시태그 *</span>
          <input
            {...register('tags')}
            required
            placeholder="예: 문구, 일러스트, 소품"
          />
          <small className="muted">
            쉼표로 구분한 1~5개. 각 태그는 문자와 숫자로 10자 이내로 입력해
            주세요.
          </small>
        </label>
      </section>
      <section className="panel stack">
        <h2>옵션과 초기 재고</h2>
        {fields.map((field, index) => (
          <div className="panel stack" key={field.id}>
            <div className="form-grid">
              <label className="field">
                <span>옵션명 *</span>
                <input
                  {...register(`skus.${index}.name`)}
                  required
                  maxLength={25}
                />
              </label>
              <label className="field">
                <span>가격 (원) *</span>
                <input
                  {...register(`skus.${index}.price`, { valueAsNumber: true })}
                  type="number"
                  min={0}
                  step={1}
                  required
                />
              </label>
              <label className="field">
                <span>초기 재고 *</span>
                <input
                  {...register(`skus.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min={0}
                  max={2147483647}
                  step={1}
                  required
                />
              </label>
              <label className="check-label">
                <input
                  type="radio"
                  name="defaultSku"
                  checked={skus[index]?.isDefault ?? false}
                  onChange={() =>
                    fields.forEach((_, i) =>
                      setValue(`skus.${i}.isDefault`, i === index),
                    )
                  }
                />
                대표 옵션
              </label>
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={fields.length === 1 || skus[index]?.isDefault}
              onClick={() => remove(index)}
            >
              옵션 삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            append({ name: '', price: 0, quantity: 0, isDefault: false })
          }
        >
          <Plus size={16} />
          옵션 추가
        </button>
      </section>
      <section className="panel stack">
        <h2>상품 이미지</h2>
        <label className="field">
          <span>JPG 또는 PNG, 최대 5개</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <small className="muted">
            파일당 5MB 이하, 900만 픽셀 이하. 첫 번째 이미지가 대표 이미지로
            표시돼요. 이미지 없이도 등록할 수 있어요.
          </small>
        </label>
        <ul>
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={isSubmitting}>
        {isSubmitting ? '상품 등록 중…' : '상품 등록'}
      </button>
    </form>
  );
}
const skuFields = [
  { name: 'name', label: '옵션명', required: true, maxLength: 25 },
  { name: 'price', label: '가격 (원)', type: 'number', required: true, min: 0 },
  {
    name: 'isDefault',
    label: '대표 옵션',
    options: [
      { value: 'false', label: '일반 옵션' },
      { value: 'true', label: '대표 옵션' },
    ],
  },
];
function SkuEditor({ productId, sku }: { productId: string; sku: Sku }) {
  const client = useQueryClient();
  return (
    <article className="panel stack">
      <div className="row between">
        <h3>{sku.name}</h3>
        <strong>{money(sku.price)}</strong>
      </div>
      <p className="help">
        현재 재고 {sku.quantity}개{sku.isDefault ? ' / 대표 옵션' : ''}
      </p>
      <details>
        <summary>옵션 정보 수정</summary>
        <Form
          fields={skuFields}
          initial={{
            name: sku.name,
            price: sku.price,
            isDefault: String(sku.isDefault),
          }}
          onSubmit={async (v) => {
            await api(
              `products/${productId}/skus/${sku.skuId}`,
              json('PATCH', {
                name: v.name,
                price: Number(v.price),
                isDefault: v.isDefault === 'true',
              }),
            );
            await client.invalidateQueries();
          }}
        />
      </details>
      <details>
        <summary>재고 조정</summary>
        <Form
          fields={[
            {
              name: 'quantity',
              label: '변경 수량',
              type: 'number',
              required: true,
              hint: '10을 입력하면 10개 추가, -5를 입력하면 5개 차감돼요.',
            },
          ]}
          submit="재고 반영"
          onSubmit={async (v) => {
            const quantity = Number(v.quantity);
            if (
              !Number.isInteger(quantity) ||
              quantity === 0 ||
              Math.abs(quantity) > 2147483647
            )
              throw new Error('0이 아닌 정수 수량을 입력해 주세요.');
            await api(
              `skus/${sku.skuId}/stock/adjustments`,
              json('POST', { quantity }),
            );
            await client.invalidateQueries();
          }}
        />
      </details>
      <Action
        path={`products/${productId}/skus/${sku.skuId}`}
        method="DELETE"
        disabled={sku.isDefault}
        confirmText="이 옵션을 삭제할까요?"
      >
        옵션 삭제
      </Action>
    </article>
  );
}
function ImageEditor({ id, images }: { id: string; images: ProductImage[] }) {
  const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const swapped = (index: number, delta: number) => {
    const ids = ordered.map((i) => i.imageId);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return { imageIds: ids };
  };
  return (
    <section className="panel stack">
      <h2>이미지 관리</h2>
      <p className="help">
        첫 번째 이미지가 대표 이미지예요. 현재 이미지는 순서 변경과 삭제를
        지원해요.
      </p>
      {ordered.length ? (
        <div className="form-grid">
          {ordered.map((image, index) => (
            <article className="stack-sm" key={image.imageId}>
              <Image
                src={image.imageUrl}
                alt={`상품 이미지 ${index + 1}`}
                width={160}
                height={160}
                unoptimized
                style={{
                  width: 160,
                  height: 160,
                  objectFit: 'contain',
                  borderRadius: 12,
                }}
              />
              <div className="row">
                {index > 0 && (
                  <Action
                    path={`products/${id}/images`}
                    method="PATCH"
                    body={swapped(index, -1)}
                  >
                    <ArrowUp size={16} />
                    앞으로
                  </Action>
                )}
                {index < ordered.length - 1 && (
                  <Action
                    path={`products/${id}/images`}
                    method="PATCH"
                    body={swapped(index, 1)}
                  >
                    <ArrowDown size={16} />
                    뒤로
                  </Action>
                )}
                <Action
                  path={`products/${id}/images/${image.imageId}`}
                  method="DELETE"
                  confirmText="이 상품 이미지를 삭제할까요?"
                >
                  삭제
                </Action>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">등록된 이미지가 없어요.</p>
      )}
    </section>
  );
}
export function EditProduct({ id, userId }: { id: string; userId: string }) {
  const q = useResource<ProductDetail>(`products/${id}`);
  const client = useQueryClient();
  const router = useRouter();
  const product = q.data;
  return (
    <QueryState query={q}>
      {product &&
        (product.creatorId !== userId ? (
          <div className="notice">본인이 등록한 상품만 관리할 수 있어요.</div>
        ) : (
          <div className="stack">
            <section className="panel stack">
              <div className="row between">
                <span className="badge">{status(product.status)}</span>
                <Link
                  className="text-link"
                  href={`/products/${id}`}
                  prefetch={false}
                >
                  판매 화면 보기
                </Link>
              </div>
              <p className="help">상품번호 {id}</p>
              <Form
                key={product.name + product.content}
                fields={[
                  {
                    name: 'name',
                    label: '상품명',
                    required: true,
                    maxLength: 100,
                    wide: true,
                  },
                  {
                    name: 'content',
                    label: '상품 설명',
                    type: 'textarea',
                    required: true,
                    maxLength: 5000,
                    wide: true,
                  },
                ]}
                initial={{ name: product.name, content: product.content }}
                onSubmit={async (v) => {
                  await api(`products/${id}`, json('PATCH', v));
                  await client.invalidateQueries();
                }}
              />
              {['ACTIVE', 'INACTIVE'].includes(product.status) && (
                <Action
                  path={`products/${id}/status`}
                  method="PATCH"
                  body={{
                    status: product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  }}
                  confirmText="상품의 판매 상태를 변경할까요?"
                >
                  {product.status === 'ACTIVE' ? '판매 중지' : '판매 재개'}
                </Action>
              )}
            </section>
            <section className="stack">
              <h2>옵션과 재고</h2>
              {product.skus.map((sku) => (
                <SkuEditor key={JSON.stringify(sku)} productId={id} sku={sku} />
              ))}
              <details className="panel">
                <summary>새 옵션 추가</summary>
                <Form
                  fields={[
                    ...skuFields,
                    {
                      name: 'quantity',
                      label: '초기 재고',
                      type: 'number',
                      required: true,
                      min: 0,
                      max: 2147483647,
                    },
                  ]}
                  initial={{ isDefault: 'false', price: 0, quantity: 0 }}
                  submit="옵션 추가"
                  onSubmit={async (v) => {
                    await api(
                      `products/${id}/skus`,
                      json('POST', {
                        name: v.name,
                        price: Number(v.price),
                        quantity: Number(v.quantity),
                        isDefault: v.isDefault === 'true',
                      }),
                    );
                    await client.invalidateQueries();
                  }}
                />
              </details>
            </section>
            <ImageEditor id={id} images={product.images} />
            <section className="panel">
              <Action
                path={`products/${id}`}
                method="DELETE"
                confirmText="이 상품을 삭제할까요? 상품이 판매 목록에서 제외돼요."
                onSuccess={() => router.replace('/studio/products')}
              >
                상품 삭제
              </Action>
            </section>
          </div>
        ))}
    </QueryState>
  );
}
