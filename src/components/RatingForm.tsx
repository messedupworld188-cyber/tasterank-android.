import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Field } from './ui/Field';
import { PhotoField } from './PhotoField';
import { ScoreInput } from './ScoreInput';
import { CATEGORIES } from '../constants/categories';
import { colors } from '../constants/theme';
import type { CategoryId, ProductSource, Rating, RatingInput } from '../types';
import { hapticWarn } from '../lib/haptics';
import { DuplicateRatingError } from '../store/RatingsProvider';

interface RatingFormProps {
  initial?: Partial<Rating>;
  submitLabel: string;
  onSubmit: (input: RatingInput) => Promise<void>;
  onDuplicate?: (existing: Rating) => void;
  footer?: React.ReactNode;
}

export function RatingForm({
  initial,
  submitLabel,
  onSubmit,
  onDuplicate,
  footer,
}: RatingFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [flavor, setFlavor] = useState(initial?.flavor ?? '');
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'energy');
  const [score, setScore] = useState(initial?.score ?? 8);
  const [review, setReview] = useState(initial?.review ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [barcode] = useState<string | null>(initial?.barcode ?? null);
  const [source] = useState<ProductSource>(initial?.source ?? 'manual');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError('Add a product name so it shows up in your rankings.');
      hapticWarn();
      return;
    }
    setNameError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name, brand, flavor, category, score, review, photoUri, barcode, source });
    } catch (error) {
      if (error instanceof DuplicateRatingError) {
        hapticWarn();
        if (onDuplicate) {
          onDuplicate(error.existing);
        } else {
          Alert.alert(
            'Already in your collection',
            `You already rated "${error.existing.name}". Open it from your rankings to edit that rating.`,
          );
        }
        return;
      }
      console.warn('[TasteRank] Could not save rating', error);
      Alert.alert('Could not save', 'Something went wrong while saving this rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AppText variant="label">THE PRODUCT</AppText>
        <Field
          label="Product name"
          placeholder="e.g. Sour Patch Kids Redberry"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (nameError) setNameError(null);
          }}
          error={nameError ?? undefined}
          maxLength={80}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <Field
          label="Brand"
          optional
          placeholder="e.g. Ghost Energy"
          value={brand}
          onChangeText={setBrand}
          maxLength={60}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <Field
          label="Flavor or variant"
          optional
          placeholder="e.g. Redberry"
          value={flavor}
          onChangeText={setFlavor}
          maxLength={60}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label">CATEGORY</AppText>
        <View style={styles.chips}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.id}
              label={item.short}
              selected={category === item.id}
              onPress={() => setCategory(item.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label">THE VERDICT</AppText>
        <ScoreInput value={score} onChange={setScore} />
      </View>

      <View style={styles.section}>
        <PhotoField photoUri={photoUri} onChange={setPhotoUri} />
      </View>

      <View style={styles.section}>
        <AppText variant="label">REVIEW</AppText>
        <Field
          label="Your notes"
          optional
          placeholder="What did it taste like? Would you buy it again?"
          value={review}
          onChangeText={setReview}
          multiline
          maxLength={600}
          hint={`${review.length}/600 characters`}
        />
      </View>

      <Button
        label={submitLabel}
        onPress={() => void handleSubmit()}
        size="lg"
        icon="checkmark"
        fullWidth
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
      />
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 26,
  },
  section: {
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  submit: {
    marginTop: 4,
  },
});
