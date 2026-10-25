import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CategoryId, ProductSource, Rating, RatingInput } from '../types';
import { loadRatings, saveRatings } from '../lib/storage';
import { deletePhoto, persistPhoto } from '../lib/photos';
import { createDemoRatings } from '../data/demo';
import { roundScore, uid } from '../lib/utils';
import { findDuplicateRating, normalizeBarcode } from '../lib/productIdentity';

/** Thrown when a barcode or product identity is already in the collection. */
export class DuplicateRatingError extends Error {
  existing: Rating;

  constructor(existing: Rating) {
    super(`You already rated ${existing.name}.`);
    this.name = 'DuplicateRatingError';
    this.existing = existing;
  }
}

interface RatingsContextValue {
  ratings: Rating[];
  ready: boolean;
  storageError: string | null;
  addRating: (input: RatingInput) => Promise<Rating>;
  updateRating: (id: string, input: RatingInput) => Promise<Rating>;
  deleteRating: (id: string) => Promise<void>;
  loadDemoRatings: () => Promise<number>;
  removeDemoRatings: () => Promise<number>;
  clearAllRatings: () => Promise<void>;
}

const RatingsContext = createContext<RatingsContextValue | null>(null);

interface NormalizedInput {
  name: string;
  brand: string;
  flavor: string;
  category: CategoryId;
  score: number;
  review: string;
  photoUri: string | null;
  barcode: string | null;
  source: ProductSource;
}

function normalize(input: RatingInput): NormalizedInput {
  return {
    name: input.name.trim(),
    brand: (input.brand ?? '').trim(),
    flavor: (input.flavor ?? '').trim(),
    category: input.category,
    score: roundScore(input.score),
    review: (input.review ?? '').trim(),
    photoUri: input.photoUri ?? null,
    barcode: normalizeBarcode(input.barcode),
    source: input.source === 'openfoodfacts' ? 'openfoodfacts' : 'manual',
  };
}

export function RatingsProvider({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const ratingsRef = useRef<Rating[]>([]);
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadRatings()
      .then((loaded) => {
        if (!active) return;
        ratingsRef.current = loaded;
        setRatings(loaded);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback((next: Rating[]) => {
    ratingsRef.current = next;
    setRatings(next);
    writeChain.current = writeChain.current
      .then(() => saveRatings(next))
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        console.warn('[TasteRank] Could not save ratings', error);
        setStorageError('TasteRank could not save to this device. Your latest change may be lost.');
      });
  }, []);

  const addRating = useCallback(
    async (input: RatingInput): Promise<Rating> => {
      const fields = normalize(input);
      const duplicate = findDuplicateRating(ratingsRef.current, fields);
      if (duplicate) throw new DuplicateRatingError(duplicate);

      const id = uid();
      const now = new Date().toISOString();
      let photoUri: string | null = null;
      if (fields.photoUri) {
        try {
          photoUri = await persistPhoto(fields.photoUri, id);
        } catch (error) {
          console.warn('[TasteRank] Could not save photo', error);
          photoUri = fields.photoUri;
        }
      }
      const rating: Rating = { ...fields, photoUri, id, createdAt: now, updatedAt: now };
      commit([rating, ...ratingsRef.current]);
      return rating;
    },
    [commit],
  );

  const updateRating = useCallback(
    async (id: string, input: RatingInput): Promise<Rating> => {
      const existing = ratingsRef.current.find((rating) => rating.id === id);
      if (!existing) throw new Error('That rating no longer exists.');

      const fields = normalize(input);
      if (input.barcode === undefined) fields.barcode = existing.barcode;
      if (input.source === undefined) fields.source = existing.source;
      const duplicate = findDuplicateRating(ratingsRef.current, fields, id);
      if (duplicate) throw new DuplicateRatingError(duplicate);

      let photoUri = existing.photoUri;
      const incomingPhoto = fields.photoUri ?? null;

      if (incomingPhoto !== existing.photoUri) {
        if (incomingPhoto) {
          try {
            photoUri = await persistPhoto(incomingPhoto, id);
          } catch (error) {
            console.warn('[TasteRank] Could not save photo', error);
            photoUri = incomingPhoto;
          }
          if (existing.photoUri && existing.photoUri !== photoUri) {
            await deletePhoto(existing.photoUri);
          }
        } else {
          photoUri = null;
          await deletePhoto(existing.photoUri);
        }
      }

      const updated: Rating = {
        ...existing,
        ...fields,
        photoUri,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      commit(ratingsRef.current.map((rating) => (rating.id === id ? updated : rating)));
      return updated;
    },
    [commit],
  );

  const deleteRating = useCallback(
    async (id: string): Promise<void> => {
      const existing = ratingsRef.current.find((rating) => rating.id === id);
      if (existing?.photoUri) await deletePhoto(existing.photoUri);
      commit(ratingsRef.current.filter((rating) => rating.id !== id));
    },
    [commit],
  );

  const loadDemoRatings = useCallback(async (): Promise<number> => {
    if (ratingsRef.current.some((rating) => rating.isDemo)) return 0;
    const demo = createDemoRatings();
    commit([...demo, ...ratingsRef.current]);
    return demo.length;
  }, [commit]);

  const removeDemoRatings = useCallback(async (): Promise<number> => {
    const demo = ratingsRef.current.filter((rating) => rating.isDemo);
    if (demo.length === 0) return 0;
    commit(ratingsRef.current.filter((rating) => !rating.isDemo));
    return demo.length;
  }, [commit]);

  const clearAllRatings = useCallback(async (): Promise<void> => {
    await Promise.all(ratingsRef.current.map((rating) => deletePhoto(rating.photoUri)));
    commit([]);
  }, [commit]);

  const value = useMemo<RatingsContextValue>(
    () => ({
      ratings,
      ready,
      storageError,
      addRating,
      updateRating,
      deleteRating,
      loadDemoRatings,
      removeDemoRatings,
      clearAllRatings,
    }),
    [
      ratings,
      ready,
      storageError,
      addRating,
      updateRating,
      deleteRating,
      loadDemoRatings,
      removeDemoRatings,
      clearAllRatings,
    ],
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings(): RatingsContextValue {
  const context = useContext(RatingsContext);
  if (!context) throw new Error('useRatings must be used inside RatingsProvider');
  return context;
}
