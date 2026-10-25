import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PressableScale } from '../../components/ui/PressableScale';
import { SearchField } from '../../components/ui/SearchField';
import { LeaderboardRow } from '../../components/RatingCard';
import { useRatings } from '../../store/RatingsProvider';
import { CATEGORIES, getCategory } from '../../constants/categories';
import { colors, radius, spacing } from '../../constants/theme';
import { SORT_OPTIONS, type SortKey } from '../../types';
import { filterAndSort, pluralize, sortLabel } from '../../lib/utils';
import { shareRankings } from '../../lib/share';

export default function RankingsScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { ratings } = useRatings();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(
    typeof params.category === 'string' ? params.category : null,
  );
  const [sort, setSort] = useState<SortKey>('top');

  useEffect(() => {
    if (typeof params.category === 'string') {
      setCategory(params.category);
    }
  }, [params.category]);

  const visible = useMemo(
    () => filterAndSort(ratings, { query, category, sort }),
    [ratings, query, category, sort],
  );

  const filtersActive = Boolean(query) || Boolean(category);
  const label = category ? getCategory(category).label : 'All categories';
  const shareLabel = `${label} · ${sortLabel(sort)}`;

  const handleShare = async () => {
    if (visible.length === 0) return;
    try {
      await shareRankings(visible, shareLabel);
    } catch {
      Alert.alert('Sharing unavailable', 'Your device could not open the share sheet.');
    }
  };

  return (
    <Screen>
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="label" color={colors.textFaint}>
              LEADERBOARD
            </AppText>
            <AppText variant="display">Rankings</AppText>
          </View>
          <IconButton
            icon="share-outline"
            accessibilityLabel="Share rankings"
            onPress={() => void handleShare()}
            disabled={visible.length === 0}
          />
        </View>

        <SearchField value={query} onChangeText={setQuery} placeholder="Search products" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsWrap}
        >
          <Chip
            label="All"
            selected={category === null}
            onPress={() => setCategory(null)}
            icon="apps-outline"
          />
          {CATEGORIES.map((item) => (
            <Chip
              key={item.id}
              label={item.short}
              selected={category === item.id}
              onPress={() => setCategory(category === item.id ? null : item.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <View style={styles.segment}>
            {SORT_OPTIONS.map((option) => {
              const active = sort === option.key;
              return (
                <PressableScale
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Sort by ${option.label}`}
                  onPress={() => setSort(option.key)}
                  haptic={false}
                  style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
                >
                  <AppText
                    variant="buttonSmall"
                    numberOfLines={1}
                    color={active ? colors.onLime : colors.textMuted}
                    style={styles.segmentLabel}
                  >
                    {option.label}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.countRow}>
          <AppText variant="caption" color={colors.textFaint}>
            {pluralize(visible.length, 'item')}
            {filtersActive ? ' matching your filters' : ' in your collection'}
          </AppText>
          {filtersActive ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
              haptic={false}
              onPress={() => {
                setQuery('');
                setCategory(null);
              }}
              style={styles.clearFilters}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.lime} />
              <AppText variant="caption" color={colors.lime}>
                Clear
              </AppText>
            </PressableScale>
          ) : null}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <LeaderboardRow
            rating={item}
            rank={index + 1}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          ratings.length === 0 ? (
            <EmptyState
              icon="podium-outline"
              title="Nothing ranked yet"
              message="Add your first rating and it will appear here, ranked against everything else you have tried."
            >
              <Button
                label="Add a rating"
                icon="add"
                onPress={() => router.push('/add')}
              />
            </EmptyState>
          ) : (
            <EmptyState
              icon="search-outline"
              title="No matches"
              message="No ratings match that search or category. Try a different product or clear your filters."
              compact
            >
              <Button
                label="Clear filters"
                icon="refresh"
                variant="secondary"
                onPress={() => {
                  setQuery('');
                  setCategory(null);
                }}
              />
            </EmptyState>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleCopy: {
    gap: 2,
  },
  chipsWrap: {
    marginHorizontal: -spacing.xl,
  },
  chips: {
    paddingHorizontal: spacing.xl,
    gap: 8,
  },
  sortRow: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentItemActive: {
    backgroundColor: colors.lime,
  },
  segmentLabel: {
    fontSize: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 2,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.55,
  },
});
