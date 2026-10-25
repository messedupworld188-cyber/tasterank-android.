import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CategoryId, Rating } from '../types';
import { CATEGORIES } from '../constants/categories';

const STORAGE_KEY = '@tasterank/ratings:v1';

type Envelope = {
  version: 1;
  ratings: Rating[];
};

function isCategory(value: unknown): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

function sanitize(raw: unknown): Rating | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!id || !name) return null;
  const score = typeof record.score === 'number' ? record.score : Number(record.score);
  const createdAt =
    typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
      ? record.createdAt
      : new Date().toISOString();

  return {
    id,
    name,
    brand: typeof record.brand === 'string' ? record.brand : '',
    flavor: typeof record.flavor === 'string' ? record.flavor : '',
    category: isCategory(record.category) ? record.category : 'other',
    score: Number.isFinite(score) ? Math.min(10, Math.max(0, Math.round(score * 10) / 10)) : 0,
    review: typeof record.review === 'string' ? record.review : '',
    photoUri: typeof record.photoUri === 'string' ? record.photoUri : null,
    createdAt,
    updatedAt:
      typeof record.updatedAt === 'string' && !Number.isNaN(Date.parse(record.updatedAt))
        ? record.updatedAt
        : createdAt,
    isDemo: record.isDemo === true ? true : undefined,
  };
}

/** Reads ratings from device storage. Never throws: a corrupt blob yields an empty list. */
export async function loadRatings(): Promise<Rating[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const list =
      Array.isArray(parsed) ? parsed : (parsed as Envelope | null)?.version === 1 ? (parsed as Envelope).ratings : [];
    if (!Array.isArray(list)) return [];
    return list
      .map(sanitize)
      .filter((rating): rating is Rating => rating !== null)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch (error) {
    console.warn('[TasteRank] Could not read saved ratings', error);
    return [];
  }
}

/** Persists ratings on the device. Throws when the write fails so callers can surface it. */
export async function saveRatings(ratings: Rating[]): Promise<void> {
  const envelope: Envelope = { version: 1, ratings };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}
