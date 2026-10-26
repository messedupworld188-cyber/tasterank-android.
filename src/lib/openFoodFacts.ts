import type { CategoryId, ProductCandidate } from '../types';
import { normalizeBarcode } from './productIdentity';

/**
 * Open Food Facts client.
 *
 * API rules (https://openfoodfacts.github.io/openfoodfacts-server/api/):
 * - 10 search requests/min/IP and 15 product reads/min/IP.
 * - No search-as-you-type. TasteRank searches only on submit, throttles
 *   requests, and caches results.
 * - A custom User-Agent identifying the app is required.
 */

const SEARCH_ENDPOINT = 'https://search.openfoodfacts.org/search';
const PRODUCT_ENDPOINT = 'https://world.openfoodfacts.org/api/v3/product';
const USER_AGENT =
  'TasteRank/1.2.0 (https://github.com/messedupworld188-cyber/tasterank-android.)';

const SEARCH_PAGE_SIZE = 20;
const SEARCH_INTERVAL_MS = 6_500; // 10 per minute, with headroom
const PRODUCT_INTERVAL_MS = 4_500; // 15 per minute, with headroom
const REQUEST_TIMEOUT_MS = 12_000;

const FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'flavors',
  'quantity',
  'categories_tags',
  'image_front_small_url',
  'image_front_url',
].join(',');

export type ProductApiErrorKind =
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'server'
  | 'not-found'
  | 'unknown';

export class ProductApiError extends Error {
  kind: ProductApiErrorKind;
  retryAfterMs: number;
  status?: number;

  constructor(
    kind: ProductApiErrorKind,
    message: string,
    options: { retryAfterMs?: number; status?: number } = {},
  ) {
    super(message);
    this.name = 'ProductApiError';
    this.kind = kind;
    this.retryAfterMs = options.retryAfterMs ?? 0;
    this.status = options.status;
  }
}

let nextSearchAt = 0;
let nextProductAt = 0;

export function searchCooldownMs(): number {
  return Math.max(0, nextSearchAt - Date.now());
}

export function productCooldownMs(): number {
  return Math.max(0, nextProductAt - Date.now());
}

function takeSlot(kind: 'search' | 'product'): void {
  const now = Date.now();
  const nextAt = kind === 'search' ? nextSearchAt : nextProductAt;
  const interval = kind === 'search' ? SEARCH_INTERVAL_MS : PRODUCT_INTERVAL_MS;

  if (now < nextAt) {
    throw new ProductApiError(
      'rate-limit',
      kind === 'search'
        ? 'Open Food Facts allows 10 searches per minute.'
        : 'Open Food Facts allows 15 product lookups per minute.',
      { retryAfterMs: nextAt - now },
    );
  }

  if (kind === 'search') nextSearchAt = now + interval;
  else nextProductAt = now + interval;
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 20_000;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 120) * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(1_000, Math.min(date - Date.now(), 120_000));
  return 20_000;
}

async function getJson(
  url: string,
  kind: 'search' | 'product',
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
      if (kind === 'search') nextSearchAt = Math.max(nextSearchAt, Date.now() + retryAfterMs);
      else nextProductAt = Math.max(nextProductAt, Date.now() + retryAfterMs);
      throw new ProductApiError('rate-limit', 'Open Food Facts is rate limiting requests.', {
        retryAfterMs,
        status: 429,
      });
    }

    if (response.status === 404) {
      throw new ProductApiError('not-found', 'No product matched that barcode.', {
        status: 404,
      });
    }

    if (!response.ok) {
      throw new ProductApiError(
        response.status >= 500 ? 'server' : 'unknown',
        `Open Food Facts returned HTTP ${response.status}.`,
        { status: response.status },
      );
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new ProductApiError('unknown', 'Open Food Facts returned unreadable data.');
    }
  } catch (error) {
    if (error instanceof ProductApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProductApiError('timeout', 'The Open Food Facts request timed out.');
    }
    throw new ProductApiError('network', 'Could not reach Open Food Facts.');
  } finally {
    clearTimeout(timer);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function joinText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean)
      .join(', ');
  }
  return asString(value);
}

function firstBrand(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const brand = asString(item).split(',')[0]?.trim();
      if (brand) return brand;
    }
    return '';
  }
  return asString(value).split(',')[0]?.trim() ?? '';
}

function cleanName(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const value = asString(candidate).replace(/\s+/g, ' ');
    if (value) return value;
  }
  return '';
}

function imageUrl(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw.replace(/^http:\/\//i, 'https://');
}

/** Maps Open Food Facts category tags to TasteRank's categories. */
export function inferCategory(input: {
  name?: string;
  brand?: string;
  categoriesTags?: string[];
}): CategoryId {
  const haystack = [
    ...(input.categoriesTags ?? []),
    input.name ?? '',
    input.brand ?? '',
  ]
    .join(' ')
    .toLowerCase();

  const has = (...needles: string[]) => needles.some((needle) => haystack.includes(needle));
  const brand = (input.brand ?? '').trim().toLowerCase();

  if (
    brand === 'monster' ||
    brand === 'monster energy' ||
    brand === 'red bull' ||
    brand === 'c4 energy' ||
    brand === 'rockstar' ||
    brand === 'bang energy' ||
    brand === 'ghost energy' ||
    brand === 'alani nu'
  ) {
    return 'energy';
  }

  if (
    has(
      'energy-drink',
      'energy drink',
      'monster energy',
      'red bull',
      'c4 energy',
      'rockstar energy',
      'bang energy',
      'ghost energy',
      'alani nu',
      'prime energy',
    )
  ) {
    return 'energy';
  }
  if (has('protein-bar', 'protein bar', 'protein powder', 'protein snack')) return 'protein';
  if (has('coffee', 'espresso', 'cappuccino', 'latte', 'matcha', 'tea')) return 'coffee';
  if (has('restaurant', 'fast-food', 'fast food')) return 'restaurants';
  if (
    has(
      'ice-cream',
      'ice cream',
      'dessert',
      'chocolate',
      'candy',
      'cookies',
      'cookie',
      'cake',
      'biscuit',
      'wafer',
    )
  ) {
    return 'dessert';
  }
  if (
    has(
      'snack',
      'chips',
      'crisps',
      'popcorn',
      'pretzel',
      'nuts',
      'jerky',
      'cracker',
      'trail mix',
    )
  ) {
    return 'snacks';
  }
  return 'other';
}

/**
 * Extracts the variant from a product name when Open Food Facts has no
 * flavours field, e.g. "Monster Ultra White" with brand "Monster" becomes
 * "Ultra White". Returns an empty string when nothing reliable is left.
 */
export function deriveVariant(name: string, brand: string): string {
  const brandWords = brand
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word.length >= 2 &&
        !['the', 'and', 'ltd', 'limited', 'inc', 'llc', 'co', 'company', 'corp'].includes(
          word,
        ),
    );
  if (brandWords.length === 0) return '';

  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalizedName.startsWith(brandWords[0])) return '';

  // Brand words only contain letters and digits, so they are safe in a RegExp.
  let rest = name;
  for (const word of brandWords) {
    rest = rest.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  }
  rest = rest
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l|kg|g|oz|fl\s*oz|pack|pcs)\b/gi, ' ')
    .replace(/\b(?:energy drinks?|energy|protein bars?|protein|beverages?|drinks?)\b/gi, ' ')
    .replace(/[®™©()\[\]]/g, ' ')
    .replace(/[^A-Za-z0-9À-ÖØ-öø-ÿ\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s&'-]+|[\s&'-]+$/g, '')
    .trim();

  if (rest.length < 2 || rest.length > 40) return '';
  if (rest.toLowerCase() === name.toLowerCase()) return '';
  return rest;
}

interface MappableProduct {
  code?: unknown;
  product_name?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  flavors?: unknown;
  quantity?: unknown;
  categories_tags?: unknown;
  image_front_small_url?: unknown;
  image_front_url?: unknown;
}

/** Converts one raw Open Food Facts record into a product candidate. */
export function mapProduct(
  raw: unknown,
  fallbackBarcode = '',
): ProductCandidate | null {
  const record = asRecord(raw);
  if (!record) return null;

  const product = record as MappableProduct;
  const barcode = asString(product.code) || fallbackBarcode;
  const name = cleanName(product.product_name, product.generic_name);
  if (!barcode || !name) return null;

  const brand = firstBrand(product.brands);
  const categoriesTags = Array.isArray(product.categories_tags)
    ? product.categories_tags.map((tag) => asString(tag)).filter(Boolean)
    : [];

  return {
    barcode,
    name,
    brand,
    flavor: joinText(product.flavors) || deriveVariant(name, brand),
    quantity: asString(product.quantity),
    category: inferCategory({ name, brand, categoriesTags }),
    imageUrl: imageUrl(product.image_front_url) ?? imageUrl(product.image_front_small_url),
    thumbnailUrl:
      imageUrl(product.image_front_small_url) ?? imageUrl(product.image_front_url),
  };
}

/** Full-text keyword search by product name, brand or flavour. */
export async function searchProducts(query: string): Promise<ProductCandidate[]> {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return [];

  takeSlot('search');

  const params = [
    `q=${encodeURIComponent(trimmed.slice(0, 80))}`,
    `page_size=${SEARCH_PAGE_SIZE}`,
    `fields=${encodeURIComponent(FIELDS)}`,
  ].join('&');

  const payload = await getJson(`${SEARCH_ENDPOINT}?${params}`, 'search');
  const record = asRecord(payload);
  const hits = record?.hits;
  if (!Array.isArray(hits)) {
    throw new ProductApiError('unknown', 'Open Food Facts returned an unexpected search result.');
  }

  const seen = new Set<string>();
  const products: ProductCandidate[] = [];
  for (const hit of hits) {
    const product = mapProduct(hit);
    if (!product) continue;
    const key = product.barcode;
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(product);
  }
  return products;
}

/** Looks up a single product by barcode using the current v3 product API. */
export async function fetchProductByBarcode(barcode: string): Promise<ProductCandidate> {
  const code = normalizeBarcode(barcode);
  if (!code || !/^[0-9A-Za-z-]{6,20}$/.test(code)) {
    throw new ProductApiError('not-found', 'That does not look like a product barcode.');
  }

  takeSlot('product');

  const params = `fields=${encodeURIComponent(FIELDS)}`;
  const payload = await getJson(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(code)}.json?${params}`,
    'product',
  );
  const record = asRecord(payload);
  if (!record) {
    throw new ProductApiError('unknown', 'Open Food Facts returned an unexpected product.');
  }

  const status = asString(record.status).toLowerCase();
  const resultRecord = asRecord(record.result);
  const resultId = asString(resultRecord?.id).toLowerCase();
  const product = mapProduct(record.product, code);

  if (product && (status === 'success' || status === '')) return product;

  if (status === 'failure' || resultId.includes('not_found') || status === 'not-found') {
    throw new ProductApiError('not-found', 'No product matched that barcode.');
  }

  throw new ProductApiError('unknown', 'Open Food Facts could not return that product.');
}

/** Short, human-readable explanation for UI banners. */
export function productErrorMessage(error: unknown): string {
  if (error instanceof ProductApiError) {
    switch (error.kind) {
      case 'rate-limit': {
        const seconds = Math.max(1, Math.ceil(error.retryAfterMs / 1000));
        return `Open Food Facts needs a short break. Try again in ${seconds}s.`;
      }
      case 'network':
        return "Can't reach Open Food Facts. Check your connection and try again.";
      case 'timeout':
        return 'Open Food Facts took too long to respond. Try again.';
      case 'server':
        return 'Open Food Facts is busy right now. Try again in a moment.';
      case 'not-found':
        return 'No product matched that barcode on Open Food Facts.';
      default:
        return 'Open Food Facts returned an unexpected response. Try again.';
    }
  }
  return 'Something went wrong while looking up products.';
}
