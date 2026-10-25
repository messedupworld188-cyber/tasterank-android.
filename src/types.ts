export type CategoryId =
  | 'energy'
  | 'protein'
  | 'snacks'
  | 'restaurants'
  | 'coffee'
  | 'dessert'
  | 'other';

/** Where the product details originally came from. */
export type ProductSource = 'manual' | 'openfoodfacts';

/** A single saved tasting. Scores range from 0.0 to 10.0 in 0.1 steps. */
export interface Rating {
  id: string;
  name: string;
  brand: string;
  flavor: string;
  category: CategoryId;
  score: number;
  review: string;
  /** Permanent file URI inside the app's documents directory, or null. */
  photoUri: string | null;
  /** EAN/UPC code used to identify the product, or null for manual entries. */
  barcode: string | null;
  source: ProductSource;
  createdAt: string;
  updatedAt: string;
  /** Demo entries can be removed in one tap from Settings. */
  isDemo?: boolean;
}

export type RatingInput = {
  name: string;
  brand?: string;
  flavor?: string;
  category: CategoryId;
  score: number;
  review?: string;
  /** May be a temporary picker URI or a remote product image; the store keeps it. */
  photoUri?: string | null;
  barcode?: string | null;
  source?: ProductSource;
};

/** A real product returned by Open Food Facts before it is rated. */
export interface ProductCandidate {
  /** EAN/UPC barcode, used as the stable product identifier. */
  barcode: string;
  name: string;
  brand: string;
  flavor: string;
  /** Net weight or volume, used when the database has no flavour field. */
  quantity: string;
  category: CategoryId;
  /** 400px front image, saved locally when the rating is created. */
  imageUrl: string | null;
  /** 200px front image for lists. */
  thumbnailUrl: string | null;
}

export type SortKey = 'top' | 'new' | 'az' | 'low';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'top', label: 'Top rated' },
  { key: 'new', label: 'Newest' },
  { key: 'az', label: 'A–Z' },
  { key: 'low', label: 'Lowest' },
];
