import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ProductThumb } from './ProductThumb';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';
import { getCategory } from '../constants/categories';
import { colors, radius } from '../constants/theme';
import type { ProductCandidate, Rating } from '../types';
import { formatScore } from '../lib/utils';

interface ProductResultRowProps {
  product: ProductCandidate;
  existing: Rating | null;
  onPress: () => void;
}

export function ProductResultRow({
  product,
  existing,
  onPress,
}: ProductResultRowProps): React.JSX.Element {
  const category = getCategory(product.category);
  const detail =
    [product.brand, product.flavor || product.quantity].filter(Boolean).join(' · ') ||
    category.label;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${product.name}${
        existing ? `, already rated ${formatScore(existing.score)}` : ''
      }`}
      onPress={onPress}
      style={styles.row}
    >
      <ProductThumb
        name={product.name}
        brand={product.brand}
        category={product.category}
        photoUri={product.thumbnailUrl ?? product.imageUrl}
        size={58}
        rounded={radius.md}
        showInitials
      />
      <View style={styles.copy}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {product.name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {detail}
        </AppText>
        <View style={styles.tagRow}>
          <Ionicons
            name={category.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={11}
            color={category.tint}
          />
          <AppText variant="caption" color={colors.textFaint} style={styles.tagText}>
            {category.short}
          </AppText>
        </View>
      </View>
      {existing ? (
        <View style={styles.rated}>
          <Ionicons name="checkmark" size={11} color={colors.onAccent} />
          <AppText variant="caption" color={colors.onAccent} style={styles.ratedText}>
            {formatScore(existing.score)}
          </AppText>
        </View>
      ) : (
        <Ionicons name="add-circle-outline" size={21} color={colors.accent} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  tagText: {
    fontSize: 11,
  },
  rated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  ratedText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
