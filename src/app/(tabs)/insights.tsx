import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScoreBar } from '../../components/ui/ScoreBadge';
import { StatTile } from '../../components/ui/StatTile';
import { LeaderboardRow } from '../../components/RatingCard';
import { useRatings } from '../../store/RatingsProvider';
import { colors, radius, spacing } from '../../constants/theme';
import { formatScore, pluralize } from '../../lib/utils';
import {
  categorySummaries,
  scoreDistribution,
  summarize,
  topRated,
} from '../../lib/stats';

export default function InsightsScreen(): React.JSX.Element {
  const router = useRouter();
  const { ratings, ready } = useRatings();

  const stats = useMemo(() => summarize(ratings), [ratings]);
  const categories = useMemo(
    () => [...categorySummaries(ratings)].sort((a, b) => b.count - a.count),
    [ratings],
  );
  const distribution = useMemo(() => scoreDistribution(ratings), [ratings]);
  const top = useMemo(() => topRated(ratings, 3), [ratings]);
  const maxBucket = Math.max(1, ...distribution.map((bucket) => bucket.count));
  const withReviews = ratings.filter((rating) => rating.review.trim().length > 0).length;

  if (!ready) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.lime} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="label" color={colors.textFaint}>
            YOUR PATTERNS
          </AppText>
          <AppText variant="display">Insights</AppText>
          <AppText variant="body" color={colors.textMuted}>
            A read on how you rate, what you love and where your taste is heading.
          </AppText>
        </View>

        {stats.total === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="No data to analyse yet"
            message="Rate a few things and this screen fills with your averages, favourite categories and top picks."
          >
            <Button label="Add a rating" icon="add" onPress={() => router.push('/add')} />
          </EmptyState>
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statRow}>
                <StatTile
                  label="Total reviews"
                  value={String(stats.total)}
                  icon="document-text-outline"
                  footnote={`${withReviews} written`}
                />
                <StatTile
                  label="Average score"
                  value={formatScore(stats.average)}
                  icon="trending-up"
                  accent
                  footnote="out of 10"
                />
              </View>
              <View style={styles.statRow}>
                <StatTile
                  label="Highest"
                  value={stats.highest ? formatScore(stats.highest.score) : '—'}
                  icon="trophy-outline"
                  footnote={stats.highest?.name}
                />
                <StatTile
                  label="Categories"
                  value={String(stats.categoriesUsed)}
                  icon="grid-outline"
                  footnote={`${stats.brands} brands`}
                />
              </View>
            </View>

            {stats.favourite ? (
              <Card style={styles.favouriteCard}>
                <View
                  style={[
                    styles.favouriteIcon,
                    {
                      backgroundColor: `${stats.favourite.category.tint}18`,
                      borderColor: `${stats.favourite.category.tint}44`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      stats.favourite.category.icon as React.ComponentProps<
                        typeof Ionicons
                      >['name']
                    }
                    size={22}
                    color={stats.favourite.category.tint}
                  />
                </View>
                <View style={styles.favouriteCopy}>
                  <AppText variant="label" color={colors.textFaint}>
                    YOU RATE MOST
                  </AppText>
                  <AppText variant="heading">{stats.favourite.category.label}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {pluralize(stats.favourite.count, 'rating')}
                    {stats.favourite.average !== null
                      ? ` · avg ${formatScore(stats.favourite.average)}/10`
                      : ''}
                  </AppText>
                </View>
              </Card>
            ) : null}

            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText variant="heading">Score spread</AppText>
                <AppText variant="caption" color={colors.textFaint}>
                  {stats.total} {pluralize(stats.total, 'rating')}
                </AppText>
              </View>
              <View style={styles.buckets}>
                {distribution.map((bucket) => (
                  <View key={bucket.label} style={styles.bucketRow}>
                    <AppText variant="caption" color={colors.textMuted} style={styles.bucketLabel}>
                      {bucket.label}
                    </AppText>
                    <View style={styles.bucketTrack}>
                      <View
                        style={[
                          styles.bucketFill,
                          {
                            width: `${(bucket.count / maxBucket) * 100}%`,
                            opacity: bucket.count === 0 ? 0.16 : 1,
                          },
                        ]}
                      />
                    </View>
                    <AppText
                      variant="caption"
                      color={bucket.count === 0 ? colors.textFaint : colors.text}
                      style={styles.bucketCount}
                    >
                      {bucket.count}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText variant="heading">By category</AppText>
                <AppText variant="caption" color={colors.textFaint}>
                  Avg score
                </AppText>
              </View>
              <View style={styles.categoryList}>
                {categories.map((summary) => (
                  <View key={summary.category.id} style={styles.categoryRow}>
                    <View
                      style={[
                        styles.categoryIcon,
                        {
                          backgroundColor: `${summary.category.tint}16`,
                          borderColor: `${summary.category.tint}3A`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          summary.category.icon as React.ComponentProps<
                            typeof Ionicons
                          >['name']
                        }
                        size={15}
                        color={summary.category.tint}
                      />
                    </View>
                    <View style={styles.categoryBody}>
                      <View style={styles.categoryTitleRow}>
                        <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                          {summary.category.label}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted}>
                          {pluralize(summary.count, 'rating')}
                        </AppText>
                      </View>
                      <View style={styles.categoryScoreRow}>
                        <View style={styles.categoryBar}>
                          <ScoreBar
                            score={summary.average ?? 0}
                            height={5}
                            tint={summary.category.tint}
                          />
                        </View>
                        <AppText variant="caption" color={colors.text}>
                          {formatScore(summary.average)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {top.length > 0 ? (
              <View style={styles.topSection}>
                <View style={styles.cardHeader}>
                  <AppText variant="heading">Highest rated</AppText>
                  <AppText variant="caption" color={colors.textFaint}>
                    Top {top.length}
                  </AppText>
                </View>
                <View>
                  {top.map((rating, index) => (
                    <View key={rating.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <LeaderboardRow
                        rating={rating}
                        rank={index + 1}
                        onPress={() => router.push(`/item/${rating.id}`)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  statGrid: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  favouriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  favouriteIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favouriteCopy: {
    flex: 1,
    gap: 2,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  buckets: {
    gap: 12,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bucketLabel: {
    width: 36,
  },
  bucketTrack: {
    flex: 1,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  bucketFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  bucketCount: {
    width: 20,
    textAlign: 'right',
  },
  categoryList: {
    gap: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    flex: 1,
    gap: 6,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryBar: {
    flex: 1,
  },
  topSection: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.55,
  },
});
