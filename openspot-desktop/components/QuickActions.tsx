import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';
import { typography } from '@/constants/typography';

interface QuickActionsProps {
  onShuffleLiked: () => void;
  onDownloads: () => void;
  onLibrary: () => void;
}

export function QuickActions({ onShuffleLiked, onDownloads, onLibrary }: QuickActionsProps) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const accent = isDark ? '#1DB954' : '#167c3a';
  const { t } = useTranslation();

  const pills = [
    { icon: 'shuffle-outline' as const, label: t('home.shuffle_liked'), onPress: onShuffleLiked },
    { icon: 'download-outline' as const, label: t('tabs.downloads'), onPress: onDownloads },
    { icon: 'library-outline' as const, label: t('tabs.library'), onPress: onLibrary },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {pills.map((pill) => (
        <TouchableOpacity
          key={pill.label}
          style={[styles.pill, { backgroundColor: accent }]}
          onPress={pill.onPress}
          activeOpacity={0.8}
        >
          <Ionicons name={pill.icon} size={16} color="#fff" style={styles.pillIcon} />
          <Text style={styles.pillLabel}>{pill.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  pillIcon: {
    marginRight: 6,
  },
  pillLabel: {
    ...typography.pill,
    color: '#fff',
  },
});
