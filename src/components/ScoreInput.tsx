import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';
import { Card } from './ui/Card';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';
import { colors, fonts, radius } from '../constants/theme';
import { roundScore, verdictFor } from '../lib/utils';
import { hapticSelect } from '../lib/haptics';

interface ScoreInputProps {
  value: number;
  onChange: (value: number) => void;
}

const STEPS = [
  { label: '−1', delta: -1 },
  { label: '−0.1', delta: -0.1 },
  { label: '+0.1', delta: 0.1 },
  { label: '+1', delta: 1 },
];

export function ScoreInput({ value, onChange }: ScoreInputProps): React.JSX.Element {
  const setScore = (next: number, withHaptic = false) => {
    const rounded = roundScore(next);
    if (rounded !== value) {
      if (withHaptic) hapticSelect();
      onChange(rounded);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <AppText variant="label" color={colors.textMuted}>
          YOUR SCORE
        </AppText>
        <View style={styles.verdictPill}>
          <Ionicons name="sparkles" size={12} color={colors.lime} />
          <AppText variant="caption" color={colors.lime}>
            {verdictFor(value)}
          </AppText>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <AppText style={styles.score} color={colors.lime}>
          {value.toFixed(1)}
        </AppText>
        <AppText variant="heading" color={colors.textFaint} style={styles.outOf}>
          /10
        </AppText>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={10}
        step={0.1}
        value={value}
        onValueChange={(next) => setScore(next)}
        minimumTrackTintColor={colors.lime}
        maximumTrackTintColor={colors.surfaceHi}
        thumbTintColor={colors.lime}
        accessibilityLabel="Rating score from 0 to 10"
      />

      <View style={styles.scaleRow}>
        <AppText variant="caption" color={colors.textFaint}>
          0
        </AppText>
        <AppText variant="caption" color={colors.textFaint}>
          10
        </AppText>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step) => (
          <PressableScale
            key={step.label}
            accessibilityRole="button"
            accessibilityLabel={`Adjust score by ${step.label}`}
            onPress={() => setScore(value + step.delta, true)}
            haptic={false}
            style={styles.stepButton}
          >
            <AppText variant="buttonSmall" color={colors.textMuted}>
              {step.label}
            </AppText>
          </PressableScale>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  verdictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(196, 255, 84, 0.1)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  score: {
    fontFamily: fonts.bold,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -3.4,
  },
  outOf: {
    fontSize: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: -4,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  steps: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stepButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
