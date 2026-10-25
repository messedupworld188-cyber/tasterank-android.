import type { CategoryId } from '../types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** Short label for compact chips. */
  short: string;
  icon: string;
  tint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'energy', label: 'Energy Drinks', short: 'Energy', icon: 'flash', tint: '#C4FF54' },
  { id: 'protein', label: 'Protein Bars', short: 'Protein', icon: 'barbell', tint: '#7BD8FF' },
  { id: 'snacks', label: 'Snacks', short: 'Snacks', icon: 'fast-food', tint: '#FFD166' },
  { id: 'restaurants', label: 'Restaurants', short: 'Restaurants', icon: 'restaurant', tint: '#FF9F6E' },
  { id: 'coffee', label: 'Coffee & Tea', short: 'Coffee', icon: 'cafe', tint: '#E0C3A3' },
  { id: 'dessert', label: 'Desserts', short: 'Desserts', icon: 'ice-cream', tint: '#FF9AD5' },
  { id: 'other', label: 'Other', short: 'Other', icon: 'sparkles', tint: '#B6A6FF' },
];

const FALLBACK: CategoryMeta = {
  id: 'other',
  label: 'Other',
  short: 'Other',
  icon: 'sparkles',
  tint: '#B6A6FF',
};

export function getCategory(id: CategoryId | string | undefined): CategoryMeta {
  return CATEGORIES.find((category) => category.id === id) ?? FALLBACK;
}
