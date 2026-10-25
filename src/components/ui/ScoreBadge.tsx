import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, fonts, radius } from '../../constants/theme';
import { scoreTone } from '../../lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { fontSize: 13, suffix: 9, height: 26, paddingHorizontal: 8, radius: radius.sm },
  md: { fontSize: 17, suffix: 10, height: 34, paddingHorizontal: 10, radius: radius.md },
  lg: { fontSize: 26, suffix: 12, height: 52, paddingHorizontal: 15, radius: radius.lg },
} as const;

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps): React.JSX.Element {
  const tone = scoreTone(score);
  const dimensions = SIZES[size];
  return (
    <View
      accessibilityLabel={`Rated ${score.toFixed(1)} out of 10`}
      style={[
        styles.badge,
        {
          height: dimensions.height,
          paddingHorizontal: dimensions.paddingHorizontal,
          borderRadius: dimensions.radius,
          backgroundColor: tone.background,
          borderColor: tone.border,
        },
      ]}
    >
      <AppText
        style={{
          fontFamily: fonts.bold,
          fontSize: dimensions.fontSize,
          lineHeight: dimensions.fontSize + 3,
          letterSpacing: -0.4,
        }}
        color={tone.text}
      >
        {score.toFixed(1)}
      </AppText>
      <AppText
        style={{ fontFamily: fonts.medium, fontSize: dimensions.suffix }}
        color={tone.text}
      >
        /10
      </AppText>
    </View>
  );
}

interface ScoreBarProps {
  score: number;
  height?: number;
  tint?: string;
}

export function ScoreBar({ score, height = 5, tint }: ScoreBarProps): React.JSX.Element {
  const width = `${Math.min(100, Math.max(0, score * 10))}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: tint ?? colors.lime,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    borderWidth: 1,
  },
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
});
