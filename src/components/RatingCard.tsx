import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ProductThumb } from './ProductThumb';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';
import { RankBadge } from './ui/RankBadge';
import { ScoreBadge, ScoreBar } from './ui/ScoreBadge';
import { colors, radius, spacing } from '../constants/theme';
import { getCategory } from '../constants/categories';
import type { Rating } from '../types';
import { relativeDate } from '../lib/utils';

interface RowProps {
  rating: Rating;
  onPress: () => void;
}

function DemoTag(): React.JSX.Element {
  return (
    <View style={styles.demoTag}>
      <AppText variant="label" color={colors.textFaint} style={styles.demoText}>
        DEMO
      </AppText>
    </View>
  );
}

/** Row used for recent activity lists. */
export function RecentRow({ rating, onPress }: RowProps): React.JSX.Element {
  const category = getCategory(rating.category);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${rating.name}, rated ${rating.score.toFixed(1)} out of 10`}
      onPress={onPress}
      style={styles.row}
    >
      <ProductThumb
        name={rating.name}
        brand={rating.brand}
        category={rating.category}
        photoUri={rating.photoUri}
        size={48}
        rounded={radius.md}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {rating.name}
          </AppText>
          {rating.isDemo ? <DemoTag /> : null}
        </View>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {[rating.brand, category.short].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={styles.rowRight}>
        <ScoreBadge score={rating.score} size="sm" />
        <AppText variant="caption" color={colors.textFaint} style={styles.rowDate}>
          {relativeDate(rating.createdAt)}
        </AppText>
      </View>
    </PressableScale>
  );
}

interface LeaderboardRowProps extends RowProps {
  rank: number;
}

/** Numbered leaderboard row with a score bar. */
export function LeaderboardRow({ rating, rank, onPress }: LeaderboardRowProps): React.JSX.Element {
  const category = getCategory(rating.category);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}, ${rating.name}, ${rating.score.toFixed(1)} out of 10`}
      onPress={onPress}
      style={[styles.leaderRow, rank <= 3 ? styles.leaderRowTop : null]}
    >
      <RankBadge rank={rank} />
      <ProductThumb
        name={rating.name}
        brand={rating.brand}
        category={rating.category}
        photoUri={rating.photoUri}
        size={52}
        rounded={radius.md}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {rating.name}
          </AppText>
          {rating.isDemo ? <DemoTag /> : null}
        </View>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {[rating.brand || category.short, rating.flavor].filter(Boolean).join(' · ')}
        </AppText>
        <View style={styles.barWrap}>
          <ScoreBar score={rating.score} height={4} />
        </View>
      </View>
      <ScoreBadge score={rating.score} size="md" />
    </PressableScale>
  );
}

/** Compact card for the horizontal top-rated carousel. */
export function TopRatedCard({ rating, rank, onPress }: LeaderboardRowProps): React.JSX.Element {
  const category = getCategory(rating.category);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}, ${rating.name}`}
      onPress={onPress}
      style={styles.topCard}
    >
      <View style={styles.topCardHeader}>
        <ProductThumb
          name={rating.name}
          brand={rating.brand}
          category={rating.category}
          photoUri={rating.photoUri}
          size={46}
          rounded={radius.md}
        />
        <ScoreBadge score={rating.score} size="sm" />
      </View>
      <View style={styles.topCardBody}>
        <AppText variant="bodyStrong" numberOfLines={2} style={styles.topCardTitle}>
          {rating.name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {rating.brand || category.short}
        </AppText>
      </View>
      <View style={styles.topCardFooter}>
        <AppText variant="label" color={colors.textFaint}>
          #{rank}
        </AppText>
        <Ionicons name="arrow-forward" size={14} color={colors.accent} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  leaderRowTop: {
    backgroundColor: colors.accentWash,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  rowBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowDate: {
    fontSize: 11,
  },
  barWrap: {
    marginTop: 5,
    maxWidth: 150,
  },
  demoTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    fontSize: 8,
    letterSpacing: 0.8,
  },
  topCard: {
    width: 168,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  topCardBody: {
    gap: 3,
  },
  topCardTitle: {
    minHeight: 44,
  },
  topCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
