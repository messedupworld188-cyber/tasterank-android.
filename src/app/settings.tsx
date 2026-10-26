import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { useToast } from '../components/ui/Toast';
import { useRatings } from '../store/RatingsProvider';
import { colors, radius, spacing } from '../constants/theme';
import { pluralize, sortRatings } from '../lib/utils';
import { shareRankings } from '../lib/share';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'default',
  badge,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'accent';
  badge?: string;
}): React.JSX.Element {
  const iconColor =
    tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.textMuted;
  const iconBackground =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'accent'
        ? colors.accentSoft
        : colors.surfaceAlt;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      haptic={false}
      style={styles.row}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="bodyStrong" color={tone === 'danger' ? colors.danger : colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" color={colors.textMuted}>
            {badge}
          </AppText>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </PressableScale>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    ratings,
    loadDemoRatings,
    removeDemoRatings,
    clearAllRatings,
  } = useRatings();
  const { show } = useToast();

  const demoCount = useMemo(() => ratings.filter((rating) => rating.isDemo).length, [ratings]);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleLoadDemo = async () => {
    const added = await loadDemoRatings();
    show(added > 0 ? `${added} demo ratings added` : 'Demo ratings are already loaded');
  };

  const handleRemoveDemo = async () => {
    const removed = await removeDemoRatings();
    show(removed > 0 ? `${removed} demo ratings removed` : 'No demo ratings to remove');
  };

  const handleClearAll = () => {
    Alert.alert(
      'Delete all ratings?',
      `This removes all ${ratings.length} ratings and their photos from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void clearAllRatings().then(() => show('All ratings deleted'));
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (ratings.length === 0) {
      show('Add a rating before sharing');
      return;
    }
    try {
      await shareRankings(sortRatings(ratings, 'top'), 'All categories · Top rated');
    } catch {
      Alert.alert('Sharing unavailable', 'Your device could not open the share sheet.');
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel="Close settings" onPress={close} />
        <AppText variant="heading" style={styles.headerTitle}>
          Settings
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText variant="display">Your data.</AppText>
          <AppText variant="body" color={colors.textMuted}>
            Everything you rate is stored on this device only. No account, no cloud, no
            subscription.
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="label">RATINGS</AppText>
          <Card padded={false}>
            <SettingRow
              icon="flask-outline"
              title={demoCount > 0 ? 'Demo ratings loaded' : 'Load demo ratings'}
              subtitle={
                demoCount > 0
                  ? `${pluralize(demoCount, 'sample rating')} ready to explore`
                  : 'Try the app with a curated sample collection'
              }
              onPress={() => void handleLoadDemo()}
              tone="accent"
            />
            <View style={styles.divider} />
            <SettingRow
              icon="share-outline"
              title="Share my rankings"
              subtitle="Send your leaderboard as text"
              onPress={() => void handleShare()}
            />
            {demoCount > 0 ? (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="remove-circle-outline"
                  title="Remove demo ratings"
                  subtitle="Keep your real ratings untouched"
                  onPress={() => void handleRemoveDemo()}
                  badge={String(demoCount)}
                />
              </>
            ) : null}
            <View style={styles.divider} />
            <SettingRow
              icon="trash-outline"
              title="Delete all ratings"
              subtitle={`${pluralize(ratings.length, 'rating')} on this device`}
              onPress={handleClearAll}
              tone="danger"
            />
          </Card>
        </View>

        <View style={styles.section}>
          <AppText variant="label">PRODUCT DATA</AppText>
          <Card padded={false}>
            <SettingRow
              icon="globe-outline"
              title="Open Food Facts"
              subtitle="Search data, attribution and licences"
              onPress={() => router.push('/data-credits')}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <AppText variant="label">ABOUT</AppText>
          <Card style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <View style={styles.logoMark}>
                <Ionicons name="podium" size={18} color={colors.onAccent} />
              </View>
              <View style={styles.aboutCopy}>
                <AppText variant="heading">TasteRank</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Version {version}
                </AppText>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutLine}>
              <Ionicons name="cloud-offline-outline" size={15} color={colors.accent} />
              <AppText variant="caption" color={colors.textMuted} style={styles.aboutLineText}>
                Ratings and photos work offline. Product search needs a connection and
                caches recent results on this device.
              </AppText>
            </View>
            <View style={styles.aboutLine}>
              <Ionicons name="phone-portrait-outline" size={15} color={colors.accent} />
              <AppText variant="caption" color={colors.textMuted} style={styles.aboutLineText}>
                Uninstalling TasteRank removes your ratings, so share the ones you want to keep.
              </AppText>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  intro: {
    gap: 8,
  },
  section: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHi,
  },
  divider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  aboutCard: {
    gap: spacing.lg,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCopy: {
    gap: 2,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  aboutLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  aboutLineText: {
    flex: 1,
    lineHeight: 19,
  },
});
