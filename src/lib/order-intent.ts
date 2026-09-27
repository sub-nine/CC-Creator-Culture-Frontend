export async function intentKey(
  scope: string,
  payload: unknown,
  storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage,
) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  const name = `cc.intent.${scope}.${hash}`;
  const existing = storage.getItem(name);
  if (existing) return existing;
  const key = crypto.randomUUID();
  storage.setItem(name, key);
  return key;
}
export function estimateDiscount(amount: number, rate: number) {
  return Number((BigInt(amount) * BigInt(rate)) / 100n);
}
