export type CategoryId =
  | 'energy'
  | 'protein'
  | 'snacks'
  | 'restaurants'
  | 'coffee'
  | 'dessert'
  | 'other';

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
  /** May be a temporary picker URI; the store copies it into app storage. */
  photoUri?: string | null;
};

export type SortKey = 'top' | 'new' | 'az' | 'low';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'top', label: 'Top rated' },
  { key: 'new', label: 'Newest' },
  { key: 'az', label: 'A–Z' },
  { key: 'low', label: 'Lowest' },
];
