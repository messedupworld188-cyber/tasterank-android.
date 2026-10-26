import { SORT_OPTIONS, type Rating, type SortKey } from '../types';
import { getCategory } from '../constants/categories';
import { colors } from '../constants/theme';

export function roundScore(value: number): number {
  const clamped = Math.min(10, Math.max(0, value));
  return Math.round(clamped * 10) / 10;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return formatDate(iso);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function verdictFor(score: number): string {
  if (score >= 9.5) return 'Hall of fame';
  if (score >= 9) return 'Elite';
  if (score >= 8) return 'Excellent';
  if (score >= 6.5) return 'Solid';
  if (score >= 5) return 'Average';
  if (score >= 3) return 'Not for me';
  return 'Would not repeat';
}

export function initialsFor(...parts: (string | null | undefined)[]): string {
  const words = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function sortRatings(ratings: Rating[], sort: SortKey): Rating[] {
  const copy = [...ratings];
  switch (sort) {
    case 'top':
      return copy.sort(
        (a, b) => b.score - a.score || Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
    case 'low':
      return copy.sort(
        (a, b) => a.score - b.score || Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
    case 'az':
      return copy.sort((a, b) =>
        `${a.brand} ${a.name}`.toLowerCase().localeCompare(`${b.brand} ${b.name}`.toLowerCase()),
      );
    case 'new':
    default:
      return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}

export function matchesQuery(rating: Rating, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const category = getCategory(rating.category);
  return [rating.name, rating.brand, rating.flavor, rating.review, category.label, category.short]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle));
}

export function filterAndSort(
  ratings: Rating[],
  options: { query?: string; category?: string | null; sort?: SortKey },
): Rating[] {
  const { query = '', category = null, sort = 'top' } = options;
  const filtered = ratings.filter(
    (rating) => (category ? rating.category === category : true) && matchesQuery(rating, query),
  );
  return sortRatings(filtered, sort);
}

export function sortLabel(sort: SortKey): string {
  return SORT_OPTIONS.find((option) => option.key === sort)?.label ?? 'Top rated';
}

export function scoreTone(score: number): {
  background: string;
  text: string;
  border: string;
} {
  if (score >= 8) {
    return {
      background: colors.accentSoft,
      text: colors.accentBright,
      border: colors.accentBorder,
    };
  }
  if (score >= 6) {
    return {
      background: 'rgba(255, 209, 102, 0.14)',
      text: '#FFD166',
      border: 'rgba(255, 209, 102, 0.34)',
    };
  }
  return {
    background: 'rgba(255, 255, 255, 0.07)',
    text: '#C7CFDA',
    border: 'rgba(255, 255, 255, 0.12)',
  };
}
