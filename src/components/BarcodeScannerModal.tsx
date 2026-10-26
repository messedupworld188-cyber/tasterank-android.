import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
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
import { BarcodePhotoError, decodeBarcodeFromBase64 } from '../lib/barcodePhoto';

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
const NO_EVENT_HINT_MS = 10_000;

function messageFor(error: unknown): string {
  if (error instanceof BarcodePhotoError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'The photo could not be read. Try again or enter the number manually.';
}

function clockTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
  const [cameraKey, setCameraKey] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [scanEvents, setScanEvents] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [noEventHint, setNoEventHint] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const locked = useRef(false);
  const lookingUpRef = useRef(false);
  const manualOpenRef = useRef(false);
  const onScannedRef = useRef(onScanned);

  const lookingUp = status === 'looking-up';
  const showDetected = Boolean(detectedBarcode);
  const needsSettings = permission !== null && !permission.granted && !permission.canAskAgain;

  lookingUpRef.current = lookingUp;
  manualOpenRef.current = manualOpen;
  onScannedRef.current = onScanned;

  useEffect(() => {
    if (!visible) return;
    locked.current = false;
    setTorch(false);
    setCameraError(null);
    setCameraReady(false);
    setCapturing(false);
    setCaptureError(null);
    setManualOpen(false);
    setManualValue('');
    setManualError(null);
    setDiagnosticsOpen(false);
    setScanEvents(0);
    setLastEventAt(null);
    setNoEventHint(false);
  }, [visible]);

  // A retry clears the detected value in the parent. Re-arm scanning at that point.
  useEffect(() => {
    if (!detectedBarcode && !lookingUp) {
      locked.current = false;
    }
  }, [detectedBarcode, lookingUp]);

  useEffect(() => {
    if (!visible || !cameraReady || manualOpen || showDetected || scanEvents > 0) {
      setNoEventHint(false);
      return;
    }

    const timer = setTimeout(() => setNoEventHint(true), NO_EVENT_HINT_MS);
    return () => clearTimeout(timer);
  }, [cameraReady, manualOpen, scanEvents, showDetected, visible]);

  /**
   * Stable callback: CameraView must keep the same native barcode listener
   * while busy, so it never toggles scanning off during a product lookup.
   */
  const handleBarcode = useCallback((value: string | BarcodeScanningResult | null | undefined) => {
    const data = (typeof value === 'string' ? value : value?.data)?.trim();
    if (!data || locked.current || lookingUpRef.current || manualOpenRef.current) return;

    locked.current = true;
    setScanEvents((current) => current + 1);
    setLastEventAt(Date.now());
    setDiagnosticsOpen(false);
    hapticSuccess();
    onScannedRef.current(data);
  }, []);

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const restartCamera = () => {
    locked.current = false;
    setTorch(false);
    setCameraError(null);
    setCameraReady(false);
    setCaptureError(null);
    setNoEventHint(false);
    setScanEvents(0);
    setLastEventAt(null);
    setCameraKey((current) => current + 1);
  };

  const captureAndScan = async () => {
    if (!cameraRef.current || locked.current || lookingUp || capturing || !cameraReady) return;

    Keyboard.dismiss();
    setCapturing(true);
    setCaptureError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        shutterSound: false,
      });

      if (!photo?.base64) {
        throw new BarcodePhotoError('The camera did not return image data. Try again.');
      }

      const match = await decodeBarcodeFromBase64(photo.base64);
      if (!match) {
        setCaptureError(
          'No barcode was found in that photo. Fill more of the frame, hold steady and try again.',
        );
        return;
      }

      handleBarcode(match.value);
    } catch (error) {
      setCaptureError(messageFor(error));
    } finally {
      setCapturing(false);
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
    setLastEventAt(Date.now());
    onScannedRef.current(digits);
  };

  const openManual = () => {
    Keyboard.dismiss();
    setManualOpen(true);
    setCaptureError(null);
    setDiagnosticsOpen(false);
  };

  const diagnostics = [
    {
      label: 'Camera',
      value: cameraError ? 'Error' : cameraReady ? 'Ready' : 'Starting',
    },
    {
      label: 'Live analyzer',
      value:
        scanEvents > 0
          ? `${scanEvents} barcode event${scanEvents === 1 ? '' : 's'} received`
          : cameraReady
            ? 'Waiting for a barcode'
            : 'Not started',
    },
    {
      label: 'Last event',
      value: lastEventAt ? clockTime(lastEventAt) : 'None yet',
    },
    {
      label: 'Formats',
      value: 'EAN-13 · EAN-8 · UPC-A · UPC-E · Code 128',
    },
    {
      label: 'Photo decoder',
      value: 'ZXing on-device (no Google services)',
    },
    {
      label: 'Google Code Scanner',
      value:
        Platform.OS === 'android' && !CameraView.isModernBarcodeScannerAvailable
          ? 'Not detected — not required for live scanning'
          : 'Available — not used for live scanning',
    },
  ];

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
            key={cameraKey}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="picture"
            ratio="4:3"
            pictureSize="1280x960"
            enableTorch={torch}
            animateShutter={false}
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
          <IconButton
            icon={diagnosticsOpen ? 'information-circle' : 'information-circle-outline'}
            accessibilityLabel={diagnosticsOpen ? 'Close scanner diagnostics' : 'Scanner diagnostics'}
            onPress={() => setDiagnosticsOpen((current) => !current)}
            disabled={manualOpen}
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
        ) : !permission?.granted ? (
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
                  onPress={openManual}
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
        ) : cameraError ? (
          <View style={styles.centerOverlay}>
            <View style={styles.stateCard}>
              <Ionicons name="camera-outline" size={24} color={colors.danger} />
              <AppText variant="bodyStrong" align="center">
                Camera unavailable
              </AppText>
              <AppText variant="caption" color={colors.textMuted} align="center">
                {cameraError}
              </AppText>
              <Button label="Restart camera" icon="refresh" onPress={restartCamera} />
              <Button label="Enter barcode number" icon="keypad-outline" onPress={openManual} />
              <Button
                label="Add product manually"
                variant="ghost"
                icon="create-outline"
                onPress={() => onManual()}
              />
            </View>
          </View>
        ) : (
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

            {diagnosticsOpen ? (
              <View style={[styles.diagnosticsOverlay, { paddingBottom: insets.bottom + 18 }]}>
                <View style={styles.diagnosticsCard}>
                  <View style={styles.diagnosticsHeader}>
                    <View style={styles.diagnosticsTitle}>
                      <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                      <AppText variant="bodyStrong">Scanner diagnostics</AppText>
                    </View>
                    <IconButton
                      icon="close"
                      accessibilityLabel="Close scanner diagnostics"
                      onPress={() => setDiagnosticsOpen(false)}
                    />
                  </View>
                  <View style={styles.diagnosticsRows}>
                    {diagnostics.map((row) => (
                      <View style={styles.diagnosticsRow} key={row.label}>
                        <AppText variant="caption" color={colors.textFaint} style={styles.diagLabel}>
                          {row.label}
                        </AppText>
                        <AppText variant="caption" color={colors.text} style={styles.diagValue}>
                          {row.value}
                        </AppText>
                      </View>
                    ))}
                  </View>
                  {cameraError || captureError ? (
                    <View style={styles.diagnosticsError}>
                      <Ionicons name="warning-outline" size={15} color={colors.gold} />
                      <AppText variant="caption" color={colors.gold} style={styles.diagnosticsErrorText}>
                        {cameraError ?? captureError}
                      </AppText>
                    </View>
                  ) : null}
                  <View style={styles.diagnosticsActions}>
                    <Button label="Restart live camera" icon="refresh" onPress={restartCamera} />
                    <Button
                      label="Photo scan"
                      variant="secondary"
                      icon="camera-outline"
                      onPress={() => void captureAndScan()}
                      disabled={capturing || !cameraReady}
                    />
                  </View>
                </View>
              </View>
            ) : showDetected ? (
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
                      <Button label="Try again" icon="refresh" fullWidth onPress={onRetry} />
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
                {noEventHint ? (
                  <View style={styles.hintPill}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
                    <AppText variant="caption" color={colors.textMuted} style={styles.hintText}>
                      No native scan event yet. Photo scan reads the barcode on your phone.
                    </AppText>
                  </View>
                ) : null}
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
                    accessibilityLabel="Take a photo and decode the barcode on this device"
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
                      Photo scan
                    </AppText>
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Enter a barcode number"
                    onPress={openManual}
                    style={styles.actionChip}
                  >
                    <Ionicons name="keypad-outline" size={17} color={colors.accent} />
                    <AppText variant="buttonSmall" color={colors.text}>
                      Enter number
                    </AppText>
                  </PressableScale>
                </View>
                <AppText variant="caption" color={colors.textFaint} align="center">
                  Photo scan decodes on this phone. No Google services needed.
                </AppText>
              </View>
            )}

            {capturing ? (
              <View style={styles.captureOverlay} pointerEvents="none">
                <View style={styles.captureCard}>
                  <ActivityIndicator color={colors.accent} />
                  <AppText variant="bodyStrong">Reading photo…</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    Decoding the barcode on this device
                  </AppText>
                </View>
              </View>
            ) : null}
          </>
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
    gap: spacing.sm,
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
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(8, 14, 20, 0.9)',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  hintText: {
    flex: 1,
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
  diagnosticsOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  diagnosticsCard: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  diagnosticsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  diagnosticsRows: {
    gap: 7,
  },
  diagnosticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  diagLabel: {
    width: 118,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  diagValue: {
    flex: 1,
    lineHeight: 16,
  },
  diagnosticsError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingTop: 2,
  },
  diagnosticsErrorText: {
    flex: 1,
  },
  diagnosticsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
