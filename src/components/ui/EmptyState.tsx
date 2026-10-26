import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message: string;
  children?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  message,
  children,
  compact = false,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View style={[styles.container, compact ? styles.compact : null]}>
      <View style={styles.badge}>
        <View style={styles.badgeInner}>
          <Ionicons name={icon} size={26} color={colors.accent} />
        </View>
      </View>
      <View style={styles.copy}>
        <AppText variant="heading" align="center">
          {title}
        </AppText>
        <AppText variant="body" color={colors.textMuted} align="center">
          {message}
        </AppText>
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    gap: 22,
  },
  compact: {
    paddingVertical: 28,
    gap: 16,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  badgeInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  copy: {
    gap: 8,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
});
