import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { AppText } from './AppText';
import { colors, fonts, radius } from '../../constants/theme';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  trailing?: string;
}

export function Field({
  label,
  hint,
  error,
  optional = false,
  trailing,
  multiline,
  style,
  onFocus,
  onBlur,
  ...rest
}: FieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="label" color={colors.textMuted}>
          {label.toUpperCase()}
        </AppText>
        {optional ? (
          <AppText variant="caption" color={colors.textFaint} style={styles.optional}>
            Optional
          </AppText>
        ) : trailing ? (
          <AppText variant="caption" color={colors.textFaint}>
            {trailing}
          </AppText>
        ) : null}
      </View>
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.textFaint}>
          {hint}
        </AppText>
      ) : null}
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
  optional: {
    fontSize: 11,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 118,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  inputFocused: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAlt,
  },
  inputError: {
    borderColor: colors.dangerBorder,
  },
});

