import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CategoryId, ProductCandidate } from '../types';
import { CATEGORIES } from '../constants/categories';
import { normalizeBarcode } from './productIdentity';
import {
  fetchProductByBarcode,
  searchProducts,
  ProductApiError,
} from './openFoodFacts';

const SEARCH_PREFIX = '@tasterank/off-search:v2:';
const PRODUCT_PREFIX = '@tasterank/off-product:v2:';
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;
const PRODUCT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SEARCH_KEYS = 40;
const MAX_PRODUCT_KEYS = 60;

interface CachedSearch {
  query: string;
  savedAt: number;
  products: ProductCandidate[];
}

interface CachedProduct {
  barcode: string;
  savedAt: number;
  product: ProductCandidate;
}

export interface SearchOutcome {
  products: ProductCandidate[];
  savedAt: number;
  fromCache: boolean;
  /** True when the network failed and older cached results were used. */
  stale: boolean;
  error?: unknown;
}

export interface BarcodeOutcome {
  product: ProductCandidate;
  savedAt: number;
  fromCache: boolean;
  stale: boolean;
  error?: unknown;
}

function hashKey(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isCategory(value: unknown): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

function sanitizeProduct(value: unknown): ProductCandidate | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const barcode = typeof record.barcode === 'string' ? record.barcode.trim() : '';
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!barcode || !name) return null;
  return {
    barcode,
    name,
    brand: typeof record.brand === 'string' ? record.brand : '',
    flavor: typeof record.flavor === 'string' ? record.flavor : '',
    quantity: typeof record.quantity === 'string' ? record.quantity : '',
    category: isCategory(record.category) ? record.category : 'other',
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : null,
  };
}

function sanitizeProducts(value: unknown): ProductCandidate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeProduct)
    .filter((product): product is ProductCandidate => product !== null);
}

function searchKey(query: string): string {
  return `${SEARCH_PREFIX}${hashKey(normalizeQuery(query))}`;
}

function productKey(barcode: string): string {
  return `${PRODUCT_PREFIX}${normalizeBarcode(barcode) ?? barcode}`;
}

async function readSearch(query: string): Promise<CachedSearch | null> {
  try {
    const raw = await AsyncStorage.getItem(searchKey(query));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (normalizeQuery(String(record.query ?? '')) !== normalizeQuery(query)) return null;
    const savedAt = typeof record.savedAt === 'number' ? record.savedAt : 0;
    const products = sanitizeProducts(record.products);
    if (!savedAt) return null;
    return { query, savedAt, products };
  } catch {
    return null;
  }
}

async function writeSearch(query: string, products: ProductCandidate[]): Promise<number> {
  const savedAt = Date.now();
  try {
    await AsyncStorage.setItem(
      searchKey(query),
      JSON.stringify({ query, savedAt, products } satisfies CachedSearch),
    );
    void prune(SEARCH_PREFIX, MAX_SEARCH_KEYS);
  } catch (error) {
    console.warn('[TasteRank] Could not cache product search', error);
  }
  return savedAt;
}

async function readProduct(barcode: string): Promise<CachedProduct | null> {
  try {
    const raw = await AsyncStorage.getItem(productKey(barcode));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const product = sanitizeProduct(record.product);
    const savedAt = typeof record.savedAt === 'number' ? record.savedAt : 0;
    if (!product || !savedAt) return null;
    return { barcode, savedAt, product };
  } catch {
    return null;
  }
}

async function writeProduct(product: ProductCandidate): Promise<number> {
  const savedAt = Date.now();
  try {
    await AsyncStorage.setItem(
      productKey(product.barcode),
      JSON.stringify({ barcode: product.barcode, savedAt, product } satisfies CachedProduct),
    );
    void prune(PRODUCT_PREFIX, MAX_PRODUCT_KEYS);
  } catch (error) {
    console.warn('[TasteRank] Could not cache product lookup', error);
  }
  return savedAt;
}

/** Keeps the on-device cache bounded without touching ratings. */
async function prune(prefix: string, limit: number): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (keys.length <= limit) return;
    const entries = await AsyncStorage.multiGet(keys);
    const dated = entries
      .map(([key, value]) => {
        try {
          const parsed = JSON.parse(value ?? '{}') as { savedAt?: unknown };
          return { key, savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0 };
        } catch {
          return { key, savedAt: 0 };
        }
      })
      .sort((a, b) => b.savedAt - a.savedAt);
    const remove = dated.slice(limit).map((entry) => entry.key);
    if (remove.length > 0) await AsyncStorage.multiRemove(remove);
  } catch {
    // Cache maintenance is best-effort.
  }
}

/**
 * Cached keyword search. Fresh results (24h) never touch the network. If the
 * request fails, older results are returned with `stale: true`.
 */
export async function searchProductsWithCache(query: string): Promise<SearchOutcome> {
  const cached = await readSearch(query);
  const now = Date.now();

  if (cached && now - cached.savedAt < SEARCH_TTL_MS) {
    return {
      products: cached.products,
      savedAt: cached.savedAt,
      fromCache: true,
      stale: false,
    };
  }

  try {
    const products = await searchProducts(query);
    const savedAt = await writeSearch(query, products);
    return { products, savedAt, fromCache: false, stale: false };
  } catch (error) {
    if (cached) {
      return {
        products: cached.products,
        savedAt: cached.savedAt,
        fromCache: true,
        stale: true,
        error,
      };
    }
    throw error;
  }
}

/**
 * Cached barcode lookup. Fresh products (7 days) are instant. A network,
 * server or rate-limit failure falls back to the saved product.
 */
export async function lookupBarcodeWithCache(barcode: string): Promise<BarcodeOutcome> {
  const cached = await readProduct(barcode);
  const now = Date.now();

  if (cached && now - cached.savedAt < PRODUCT_TTL_MS) {
    return {
      product: cached.product,
      savedAt: cached.savedAt,
      fromCache: true,
      stale: false,
    };
  }

  try {
    const product = await fetchProductByBarcode(barcode);
    const savedAt = await writeProduct(product);
    return { product, savedAt, fromCache: false, stale: false };
  } catch (error) {
    const canReuse =
      cached &&
      (!(error instanceof ProductApiError) || error.kind !== 'not-found');
    if (canReuse) {
      return {
        product: cached.product,
        savedAt: cached.savedAt,
        fromCache: true,
        stale: true,
        error,
      };
    }
    throw error;
  }
}
