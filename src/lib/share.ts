import { Share } from 'react-native';
import type { Rating } from '../types';
import { getCategory } from '../constants/categories';
import { formatScore } from './utils';

export function buildRankingsText(ratings: Rating[], label: string): string {
  const lines = ratings.map((rating, index) => {
    const product = [rating.brand, rating.name].filter(Boolean).join(' ');
    const flavor = rating.flavor ? ` (${rating.flavor})` : '';
    return `${index + 1}. ${product}${flavor} — ${formatScore(rating.score)}/10`;
  });
  return [
    `TasteRank · ${label}`,
    '',
    ...lines,
    '',
    `${ratings.length} rated · my personal ranking`,
  ].join('\n');
}

export function buildRatingText(rating: Rating): string {
  const product = [rating.brand, rating.name].filter(Boolean).join(' ');
  const flavor = rating.flavor ? ` (${rating.flavor})` : '';
  return [
    `${product}${flavor}`,
    `${getCategory(rating.category).label} · ${formatScore(rating.score)}/10`,
    rating.review ? `\n“${rating.review}”` : '',
    '',
    'Ranked with TasteRank',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export async function shareRankings(ratings: Rating[], label: string): Promise<void> {
  if (ratings.length === 0) return;
  await Share.share({
    title: `TasteRank · ${label}`,
    message: buildRankingsText(ratings, label),
  });
}

export async function shareSingleRating(rating: Rating): Promise<void> {
  await Share.share({
    title: `${rating.name} · TasteRank`,
    message: buildRatingText(rating),
  });
}
