import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, fonts, radius } from '../../constants/theme';

export function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  const isPodium = rank <= 3;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isPodium ? colors.lime : colors.surfaceAlt,
          borderColor: isPodium ? colors.lime : colors.border,
        },
      ]}
    >
      <AppText
        style={styles.text}
        color={isPodium ? colors.onLime : colors.textMuted}
      >
        {rank}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
  },
});
