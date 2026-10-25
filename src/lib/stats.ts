import type { Rating } from '../types';
import { CATEGORIES, getCategory, type CategoryMeta } from '../constants/categories';
import { average, filterAndSort } from './utils';

export interface CategorySummary {
  category: CategoryMeta;
  count: number;
  average: number | null;
  best: Rating | null;
}

export interface StatsSummary {
  total: number;
  average: number | null;
  highest: Rating | null;
  lowest: Rating | null;
  categoriesUsed: number;
  brands: number;
  withPhotos: number;
  lastRatedAt: string | null;
  favourite: CategorySummary | null;
  topCategoryByAverage: CategorySummary | null;
}

export function categorySummaries(ratings: Rating[]): CategorySummary[] {
  return CATEGORIES.map((category) => {
    const items = ratings.filter((rating) => rating.category === category.id);
    const scores = items.map((rating) => rating.score);
    const best = items.reduce<Rating | null>(
      (winner, rating) => (!winner || rating.score > winner.score ? rating : winner),
      null,
    );
    return {
      category,
      count: items.length,
      average: average(scores),
      best,
    };
  }).filter((summary) => summary.count > 0);
}

export function summarize(ratings: Rating[]): StatsSummary {
  const scores = ratings.map((rating) => rating.score);
  const sortedByScore = [...ratings].sort((a, b) => b.score - a.score);
  const sortedByDate = [...ratings].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const summaries = categorySummaries(ratings);
  const byCount = [...summaries].sort((a, b) => b.count - a.count);
  const byAverage = [...summaries]
    .filter((summary) => summary.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  return {
    total: ratings.length,
    average: average(scores),
    highest: sortedByScore[0] ?? null,
    lowest: sortedByScore[sortedByScore.length - 1] ?? null,
    categoriesUsed: summaries.length,
    brands: new Set(
      ratings.map((rating) => rating.brand.trim().toLowerCase()).filter(Boolean),
    ).size,
    withPhotos: ratings.filter((rating) => Boolean(rating.photoUri)).length,
    lastRatedAt: sortedByDate[0]?.createdAt ?? null,
    favourite: byCount[0] ?? null,
    topCategoryByAverage: byAverage[0] ?? null,
  };
}

export function topRated(ratings: Rating[], count: number): Rating[] {
  return filterAndSort(ratings, { sort: 'top' }).slice(0, count);
}

export function recentRatings(ratings: Rating[], count: number): Rating[] {
  return filterAndSort(ratings, { sort: 'new' }).slice(0, count);
}

export interface Bucket {
  label: string;
  count: number;
  min: number;
  max: number;
}

export function scoreDistribution(ratings: Rating[]): Bucket[] {
  const buckets: Bucket[] = [
    { label: '0–2', min: 0, max: 2, count: 0 },
    { label: '2–4', min: 2, max: 4, count: 0 },
    { label: '4–6', min: 4, max: 6, count: 0 },
    { label: '6–8', min: 6, max: 8, count: 0 },
    { label: '8–10', min: 8, max: 10, count: 0 },
  ];
  for (const rating of ratings) {
    const bucket =
      buckets.find((candidate) => rating.score >= candidate.min && rating.score < candidate.max) ??
      buckets[buckets.length - 1];
    bucket.count += 1;
  }
  return buckets;
}

export function findRating(ratings: Rating[], id: string | undefined): Rating | null {
  if (!id) return null;
  return ratings.find((rating) => rating.id === id) ?? null;
}

export function categoryName(id: string): string {
  return getCategory(id as Rating['category']).label;
}
