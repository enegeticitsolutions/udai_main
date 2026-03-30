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

export function getCart(): CartItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(product: Product) {
  const current = getCart();
  const existing = current.find((item) => item.product.id === product.id);

  let nextCart: CartItem[];

  if (existing) {
    nextCart = current.map((item) =>
      item.product.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
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
