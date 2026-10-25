import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';
import { Button } from './ui/Button';
import { colors, radius } from '../constants/theme';
import { hapticSelect } from '../lib/haptics';

interface PhotoFieldProps {
  photoUri: string | null;
  onChange: (uri: string | null) => void;
}

export function PhotoField({ photoUri, onChange }: PhotoFieldProps): React.JSX.Element {
  const pick = async (source: 'library' | 'camera') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Camera access needed',
            'Allow camera access in your device settings to photograph a product.',
          );
          return;
        }
      }
      const options = {
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.85,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets?.[0];
      if (asset?.uri) {
        hapticSelect();
        onChange(asset.uri);
      }
    } catch (error) {
      console.warn('[TasteRank] Photo picker failed', error);
      Alert.alert(
        'Photo unavailable',
        'TasteRank could not open the photo picker. You can still save the rating without a photo.',
      );
    }
  };

  const choosePhoto = () => {
    if (!photoUri) {
      Alert.alert('Add a photo', 'Choose where the photo comes from.', [
        { text: 'Take photo', onPress: () => void pick('camera') },
        { text: 'Choose from library', onPress: () => void pick('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    // Android alerts show at most three buttons, so keep this list short.
    Alert.alert('Change photo', 'Replace or remove the current photo?', [
      { text: 'Take new photo', onPress: () => void pick('camera') },
      { text: 'Choose from library', onPress: () => void pick('library') },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          hapticSelect();
          onChange(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="label">PHOTO</AppText>
        <AppText variant="caption" color={colors.textFaint}>
          Optional
        </AppText>
      </View>

      {photoUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          <View style={styles.previewFooter}>
            <AppText variant="caption" color={colors.textMuted} style={styles.previewHint}>
              Stored on this device
            </AppText>
            <View style={styles.previewActions}>
              <Button
                label="Change"
                size="sm"
                variant="secondary"
                icon="camera-outline"
                onPress={choosePhoto}
              />
              <Button
                label="Remove"
                size="sm"
                variant="ghost"
                icon="trash-outline"
                onPress={() => onChange(null)}
              />
            </View>
          </View>
        </View>
      ) : (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          onPress={choosePhoto}
          style={styles.emptyTile}
        >
          <View style={styles.emptyIcon}>
            <Ionicons name="camera-outline" size={22} color={colors.lime} />
          </View>
          <View style={styles.emptyCopy}>
            <AppText variant="bodyStrong">Add a photo</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Snap it now or pick from your library
            </AppText>
          </View>
          <Ionicons name="add" size={20} color={colors.textFaint} />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: {
    width: '100%',
    height: 190,
    backgroundColor: colors.surfaceAlt,
  },
  previewFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewHint: {
    flexShrink: 1,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyTile: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 255, 84, 0.1)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  emptyCopy: {
    flex: 1,
    gap: 2,
  },
});
