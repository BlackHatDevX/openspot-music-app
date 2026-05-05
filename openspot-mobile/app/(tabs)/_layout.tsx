import React, { useMemo, useState, createContext, useRef, useEffect } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Player } from '@/components/Player';
import { QueueDisplay } from '@/components/QueueDisplay';
import { useMusicQueue } from '@/hooks/useMusicQueue';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Track } from '@/types/music';
import { View, Modal, Text, TouchableOpacity, StyleSheet, Linking, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusicAPI } from '@/lib/music-api';
import { useTranslation } from 'react-i18next';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useApiStatus } from '@/hooks/useApiStatus';
import { useToast } from '@/hooks/useToast';

interface PlatformUpdateConfig {
  latest_version: string;
  min_supported_version: string;
  force_update: boolean;
  changelog: Record<string, string[]>;
  release_url: string;
}

interface UpdateConfig {
  android: PlatformUpdateConfig;
  ios: PlatformUpdateConfig;
}

const UPDATE_CONFIG_URL = 'https://raw.githubusercontent.com/BlackHatDevX/openspot-config/refs/heads/main/update-mobile.json';

interface MusicPlayerContextType {
  musicQueue: ReturnType<typeof useMusicQueue>;
  isPlaying: boolean;
  currentTrack: Track | null;
  handleTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  handleQueueTrackSelect: (track: Track, index: number) => void;
  handlePlayingStateChange: (playing: boolean) => void;
  toggleQueue: () => void;
  setPendingAutoPlay: () => void;
}

export const MusicPlayerContext = createContext<MusicPlayerContextType>({
  musicQueue: {} as ReturnType<typeof useMusicQueue>,
  isPlaying: false,
  currentTrack: null,
  handleTrackSelect: () => {},
  handleQueueTrackSelect: () => {},
  handlePlayingStateChange: () => {},
  toggleQueue: () => {},
  setPendingAutoPlay: () => {},
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const musicQueue = useMusicQueue();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const pendingPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isOffline } = useConnectivity();
  const router = useRouter();
  const pathname = usePathname();
  const { isProviderDisabled } = useApiStatus();
  const { toastMessage, toastType, showToast } = useToast();

  const isIOS = Platform.OS === 'ios';
  const tabTheme = useMemo(
    () => ({
      background: isDark ? '#121212' : '#fffaf2',
      border: isDark ? '#272727' : '#e4d5c5',
      active: isDark ? (isIOS ? '#038434' : '#1DB954') : '#167c3a',
      inactive: isDark ? (isIOS ? '#646464' : '#9a9a9a') : '#7a6251',
      safeArea: isDark ? '#050505' : '#f5efe6',
    }),
    [isDark, isIOS]
  );

  const [updateConfig, setUpdateConfig] = useState<UpdateConfig | null>(null);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const currentVersion = Constants.expoConfig?.version ?? '3.1.4';

  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  };

  const platformUpdateConfig = updateConfig
    ? (Platform.OS === 'ios' ? updateConfig.ios : updateConfig.android)
    : null;

  useEffect(() => {
    const checkUpdateOnStart = async () => {
      try {
        const res = await fetch(UPDATE_CONFIG_URL);
        const data: UpdateConfig = await res.json();
        setUpdateConfig(data);

        const platformConfig = Platform.OS === 'ios' ? data.ios : data.android;

        const isSupported = compareVersions(currentVersion, platformConfig.min_supported_version) >= 0;
        const hasUpdate = compareVersions(platformConfig.latest_version, currentVersion) > 0;

        if (!isSupported || (platformConfig.force_update && hasUpdate)) {
          setShowForceUpdate(true);
        }
      } catch (error) {
        console.error('Auto update check failed:', error);
      }
    };
    void checkUpdateOnStart();
  }, [currentVersion]);

  const pendingAutoPlayRef = useRef(false);

  const setPendingAutoPlay = () => {
    pendingAutoPlayRef.current = true;
  };

  const currentTrack = useMemo(
    () => musicQueue.tracks[musicQueue.currentIndex] ?? null,
    [musicQueue.tracks, musicQueue.currentIndex]
  );

  const handleTrackSelect = (track: Track, trackList?: Track[], startIndex?: number) => {
    const trackProvider = track.provider || 'saavn';
    if (isProviderDisabled(trackProvider as 'saavn' | 'ytmusic')) {
      showToast('Currently API is down. Please use Saavn.', 'error');
      return;
    }

    if (pendingPlayTimeoutRef.current) {
      clearTimeout(pendingPlayTimeoutRef.current);
      pendingPlayTimeoutRef.current = null;
    }

    const isSameTrack = currentTrack?.id === track.id;
    const isSameQueue = trackList
      ? trackList.length === musicQueue.tracks.length &&
        trackList[startIndex ?? 0]?.id === track.id &&
        musicQueue.currentIndex === (startIndex ?? 0)
      : true;

    if (isSameTrack && isSameQueue) {
      pendingAutoPlayRef.current = !isPlaying;
      setIsPlaying(prev => !prev);
      return;
    }


    setIsPlaying(false);

    pendingAutoPlayRef.current = true;

    if (trackList && startIndex !== undefined) {
      musicQueue.setQueueTracks(trackList, startIndex);
    } else {
      musicQueue.setQueueTracks([track], 0);
    }

    void MusicAPI.addToRecentlyPlayed(track);
    setTimeout(() => {
      setIsPlaying(true);
    }, 0);
  };

  const handleQueueTrackSelect = (track: Track, index: number) => {
    const trackProvider = track.provider || 'saavn';
    if (isProviderDisabled(trackProvider as 'saavn' | 'ytmusic')) {
      showToast('Currently API is down. Please use Saavn.', 'error');
      return;
    }

    const isSameTrack = currentTrack?.id === track.id;
    if (isSameTrack) {
      setIsPlaying(prev => !prev);
      return;
    }
    setIsPlaying(false);
    pendingAutoPlayRef.current = true;
    musicQueue.setCurrentIndex(index);
    setTimeout(() => {
      setIsPlaying(true);
    }, 0);
  };

  const handlePlayingStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const toggleQueue = () => {
    setIsQueueOpen(prev => !prev);
  };

  const closeQueue = () => {
    setIsQueueOpen(false);
  };

  useEffect(() => {
    if (!isOffline) return;
    if (!pathname?.includes('/downloads')) {
      router.replace('/downloads');
    }
  }, [isOffline, pathname, router]);

  return (
    <MusicPlayerContext.Provider
      value={{
        musicQueue,
        isPlaying,
        currentTrack,
        handleTrackSelect,
        handleQueueTrackSelect,
        handlePlayingStateChange,
        toggleQueue,
        setPendingAutoPlay,
      }}
    >
      <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: tabTheme.safeArea }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {isOffline && !pathname?.includes('/downloads') && <OfflineBanner />}
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: tabTheme.active,
              tabBarInactiveTintColor: tabTheme.inactive,
              headerShown: false,
              tabBarButton: HapticTab,
              tabBarBackground: TabBarBackground,
              tabBarStyle: {
                backgroundColor: tabTheme.background,
                borderTopWidth: 1,
                borderTopColor: tabTheme.border,
                // height: insets.bottom,
              },
              tabBarLabelStyle: {
                paddingBottom: 0,
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: t('tabs.home'),
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: t('tabs.search'),
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: t('tabs.library'),
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="books.vertical.fill" color={color} />,
              }}
            />
            <Tabs.Screen
              name="downloads"
              options={{
                title: t('tabs.downloads'),
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.down.circle.fill" color={color} />,
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: t('settings.settings'),
                tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
              }}
            />
            <Tabs.Screen
              name="media/[type]/[id]"
              options={{ href: null }}
            />
          </Tabs>

          {isQueueOpen && (
            <QueueDisplay
              isOpen={isQueueOpen}
              onClose={closeQueue}
              musicQueue={musicQueue}
              onTrackSelect={handleQueueTrackSelect}
              currentTrack={currentTrack}
            />
          )}

          {currentTrack && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 50 + insets.bottom,
                zIndex: 100,
              }}
            >
              <Player
                track={currentTrack}
                isPlaying={isPlaying}
                onPlayingChange={handlePlayingStateChange}
                musicQueue={musicQueue}
                onQueueToggle={toggleQueue}
                pendingAutoPlayRef={pendingAutoPlayRef}
                showToast={showToast}
              />
            </View>
          )}
        </View>

        {/* Force Update Modal */}
        <Modal visible={showForceUpdate} transparent animationType="fade">
          <View style={styles.forceUpdateOverlay}>
            <View style={[styles.forceUpdateCard, { backgroundColor: isDark ? '#121212' : '#fffaf2', borderColor: isDark ? '#272727' : '#e4d5c5' }]}>
              <Ionicons name="warning" size={48} color="#ff4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={[styles.forceUpdateTitle, { color: isDark ? '#fff' : '#2d2219' }]}>
                {platformUpdateConfig && compareVersions(currentVersion, platformUpdateConfig.min_supported_version) < 0
                  ? 'Update Required'
                  : 'Update Available'}
              </Text>
              <Text style={[styles.forceUpdateText, { color: isDark ? '#a9a9a9' : '#7a6251' }]}>
                {platformUpdateConfig && compareVersions(currentVersion, platformUpdateConfig.min_supported_version) < 0
                  ? `Your version (v${currentVersion}) is no longer supported. Minimum required: v${platformUpdateConfig.min_supported_version}`
                  : `A new version (v${platformUpdateConfig?.latest_version}) is available. Please update to continue.`}
              </Text>
              {platformUpdateConfig?.changelog && platformUpdateConfig.changelog[platformUpdateConfig.latest_version] && (
                <ScrollView style={[styles.changelogBox, { backgroundColor: isDark ? '#1b1b1b' : '#efe4d6' }]}>
                  <Text style={[styles.changelogTitle, { color: isDark ? '#fff' : '#2d2219' }]}>What&apos;s New:</Text>
                  {platformUpdateConfig.changelog[platformUpdateConfig.latest_version].map((item, idx) => (
                    <Text key={idx} style={[styles.changelogItem, { color: isDark ? '#a9a9a9' : '#7a6251' }]}>
                      • {item}
                    </Text>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={[styles.updateButton, { backgroundColor: '#ff4444' }]}
                onPress={() => Linking.openURL(platformUpdateConfig?.release_url || 'https://github.com/BlackHatDevX/openspot-music-app/releases')}
              >
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {toastMessage && (
          <View style={[styles.toastContainer, { backgroundColor: toastType === 'error' ? '#ff4444' : '#1DB954' }]}>
            <Ionicons name={toastType === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#fff" style={styles.toastIcon} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </SafeAreaView>
    </MusicPlayerContext.Provider>
  );
}

const styles = StyleSheet.create({
  forceUpdateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  forceUpdateCard: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  forceUpdateTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  forceUpdateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  changelogBox: {
    width: '100%',
    maxHeight: 150,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  changelogTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  changelogItem: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  updateButton: {
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 65,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});