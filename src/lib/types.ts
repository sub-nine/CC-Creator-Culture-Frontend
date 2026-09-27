export type Role = 'CUSTOMER' | 'CREATOR' | 'MANAGER' | 'MASTER';
export interface User {
  userId: string;
  email: string;
  nickname: string;
  phone: string;
  address: string;
  slackId?: string;
  role: Role;
}
export interface Page<T> {
  content: T[];
  totalPages?: number | null;
  totalElements?: number | null;
  pageNumber?: number;
  number?: number;
  page?: number;
  hasNext?: boolean;
  last?: boolean;
}
export interface Product {
  productId: string;
  creatorName: string;
  name: string;
  status: string;
  averageRating: number;
  reviewCount: number;
  price: number | null;
  quantity: number;
  imageUrl?: string;
}
export interface Sku {
  skuId: string;
  name: string;
  price: number;
  isDefault: boolean;
  quantity: number;
}
export interface ProductImage {
  imageId: string;
  imageUrl: string;
  sortOrder: number;
}
export interface ProductDetail {
  productId: string;
  creatorId: string;
  creatorName: string;
  name: string;
  content: string;
  status: string;
  viewCount: number;
  averageRating: number;
  reviewCount: number;
  categories: { categoryId: string; name: string }[];
  hashtags: { hashtagId: string; name: string }[];
  skus: Sku[];
  images: ProductImage[];
}
export interface Creator {
  creatorId: string;
  creatorName: string;
  businessRegistrationNumber?: string;
}
export interface CartItem {
  cartId: string;
  skuId: string;
  creatorName: string;
  productName: string;
  skuName: string;
  productStatus: string;
  quantity: number;
  price: number;
}
export interface Coupon {
  couponId: string;
  couponName: string;
  discountRate: number;
  totalQuantity: number;
  issuedQuantity: number;
  startedAt: string;
  expiredAt: string;
}
export interface UserCoupon {
  userCouponId: string;
  couponId: string;
  couponName: string;
  discountRate: number;
  status: string;
  expired: boolean;
  expiredAt: string;
}
export interface Address {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2?: string;
}
export interface OrderItem {
  orderItemId: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  paymentAmount: number;
  status: string;
}
export interface Order {
  orderNumber: string;
  customerId?: string;
  status: string;
  originalAmount: number;
  discountAmount: number;
  paymentAmount: number;
  createdAt: string;
  expiresAt: string;
  shippingAddress: Address;
  creatorGroups: { creatorId: string; items: OrderItem[] }[];
}
export interface CreatorOrder extends OrderItem {
  orderNumber: string;
  orderStatus: string;
  createdAt: string;
  shippingAddress: Address;
}
export interface Review {
  reviewId: string;
  productId: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: string;
}
export interface Wishlist {
  wishlistId: string;
  productId: string;
  productName: string;
  status: string;
  price: number;
  imageUrl?: string;
}
export interface Follow {
  creatorId: string;
  creatorName: string;
  followedAt: string;
}
export interface Notice {
  id: string;
  title: string;
  content: string;
  read: boolean;
  referenceType: string;
  referenceId: string;
  createdAt: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
  hashtags?: Hashtag[];
}
export interface Hashtag {
  id: string;
  name: string;
  usageCount: number;
}
export interface MergeRequest {
  id: string;
  categoryId: string;
  categoryName: string;
  hashtagId: string;
  hashtagName: string;
  status: string;
  createdAt: string;
}
export interface Leaderboard {
  period: string;
  type: string;
  startDate: string;
  endDate: string;
  items: { ranking: number; targetId: string; name: string; score: number }[];
}
