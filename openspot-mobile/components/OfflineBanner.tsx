import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const insets = useSafeAreaInsets();
  const theme = useMemo(
    () => ({
      bg: isDark ? '#2a1b00' : '#fff3d6',
      border: isDark ? '#5a3a00' : '#f0d28a',
      text: isDark ? '#ffd18a' : '#7a4a00',
    }),
    [isDark]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, borderColor: theme.border, top: insets.top }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={theme.text} />
      <Text style={[styles.text, { color: theme.text }]}>
        You&apos;re offline. Showing downloads.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

