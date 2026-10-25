import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { hapticTap } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  children: React.ReactNode;
}

/** A Pressable that springs down slightly on touch for a tactile feel. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: PressableScaleProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        speed: 45,
        bounciness: 0,
      }).start();
    },
    [scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        animate(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) hapticTap();
        onPress?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
