import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { ScoreBar } from '../../components/ui/ScoreBadge';
import { useToast } from '../../components/ui/Toast';
import { useRatings } from '../../store/RatingsProvider';
import { getCategory } from '../../constants/categories';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { formatDate, formatScore, initialsFor, verdictFor } from '../../lib/utils';
import { findRating } from '../../lib/stats';
import { shareSingleRating } from '../../lib/share';
import { hapticWarn } from '../../lib/haptics';

export default function ItemDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ratings, deleteRating } = useRatings();
  const { show } = useToast();
  const rating = findRating(ratings, typeof id === 'string' ? id : undefined);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!rating) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={goBack} />
        </View>
        <EmptyState
          icon="help-circle-outline"
          title="Rating not found"
          message="This rating may have been deleted. Head back to your rankings to pick another one."
        >
          <Button label="Back to rankings" icon="podium-outline" onPress={goBack} />
        </EmptyState>
      </View>
    );
  }

  const category = getCategory(rating.category);
  const edited =
    Date.parse(rating.updatedAt) - Date.parse(rating.createdAt) > 60_000
      ? formatDate(rating.updatedAt)
      : null;

  const handleDelete = () => {
    Alert.alert(
      'Delete this rating?',
      `"${rating.name}" will be removed from your rankings. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            hapticWarn();
            show('Rating deleted');
            goBack();
            void deleteRating(rating.id);
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    try {
      await shareSingleRating(rating);
    } catch {
      Alert.alert('Sharing unavailable', 'Your device could not open the share sheet.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {rating.photoUri ? (
            <Image source={{ uri: rating.photoUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[`${category.tint}30`, '#141A20']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.heroPlaceholder}
            >
              <View style={[styles.heroIconRing, { borderColor: `${category.tint}44` }]}>
                <Ionicons
                  name={category.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={44}
                  color={category.tint}
                />
              </View>
              <AppText
                style={styles.heroInitials}
                color={`${category.tint}CC`}
              >
                {initialsFor(rating.brand, rating.name)}
              </AppText>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['rgba(16, 19, 24, 0.05)', 'rgba(16, 19, 24, 0.92)']}
            style={styles.heroFade}
            pointerEvents="none"
          />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={goBack} />
            <IconButton icon="share-outline" accessibilityLabel="Share rating" onPress={() => void handleShare()} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Ionicons
                name={category.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={13}
                color={category.tint}
              />
              <AppText variant="caption" color={category.tint}>
                {category.label}
              </AppText>
            </View>
            {rating.isDemo ? (
              <View style={styles.demoTag}>
                <AppText variant="label" color={colors.textFaint} style={styles.demoText}>
                  DEMO DATA
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.titleBlock}>
            <AppText variant="display">{rating.name}</AppText>
            <AppText variant="body" color={colors.textMuted}>
              {[rating.brand, rating.flavor].filter(Boolean).join(' · ') || category.label}
            </AppText>
          </View>

          <Card style={styles.scoreCard}>
            <View style={styles.scoreTop}>
              <View style={styles.scoreCopy}>
                <AppText variant="label" color={colors.textFaint}>
                  MY RATING
                </AppText>
                <View style={styles.scoreRow}>
                  <AppText style={styles.score} color={colors.lime}>
                    {formatScore(rating.score)}
                  </AppText>
                  <AppText variant="heading" color={colors.textFaint} style={styles.outOf}>
                    /10
                  </AppText>
                </View>
              </View>
              <View style={styles.verdict}>
                <Ionicons name="sparkles" size={12} color={colors.lime} />
                <AppText variant="caption" color={colors.lime}>
                  {verdictFor(rating.score)}
                </AppText>
              </View>
            </View>
            <ScoreBar score={rating.score} height={8} />
          </Card>

          <View style={styles.section}>
            <AppText variant="label">REVIEW</AppText>
            <Card style={styles.reviewCard}>
              {rating.review ? (
                <AppText variant="body" style={styles.reviewText}>
                  {rating.review}
                </AppText>
              ) : (
                <AppText variant="body" color={colors.textMuted}>
                  No notes yet. Add a few thoughts so future-you remembers whether it was worth
                  buying again.
                </AppText>
              )}
            </Card>
          </View>

          <View style={styles.metaCard}>
            <MetaRow icon="calendar-outline" label="Rated" value={formatDate(rating.createdAt)} />
            <View style={styles.metaDivider} />
            <MetaRow icon="grid-outline" label="Category" value={category.label} />
            {edited ? (
              <>
                <View style={styles.metaDivider} />
                <MetaRow icon="create-outline" label="Last edited" value={edited} />
              </>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button
              label="Edit rating"
              icon="create-outline"
              fullWidth
              style={styles.flex}
              onPress={() => router.push(`/edit/${rating.id}`)}
            />
            <Button
              label="Delete"
              icon="trash-outline"
              variant="danger"
              fullWidth
              style={styles.flex}
              onPress={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.textFaint} />
      <AppText variant="caption" color={colors.textMuted} style={styles.metaLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.metaValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  hero: {
    height: 330,
    backgroundColor: colors.surface,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroIconRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 3,
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
  },
  heroActions: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: spacing.xl,
    marginTop: -20,
    gap: spacing.xxl,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    fontSize: 8,
  },
  titleBlock: {
    gap: 6,
    marginTop: -8,
  },
  scoreCard: {
    gap: spacing.lg,
    borderColor: colors.limeBorder,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.xl,
  },
  scoreTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  scoreCopy: {
    gap: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  score: {
    fontFamily: fonts.bold,
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -2.6,
  },
  outOf: {
    fontSize: 18,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(196, 255, 84, 0.1)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
    marginBottom: 8,
  },
  section: {
    gap: 10,
  },
  reviewCard: {
    padding: spacing.lg,
  },
  reviewText: {
    lineHeight: 23,
  },
  metaCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
  },
  metaLabel: {
    flex: 1,
  },
  metaValue: {
    maxWidth: '55%',
    textAlign: 'right',
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});
