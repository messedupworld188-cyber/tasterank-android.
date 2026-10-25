import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ProductThumb } from './ProductThumb';
import { getCategory } from '../constants/categories';
import { colors, radius } from '../constants/theme';
import type { ProductCandidate } from '../types';

interface SelectedProductCardProps {
  product: ProductCandidate;
  onChange: () => void;
}

export function SelectedProductCard({
  product,
  onChange,
}: SelectedProductCardProps): React.JSX.Element {
  const category = getCategory(product.category);
  const detail =
    [product.brand, product.flavor, product.quantity].filter(Boolean).join(' · ') ||
    category.label;

  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <ProductThumb
          name={product.name}
          brand={product.brand}
          category={product.category}
          photoUri={product.thumbnailUrl ?? product.imageUrl}
          size={64}
          rounded={radius.md}
          showInitials
        />
        <View style={styles.copy}>
          <View style={styles.sourceRow}>
            <Ionicons name="checkmark-circle" size={13} color={colors.lime} />
            <AppText variant="label" color={colors.lime}>
              PRODUCT SELECTED
            </AppText>
          </View>
          <AppText variant="heading" numberOfLines={2}>
            {product.name}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
            {detail}
          </AppText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="barcode-outline" size={12} color={colors.textFaint} />
          <AppText variant="caption" color={colors.textFaint}>
            {product.barcode}
          </AppText>
        </View>
        <Button label="Change" size="sm" variant="secondary" icon="swap-horizontal" onPress={onChange} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    borderColor: colors.limeBorder,
    backgroundColor: colors.surfaceAlt,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
