import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { colors, radius } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IoniconName;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
}: ChipProps): React.JSX.Element {
  const contentColor = selected ? colors.onAccent : colors.textMuted;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      haptic={false}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceAlt,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={13} color={contentColor} /> : null}
        <AppText
          variant="buttonSmall"
          color={contentColor}
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
});
