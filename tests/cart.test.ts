import { describe, expect, test } from "bun:test";
import { mergeCartItem, type CartItem } from "../lib/cart";

const item: CartItem = {
  id: "product-1",
  name: "Produk GlucoCare",
  unit: "Alat kesehatan",
  price: 100_000,
  image: "/product.png",
  qty: 1,
};

describe("cart", () => {
  test("menambahkan produk baru ke keranjang kosong", () => {
    expect(mergeCartItem([], item)).toEqual([item]);
  });

  test("menambah jumlah produk yang sudah ada", () => {
    expect(mergeCartItem([{ ...item, qty: 2 }], item)[0]?.qty).toBe(3);
  });
});
