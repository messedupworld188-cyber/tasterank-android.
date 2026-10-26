import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PressableScale } from '../../components/ui/PressableScale';
import { ScoreBar } from '../../components/ui/ScoreBadge';
import { StatTile } from '../../components/ui/StatTile';
import { useToast } from '../../components/ui/Toast';
import { ProductThumb } from '../../components/ProductThumb';
import { RecentRow, TopRatedCard } from '../../components/RatingCard';
import { useRatings } from '../../store/RatingsProvider';
import { getCategory } from '../../constants/categories';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { formatScore, pluralize } from '../../lib/utils';
import { recentRatings, summarize, topRated } from '../../lib/stats';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { ratings, ready, storageError, loadDemoRatings } = useRatings();
  const { show } = useToast();

  const stats = useMemo(() => summarize(ratings), [ratings]);
  const top = useMemo(() => topRated(ratings, 5), [ratings]);
  const recent = useMemo(() => recentRatings(ratings, 4), [ratings]);
  const hero = top[0];
  const favourite = stats.favourite;

  const openItem = (id: string) => router.push(`/item/${id}`);

  const handleLoadDemo = async () => {
    const added = await loadDemoRatings();
    show(added > 0 ? `${added} demo ratings added` : 'Demo ratings are already loaded');
  };

  if (!ready) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="podium" size={14} color={colors.onAccent} />
            </View>
            <AppText style={styles.wordmark}>TasteRank</AppText>
          </View>
          <IconButton
            icon="settings-outline"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        <View style={styles.intro}>
          <AppText variant="label" color={colors.accent}>
            {greeting().toUpperCase()}
          </AppText>
          <AppText variant="display">Your taste,{'\n'}ranked.</AppText>
          <AppText variant="body" color={colors.textMuted}>
            {stats.total > 0
              ? `${pluralize(stats.total, 'rating')} across ${pluralize(stats.categoriesUsed, 'category', 'categories')}. ${
                  stats.average !== null ? `Average score ${formatScore(stats.average)}.` : ''
                }`
              : 'Every can, bar and burger you try becomes part of your personal leaderboard.'}
          </AppText>
        </View>

        {storageError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={styles.flex}>
              {storageError}
            </AppText>
          </View>
        ) : null}

        {stats.total === 0 || !hero ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="podium-outline"
              title="Your leaderboard is empty"
              message="Rate your first energy drink, protein bar or restaurant and TasteRank builds the rankings for you."
            >
              <Button label="Rate your first item" icon="add" onPress={() => router.push('/add')} />
              <Button
                label="Load demo ratings"
                icon="flask-outline"
                variant="secondary"
                onPress={() => void handleLoadDemo()}
              />
            </EmptyState>
          </View>
        ) : (
          <>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Your number one: ${hero.name}`}
              onPress={() => openItem(hero.id)}
              style={styles.heroWrap}
            >
              <LinearGradient
                colors={[colors.accentDeep, colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroTop}>
                  <View style={styles.heroLabel}>
                    <Ionicons name="trophy" size={12} color={colors.accent} />
                    <AppText variant="label" color={colors.accent}>
                      YOUR #1
                    </AppText>
                  </View>
                  <Ionicons name="arrow-forward" size={17} color={colors.accent} />
                </View>

                <View style={styles.heroMain}>
                  <ProductThumb
                    name={hero.name}
                    brand={hero.brand}
                    category={hero.category}
                    photoUri={hero.photoUri}
                    size={82}
                    rounded={radius.lg}
                  />
                  <View style={styles.heroCopy}>
                    <AppText variant="title" numberOfLines={2}>
                      {hero.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {[hero.brand, hero.flavor].filter(Boolean).join(' · ') ||
                        getCategory(hero.category).label}
                    </AppText>
                    <View style={styles.heroScoreRow}>
                      <AppText style={styles.heroScore} color={colors.accent}>
                        {hero.score.toFixed(1)}
                      </AppText>
                      <AppText variant="caption" color={colors.textFaint}>
                        /10
                      </AppText>
                      <View style={styles.categoryPill}>
                        <AppText variant="caption" color={colors.textMuted}>
                          {getCategory(hero.category).short}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>

                <ScoreBar score={hero.score} height={6} />
              </LinearGradient>
            </PressableScale>

            <View style={styles.statRow}>
              <StatTile
                label="Rated"
                value={String(stats.total)}
                icon="checkmark-done"
                footnote={pluralize(stats.brands, 'brand')}
              />
              <StatTile
                label="Avg score"
                value={formatScore(stats.average)}
                icon="trending-up"
                accent
                footnote={stats.highest ? `Top ${formatScore(stats.highest.score)}` : undefined}
              />
              <StatTile
                label="Categories"
                value={String(stats.categoriesUsed)}
                icon="grid-outline"
                footnote={pluralize(stats.withPhotos, 'photo')}
              />
            </View>

            {favourite ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Favourite category: ${favourite.category.label}`}
                onPress={() =>
                  router.push({
                    pathname: '/rankings',
                    params: { category: favourite.category.id },
                  })
                }
                style={styles.favouriteWrap}
              >
                <Card style={styles.favourite} padded={false}>
                  <View
                    style={[
                      styles.favouriteIcon,
                      {
                        backgroundColor: `${favourite.category.tint}18`,
                        borderColor: `${favourite.category.tint}44`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={favourite.category.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={20}
                      color={favourite.category.tint}
                    />
                  </View>
                  <View style={styles.favouriteCopy}>
                    <AppText variant="label" color={colors.textFaint}>
                      FAVOURITE CATEGORY
                    </AppText>
                    <AppText variant="heading">{favourite.category.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {pluralize(favourite.count, 'rating')}
                      {favourite.average !== null
                        ? ` · avg ${formatScore(favourite.average)}`
                        : ''}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Card>
              </PressableScale>
            ) : null}

            <View style={styles.section}>
              <SectionHeader
                title="Top rated"
                actionLabel="See all"
                onAction={() => router.push('/rankings')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
                style={styles.carouselWrap}
              >
                {top.map((rating, index) => (
                  <TopRatedCard
                    key={rating.id}
                    rating={rating}
                    rank={index + 1}
                    onPress={() => openItem(rating.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="Recent"
                actionLabel="All ratings"
                onAction={() => router.push('/rankings')}
              />
              <View style={styles.recentList}>
                {recent.map((rating, index) => (
                  <View key={rating.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <RecentRow rating={rating} onPress={() => openItem(rating.id)} />
                  </View>
                ))}
              </View>
            </View>

            <Button
              label="Rate something new"
              icon="add"
              size="lg"
              fullWidth
              onPress={() => router.push('/add')}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 19,
    letterSpacing: -0.6,
    color: colors.text,
  },
  intro: {
    gap: 10,
    marginTop: -4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  flex: {
    flex: 1,
  },
  emptyWrap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  heroWrap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    overflow: 'hidden',
  },
  hero: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 2,
  },
  heroScore: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.4,
  },
  categoryPill: {
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  favouriteWrap: {
    borderRadius: radius.lg,
  },
  favourite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  favouriteIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favouriteCopy: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: spacing.md,
  },
  carouselWrap: {
    marginHorizontal: -spacing.xl,
  },
  carousel: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  recentList: {
    marginTop: -6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.7,
  },
});
