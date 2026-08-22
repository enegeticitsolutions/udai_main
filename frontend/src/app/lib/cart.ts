import type { Product } from "../types/api";

export type CartItem = {
  product: Product;
  quantity: number;
};

const CART_KEY = "udai_cart";
const CHECKOUT_KEY = "udai_checkout_product";
const CART_OWNER_KEY = "udai_cart_owner";
const GUEST_OWNER = "guest";

type CartOwner = string | number | null | undefined;

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeOwnerId(ownerId?: CartOwner) {
  if (ownerId === undefined) {
    return canUseStorage() ? window.localStorage.getItem(CART_OWNER_KEY) || GUEST_OWNER : GUEST_OWNER;
  }

  const value = String(ownerId ?? "").trim();
  return value ? `user:${value}` : GUEST_OWNER;
}

function cartKey(ownerId?: CartOwner) {
  return `${CART_KEY}:${normalizeOwnerId(ownerId)}`;
}

function checkoutKey(ownerId?: CartOwner) {
  return `${CHECKOUT_KEY}:${normalizeOwnerId(ownerId)}`;
}

function removeLegacyGlobalStorage() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CART_KEY);
  window.localStorage.removeItem(CHECKOUT_KEY);
}

export function setCartOwner(ownerId?: CartOwner) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_OWNER_KEY, normalizeOwnerId(ownerId));
  removeLegacyGlobalStorage();
  window.dispatchEvent(new Event("udai-cart-changed"));
}

export function getGuestCart() {
  return getCartForOwner(null);
}

export function clearGuestCart() {
  clearCart(null);
  clearCheckoutProduct(null);
}

function normalizeQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(Math.max(Math.trunc(quantity), 1), 99);
}

function normalizeCartItems(items: CartItem[]) {
  const merged = new Map<string, CartItem>();

  for (const item of items) {
    if (!item?.product?.id) continue;
    const productId = String(item.product.id);
    const existing = merged.get(productId);
    const quantity = normalizeQuantity(item.quantity);

    if (existing) {
      merged.set(productId, {
        product: item.product,
        quantity: Math.max(normalizeQuantity(existing.quantity), quantity),
      });
    } else {
      merged.set(productId, {
        product: item.product,
        quantity,
      });
    }
  }

  return Array.from(merged.values());
}

export function getCart(): CartItem[] {
  return getCartForOwner();
}

export function getCartForOwner(ownerId?: CartOwner): CartItem[] {
  if (!canUseStorage()) return [];

  try {
    removeLegacyGlobalStorage();
    const raw = window.localStorage.getItem(cartKey(ownerId));
    return raw ? normalizeCartItems(JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[], options: { notify?: boolean; ownerId?: CartOwner } = {}) {
  if (!canUseStorage()) return;
  removeLegacyGlobalStorage();
  window.localStorage.setItem(cartKey(options.ownerId), JSON.stringify(normalizeCartItems(items)));
  if (options.notify !== false) {
    window.dispatchEvent(new Event("udai-cart-changed"));
  }
}

export function addToCart(product: Product) {
  const current = getCart();
  const existing = current.find((item) => String(item.product.id) === String(product.id));

  let nextCart: CartItem[];

  if (existing) {
    nextCart = current.map((item) =>
      String(item.product.id) === String(product.id)
        ? { product, quantity: 1 }
        : item,
    );
  } else {
    nextCart = [...current, { product, quantity: 1 }];
  }

  saveCart(nextCart);
  return nextCart;
}

export function setCheckoutProduct(product: Product) {
  if (!canUseStorage()) return;
  removeLegacyGlobalStorage();
  window.localStorage.setItem(checkoutKey(), JSON.stringify(product));
}

export function getCheckoutProduct(ownerId?: CartOwner) {
  if (!canUseStorage()) return null;

  try {
    removeLegacyGlobalStorage();
    const raw = window.localStorage.getItem(checkoutKey(ownerId));
    return raw ? (JSON.parse(raw) as Product) : null;
  } catch {
    return null;
  }
}

export function clearCheckoutProduct(ownerId?: CartOwner) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(checkoutKey(ownerId));
}

export function clearCart(ownerId?: CartOwner) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(cartKey(ownerId));
  window.dispatchEvent(new Event("udai-cart-changed"));
}

export function clearCurrentUserCartData(ownerId: string | number) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(cartKey(ownerId));
  window.localStorage.removeItem(checkoutKey(ownerId));
  window.dispatchEvent(new Event("udai-cart-changed"));
}
