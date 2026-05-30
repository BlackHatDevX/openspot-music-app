import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';
import { typography } from '@/constants/typography';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#2d2219' }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: isDark ? '#1DB954' : '#167c3a' }]}>{t('home.see_all')} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    ...typography.h3,
  },
  seeAll: {
    ...typography.bodyBold,
  },
});
