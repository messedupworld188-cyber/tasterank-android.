import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { colors, radius, spacing } from '../constants/theme';
import { hapticSuccess } from '../lib/haptics';

interface BarcodeScannerModalProps {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
  onManual: () => void;
}

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'] as const;

export function BarcodeScannerModal({
  visible,
  busy,
  onClose,
  onScanned,
  onManual,
}: BarcodeScannerModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    if (visible) {
      locked.current = false;
      setTorch(false);
      setCameraError(null);
    }
  }, [visible]);

  const handleBarcode = (result: { data?: string }) => {
    if (busy || locked.current) return;
    const data = result.data?.trim();
    if (!data) return;
    locked.current = true;
    hapticSuccess();
    onScanned(data);
  };

  const needsSettings = permission !== null && !permission.granted && !permission.canAskAgain;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={busy ? undefined : handleBarcode}
            onMountError={(event) =>
              setCameraError(event.message || 'The camera could not start.')
            }
          />
        ) : null}

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <IconButton icon="close" accessibilityLabel="Close barcode scanner" onPress={onClose} />
          <View style={styles.headerCopy}>
            <AppText variant="label" color={colors.lime}>
              SCAN
            </AppText>
            <AppText variant="heading">Product barcode</AppText>
          </View>
          <IconButton
            icon={torch ? 'flash' : 'flash-off'}
            accessibilityLabel={torch ? 'Turn off torch' : 'Turn on torch'}
            onPress={() => setTorch((current) => !current)}
            disabled={!permission?.granted}
          />
        </View>

        {permission?.granted && cameraError ? (
          <View style={styles.busyOverlay}>
            <View style={styles.busyCard}>
              <Ionicons name="camera-outline" size={24} color={colors.danger} />
              <AppText variant="bodyStrong" align="center">
                Camera unavailable
              </AppText>
              <AppText variant="caption" color={colors.textMuted} align="center">
                {cameraError}
              </AppText>
              <Button label="Add manually instead" icon="create-outline" onPress={onManual} />
            </View>
          </View>
        ) : permission?.granted ? (
          <>
            <View pointerEvents="none" style={styles.frameArea}>
              <View style={styles.dim} />
              <View style={styles.frameRow}>
                <View style={styles.dim} />
                <View style={styles.frame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  <View style={styles.scanLine} />
                </View>
                <View style={styles.dim} />
              </View>
              <View style={[styles.footerDim, { paddingBottom: insets.bottom + 26 }]}>
                <Ionicons name="barcode-outline" size={18} color={colors.lime} />
                <AppText variant="bodyStrong" align="center">
                  Align the barcode inside the frame
                </AppText>
                <AppText variant="caption" color={colors.textMuted} align="center">
                  EAN and UPC barcodes on drinks, bars and snacks.
                </AppText>
              </View>
            </View>

            {busy ? (
              <View style={styles.busyOverlay}>
                <View style={styles.busyCard}>
                  <ActivityIndicator color={colors.lime} />
                  <AppText variant="bodyStrong">Looking up barcode…</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Checking Open Food Facts
                  </AppText>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={[styles.permission, { paddingBottom: insets.bottom + spacing.xxl }]}>
            {permission === null ? (
              <ActivityIndicator color={colors.lime} />
            ) : (
              <>
                <View style={styles.permissionIcon}>
                  <Ionicons name="camera-outline" size={28} color={colors.lime} />
                </View>
                <AppText variant="title" align="center">
                  Camera access
                </AppText>
                <AppText variant="body" color={colors.textMuted} align="center">
                  TasteRank uses your camera only to read product barcodes. Photos are not
                  recorded or uploaded.
                </AppText>
                {cameraError ? (
                  <AppText variant="caption" color={colors.danger} align="center">
                    {cameraError}
                  </AppText>
                ) : null}
                <Button
                  label={needsSettings ? 'Open settings' : 'Allow camera'}
                  icon={needsSettings ? 'settings-outline' : 'camera-outline'}
                  fullWidth
                  onPress={() => {
                    if (needsSettings) void Linking.openSettings();
                    else void requestPermission();
                  }}
                />
                <Button
                  label="Add manually instead"
                  variant="ghost"
                  icon="create-outline"
                  fullWidth
                  onPress={onManual}
                />
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  frameArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  frameRow: {
    flexDirection: 'row',
    height: 210,
  },
  frame: {
    width: 300,
    maxWidth: '90%',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.lime,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.lg,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.lg,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.lg,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.lg,
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(196, 255, 84, 0.55)',
  },
  footerDim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  busyCard: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: spacing.xxl,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 255, 84, 0.08)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
    marginBottom: 4,
  },
});
