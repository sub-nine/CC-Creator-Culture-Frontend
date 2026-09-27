import { z } from 'zod';
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, '필수 입력 항목입니다.')
    .max(max, `${max}자 이하로 입력해 주세요.`);
export const profileSchema = z.object({
  nickname: text(50),
  phone: text(20).regex(/^[0-9-]+$/, '숫자와 하이픈으로 입력해 주세요.'),
  address: text(255),
  slackId: z.string().trim().max(100).optional(),
});
const account = profileSchema.extend({
  email: z.email('이메일 형식을 확인해 주세요.').max(255),
  password: z
    .string()
    .min(8, '8자 이상 입력해 주세요.')
    .max(64)
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/,
      '영문, 숫자, 특수문자를 포함해 주세요.',
    ),
});
export const signupSchema = z.discriminatedUnion('kind', [
  account.extend({ kind: z.literal('customer') }),
  account.extend({
    kind: z.literal('creator'),
    creatorName: text(100),
    businessRegistrationNumber: text(20).regex(/^[0-9-]+$/),
  }),
]);
export const addressSchema = z.object({
  recipientName: text(50),
  recipientPhone: text(20),
  postalCode: text(10),
  addressLine1: text(200),
  addressLine2: z.string().max(200).optional(),
});
export const skuSchema = z.object({
  name: text(25),
  price: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  quantity: z.number().int().min(0).max(2147483647),
  isDefault: z.boolean(),
});
export const productSchema = z.object({
  name: text(100),
  content: text(5000),
  hashTags: z
    .array(
      text(10).regex(
        /^[\p{L}\p{N}]+$/u,
        '태그에는 문자와 숫자만 사용해 주세요.',
      ),
    )
    .min(1)
    .max(5),
  skus: z
    .array(skuSchema)
    .min(1)
    .refine(
      (s) => s.filter((x) => x.isDefault).length === 1,
      '대표 옵션을 하나 선택해 주세요.',
    ),
});
