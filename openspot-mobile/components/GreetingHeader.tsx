import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';
import { typography } from '@/constants/typography';

const nightQuotes = [
  'Time to rest your ears, the music will be here tomorrow.',
  'The stars are playing their own melody tonight.',
  'Sweet dreams are made of these… and playlists.',
  'Shh… the playlist is dreaming too.',
  'Moonlight and melodies — save some for tomorrow.',
  'Your ears deserve a break. See you in the AM.',
];

export function GreetingHeader() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const { t } = useTranslation();

  const hour = new Date().getHours();
  const isLateNight = hour >= 22 || hour < 5;

  const greeting = useMemo(() => {
    if (isLateNight) {
      const idx = Math.floor(Math.random() * nightQuotes.length);
      return nightQuotes[idx];
    }
    if (hour < 12) return t('home.good_morning');
    if (hour < 18) return t('home.good_afternoon');
    return t('home.good_evening');
  }, [hour, isLateNight, t]);

  const colors = isLateNight
    ? (isDark ? ['#0d1a33', '#0a0f1a'] as const : ['#c8d4e6', '#dce3ed'] as const)
    : (isDark ? ['#0d3320', '#0b1a12'] as const : ['#d4e9d6', '#e8f0e6'] as const);

  const iconName = isLateNight ? 'moon-outline' as const : 'musical-notes' as const;
  const iconColor = isLateNight
    ? (isDark ? '#6b8fc4' : '#4a6b8a')
    : (isDark ? '#1DB954' : '#167c3a');

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <View style={styles.iconRow}>
        <Ionicons name={iconName} size={28} color={iconColor} />
      </View>
      <Text style={[styles.greeting, { color: isDark ? '#fff' : '#1a2e1a' }]} numberOfLines={2}>
        {greeting}
      </Text>
      {!isLateNight && (
        <Text style={[styles.subtitle, { color: isDark ? '#a9c9b5' : '#4a6b4a' }]}>
          {t('home.ready_to_explore')}
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    paddingTop: 18,
  },
  iconRow: {
    marginBottom: 6,
  },
  greeting: {
    ...typography.h2,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.body,
    fontWeight: '500',
  },
});
