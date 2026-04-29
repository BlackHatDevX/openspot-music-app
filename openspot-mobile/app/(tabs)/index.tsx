import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, StatusBar, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
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
import { useRouter , useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { COUNTRY_NAMES } from '@/constants/countryNames';
import { useTranslation } from 'react-i18next';
import { useThemeMode, ThemeMode } from '@/hooks/theme-mode';
import { useConnectivity } from '@/hooks/useConnectivity';

const TRENDING_URL = 'https://raw.githubusercontent.com/BlackHatDevX/openspot-config/refs/heads/main/trending.json';
const TRENDING_TRACKS_CACHE_KEY = 'TRENDING_TRACKS_CACHE_V1';
const REGION_OVERRIDE_KEY = 'openspot_region_override_v1';
const LANGUAGE_KEY = 'openspot_language_v1';
const FIRST_RUN_SETUP_KEY = 'openspot_first_run_setup_done_v1';
const TRENDING_ENABLED_KEY = 'openspot_trending_enabled_v1';

type TrendingDataType = Record<string, string[]>;

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
  const [trendingData, setTrendingData] = useState<TrendingDataType | null>(null);
  const [trendingDataLoading, setTrendingDataLoading] = useState(true);
  const [trendingCache, setTrendingCache] = useState<Record<string, Track>>({});
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState<Track[]>([]);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false);
  const [setupRegion, setSetupRegion] = useState<string>('auto');
  const [setupLanguage, setSetupLanguage] = useState<string>('en');
  const [setupTheme, setSetupTheme] = useState<ThemeMode>(mode);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const { isOffline } = useConnectivity();
  const wasOfflineRef = React.useRef(false);
  const [trendingEnabled, setTrendingEnabled] = useState<boolean>(true);

  
  useEffect(() => {
    (async () => {
      try {
        const cacheStr = await AsyncStorage.getItem(TRENDING_TRACKS_CACHE_KEY);
        if (cacheStr) {
          setTrendingCache(JSON.parse(cacheStr));
        }
      } catch (e) {
        console.error('Failed to load trending tracks cache:', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(FIRST_RUN_SETUP_KEY);
        if (!done) {
          setShowFirstRunSetup(true);
        }
      } catch {
        setShowFirstRunSetup(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TRENDING_ENABLED_KEY);
        if (stored !== null) {
          setTrendingEnabled(stored === 'true');
        }
      } catch (e) {
        console.error('Failed to load trending setting:', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedRegion = await AsyncStorage.getItem(REGION_OVERRIDE_KEY);
        if (storedRegion && storedRegion.trim()) {
          setRegionOverride(storedRegion);
        }
      } catch (e) {
        console.error('Failed to load region override:', e);
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
        setTrendingDataLoading(true);
        const res = await fetch(TRENDING_URL);
        const data = await res.json();
        setTrendingData(data);
      } catch (e) {
        console.error('Trending data fetch error:', e);
        setTrendingData(null);
      } finally {
        setTrendingDataLoading(false);
      }
    })();
  }, []);

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
    if (!countryLoading && !trendingDataLoading && trendingData && activeRegion && activeRegion !== 'your country') {
      if (activeRegion.toLowerCase() === 'global' && trendingData.global) {
        fetchTrendingTracks(trendingData.global);
        return () => { isMounted = false; };
      }

      const activeRegionKey = activeRegion.toLowerCase();
      const trendingKey = Object.keys(trendingData).find(
        k => k.toLowerCase() === activeRegionKey
      );
      if (trendingKey && trendingData[trendingKey]) {
        fetchTrendingTracks(trendingData[trendingKey]);
      } else if (trendingData.global) {
        fetchTrendingTracks(trendingData.global);
      } else {
        setTrendingTracks([]);
      }
    } else {
      setTrendingTracks([]);
    }
    return () => { isMounted = false; };
  }, [activeRegion, countryLoading, trendingData, trendingDataLoading, trendingCache]);

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

  // eslint-disable-next-line react/display-name
  const renderRecentTrackItem = (tracks: Track[]) => ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.recentTrackItem,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isCurrentTrack && [styles.currentTrackItem, { borderColor: theme.accent }],
        ]}
        onPress={() => handleHomeTrackSelect(item, tracks, index)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.recentAlbumCover}
          contentFit="cover"
        />
        <View style={styles.recentTrackInfo}>
          <Text style={[styles.recentTrackTitle, { color: theme.textPrimary }, isCurrentTrack && { color: theme.accent }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.recentTrackArtist, { color: theme.textSecondary }, isCurrentTrack && { color: theme.accent }]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surfaceElevated }]}
          onPress={() => handleHomeTrackSelect(item, tracks, index)}
        >
          <Ionicons
            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
            size={20}
            color={isCurrentTrack ? theme.accent : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surfaceElevated, marginLeft: 8 }]}
          onPress={() => musicQueue.addToQueue(item)}
        >
          <Ionicons
            name="add"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  renderRecentTrackItem.displayName = 'renderRecentTrackItem';

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
            <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.heroEyebrow, { color: theme.accent }]}>{t('home.for_you')}</Text>
              <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>{t('home.daily_mix_ready')}</Text>
              <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                {t('home.daily_mix_subtitle')}
              </Text>
            </View>
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
            {likedTracks.length > 0 ? (
              <HorizontalTrackList
                title={t('home.liked_songs')}
                tracks={likedTracks}
                onTrackSelect={handleHomeTrackSelect}
                isPlaying={isPlaying}
                currentTrack={currentTrack}
              />
            ) : (
              <View style={styles.emptyLikedSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('home.liked_songs')}</Text>
                <View style={[styles.emptyLikedBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="heart-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyLikedText, { color: theme.textSecondary }]}>
                    {t('home.empty_liked')}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('home.recently_played')}</Text>
              {recentlyPlayedTracks.length === 0 ? (
                <View style={[styles.emptyRecentBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="time-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyRecentText, { color: theme.textSecondary }]}>
                    {t('home.empty_recent')}
                  </Text>
                </View>
              ) : (
                recentlyPlayedTracks.slice(0, 12).map((item, index) => (
                  <View key={`recent-${item.id}-${index}`}>{renderRecentTrackItem(recentlyPlayedTracks)({ item, index })}</View>
                ))
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
            <View style={styles.setupWrap}>
              {['auto', ...Object.keys(trendingData || {})].slice(0, 12).map((option) => {
                const active = setupRegion === option;
                const label =
                  option === 'auto'
                    ? 'Auto'
                    : option
                        .split(' ')
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ');
                return (
                  <TouchableOpacity
                    key={`setup-region-${option}`}
                    style={[
                      styles.setupChip,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSetupRegion(option)}
                  >
                    <Text style={[styles.setupChipText, { color: active ? '#fff' : theme.textSecondary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary }]}>Language</Text>
            <View style={styles.setupRow}>
              {[
                { label: 'English', value: 'en' },
                { label: 'Hindi', value: 'hi' },
              ].map((lang) => {
                const active = setupLanguage === lang.value;
                return (
                  <TouchableOpacity
                    key={`setup-lang-${lang.value}`}
                    style={[
                      styles.setupSegment,
                      { borderColor: theme.border, backgroundColor: theme.surfaceElevated },
                      active && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSetupLanguage(lang.value)}
                  >
                    <Text style={[styles.setupSegmentText, { color: active ? '#fff' : theme.textSecondary }]}>{lang.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.setupSectionTitle, { color: theme.textPrimary }]}>Theme</Text>
            <View style={styles.setupRow}>
              {[
                { label: 'components.theme_light', value: 'light' as ThemeMode },
                { label: 'components.theme_dark', value: 'dark' as ThemeMode },
                { label: 'components.theme_auto', value: 'auto' as ThemeMode },
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
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 16,
    marginTop: 10,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  recentSection: {
    marginTop: 6,
    paddingHorizontal: 8,
  },
  recentTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 8,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
  },
  currentTrackItem: {
    borderWidth: 1.5,
  },
  recentAlbumCover: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 10,
  },
  recentTrackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  recentTrackTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  recentTrackArtist: {
    fontSize: 13,
  },
  actionButton: {
    padding: 10,
    borderRadius: 18,
  },
  emptyRecentBox: {
    marginHorizontal: 8,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyRecentText: {
    marginTop: 8,
    fontSize: 13,
  },
  emptyLikedSection: {
    marginTop: 6,
  },
  emptyLikedBox: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyLikedText: {
    marginTop: 8,
    fontSize: 13,
  },
});
