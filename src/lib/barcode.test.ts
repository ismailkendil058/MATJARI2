import { describe, expect, it } from "vitest";
import { findProductByBarcode, getBarcodeLookupKeys, normalizeBarcode } from "./barcode";
import { Product } from "./types";

const product: Product = {
  id: "product-1",
  name: "Produit test",
  nameAr: "",
  category: "test",
  barcode: "0123456789012",
  priceSale: 100,
  priceBuy: 50,
  stock: 10,
  unit: "unitÃ©",
};

describe("barcode utilities", () => {
  it("removes scanner control characters and normalizes Unicode digits", () => {
    expect(normalizeBarcode("\u001D٠١٢٣٤٥٦٧٨٩\r\n")).toBe("0123456789");
    expect(normalizeBarcode("]C10123456789012\r")).toBe("0123456789012");
  });

  it("matches formatted numeric barcodes and UPC/EAN leading-zero variants", () => {
    expect(findProductByBarcode([product], "0123 456-789 012")).toBe(product);
    expect(findProductByBarcode([product], "123456789012")).toBe(product);
  });

  it("keeps non-numeric barcodes exact after cleanup", () => {
    expect(getBarcodeLookupKeys(" AB-12 ")).toEqual(["AB-12"]);
  });
});
