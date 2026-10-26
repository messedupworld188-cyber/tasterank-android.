import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { PressableScale } from './ui/PressableScale';
import { ProductResultRow } from './ProductResultRow';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { ProductCandidate, Rating } from '../types';
import { formatDate, pluralize } from '../lib/utils';
import { searchProductsWithCache } from '../lib/productCache';
import { productErrorMessage, searchCooldownMs } from '../lib/openFoodFacts';
import { hapticSelect } from '../lib/haptics';

const SUGGESTIONS = ['Monster', 'Red Bull', 'C4'];

interface ProductSearchProps {
  onSelect: (product: ProductCandidate) => void;
  onScan: () => void;
  onManual: () => void;
  existingFor: (product: ProductCandidate) => Rating | null;
}

type Notice =
  | { kind: 'cached' | 'stale'; text: string }
  | { kind: 'error'; text: string }
  | null;

export function ProductSearch({
  onSelect,
  onScan,
  onManual,
  existingFor,
}: ProductSearchProps): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState<string | null>(null);
  const [results, setResults] = useState<ProductCandidate[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [cooldown, setCooldown] = useState(0);
  const requestId = useRef(0);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const tick = () => setCooldown(searchCooldownMs());
    tick();
    const timer = setInterval(tick, 500);
    return () => {
      active.current = false;
      clearInterval(timer);
    };
  }, []);

  const runSearch = async (explicit?: string) => {
    if (loading) return;
    const term = (explicit ?? query).trim().replace(/\s+/g, ' ');
    if (term.length < 2) {
      setInputError('Type at least 2 characters to search.');
      hapticSelect();
      return;
    }

    Keyboard.dismiss();
    setInputError(null);
    setQuery(term);
    setLoading(true);
    setSearched(term);
    setNotice(null);
    setResults([]);

    const id = ++requestId.current;
    try {
      const outcome = await searchProductsWithCache(term);
      if (!active.current || id !== requestId.current) return;
      setResults(outcome.products);
      if (outcome.stale) {
        setNotice({
          kind: 'stale',
          text: `Connection failed — showing saved results from ${formatDate(
            new Date(outcome.savedAt).toISOString(),
          )}.`,
        });
      } else if (outcome.fromCache) {
        setNotice({
          kind: 'cached',
          text: `Saved results · refreshed ${formatDate(
            new Date(outcome.savedAt).toISOString(),
          )}`,
        });
      }
    } catch (error) {
      if (!active.current || id !== requestId.current) return;
      setResults([]);
      setNotice({ kind: 'error', text: productErrorMessage(error) });
    } finally {
      if (active.current && id === requestId.current) {
        setLoading(false);
        setCooldown(searchCooldownMs());
      }
    }
  };

  const choose = (product: ProductCandidate) => {
    hapticSelect();
    onSelect(product);
  };

  const retry = () => {
    if (searched) void runSearch(searched);
  };

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <View style={styles.eyebrow}>
          <Ionicons name="search" size={13} color={colors.accent} />
          <AppText variant="label" color={colors.accent}>
            PRODUCT SEARCH
          </AppText>
        </View>
        <AppText variant="display">Find it.{'\n'}Then rank it.</AppText>
        <AppText variant="body" color={colors.textMuted}>
          Search real packaged food and drinks by name, brand or flavor, or scan a barcode.
        </AppText>
      </View>

      <View style={styles.searchBlock}>
        <View style={[styles.searchBar, focused ? styles.searchBarFocused : null]}>
          <Ionicons name="search" size={19} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (inputError) setInputError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => void runSearch()}
            placeholder="Monster, Barebells, C4…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            maxLength={80}
            accessibilityLabel="Search Open Food Facts products"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setQuery('');
                setResults([]);
                setSearched(null);
                setNotice(null);
                setInputError(null);
              }}
              hitSlop={8}
              style={styles.clear}
            >
              <Ionicons name="close" size={13} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Search products"
            disabled={loading || query.trim().length < 2}
            haptic={false}
            onPress={() => void runSearch()}
            style={[
              styles.searchButton,
              loading || query.trim().length < 2 ? styles.searchButtonDisabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
            )}
          </PressableScale>
        </View>

        {inputError ? (
          <AppText variant="caption" color={colors.danger}>
            {inputError}
          </AppText>
        ) : (
          <AppText variant="caption" color={colors.textFaint}>
            {cooldown > 0
              ? `Open Food Facts allows 10 searches a minute · ready in ${Math.ceil(
                  cooldown / 1000,
                )}s`
              : 'Searches run on submit and are cached on this device.'}
          </AppText>
        )}

        <View style={styles.suggestions}>
          <AppText variant="label" color={colors.textFaint} style={styles.tryLabel}>
            TRY
          </AppText>
          {SUGGESTIONS.map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              onPress={() => {
                setQuery(suggestion);
                void runSearch(suggestion);
              }}
            />
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Scan a product barcode"
          onPress={onScan}
          style={styles.actionCard}
        >
          <View style={[styles.actionIcon, styles.actionIconAccent]}>
            <Ionicons name="scan-outline" size={20} color={colors.onAccent} />
          </View>
          <View style={styles.actionCopy}>
            <AppText variant="bodyStrong">Scan barcode</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Use your camera
            </AppText>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add a product manually"
          onPress={onManual}
          style={styles.actionCard}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="create-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.actionCopy}>
            <AppText variant="bodyStrong">Add manually</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Not in the database
            </AppText>
          </View>
        </PressableScale>
      </View>

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="bodyStrong">Searching Open Food Facts…</AppText>
          <AppText variant="caption" color={colors.textMuted} align="center">
            Real product data, matched on name, brand and flavor.
          </AppText>
        </Card>
      ) : null}

      {!loading && notice ? (
        <View
          style={[
            styles.notice,
            notice.kind === 'error' ? styles.noticeError : styles.noticeInfo,
          ]}
        >
          <Ionicons
            name={notice.kind === 'error' ? 'cloud-offline-outline' : 'time-outline'}
            size={15}
            color={notice.kind === 'error' ? colors.danger : colors.gold}
          />
          <AppText
            variant="caption"
            color={notice.kind === 'error' ? colors.danger : colors.textMuted}
            style={styles.flex}
          >
            {notice.text}
          </AppText>
          {notice.kind === 'error' ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Try search again"
              onPress={retry}
              haptic={false}
              style={styles.noticeAction}
            >
              <AppText variant="caption" color={colors.accent}>
                Retry
              </AppText>
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      {!loading && results.length > 0 ? (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <AppText variant="label" color={colors.textMuted}>
              {pluralize(results.length, 'RESULT')}
              {searched ? ` FOR “${searched.toUpperCase()}”` : ''}
            </AppText>
            <AppText variant="caption" color={colors.textFaint}>
              20 max
            </AppText>
          </View>
          <Card padded={false} style={styles.resultsCard}>
            {results.map((product, index) => (
              <View key={`${product.barcode}-${index}`}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.resultRowWrap}>
                  <ProductResultRow
                    product={product}
                    existing={existingFor(product)}
                    onPress={() => choose(product)}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {!loading && searched && results.length === 0 && notice?.kind !== 'error' ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={24} color={colors.accent} />
          </View>
          <AppText variant="heading" align="center">
            No matches for “{searched}”
          </AppText>
          <AppText variant="body" color={colors.textMuted} align="center">
            Open Food Facts may not have this product yet. Add it manually with your own
            photo, or try a shorter search.
          </AppText>
          <Button label="Add product manually" icon="create-outline" onPress={onManual} />
        </Card>
      ) : null}

      {!loading && !searched ? (
        <Card style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb-outline" size={19} color={colors.accent} />
          </View>
          <View style={styles.tipCopy}>
            <AppText variant="bodyStrong">Search tips</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Try a brand plus a flavor — “Monster Ultra White”, “Barebells Cookies &
              Cream”. Searches run only when you submit, to respect Open Food Facts'
              limits.
            </AppText>
          </View>
        </Card>
      ) : null}

      <PressableScale
        accessibilityRole="link"
        accessibilityLabel="Open Food Facts attribution and licensing"
        onPress={() => router.push('/data-credits')}
        haptic={false}
        style={styles.attribution}
      >
        <Ionicons name="information-circle-outline" size={14} color={colors.textFaint} />
        <AppText variant="caption" color={colors.textFaint} style={styles.flex}>
          Product data from Open Food Facts · ODbL · images CC BY-SA
        </AppText>
        <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  intro: {
    gap: 8,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchBlock: {
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingLeft: 15,
    paddingRight: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  searchBarFocused: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAlt,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 12,
  },
  clear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  searchButtonDisabled: {
    opacity: 0.35,
  },
  suggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  tryLabel: {
    marginRight: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    minHeight: 84,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
    justifyContent: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  actionIconAccent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionCopy: {
    gap: 1,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  noticeInfo: {
    backgroundColor: 'rgba(255, 209, 102, 0.08)',
    borderColor: 'rgba(255, 209, 102, 0.28)',
  },
  noticeAction: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  results: {
    gap: 10,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultsCard: {
    paddingHorizontal: 12,
  },
  resultRowWrap: {
    paddingVertical: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.55,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentWash,
  },
  tipCopy: {
    flex: 1,
    gap: 3,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  flex: {
    flex: 1,
  },
});
