import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { RatingForm } from '../../components/RatingForm';
import { ProductSearch } from '../../components/ProductSearch';
import { SelectedProductCard } from '../../components/SelectedProductCard';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { AppText } from '../../components/ui/AppText';
import { PressableScale } from '../../components/ui/PressableScale';
import { useToast } from '../../components/ui/Toast';
import { useRatings } from '../../store/RatingsProvider';
import { colors, radius, spacing } from '../../constants/theme';
import type { ProductCandidate, Rating } from '../../types';
import { findDuplicateRating } from '../../lib/productIdentity';
import { ProductApiError, productErrorMessage } from '../../lib/openFoodFacts';
import { lookupBarcodeWithCache } from '../../lib/productCache';
import { hapticSuccess, hapticWarn } from '../../lib/haptics';
import { formatScore } from '../../lib/utils';

type Mode = 'search' | 'form';

export default function AddScreen(): React.JSX.Element {
  const router = useRouter();
  const { ratings, addRating } = useRatings();
  const { show } = useToast();

  const [mode, setMode] = useState<Mode>('search');
  const [selected, setSelected] = useState<ProductCandidate | null>(null);
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const existingFor = useCallback(
    (product: ProductCandidate) => findDuplicateRating(ratings, product),
    [ratings],
  );

  const openExisting = useCallback(
    (existing: Rating) => {
      hapticWarn();
      Alert.alert(
        'Already in your collection',
        `You rated "${existing.name}" ${formatScore(existing.score)}/10. Open it to edit your notes or score.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open rating', onPress: () => router.push(`/item/${existing.id}`) },
        ],
      );
    },
    [router],
  );

  const startProduct = useCallback(
    (product: ProductCandidate) => {
      const duplicate = findDuplicateRating(ratings, product);
      if (duplicate) {
        openExisting(duplicate);
        return;
      }
      setSelected(product);
      setManualBarcode(null);
      setFormKey((current) => current + 1);
      setMode('form');
    },
    [openExisting, ratings],
  );

  const startManual = useCallback((barcode?: string) => {
    setScannerVisible(false);
    setSelected(null);
    setManualBarcode(barcode ?? null);
    setFormKey((current) => current + 1);
    setMode('form');
  }, []);

  const backToSearch = () => {
    setMode('search');
    setSelected(null);
    setManualBarcode(null);
  };

  const handleScanned = async (barcode: string) => {
    if (lookingUp) return;
    setLookingUp(true);
    try {
      const outcome = await lookupBarcodeWithCache(barcode);
      setScannerVisible(false);
      if (outcome.stale) {
        show('Offline — using the saved product');
      }
      startProduct(outcome.product);
    } catch (error) {
      setScannerVisible(false);
      const notFound = error instanceof ProductApiError && error.kind === 'not-found';
      Alert.alert(
        notFound ? 'No product match' : 'Lookup failed',
        notFound
          ? `Barcode ${barcode} is not in Open Food Facts yet. Add it manually and TasteRank will keep the barcode with your rating.`
          : productErrorMessage(error),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add manually', onPress: () => startManual(barcode) },
        ],
      );
    } finally {
      setLookingUp(false);
    }
  };

  const initial = useMemo(() => {
    if (selected) {
      return {
        name: selected.name,
        brand: selected.brand,
        flavor: selected.flavor,
        category: selected.category,
        photoUri: selected.imageUrl,
        barcode: selected.barcode,
        source: 'openfoodfacts' as const,
      };
    }
    return {
      barcode: manualBarcode,
      source: 'manual' as const,
    };
  }, [manualBarcode, selected]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'search' ? (
            <ProductSearch
              onSelect={startProduct}
              onScan={() => setScannerVisible(true)}
              onManual={() => startManual()}
              existingFor={existingFor}
            />
          ) : (
            <>
              <View style={styles.formHeader}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Back to product search"
                  onPress={backToSearch}
                  haptic={false}
                  style={styles.back}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                  <AppText variant="buttonSmall" color={colors.textMuted}>
                    Product search
                  </AppText>
                </PressableScale>
                <View style={styles.eyebrow}>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'create-outline'}
                    size={13}
                    color={colors.lime}
                  />
                  <AppText variant="label" color={colors.lime}>
                    {selected ? 'NEW RATING' : 'MANUAL ENTRY'}
                  </AppText>
                </View>
                <AppText variant="display">
                  {selected ? 'Rate it.' : 'Add your own.'}
                </AppText>
                <AppText variant="body" color={colors.textMuted}>
                  {selected
                    ? 'Product details are filled in. Adjust anything, then score it from 0.0 to 10.0.'
                    : 'Enter the product yourself and attach your own photo. It joins the same leaderboard.'}
                </AppText>
              </View>

              {selected ? (
                <SelectedProductCard product={selected} onChange={backToSearch} />
              ) : manualBarcode ? (
                <View style={styles.barcodeNote}>
                  <View style={styles.barcodeIcon}>
                    <Ionicons name="barcode-outline" size={17} color={colors.lime} />
                  </View>
                  <View style={styles.barcodeCopy}>
                    <AppText variant="bodyStrong">Barcode captured</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {manualBarcode} · saved with this product to prevent duplicates
                    </AppText>
                  </View>
                </View>
              ) : null}

              <RatingForm
                key={formKey}
                initial={initial}
                submitLabel="Save rating"
                onDuplicate={(existing) => {
                  backToSearch();
                  openExisting(existing);
                }}
                onSubmit={async (input) => {
                  const rating = await addRating(input);
                  hapticSuccess();
                  show('Rating saved to your leaderboard');
                  backToSearch();
                  setFormKey((current) => current + 1);
                  router.push(`/item/${rating.id}`);
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={scannerVisible}
        busy={lookingUp}
        onClose={() => {
          if (!lookingUp) setScannerVisible(false);
        }}
        onScanned={(barcode) => void handleScanned(barcode)}
        onManual={() => startManual()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  formHeader: {
    gap: 8,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 1,
    paddingVertical: 4,
    marginLeft: -4,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  barcodeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  barcodeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 255, 84, 0.08)',
    borderWidth: 1,
    borderColor: colors.limeBorder,
  },
  barcodeCopy: {
    flex: 1,
    gap: 2,
  },
});
