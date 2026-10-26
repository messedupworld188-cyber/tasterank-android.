import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { colors, radius } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 50, lg: 56 };

const PALETTE: Record<
  ButtonVariant,
  { background: string; border: string; text: string; icon: string }
> = {
  primary: {
    background: colors.accent,
    border: colors.accent,
    text: colors.onAccent,
    icon: colors.onAccent,
  },
  secondary: {
    background: colors.surfaceAlt,
    border: colors.border,
    text: colors.text,
    icon: colors.text,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: colors.textMuted,
    icon: colors.textMuted,
  },
  danger: {
    background: colors.dangerSoft,
    border: colors.dangerBorder,
    text: colors.danger,
    icon: colors.danger,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic = true,
  style,
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const palette = PALETTE[variant];
  const iconSize = size === 'sm' ? 16 : 19;
  const textVariant = size === 'sm' ? 'buttonSmall' : 'button';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      haptic={haptic}
      onPress={onPress}
      style={[
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
          paddingHorizontal: size === 'sm' ? 14 : 20,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={iconSize} color={palette.icon} />
          ) : null}
          <AppText
            variant={textVariant}
            color={palette.text}
            numberOfLines={1}
            style={styles.label}
          >
            {label}
          </AppText>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={iconSize} color={palette.icon} />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flexShrink: 1,
  },
});
