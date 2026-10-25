import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  tone?: 'surface' | 'lime' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const TONES = {
  surface: { background: colors.surfaceAlt, border: colors.border, icon: colors.text },
  lime: { background: colors.lime, border: colors.lime, icon: colors.onLime },
  ghost: { background: 'transparent', border: 'transparent', icon: colors.textMuted },
  danger: { background: colors.dangerSoft, border: colors.dangerBorder, icon: colors.danger },
} as const;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 42,
  iconSize = 20,
  tone = 'surface',
  style,
  disabled = false,
}: IconButtonProps): React.JSX.Element {
  const palette = TONES[tone];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={palette.icon} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
