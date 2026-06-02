import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, StatusBar, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearch } from '@/hooks/useSearch';
import { TopBar } from '@/components/TopBar';
import { MusicPlayerContext } from './_layout';
import { MusicAPI } from '@/lib/music-api';
import { Track } from '@/types/music';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { HorizontalTrackList } from '@/components/HorizontalTrackList';
import { GreetingHeader } from '@/components/GreetingHeader';
import { QuickActions } from '@/components/QuickActions';
import { SectionHeader } from '@/components/SectionHeader';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { COUNTRY_NAMES } from '@/constants/countryNames';
import { useTranslation } from 'react-i18next';
import { useThemeMode, ThemeMode } from '@/hooks/theme-mode';
import { useConnectivity } from '@/hooks/useConnectivity';

const KWORD_URL = 'https://kworb.net/spotify/';
const REGION_URL_MAP_KEY = 'openspot_region_url_map_v1';
const REGION_URL_MAP_TIMESTAMP_KEY = 'openspot_region_url_map_ts_v1';
const REGION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRENDING_TRACKS_CACHE_KEY = 'TRENDING_TRACKS_CACHE_V1';
const REGION_OVERRIDE_KEY = 'openspot_region_override_v1';
const LANGUAGE_KEY = 'openspot_language_v1';
const FIRST_RUN_SETUP_KEY = 'openspot_first_run_setup_done_v1';
const TRENDING_ENABLED_KEY = 'openspot_trending_enabled_v1';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const isDark = colorScheme !== 'light';
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

  const [currentView, setCurrentView] = React.useState<'home' | 'search'>('home');
  const searchState = useSearch();
  const { clearResults } = searchState;
  const { handleTrackSelect, musicQueue, isPlaying, currentTrack } = useContext(MusicPlayerContext);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const { getLikedSongsAsTrack } = useLikedSongs();
  const likedTracks = getLikedSongsAsTrack();
  const [detectedCountry, setDetectedCountry] = useState('your country');
  const [regionOverride, setRegionOverride] = useState<string>('auto');
  const [countryLoading, setCountryLoading] = useState(true);
  const [regionUrlMap, setRegionUrlMap] = useState<Record<string, string>>({});
  const [trendingCache, setTrendingCache] = useState<Record<string, Track>>({});
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState<Track[]>([]);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false);
  const [setupRegion, setSetupRegion] = useState<string>('auto');
  const [setupLanguage, setSetupLanguage] = useState<string>('en');
  const [setupTheme, setSetupTheme] = useState<ThemeMode>(mode);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const { isOffline } = useConnectivity();
  const wasOfflineRef = React.useRef(false);
  const [trendingEnabled, setTrendingEnabled] = useState<boolean>(true);

  const languageOptions: { label: string; value: string; nativeLabel: string }[] = [
    { label: 'English', value: 'en', nativeLabel: 'English' },
    { label: 'Hindi', value: 'hi', nativeLabel: 'Hindi' },
    { label: 'Spanish', value: 'es', nativeLabel: 'Espanol' },
    { label: 'Chinese', value: 'zh', nativeLabel: 'Zhongwen' },
    { label: 'German', value: 'de', nativeLabel: 'Deutsch' },
    { label: 'French', value: 'fr', nativeLabel: 'Francais' },
    { label: 'Russian', value: 'ru', nativeLabel: 'Russkiy' },
    { label: 'Hebrew', value: 'he', nativeLabel: 'Ivrit' },
    { label: 'Turkish', value: 'tr', nativeLabel: 'Türkçe' },
  ];

  
  useEffect(() => {
    (async () => {
      try {
        const [cacheStr, mapStr, done, stored, storedRegion, timestamp] = await Promise.all([
          AsyncStorage.getItem(TRENDING_TRACKS_CACHE_KEY),
          AsyncStorage.getItem(REGION_URL_MAP_KEY),
          AsyncStorage.getItem(FIRST_RUN_SETUP_KEY),
          AsyncStorage.getItem(TRENDING_ENABLED_KEY),
          AsyncStorage.getItem(REGION_OVERRIDE_KEY),
          AsyncStorage.getItem(REGION_URL_MAP_TIMESTAMP_KEY),
        ]);
        if (cacheStr) setTrendingCache(JSON.parse(cacheStr));
        if (mapStr) setRegionUrlMap(JSON.parse(mapStr));
        if (!done) setShowFirstRunSetup(true);
        if (stored !== null) setTrendingEnabled(stored === 'true');
        if (storedRegion && storedRegion.trim()) setRegionOverride(storedRegion);

        const isStale = !timestamp || Date.now() - parseInt(timestamp, 10) > REGION_CACHE_TTL_MS;
        if (isStale) {
          const res = await fetch(KWORD_URL);
          const html = await res.text();
          const freshMap: Record<string, string> = {};
          const regex = /<tr><td class="mp text">([^<]+)<\/td>\s*<td class="mp text">[\s\S]*?<a href="([^"]+)">Weekly<\/a>/g;
          let match;
          while ((match = regex.exec(html)) !== null) {
            const name = match[1].trim();
            freshMap[name] = `https://kworb.net/spotify/${match[2]}`;
          }
          setRegionUrlMap(freshMap);
          await AsyncStorage.setItem(REGION_URL_MAP_KEY, JSON.stringify(freshMap));
          await AsyncStorage.setItem(REGION_URL_MAP_TIMESTAMP_KEY, Date.now().toString());
        }
      } catch (e) {
        console.error('Failed to load cached data:', e);
      }
    })();
  }, []);

  useEffect(() => {
    setSetupTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (!isOffline && wasOfflineRef.current) {
      void (async () => {
        try {
          setTrendingDataLoading(true);
          const res = await fetch(TRENDING_URL);
          const data = await res.json();
          setTrendingData(data);
        } catch (e) {
          console.error('Trending data re-fetch error:', e);
        } finally {
          setTrendingDataLoading(false);
        }
      })();
      if (regionOverride === 'auto') {
        void (async () => {
          try {
            setCountryLoading(true);
            const res = await fetch('https://ipinfo.io/json');
            const data = await res.json();
            if (data && data.country && COUNTRY_NAMES[data.country]) {
              setDetectedCountry(COUNTRY_NAMES[data.country]);
            } else {
              setDetectedCountry('your country');
            }
          } catch (e) {
            console.error('Country re-fetch error:', e);
          } finally {
            setCountryLoading(false);
          }
        })();
      }
    }
    wasOfflineRef.current = isOffline;
  }, [isOffline, regionOverride]);

  const loadRecentlyPlayed = React.useCallback(async () => {
    try {
      const recent = await MusicAPI.getRecentlyPlayed();
      setRecentlyPlayedTracks(recent);
    } catch (error) {
      console.error('Failed to load recently played tracks:', error);
      setRecentlyPlayedTracks([]);
    }
  }, []);

  useEffect(() => {
    void loadRecentlyPlayed();
  }, [loadRecentlyPlayed]);

  useFocusEffect(
    React.useCallback(() => {
      void loadRecentlyPlayed();
      void (async () => {
        try {
          const storedRegion = await AsyncStorage.getItem(REGION_OVERRIDE_KEY);
          setRegionOverride(storedRegion && storedRegion.trim() ? storedRegion : 'auto');
        } catch (e) {
          console.error('Failed to refresh region override:', e);
        }
      })();
      void (async () => {
        try {
          const stored = await AsyncStorage.getItem(TRENDING_ENABLED_KEY);
          if (stored !== null) setTrendingEnabled(stored === 'true');
        } catch (e) {
          console.error('Failed to refresh trending setting:', e);
        }
      })();
    }, [loadRecentlyPlayed])
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://ipinfo.io/json');
        const data = await res.json();
        if (data && data.country && COUNTRY_NAMES[data.country]) {
          setDetectedCountry(COUNTRY_NAMES[data.country]);
        } else {
          setDetectedCountry('your country');
        }
      } catch (e) {
        console.error('Country fetch error:', e);
        setDetectedCountry('your country');
      } finally {
        setCountryLoading(false);
      }
    })();
  }, []);

  const activeRegion = regionOverride === 'auto' ? detectedCountry : regionOverride;
  const formattedActiveRegion = activeRegion
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  useEffect(() => {
    let isMounted = true;

    const fetchTrendingTracks = async (list: string[]) => {

      let cache = { ...trendingCache };
      const tracks: Track[] = [];
      let cacheChanged = false;


      for (const entry of list) {
        if (cache[entry]) {
          tracks.push(cache[entry]);
        }
      }


      if (isMounted) {
        setTrendingTracks([...tracks]);
      }


      for (const entry of list) {
        if (!cache[entry]) {
          try {
            const res = await MusicAPI.searchTracks(entry);
            if (res.tracks && res.tracks.length > 0) {
              cache[entry] = res.tracks[0];
              tracks.push(res.tracks[0]);
              cacheChanged = true;


              if (isMounted) {
                setTrendingTracks([...tracks]);
              }
            } else {
              console.warn(`[Trending] No results for: ${entry}`);
            }
          } catch (e) {
            console.error(`[Trending] Error fetching "${entry}":`, e);
          }
        }
      }

      if (cacheChanged) {
        setTrendingCache(cache);
        try {
          await AsyncStorage.setItem(TRENDING_TRACKS_CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
          console.error('Failed to save trending tracks cache:', e);
        }
      }
    };

    const fetchKworbWeekly = async (weeklyUrl: string) => {
      try {
        const res = await fetch(weeklyUrl);
        const html = await res.text();
        const trackRegex = /<td class="text mp"><div><a href="[^"]+">([^<]+)<\/a> - <a href="[^"]+">([^<]+)<\/a>/g;
        const searchQueries: string[] = [];
        let match;
        while ((match = trackRegex.exec(html)) !== null) {
          searchQueries.push(match[2].trim());
        }
        fetchTrendingTracks(searchQueries.slice(0, 50));
      } catch (e) {
        console.error('Failed to fetch kworb weekly chart:', e);
        if (isMounted) setTrendingTracks([]);
      }
    };

    if (!countryLoading && activeRegion && activeRegion !== 'your country') {
      const activeKey = activeRegion.toLowerCase();
      const regionKey = Object.keys(regionUrlMap).find(k => k.toLowerCase() === activeKey);
      if (regionKey && regionUrlMap[regionKey]) {
        fetchKworbWeekly(regionUrlMap[regionKey]);
      } else {
        const globalKey = Object.keys(regionUrlMap).find(k => k.toLowerCase() === 'global');
        if (globalKey && regionUrlMap[globalKey]) {
          fetchKworbWeekly(regionUrlMap[globalKey]);
        } else {
          if (isMounted) setTrendingTracks([]);
        }
      }
    } else {
      if (isMounted) setTrendingTracks([]);
    }
    return () => { isMounted = false; };
  }, [activeRegion, countryLoading, regionUrlMap, trendingCache]);

  const handleViewChange = (view: 'home' | 'search') => {
    setCurrentView(view);
    if (view === 'home') {
      clearResults();
    }
  };

  const handleSearchClick = () => {
    router.push('/search');
  };

  const handleSearchStart = () => {
    setCurrentView('search');
  };

  const saveFirstRunSetup = async () => {
    setIsSavingSetup(true);
    try {
      await AsyncStorage.setItem(REGION_OVERRIDE_KEY, setupRegion);
      await AsyncStorage.setItem(LANGUAGE_KEY, setupLanguage);
      await AsyncStorage.setItem(FIRST_RUN_SETUP_KEY, '1');
      await i18n.changeLanguage(setupLanguage);
      setMode(setupTheme);
      setRegionOverride(setupRegion);
      setShowFirstRunSetup(false);
    } catch (error) {
      console.error('Failed to save first run setup:', error);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleHomeTrackSelect = React.useCallback(
    (track: Track, trackList?: Track[], startIndex?: number) => {
      handleTrackSelect(track, trackList, startIndex);
      setRecentlyPlayedTracks((prev) => {
        const withoutCurrent = prev.filter((item) => item.id.toString() !== track.id.toString());
        return [track, ...withoutCurrent].slice(0, 30);
      });
    },
    [handleTrackSelect]
  );

  const handleShuffleLiked = React.useCallback(() => {
    if (likedTracks.length > 0) {
      const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
      handleTrackSelect(shuffled[0], shuffled, 0);
    }
  }, [likedTracks, handleTrackSelect]);

  const handleDownloadsNav = React.useCallback(() => {
    router.push('/downloads');
  }, [router]);

  const handleLibraryNav = React.useCallback(() => {
    router.push('/library');
  }, [router]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
      <TopBar
        currentView={currentView}
        onViewChange={handleViewChange}
        onSearchClick={handleSearchClick}
        onSearchStart={handleSearchStart}
        searchState={searchState}
      />
      <View style={styles.mainContent}>
        {currentView === 'home' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <GreetingHeader />
            <QuickActions
              onShuffleLiked={handleShuffleLiked}
              onDownloads={handleDownloadsNav}
              onLibrary={handleLibraryNav}
            />
            {trendingEnabled && (
              <HorizontalTrackList
                title={t('home.trending_in', { region: countryLoading ? '...' : (formattedActiveRegion || t('home.your_country')) })}
                tracks={trendingTracks}
                onTrackSelect={handleHomeTrackSelect}
                isPlaying={isPlaying}
                currentTrack={currentTrack}
              />
            )}
            {trendingEnabled && trendingTracks.length === 0 && !trendingDataLoading && (
              <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 24 }}>
                {t('home.loading_trending')}
              </Text>
            )}

            <View style={{ marginTop: 16 }}>
              <SectionHeader title={t('home.liked_songs')} onSeeAll={handleLibraryNav} />
              {likedTracks.length > 0 ? (
                <HorizontalTrackList
                  title=""
                  tracks={likedTracks}
                  onTrackSelect={handleHomeTrackSelect}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                />
              ) : (
                <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="heart-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {t('home.empty_liked')}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title={t('home.continue_listening')} />
              {recentlyPlayedTracks.length > 0 ? (
                <HorizontalTrackList
                  title=""
                  tracks={recentlyPlayedTracks.slice(0, 10)}
                  onTrackSelect={handleHomeTrackSelect}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                />
              ) : (
                <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="time-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {t('home.empty_recent')}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ height: 140 }} />
          </ScrollView>
        ) : (
          <></>
        )}
      </View>
      <Modal visible={showFirstRunSetup} transparent animationType="fade">
        <View style={styles.setupOverlay}>
          <View style={[styles.setupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.setupTitle, { color: theme.textPrimary }]}>Welcome to OpenSpot</Text>
            <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
              Set your preferences once. Trending loads in the background.
            </Text>

            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary }]}>Region</Text>
            <TouchableOpacity
              style={[styles.setupDropdownButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setIsRegionModalOpen(true)}
            >
              <Text style={[styles.setupDropdownButtonText, { color: theme.textPrimary }]}>
                {setupRegion === 'auto' ? 'Auto' : setupRegion}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary }]}>Language</Text>
            <TouchableOpacity
              style={[styles.setupDropdownButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setIsLanguageModalOpen(true)}
            >
              <Text style={[styles.setupDropdownButtonText, { color: theme.textPrimary }]}>
                {languageOptions.find((option) => option.value === setupLanguage)?.label || 'English'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary }]}>Theme</Text>
            <View style={styles.setupRow}>
              {[
                { label: t('components.theme_light'), value: 'light' as ThemeMode },
                { label: t('components.theme_dark'), value: 'dark' as ThemeMode },
                { label: t('components.theme_auto'), value: 'auto' as ThemeMode },
              ].map((themeOption) => {
                const active = setupTheme === themeOption.value;
                return (
                  <TouchableOpacity
                    key={`setup-theme-${themeOption.value}`}
                    style={[
                      styles.setupSegment,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSetupTheme(themeOption.value)}
                  >
                    <Text style={[styles.setupSegmentText, { color: active ? '#fff' : theme.textSecondary }]}>{themeOption.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.setupContinueButton, { backgroundColor: theme.accent }]}
              onPress={saveFirstRunSetup}
              disabled={isSavingSetup}
            >
              {isSavingSetup ? <ActivityIndicator color="#fff" /> : <Text style={styles.setupContinueText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isLanguageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageModalOpen(false)}
      >
        <View style={styles.setupModalOverlay}>
          <View style={[styles.setupLanguageModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>Language</Text>
            <FlatList
              data={languageOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const active = setupLanguage === item.value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.setupLanguageOptionRow,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { borderColor: theme.accent },
                    ]}
                    onPress={() => {
                      setSetupLanguage(item.value);
                      setIsLanguageModalOpen(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.setupLanguageOptionTitle, { color: theme.textPrimary }]}>{item.label}</Text>
                      <Text style={[styles.setupLanguageOptionSubtitle, { color: theme.textSecondary }]}>{item.nativeLabel}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
            <TouchableOpacity style={styles.setupCancelButtonRow} onPress={() => setIsLanguageModalOpen(false)}>
              <Text style={{ color: theme.textPrimary, fontSize: 15 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRegionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRegionModalOpen(false)}
      >
        <View style={styles.setupModalOverlay}>
          <View style={[styles.setupLanguageModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>Region</Text>
            <FlatList
              data={['auto', ...Object.keys(regionUrlMap)]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = setupRegion === item;
                const label = item === 'auto' ? 'Auto' : item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.setupLanguageOptionRow,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { borderColor: theme.accent },
                    ]}
                    onPress={() => {
                      setSetupRegion(item);
                      setIsRegionModalOpen(false);
                    }}
                  >
                    <Text style={[styles.setupLanguageOptionTitle, { color: theme.textPrimary }]}>{label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
            <TouchableOpacity style={styles.setupCancelButtonRow} onPress={() => setIsRegionModalOpen(false)}>
              <Text style={{ color: theme.textPrimary, fontSize: 15 }}>Close</Text>
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
  mainContent: {
    paddingTop: 10,
    flex: 1,
  },
  setupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  setupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  setupSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  setupSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  setupWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setupChip: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  setupChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  setupSegment: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  setupSegmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  setupDropdownButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setupDropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  setupLanguageModalCard: {
    width: '88%',
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  setupLanguageOptionRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setupLanguageOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupLanguageOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  setupCancelButtonRow: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  setupContinueButton: {
    marginTop: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  setupContinueText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 22,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
  },
  emptyBox: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
});
