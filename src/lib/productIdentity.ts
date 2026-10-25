import type { Rating } from '../types';

/**
 * Canonical form of a scanned barcode. UPC-A (12 digits) is padded to EAN-13
 * so the same package cannot be saved twice under two representations.
 */
export function normalizeBarcode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length === 12) return `0${trimmed}`;
    return trimmed;
  }

  return trimmed.toLowerCase().replace(/\s+/g, '');
}

/** Folds case, accents and punctuation so "C4® Energy" matches "c4 energy". */
export function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function productTextIdentity(input: {
  name: string;
  brand?: string;
  flavor?: string;
}): string {
  return `text:${normalizeIdentityText(input.brand)}|${normalizeIdentityText(
    input.name,
  )}|${normalizeIdentityText(input.flavor)}`;
}

export function productIdentity(input: {
  name: string;
  brand?: string;
  flavor?: string;
  barcode?: string | null;
}): string {
  const barcode = normalizeBarcode(input.barcode);
  if (barcode) return `barcode:${barcode}`;
  return productTextIdentity(input);
}

/**
 * Finds an existing rating for the same product. A shared barcode always wins;
 * otherwise brand + name + flavour must match. Demo entries are ignored so real
 * products can be added alongside the sample collection.
 */
export function findDuplicateRating(
  ratings: Rating[],
  input: {
    name: string;
    brand?: string;
    flavor?: string;
    barcode?: string | null;
  },
  excludeId?: string,
): Rating | null {
  if (!input.name.trim()) return null;

  const barcode = normalizeBarcode(input.barcode);
  const identity = productTextIdentity(input);

  return (
    ratings.find((rating) => {
      if (rating.isDemo || rating.id === excludeId) return false;
      const existingBarcode = normalizeBarcode(rating.barcode);
      if (barcode && existingBarcode && barcode === existingBarcode) return true;
      return productTextIdentity(rating) === identity;
    }) ?? null
  );
}
