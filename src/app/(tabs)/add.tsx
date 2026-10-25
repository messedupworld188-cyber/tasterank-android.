import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { RatingForm } from '../../components/RatingForm';
import { AppText } from '../../components/ui/AppText';
import { useToast } from '../../components/ui/Toast';
import { useRatings } from '../../store/RatingsProvider';
import { colors, spacing } from '../../constants/theme';
import { hapticSuccess } from '../../lib/haptics';

export default function AddScreen(): React.JSX.Element {
  const router = useRouter();
  const { addRating } = useRatings();
  const { show } = useToast();
  const [formKey, setFormKey] = useState(0);

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
          <View style={styles.header}>
            <View style={styles.eyebrow}>
              <Ionicons name="add-circle" size={14} color={colors.lime} />
              <AppText variant="label" color={colors.lime}>
                NEW ENTRY
              </AppText>
            </View>
            <AppText variant="display">Rate it.</AppText>
            <AppText variant="body" color={colors.textMuted}>
              Score it from 0.0 to 10.0 and it drops straight into your leaderboard.
            </AppText>
          </View>

          <RatingForm
            key={formKey}
            submitLabel="Save rating"
            onSubmit={async (input) => {
              const rating = await addRating(input);
              hapticSuccess();
              show('Rating saved to your leaderboard');
              setFormKey((current) => current + 1);
              router.push(`/item/${rating.id}`);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    gap: 8,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
