import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  scanFromURLAsync,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { PressableScale } from './ui/PressableScale';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { hapticSuccess } from '../lib/haptics';

export type ScanStatus = 'idle' | 'looking-up' | 'not-found' | 'error';

interface BarcodeScannerModalProps {
  visible: boolean;
  status: ScanStatus;
  /** Set as soon as a barcode is decoded, before the product lookup starts. */
  detectedBarcode: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onScanned: (barcode: string) => void;
  /** Opens manual product entry, keeping the barcode when one was scanned. */
  onManual: (barcode?: string) => void;
  onRetry: () => void;
}

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];
const SCANNER_SETTINGS = { barcodeTypes: BARCODE_TYPES };

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'The scanner could not read this barcode. Try again or enter the number manually.';
}

export function BarcodeScannerModal({
  visible,
  status,
  detectedBarcode,
  errorMessage,
  onClose,
  onScanned,
  onManual,
  onRetry,
}: BarcodeScannerModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const locked = useRef(false);
  const rebound = useRef(false);
  const rebindTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modernScannerSubscription = useRef<{ remove: () => void } | null>(null);

  const lookingUp = status === 'looking-up';

  useEffect(() => {
    if (visible) {
      locked.current = false;
      rebound.current = false;
      setTorch(false);
      setCameraError(null);
      setCameraReady(false);
      setCapturing(false);
      setCaptureError(null);
      setManualOpen(false);
      setManualValue('');
      setManualError(null);
    } else {
      if (rebindTimer.current) clearTimeout(rebindTimer.current);
      rebindTimer.current = null;
      modernScannerSubscription.current?.remove();
      modernScannerSubscription.current = null;
    }
    return () => {
      if (rebindTimer.current) clearTimeout(rebindTimer.current);
    };
  }, [visible]);

  // A retry clears the detected value in the parent. Re-arm scanning at that point.
  useEffect(() => {
    if (!detectedBarcode && !lookingUp) {
      locked.current = false;
    }
  }, [detectedBarcode, lookingUp]);

  useEffect(() => {
    return () => {
      modernScannerSubscription.current?.remove();
      if (rebindTimer.current) clearTimeout(rebindTimer.current);
    };
  }, []);

  const handleBarcode = useCallback(
    (value: string | BarcodeScanningResult | null | undefined) => {
      const data = (typeof value === 'string' ? value : value?.data)?.trim();
      if (!data || locked.current || lookingUp || manualOpen) return;
      locked.current = true;
      hapticSuccess();
      onScanned(data);
    },
    [lookingUp, manualOpen, onScanned],
  );

  const handleCameraReady = () => {
    setCameraReady(true);
    if (rebound.current) return;
    rebound.current = true;

    // expo-camera can start the preview before the barcode props have reached
    // the native view, which leaves the image analyzer detached. Rebinding the
    // camera once after it is ready applies the current settings and analyzer.
    if (Platform.OS === 'android') {
      rebindTimer.current = setTimeout(() => {
        void cameraRef.current?.resumePreview();
      }, 300);
    }
  };

  const captureAndScan = async () => {
    if (!cameraRef.current || locked.current || lookingUp || capturing) return;
    Keyboard.dismiss();
    setCapturing(true);
    setCaptureError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        shutterSound: false,
      });
      if (!photo?.uri) {
        throw new Error('The camera did not return a photo. Try again.');
      }
      const results = await scanFromURLAsync(photo.uri, BARCODE_TYPES);
      const match = results.find((result) => Boolean(result.data));
      if (!match?.data) {
        setCaptureError(
          'No barcode was found in that photo. Fill more of the frame, hold steady and try again.',
        );
        return;
      }
      handleBarcode(match.data);
    } catch (error) {
      setCaptureError(messageFor(error));
    } finally {
      setCapturing(false);
    }
  };

  const openSystemScanner = async () => {
    Keyboard.dismiss();
    setCaptureError(null);
    if (!CameraView.isModernBarcodeScannerAvailable) {
      setCaptureError(
        'Google’s barcode scanner is unavailable on this device. Use capture or type the number instead.',
      );
      return;
    }
    try {
      modernScannerSubscription.current?.remove();
      modernScannerSubscription.current = CameraView.onModernBarcodeScanned((event) => {
        modernScannerSubscription.current?.remove();
        modernScannerSubscription.current = null;
        handleBarcode(event.data);
      });
      await CameraView.launchScanner({ barcodeTypes: BARCODE_TYPES });
    } catch (error) {
      modernScannerSubscription.current?.remove();
      modernScannerSubscription.current = null;
      setCaptureError(messageFor(error));
    }
  };

  const submitManualBarcode = () => {
    const digits = manualValue.replace(/[^0-9]/g, '');
    if (digits.length < 6) {
      setManualError('Enter at least 6 digits from the barcode.');
      return;
    }
    if (digits.length > 14) {
      setManualError('A retail barcode has at most 14 digits.');
      return;
    }
    Keyboard.dismiss();
    setManualError(null);
    setManualOpen(false);
    locked.current = true;
    onScanned(digits);
  };

  const needsSettings = permission !== null && !permission.granted && !permission.canAskAgain;
  const showDetected = Boolean(detectedBarcode);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {visible && permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="picture"
            enableTorch={torch}
            barcodeScannerSettings={SCANNER_SETTINGS}
            onBarcodeScanned={handleBarcode}
            onCameraReady={handleCameraReady}
            onMountError={(event) => {
              setCameraError(event.message || 'The camera could not start.');
            }}
          />
        ) : null}

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon="close"
            accessibilityLabel="Close barcode scanner"
            onPress={onClose}
            disabled={lookingUp}
          />
          <View style={styles.headerCopy}>
            <AppText variant="label" color={colors.accent}>
              SCAN
            </AppText>
            <AppText variant="heading">Product barcode</AppText>
          </View>
          <IconButton
            icon={torch ? 'flash' : 'flash-off'}
            accessibilityLabel={torch ? 'Turn off torch' : 'Turn on torch'}
            onPress={() => setTorch((current) => !current)}
            disabled={!permission?.granted || manualOpen}
          />
        </View>

        {manualOpen ? (
          <KeyboardAvoidingView
            style={styles.manualWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.manualCard}>
              <View style={styles.manualIcon}>
                <Ionicons name="keypad-outline" size={26} color={colors.accent} />
              </View>
              <AppText variant="title" align="center">
                Enter the barcode
              </AppText>
              <AppText variant="body" color={colors.textMuted} align="center">
                Type the digits printed under the barcode. TasteRank still checks Open Food Facts
                and keeps the number with your rating.
              </AppText>
              <TextInput
                value={manualValue}
                onChangeText={(value) => {
                  setManualValue(value);
                  setManualError(null);
                }}
                placeholder="e.g. 5060335635808"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={14}
                autoFocus
                selectionColor={colors.accent}
                cursorColor={colors.accent}
                style={styles.manualInput}
                accessibilityLabel="Barcode number"
                returnKeyType="done"
                onSubmitEditing={submitManualBarcode}
              />
              {manualError ? (
                <AppText variant="caption" color={colors.danger} align="center">
                  {manualError}
                </AppText>
              ) : null}
              <Button label="Look up barcode" icon="search" fullWidth onPress={submitManualBarcode} />
              <Button
                label="Back to camera"
                variant="ghost"
                icon="camera-outline"
                fullWidth
                onPress={() => {
                  setManualOpen(false);
                  setManualError(null);
                }}
              />
              <Button
                label="Add product manually"
                variant="ghost"
                icon="create-outline"
                fullWidth
                onPress={() => onManual(manualValue.replace(/[^0-9]/g, '') || undefined)}
              />
            </View>
          </KeyboardAvoidingView>
        ) : permission?.granted && cameraError ? (
          <View style={styles.centerOverlay}>
            <View style={styles.stateCard}>
              <Ionicons name="camera-outline" size={24} color={colors.danger} />
              <AppText variant="bodyStrong" align="center">
                Camera unavailable
              </AppText>
              <AppText variant="caption" color={colors.textMuted} align="center">
                {cameraError}
              </AppText>
              <Button
                label="Enter barcode number"
                icon="keypad-outline"
                onPress={() => setManualOpen(true)}
              />
              <Button
                label="Add product manually"
                variant="ghost"
                icon="create-outline"
                onPress={() => onManual()}
              />
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
                  {!showDetected ? <View style={styles.scanLine} /> : null}
                </View>
                <View style={styles.dim} />
              </View>
              <View style={[styles.footerDim, { paddingBottom: insets.bottom + 20 }]}>
                {!showDetected ? (
                  <>
                    <Ionicons name="barcode-outline" size={18} color={colors.accent} />
                    <AppText variant="bodyStrong" align="center">
                      Align the barcode inside the frame
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} align="center">
                      EAN-13, EAN-8, UPC-A, UPC-E and Code 128
                    </AppText>
                    {!cameraReady ? (
                      <View style={styles.readyRow}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <AppText variant="caption" color={colors.textMuted}>
                          Starting camera…
                        </AppText>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>

            {showDetected ? (
              <View
                style={[styles.detectedOverlay, { paddingBottom: insets.bottom + 18 }]}
                pointerEvents="box-none"
              >
                <View style={styles.detectedCard}>
                  <View style={styles.detectedTop}>
                    <View style={styles.detectedIcon}>
                      <Ionicons name="barcode" size={20} color={colors.onAccent} />
                    </View>
                    <View style={styles.detectedCopy}>
                      <AppText variant="label" color={colors.accent}>
                        BARCODE DETECTED
                      </AppText>
                      <AppText style={styles.detectedNumber}>{detectedBarcode}</AppText>
                    </View>
                  </View>

                  {lookingUp ? (
                    <View style={styles.statusRow}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <AppText variant="caption" color={colors.textMuted}>
                        Looking up this product in Open Food Facts…
                      </AppText>
                    </View>
                  ) : status === 'not-found' ? (
                    <View style={styles.messageBlock}>
                      <View style={styles.statusRow}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.gold} />
                        <AppText variant="caption" color={colors.gold}>
                          Not in Open Food Facts yet
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textMuted}>
                        Add the product yourself and the barcode stays attached, so scanning the
                        same package later still finds your rating.
                      </AppText>
                      <Button
                        label="Add product manually"
                        icon="create-outline"
                        fullWidth
                        onPress={() => onManual(detectedBarcode ?? undefined)}
                      />
                      <Button
                        label="Scan another barcode"
                        variant="ghost"
                        icon="scan-outline"
                        fullWidth
                        onPress={onRetry}
                      />
                    </View>
                  ) : status === 'error' ? (
                    <View style={styles.messageBlock}>
                      <View style={styles.statusRow}>
                        <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
                        <AppText variant="caption" color={colors.danger}>
                          Lookup failed
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textMuted}>
                        {errorMessage ??
                          'Open Food Facts could not be reached. Check your connection and try again.'}
                      </AppText>
                      <Button
                        label="Try again"
                        icon="refresh"
                        fullWidth
                        onPress={onRetry}
                      />
                      <Button
                        label="Add manually with this barcode"
                        variant="ghost"
                        icon="create-outline"
                        fullWidth
                        onPress={() => onManual(detectedBarcode ?? undefined)}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={[styles.actions, { bottom: insets.bottom + 24 }]}>
                {captureError ? (
                  <View style={styles.errorPill}>
                    <Ionicons name="warning-outline" size={14} color={colors.gold} />
                    <AppText variant="caption" color={colors.gold} style={styles.errorText}>
                      {captureError}
                    </AppText>
                  </View>
                ) : null}
                <View style={styles.actionRow}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Capture the barcode as a photo"
                    onPress={() => void captureAndScan()}
                    disabled={capturing || !cameraReady}
                    style={styles.actionChip}
                  >
                    {capturing ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons name="camera-outline" size={17} color={colors.accent} />
                    )}
                    <AppText variant="buttonSmall" color={colors.text}>
                      Capture
                    </AppText>
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Enter a barcode number"
                    onPress={() => {
                      Keyboard.dismiss();
                      setManualOpen(true);
                    }}
                    style={styles.actionChip}
                  >
                    <Ionicons name="keypad-outline" size={17} color={colors.accent} />
                    <AppText variant="buttonSmall" color={colors.text}>
                      Enter number
                    </AppText>
                  </PressableScale>
                  {CameraView.isModernBarcodeScannerAvailable ? (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel="Open the system barcode scanner"
                      onPress={() => void openSystemScanner()}
                      style={styles.actionChip}
                    >
                      <Ionicons name="scan-outline" size={17} color={colors.accent} />
                      <AppText variant="buttonSmall" color={colors.text}>
                        System
                      </AppText>
                    </PressableScale>
                  ) : null}
                </View>
              </View>
            )}

            {capturing ? (
              <View style={styles.captureOverlay} pointerEvents="none">
                <View style={styles.captureCard}>
                  <ActivityIndicator color={colors.accent} />
                  <AppText variant="bodyStrong">Reading photo…</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Finding the barcode in the picture
                  </AppText>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={[styles.permission, { paddingBottom: insets.bottom + spacing.xxl }]}>
            {permission === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <View style={styles.permissionIcon}>
                  <Ionicons name="camera-outline" size={28} color={colors.accent} />
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
                  label="Enter barcode number"
                  variant="ghost"
                  icon="keypad-outline"
                  fullWidth
                  onPress={() => setManualOpen(true)}
                />
                <Button
                  label="Add product manually"
                  variant="ghost"
                  icon="create-outline"
                  fullWidth
                  onPress={() => onManual()}
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
    zIndex: 3,
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
    borderColor: colors.accent,
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
    backgroundColor: colors.accentLine,
  },
  footerDim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  actions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(8, 14, 20, 0.82)',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(8, 14, 20, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.32)',
  },
  errorText: {
    flex: 1,
  },
  detectedOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  detectedCard: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  detectedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  detectedCopy: {
    flex: 1,
    gap: 1,
  },
  detectedNumber: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: 0.6,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  messageBlock: {
    gap: 9,
  },
  manualWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  manualCard: {
    width: '100%',
    gap: 12,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualIcon: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 2,
  },
  manualInput: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.bgDeep,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 20,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  stateCard: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  captureOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  captureCard: {
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
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 4,
  },
});
