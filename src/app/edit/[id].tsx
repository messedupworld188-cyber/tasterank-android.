import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { useToast } from '../../components/ui/Toast';
import { useRatings } from '../../store/RatingsProvider';
import { colors, spacing } from '../../constants/theme';
import { findRating } from '../../lib/stats';
import { hapticSuccess, hapticWarn } from '../../lib/haptics';

export default function EditRatingScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ratings, updateRating, deleteRating } = useRatings();
  const { show } = useToast();
  const rating = findRating(ratings, typeof id === 'string' ? id : undefined);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
        <View style={styles.headerCopy}>
          <AppText variant="label" color={colors.textFaint}>
            EDITING
          </AppText>
          <AppText variant="heading">Update rating</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {!rating ? (
        <EmptyState
          icon="help-circle-outline"
          title="Rating not found"
          message="This rating may have already been deleted."
        >
          <Button label="Close" onPress={close} />
        </EmptyState>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <RatingForm
              initial={rating}
              submitLabel="Save changes"
              onSubmit={async (input) => {
                await updateRating(rating.id, input);
                hapticSuccess();
                show('Changes saved');
                close();
              }}
              footer={
                <Button
                  label="Delete this rating"
                  icon="trash-outline"
                  variant="danger"
                  fullWidth
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(
                      'Delete this rating?',
                      `"${rating.name}" will be removed from your rankings. This cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            hapticWarn();
                            show('Rating deleted');
                            close();
                            void deleteRating(rating.id);
                          },
                        },
                      ],
                    )
                  }
                />
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  deleteButton: {
    marginTop: 4,
  },
});
