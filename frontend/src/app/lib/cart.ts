import type { Product } from "../types/api";

export type CartItem = {
  product: Product;
  quantity: number;
};

const CART_KEY = "udai_cart";
const CHECKOUT_KEY = "udai_checkout_product";

function canUseStorage() {
  return typeof window !== "undefined";
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
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? normalizeCartItems(JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[], options: { notify?: boolean } = {}) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(normalizeCartItems(items)));
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
  window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(product));
}

export function getCheckoutProduct() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_KEY);
    return raw ? (JSON.parse(raw) as Product) : null;
  } catch {
    return null;
  }
}

export function clearCheckoutProduct() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CHECKOUT_KEY);
}

export function clearCart() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("udai-cart-changed"));
}
