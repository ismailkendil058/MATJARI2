import type { Product } from "./types";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeBarcode(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[٠-٩]/g, digit => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(EASTERN_ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
    .replace(/^\][A-Za-z]\d/, "")
    .trim();
}

export function getBarcodeLookupKeys(value: unknown): string[] {
  const barcode = normalizeBarcode(value);
  if (!barcode) return [];

  const keys = new Set([barcode]);
  if (/^[0-9 -]+$/.test(barcode)) {
    const compact = barcode.replace(/[ -]/g, "");
    keys.add(compact);
    if (compact.length === 12) keys.add(`0${compact}`);
    if (compact.length === 13 && compact.startsWith("0")) keys.add(compact.slice(1));
  }

  return [...keys];
}

export function findProductByBarcode(products: Product[], barcode: unknown): Product | undefined {
  const scannedKeys = new Set(getBarcodeLookupKeys(barcode));
  if (scannedKeys.size === 0) return undefined;

  return products.find(product =>
    getBarcodeLookupKeys(product.barcode).some(key => scannedKeys.has(key))
  );
}
