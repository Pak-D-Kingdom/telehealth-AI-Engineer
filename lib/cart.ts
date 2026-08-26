export interface CartItem {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  price: number;
  image: string;
  qty: number;
}

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  slug?: string;
}

export const CART_KEY = "glucocare_cart";
export const CART_CHANGE_EVENT = "telehealth-cart-change";

export const DEFAULT_CART_ITEMS: CartItem[] = [
  {
    id: "p1",
    name: "GlucoMeter Pro Digital Kit",
    unit: "Digital Kit + 50 Strip",
    category: "Alat Medis",
    price: 189000,
    image: "/images/glucometer.png",
    qty: 1,
  },
  {
    id: "p2",
    name: "Strip Tes Gula Darah",
    unit: "Isi 50 Strip",
    category: "Alat Medis",
    price: 45000,
    image: "/images/glucometer.png",
    qty: 2,
  },
];

export function subscribeToCart(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CART_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CART_CHANGE_EVENT, callback);
  };
}

export function getCartSnapshot() {
  return localStorage.getItem(CART_KEY);
}

export function getServerCartSnapshot() {
  return null;
}

export function parseCart(value: string | null): CartItem[] {
  if (!value) return DEFAULT_CART_ITEMS;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : DEFAULT_CART_ITEMS;
  } catch {
    return DEFAULT_CART_ITEMS;
  }
}

export function mergeCartItem(items: CartItem[], item: CartItem) {
  const existing = items.find((candidate) => candidate.id === item.id);
  if (!existing) return [...items, item];

  return items.map((candidate) => candidate.id === item.id
    ? { ...candidate, qty: candidate.qty + item.qty }
    : candidate);
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function addProductToCart(product: CartProduct) {
  try {
    const snapshot = localStorage.getItem(CART_KEY);
    const currentItems = snapshot ? parseCart(snapshot) : [];
    saveCart(mergeCartItem(currentItems, {
      id: product.id,
      name: product.name,
      unit: product.category,
      category: product.category,
      price: product.price,
      image: product.image || "/images/glucocare_logo.svg",
      qty: 1,
    }));
    return true;
  } catch {
    return false;
  }
}
