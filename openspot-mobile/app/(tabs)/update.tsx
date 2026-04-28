import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeMode, useThemeMode } from '@/hooks/theme-mode';
const CURRENT_VERSION = 'v3.0.0';
const RELEASES_URL = 'https://github.com/BlackHatDevX/openspot-music-app/releases';
const LINKEDIN_URL = 'https://www.linkedin.com/in/jash-gro/';
const DONATE_URL = 'https://telegram.dog/deveioper_x';
const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/BlackHatDevX/openspot-music-app/releases/latest';
const TRENDING_URL = 'https://raw.githubusercontent.com/BlackHatDevX/trending-music-os/refs/heads/main/trending.json';
const REGION_OVERRIDE_KEY = 'openspot_region_override_v1';
const LANGUAGE_KEY = 'openspot_language_v1';
const PROVIDER_KEY = 'openspot_provider_v1';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { mode, setMode } = useThemeMode();
  const { t, i18n } = useTranslation();

  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [region, setRegion] = useState<string>('auto');
  const [regionOptions, setRegionOptions] = useState<string[]>(['auto']);
  const [language, setLanguage] = useState<string>('en');
  const [provider, setProvider] = useState<string>('saavn');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const currentVersion = Constants.expoConfig?.version ?? 'unknown';
  const updateAvailable = !!latestVersion && latestVersion !== currentVersion;

  const theme = useMemo(
    () => ({
      background: isDark ? '#050505' : '#f5efe6',
      surface: isDark ? '#121212' : '#fffaf2',
      surfaceElevated: isDark ? '#1b1b1b' : '#efe4d6',
      textPrimary: isDark ? '#ffffff' : '#2d2219',
      textSecondary: isDark ? '#a9a9a9' : '#7a6251',
      border: isDark ? '#272727' : '#e4d5c5',
      accent: isDark ? '#1DB954' : '#167c3a',
    }),
    [isDark]
  );

  const modeOptions: Array<{ label: string; value: ThemeMode }> = [
    { label: 'Light', value: 'light' },
    { label: 'Night', value: 'dark' },
    { label: 'Auto', value: 'auto' },
  ];

  const languageOptions: Array<{ label: string; value: string; nativeLabel: string }> = [
    { label: 'English', value: 'en', nativeLabel: 'English' },
    { label: 'Hindi', value: 'hi', nativeLabel: 'Hindi' },
    { label: 'Spanish', value: 'es', nativeLabel: 'Espanol' },
    { label: 'Chinese', value: 'zh', nativeLabel: 'Zhongwen' },
    { label: 'German', value: 'de', nativeLabel: 'Deutsch' },
    { label: 'French', value: 'fr', nativeLabel: 'Francais' },
    { label: 'Russian', value: 'ru', nativeLabel: 'Russkiy' },
    { label: 'Hebrew', value: 'he', nativeLabel: 'Ivrit' },
  ];

  const providerOptions: Array<{ label: string; value: string }> = [
    { label: 'Saavn', value: 'saavn' },
    { label: 'YouTube Music', value: 'ytmusic' },
  ];

  useEffect(() => {
    const loadRegion = async () => {
      try {
        const storedRegion = await AsyncStorage.getItem(REGION_OVERRIDE_KEY);
        if (storedRegion && storedRegion.trim()) {
          setRegion(storedRegion);
        }
      } catch (error) {
        console.error('Failed to load region setting:', error);
      }
    };

    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (storedLanguage && storedLanguage.trim()) {
          setLanguage(storedLanguage);
          await i18n.changeLanguage(storedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language setting:', error);
      }
    };

    const loadProvider = async () => {
      try {
        const storedProvider = await AsyncStorage.getItem(PROVIDER_KEY);
        if (storedProvider && storedProvider.trim()) {
          setProvider(storedProvider);
        }
      } catch (error) {
        console.error('Failed to load provider setting:', error);
      }
    };

    void loadRegion();
    void loadLanguage();
    void loadProvider();
    void loadRegionOptions();
    void checkForUpdates();
  }, []);

  const loadRegionOptions = async () => {
    try {
      const response = await fetch(TRENDING_URL);
      const data = await response.json();
      const supportedRegions = Object.keys(data || {}).filter((key) => Array.isArray(data[key]));
      const mergedOptions = ['auto', ...supportedRegions];
      setRegionOptions(mergedOptions);
      setRegion((current) => (mergedOptions.includes(current) ? current : 'auto'));
    } catch (error) {
      console.error('Failed to load supported regions:', error);
      setRegionOptions(['auto', 'global']);
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch(GITHUB_LATEST_RELEASE_URL);
      const data = await res.json();
      if (data?.tag_name) {
        setLatestVersion(String(data.tag_name).replace(/^v/i, ''));
      }
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleRegionChange = async (nextRegion: string) => {
    setRegion(nextRegion);
    try {
      await AsyncStorage.setItem(REGION_OVERRIDE_KEY, nextRegion);
    } catch (error) {
      console.error('Failed to save region setting:', error);
    }
  };

  const handleLanguageChange = async (nextLanguage: string) => {
    setLanguage(nextLanguage);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
      await i18n.changeLanguage(nextLanguage);
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  };

  const handleProviderChange = async (nextProvider: string) => {
    setProvider(nextProvider);
    try {
      await AsyncStorage.setItem(PROVIDER_KEY, nextProvider);
    } catch (error) {
      console.error('Failed to save provider setting:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('settings.settings')}</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Version</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>Current version: {currentVersion}</Text>
          <Text style={[styles.cardText, { color: updateAvailable ? '#ff4444' : theme.textSecondary }]}>
            Latest version: {latestVersion ?? 'unknown'}
          </Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={checkForUpdates}>
            {isCheckingUpdate ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Check for update</Text>
            )}
          </TouchableOpacity>
          {updateAvailable && (
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => Linking.openURL(RELEASES_URL)}>
              <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>Open releases</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Theme</Text>
          <View style={styles.segmentRow}>
            {modeOptions.map((option) => {
              const active = mode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentButton,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                    active && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setMode(option.value)}
                >
                  <Text style={[styles.segmentText, { color: active ? '#fff' : theme.textSecondary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('settings.language')}</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            onPress={() => setIsLanguageModalOpen(true)}
          >
            <Text style={[styles.dropdownButtonText, { color: theme.textPrimary }]}>
              {languageOptions.find((option) => option.value === language)?.label || 'English'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Music Provider</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Select your preferred music streaming service.
          </Text>
          <View style={styles.segmentRow}>
            {providerOptions.map((option) => {
              const active = provider === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentButton,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                    active && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => handleProviderChange(option.value)}
                >
                  <Text style={[styles.segmentText, { color: active ? '#fff' : theme.textSecondary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Region</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Trending songs on home use this region. Default: Auto.
          </Text>
          <View style={styles.regionWrap}>
            {regionOptions.map((option) => {
              const active = region === option;
              const label =
                option === 'auto'
                  ? 'Auto'
                  : option
                      .split(' ')
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(' ');
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.regionChip,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                    active && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => handleRegionChange(option)}
                >
                  <Text style={[styles.regionChipText, { color: active ? '#fff' : theme.textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Contact developer</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(LINKEDIN_URL)}>
            <Ionicons name="logo-linkedin" size={18} color={theme.accent} />
            <Text style={[styles.linkText, { color: theme.textPrimary }]}>linkedin.com/in/jash-gro</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Donate</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(DONATE_URL)}>
            <Ionicons name="gift-outline" size={18} color={theme.accent} />
            <Text style={[styles.linkText, { color: theme.textPrimary }]}>telegram.dog/deveioper_x</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isLanguageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.languageModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: 12 }]}>{t('settings.language')}</Text>
            <FlatList
              data={languageOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const active = language === item.value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.languageOptionRow,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { borderColor: theme.accent },
                    ]}
                    onPress={() => {
                      void handleLanguageChange(item.value);
                      setIsLanguageModalOpen(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.languageOptionTitle, { color: theme.textPrimary }]}>{item.label}</Text>
                      <Text style={[styles.languageOptionSubtitle, { color: theme.textSecondary }]}>{item.nativeLabel}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
            <TouchableOpacity style={styles.cancelButtonRow} onPress={() => setIsLanguageModalOpen(false)}>
              <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageModalCard: {
    width: '88%',
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  languageOptionRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelButtonRow: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  regionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  regionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
