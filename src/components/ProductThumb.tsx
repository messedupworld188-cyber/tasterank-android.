import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategory } from '../constants/categories';
import { colors, radius } from '../constants/theme';
import type { CategoryId } from '../types';
import { AppText } from './ui/AppText';
import { initialsFor } from '../lib/utils';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ProductThumbProps {
  name: string;
  brand?: string;
  category: CategoryId;
  photoUri?: string | null;
  size?: number;
  rounded?: number;
  showInitials?: boolean;
}

export function ProductThumb({
  name,
  brand,
  category,
  photoUri,
  size = 56,
  rounded = radius.md,
  showInitials = false,
}: ProductThumbProps): React.JSX.Element {
  const meta = getCategory(category);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUri]);

  if (photoUri && !imageFailed) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          backgroundColor: colors.surfaceAlt,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: rounded, overflow: 'hidden' }}>
      <LinearGradient
        colors={[`${meta.tint}38`, '#151A21']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <View
          style={[
            styles.ring,
            {
              borderColor: `${meta.tint}44`,
              width: size * 0.66,
              height: size * 0.66,
              borderRadius: size,
            },
          ]}
        >
          {showInitials ? (
            <AppText
              style={{ fontSize: size * 0.22, letterSpacing: -0.3 }}
              color={meta.tint}
            >
              {initialsFor(brand, name)}
            </AppText>
          ) : (
            <Ionicons
              name={meta.icon as IoniconName}
              size={size * 0.3}
              color={meta.tint}
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
