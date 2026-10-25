import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { colors, radius, spacing } from '../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const LINKS: { icon: IoniconName; label: string; subtitle: string; url: string }[] = [
  {
    icon: 'globe-outline',
    label: 'Open Food Facts',
    subtitle: 'The open product database behind search',
    url: 'https://world.openfoodfacts.org',
  },
  {
    icon: 'document-text-outline',
    label: 'Terms of use and reuse',
    subtitle: 'Open Food Facts terms',
    url: 'https://world.openfoodfacts.org/terms-of-use',
  },
  {
    icon: 'server-outline',
    label: 'API documentation',
    subtitle: 'Endpoints, rate limits and attribution rules',
    url: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Open Database License (ODbL)',
    subtitle: 'The licence covering the product database',
    url: 'https://opendatacommons.org/licenses/odbl/1-0/',
  },
  {
    icon: 'layers-outline',
    label: 'Database Contents License',
    subtitle: 'The licence covering individual database contents',
    url: 'https://opendatacommons.org/licenses/dbcl/1-0/',
  },
  {
    icon: 'images-outline',
    label: 'Creative Commons BY-SA',
    subtitle: 'The licence covering product photos',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
];

export default function DataCreditsScreen(): React.JSX.Element {
  const router = useRouter();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', 'Your device could not open that web page.');
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
        <AppText variant="heading" style={styles.headerTitle}>
          Product data
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.badge}>
            <Ionicons name="leaf-outline" size={26} color={colors.lime} />
          </View>
          <AppText variant="display">Open data.{'\n'}Real products.</AppText>
          <AppText variant="body" color={colors.textMuted}>
            TasteRank searches Open Food Facts, a collaborative, open database of packaged
            food and drink products from around the world.
          </AppText>
        </View>

        <Card style={styles.block}>
          <AppText variant="label">ATTRIBUTION</AppText>
          <AppText variant="body">
            Product data © Open Food Facts contributors. The database is available under
            the Open Database License (ODbL). Individual database contents are available
            under the Database Contents License. Product images are available under the
            Creative Commons Attribution-ShareAlike licence.
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            TasteRank is an independent app. It is not affiliated with, sponsored by or
            endorsed by Open Food Facts.
          </AppText>
        </Card>

        <Card style={styles.block}>
          <AppText variant="label">HOW TASTERANK USES IT</AppText>
          <View style={styles.bullet}>
            <Ionicons name="search-outline" size={16} color={colors.lime} />
            <AppText variant="body" color={colors.textMuted} style={styles.flex}>
              Keyword searches run only when you submit them, never as you type. TasteRank
              waits between requests to stay inside the published limits of 10 searches
              and 15 barcode lookups per minute.
            </AppText>
          </View>
          <View style={styles.bullet}>
            <Ionicons name="save-outline" size={16} color={colors.lime} />
            <AppText variant="body" color={colors.textMuted} style={styles.flex}>
              Search results are cached on this device for 24 hours and barcode lookups for
              7 days, so repeat searches work offline. Saved ratings and their photos never
              leave your phone.
            </AppText>
          </View>
          <View style={styles.bullet}>
            <Ionicons name="refresh-outline" size={16} color={colors.lime} />
            <AppText variant="body" color={colors.textMuted} style={styles.flex}>
              The database is community-maintained, so some products are missing, renamed
              or incomplete. You can always enter a product manually and add your own
              photo.
            </AppText>
          </View>
        </Card>

        <View style={styles.section}>
          <AppText variant="label">READ THE SOURCE</AppText>
          <Card padded={false}>
            {LINKS.map((link, index) => (
              <View key={link.url}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <PressableScale
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                  onPress={() => void open(link.url)}
                  haptic={false}
                  style={styles.linkRow}
                >
                  <View style={styles.linkIcon}>
                    <Ionicons name={link.icon} size={17} color={colors.lime} />
                  </View>
                  <View style={styles.linkCopy}>
                    <AppText variant="bodyStrong">{link.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {link.subtitle}
                    </AppText>
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.textFaint} />
                </PressableScale>
              </View>
            ))}
          </Card>
        </View>

        <AppText variant="caption" color={colors.textFaint} align="center">
          Made for people who take their snacks seriously.
        </AppText>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  intro: {
    gap: 10,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 255, 84, 0.08)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
    marginBottom: 2,
  },
  block: {
    gap: 12,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  section: {
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 255, 84, 0.08)',
  },
  linkCopy: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  flex: {
    flex: 1,
  },
});
