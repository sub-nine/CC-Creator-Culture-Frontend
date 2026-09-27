'use client';
import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { ProductDetail, Page, Review, Wishlist, CartItem } from '@/lib/types';
import { api, json, ApiError } from '@/lib/api';
import { money, message, date } from '@/lib/utils';
import {
  useResource,
  QueryState,
  Pager,
  ProductPicture,
} from '@/components/client-ui';
export function ProductPurchase({
  product,
  signedIn = false,
}: {
  product: ProductDetail;
  signedIn?: boolean;
}) {
  const [selected, setSelected] = useState(
    product.skus.find((s) => s.isDefault)?.skuId ??
      product.skus[0]?.skuId ??
      '',
  );
  const optionId = useId();
  const optionPicker = useRef<HTMLDetailsElement>(null);
  const closeOptions = () => {
    if (!optionPicker.current) return;
    optionPicker.current.open = false;
    optionPicker.current.querySelector('summary')?.focus();
  };
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [showAdded, setShowAdded] = useState(false);
  const client = useQueryClient();
  const sku = product.skus.find((s) => s.skuId === selected);
  const available = product.status === 'ACTIVE' && !!sku && sku.quantity > 0;
  const add = useMutation({
    mutationFn: async () => {
      const stock = sku?.quantity ?? 0;
      const items = await api<CartItem[]>('cart/items');
      const existing = items.find((item) => item.skuId === selected);
      if (existing) {
        const next = Math.min(99, stock, existing.quantity + quantity);
        if (next <= existing.quantity)
          throw new Error('더 이상 담을 수 없어요.');
        return api(
          `cart/items/${existing.cartId}`,
          json('PATCH', { quantity: next }),
        );
      }
      return api('cart/items', json('POST', { skuId: selected, quantity }));
    },
    onMutate: () => {
      setShowAdded(true);
    },
    onError: () => {
      setShowAdded(false);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cart/items'] });
      setShowAdded(true);
    },
  });
  const resetCartFeedback = () => {
    add.reset();
    setShowAdded(false);
  };
  return (
    <div className="detail-grid">
      <div className="gallery">
        <ProductPicture
          src={product.images[image]?.imageUrl}
          name={product.name}
          className="gallery-main product-photo"
        />
        {product.images.length > 1 && (
          <div className="gallery-thumbs">
            {product.images.map((img, index) => (
              <button
                key={img.imageId}
                onClick={() => setImage(index)}
                aria-pressed={index === image}
                aria-label={`${index + 1}번 이미지`}
              >
                <Image
                  src={img.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-copy">
        <div className="purchase-heading">
          <Link
            className="product-brand"
            href={`/creators?keyword=${encodeURIComponent(product.creatorName)}`}
          >
            {product.creatorName}
            <ChevronRight size={15} />
          </Link>
          <h1>{product.name}</h1>
          <p className="price">{money(sku?.price)}</p>
        </div>
        <div className="purchase-controls">
          <div className="purchase-field">
            <span id={`${optionId}-label`} className="purchase-label">
              상품 옵션
            </span>
            <details
              className="option-picker"
              ref={optionPicker}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  e.currentTarget.open = false;
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Escape' ||
                  (e.key === 'Enter' && e.target instanceof HTMLInputElement)
                ) {
                  e.preventDefault();
                  closeOptions();
                }
              }}
            >
              <summary aria-labelledby={`${optionId}-label ${optionId}-value`}>
                <span id={`${optionId}-value`} className="option-value">
                  <span>{sku?.name ?? '옵션을 선택해 주세요'}</span>
                  {sku && <strong>{money(sku.price)}</strong>}
                </span>
                <ChevronDown size={18} className="option-chevron" />
              </summary>
              <fieldset className="option-list">
                <legend className="sr-only">구매할 상품 옵션</legend>
                {product.skus.length ? (
                  product.skus.map((option) => (
                    <label className="option-item" key={option.skuId}>
                      <input
                        type="radio"
                        name={optionId}
                        value={option.skuId}
                        checked={option.skuId === selected}
                        disabled={option.quantity <= 0}
                        onChange={() => {
                          setSelected(option.skuId);
                          setQuantity(1);
                          resetCartFeedback();
                        }}
                        onClick={(e) => {
                          if (e.detail > 0) closeOptions();
                        }}
                      />
                      <span className="option-check" aria-hidden="true">
                        {option.skuId === selected && <Check size={15} />}
                      </span>
                      <span className="option-name">
                        {option.name}
                        {option.quantity <= 0 && <small>품절</small>}
                      </span>
                      <strong>{money(option.price)}</strong>
                    </label>
                  ))
                ) : (
                  <p className="help">선택할 수 있는 옵션이 없어요.</p>
                )}
              </fieldset>
            </details>
          </div>
          <div className="purchase-selection">
            <div className="selection-caption">
              <span>{sku?.name ?? '선택한 옵션'}</span>
              <span>{money(sku?.price)}</span>
            </div>
            <div className="purchase-quantity">
              <span className="purchase-label">수량</span>
              <div className="quantity">
                <button
                  aria-label="수량 줄이기"
                  disabled={quantity <= 1}
                  onClick={() => {
                    setQuantity((q) => q - 1);
                    resetCartFeedback();
                  }}
                >
                  <Minus size={16} />
                </button>
                <output aria-label="선택 수량">{quantity}</output>
                <button
                  aria-label="수량 늘리기"
                  disabled={!sku || quantity >= Math.min(99, sku.quantity)}
                  onClick={() => {
                    setQuantity((q) => q + 1);
                    resetCartFeedback();
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="purchase-total">
          <div>
            <span>합계</span>
            <small>총 {quantity}개</small>
          </div>
          <strong className="price">
            {money(sku ? sku.price * quantity : null)}
          </strong>
        </div>
        <div className="purchase-actions">
          <button
            className={`button full cart-add${showAdded ? ' is-added' : ''}`}
            disabled={!available}
            aria-busy={add.isPending}
            onClick={() => {
              if (!available || add.isPending) return;
              add.mutate();
            }}
          >
            <span className="purchase-action-icon" aria-hidden>
              <ShoppingBag
                size={18}
                className={showAdded ? 'is-off' : undefined}
              />
              <Check size={18} className={showAdded ? undefined : 'is-off'} />
            </span>
            {!available
              ? '현재 구매할 수 없어요'
              : showAdded
                ? '담았어요'
                : '장바구니 담기'}
            {add.isSuccess && (
              <span className="sr-only" role="status">
                장바구니에 담았어요
              </span>
            )}
          </button>
          {add.error && (
            <PurchaseFeedback
              error={add.error}
              next={`/products/${product.productId}`}
            >
              <Link className="text-link" href="/cart">
                기존 장바구니 확인
              </Link>
            </PurchaseFeedback>
          )}
          <WishlistToggle productId={product.productId} signedIn={signedIn} />
        </div>
        <p className="help purchase-help">
          최종 금액과 구매 가능 수량은 주문 시 확인돼요.
        </p>
      </div>
    </div>
  );
}
function PurchaseFeedback({
  error,
  next,
  children,
}: {
  error: Error;
  next: string;
  children?: ReactNode;
}) {
  return (
    <div className="purchase-feedback" role="alert">
      <p className="error">{message(error)}</p>
      <div className="row">
        {children}
        {error instanceof ApiError && error.status === 401 && (
          <Link
            className="text-link"
            href={`/login?next=${encodeURIComponent(next)}`}
          >
            로그인
          </Link>
        )}
      </div>
    </div>
  );
}
function WishlistToggle({
  productId,
  signedIn,
}: {
  productId: string;
  signedIn: boolean;
}) {
  const [wished, setWished] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const ready = useRef(false);
  const wishlistIdRef = useRef<string | null>(null);
  const client = useQueryClient();
  const wishlist = useResource<Page<Wishlist>>('wishlist?pageNum=0', signedIn);
  wishlistIdRef.current = wishlistId;
  useEffect(() => {
    ready.current = false;
    setWished(false);
    setWishlistId(null);
  }, [productId]);
  useEffect(() => {
    if (!wishlist.isSuccess || ready.current) return;
    const item = wishlist.data.content.find(
      (entry) => entry.productId === productId,
    );
    setWished(!!item);
    setWishlistId(item?.wishlistId ?? null);
    ready.current = true;
  }, [productId, wishlist.data, wishlist.isSuccess]);
  const wish = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) {
        await api(`wishlist/${productId}`, json('POST'));
        const page = await api<Page<Wishlist>>('wishlist?pageNum=0');
        return {
          on,
          id:
            page.content.find((entry) => entry.productId === productId)
              ?.wishlistId ?? null,
        };
      }
      let id = wishlistIdRef.current;
      if (!id) {
        const page = await api<Page<Wishlist>>('wishlist?pageNum=0');
        id =
          page.content.find((entry) => entry.productId === productId)
            ?.wishlistId ?? null;
      }
      if (id) await api('wishlist', json('DELETE', [id]));
      return { on, id: null };
    },
    onMutate: (on) => {
      const prev = { wished, wishlistId };
      setWished(on);
      return prev;
    },
    onError: (_error, _on, prev) => {
      if (!prev) return;
      setWished(prev.wished);
      setWishlistId(prev.wishlistId);
    },
    onSuccess: (result) => {
      setWished(result.on);
      setWishlistId(result.id);
      client.invalidateQueries({ queryKey: ['wishlist?pageNum=0'] });
    },
  });
  return (
    <>
      <button
        className="button secondary"
        aria-busy={wish.isPending}
        aria-pressed={wished}
        onClick={() => {
          if (wish.isPending) return;
          wish.mutate(!wished);
        }}
      >
        <Heart
          className={`wishlist-heart${wished ? ' is-on' : ''}`}
          size={17}
          fill={wished ? 'currentColor' : 'none'}
          aria-hidden
        />
        찜하기
      </button>
      {wish.error && (
        <PurchaseFeedback
          error={wish.error}
          next={`/products/${productId}`}
        />
      )}
    </>
  );
}
export function ProductReviews({ id }: { id: string }) {
  const [page, setPage] = useState(0);
  const query = useResource<Page<Review>>(
    `products/${id}/reviews?pageNum=${page}`,
  );
  return (
    <QueryState query={query} empty={query.data?.content.length === 0}>
      {query.data?.content.map((review) => (
        <article className="review" key={review.reviewId}>
          <div className="row between">
            <span className="rating" aria-label={`5점 중 ${review.rating}점`}>
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </span>
            <small className="muted">{date(review.createdAt)}</small>
          </div>
          <p className="prose">{review.content}</p>
        </article>
      ))}
      {query.data && <Pager data={query.data} page={page} onChange={setPage} />}
    </QueryState>
  );
}
