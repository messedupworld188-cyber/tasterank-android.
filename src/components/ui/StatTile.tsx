import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, fonts, radius } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface StatTileProps {
  label: string;
  value: string;
  icon?: IoniconName;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
  footnote?: string;
}

export function StatTile({
  label,
  value,
  icon,
  accent = false,
  style,
  footnote,
}: StatTileProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.tile,
        accent
          ? { backgroundColor: colors.accentWash, borderColor: colors.accentBorder }
          : null,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <AppText variant="label" color={accent ? colors.accent : colors.textFaint}>
          {label.toUpperCase()}
        </AppText>
        {icon ? (
          <Ionicons name={icon} size={13} color={accent ? colors.accent : colors.textFaint} />
        ) : null}
      </View>
      <AppText
        style={styles.value}
        color={accent ? colors.accent : colors.text}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </AppText>
      {footnote ? (
        <AppText variant="caption" color={colors.textFaint} numberOfLines={1} style={styles.footnote}>
          {footnote}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'space-between',
    gap: 6,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  footnote: {
    fontSize: 11,
  },
});
