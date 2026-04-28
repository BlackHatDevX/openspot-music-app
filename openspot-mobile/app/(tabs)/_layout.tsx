import React, { useMemo, useState, createContext, useRef, useEffect } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Player } from '@/components/Player';
import { QueueDisplay } from '@/components/QueueDisplay';
import { useMusicQueue } from '@/hooks/useMusicQueue';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Track } from '@/types/music';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusicAPI } from '@/lib/music-api';
import { useTranslation } from 'react-i18next';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OfflineBanner } from '@/components/OfflineBanner';

interface MusicPlayerContextType {
  musicQueue: ReturnType<typeof useMusicQueue>;
  isPlaying: boolean;
  currentTrack: Track | null;
  handleTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  handleQueueTrackSelect: (track: Track, index: number) => void;
  handlePlayingStateChange: (playing: boolean) => void;
  toggleQueue: () => void;
}

export const MusicPlayerContext = createContext<MusicPlayerContextType>({
  musicQueue: {} as ReturnType<typeof useMusicQueue>,
  isPlaying: false,
  currentTrack: null,
  handleTrackSelect: () => {},
  handleQueueTrackSelect: () => {},
  handlePlayingStateChange: () => {},
  toggleQueue: () => {},
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const musicQueue = useMusicQueue();
  const likedSongs = useLikedSongs();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const pendingPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isOffline } = useConnectivity();
  const router = useRouter();
  const pathname = usePathname();
  const tabTheme = useMemo(
    () => ({
      background: isDark ? '#121212' : '#fffaf2',
      border: isDark ? '#272727' : '#e4d5c5',
      active: isDark ? '#1DB954' : '#167c3a',
      inactive: isDark ? '#9a9a9a' : '#7a6251',
      safeArea: isDark ? '#050505' : '#f5efe6',
    }),
    [isDark]
  );

  const handleTrackSelect = (track: Track, trackList?: Track[], startIndex?: number) => {
    if (pendingPlayTimeoutRef.current) {
      clearTimeout(pendingPlayTimeoutRef.current);
      pendingPlayTimeoutRef.current = null;
    }

    if (musicQueue.currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (trackList && startIndex !== undefined) {
      musicQueue.setQueueTracks(trackList, startIndex);
    } else {
      musicQueue.setQueueTracks([track], 0);
    }
    void MusicAPI.addToRecentlyPlayed(track);
    setIsPlaying(true);
  };

  const handleQueueTrackSelect = (track: Track, index: number) => {
    musicQueue.setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handlePlayingStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  const closeQueue = () => {
    setIsQueueOpen(false);
  };

  useEffect(() => {
    if (!isOffline) return;
    // If user loses internet anywhere, force them into Downloads.
    // Also stop autoplay to avoid endless buffering.
    setIsPlaying(false);
    if (!pathname?.includes('/downloads')) {
      router.replace('/downloads');
    }
  }, [isOffline, pathname, router]);

  return (
    <MusicPlayerContext.Provider
      value={{
        musicQueue,
        isPlaying,
        currentTrack: musicQueue.currentTrack ?? null,
        handleTrackSelect,
        handleQueueTrackSelect,
        handlePlayingStateChange,
        toggleQueue,
      }}
    >
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: tabTheme.safeArea }}>
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
                height: 64 + insets.bottom, 
                paddingBottom: insets.bottom, 
              },
              tabBarLabelStyle: {
                paddingBottom: 8, 
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: t('tabs.home'),
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="house.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: t('tabs.search'),
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="magnifyingglass" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: t('tabs.library'),
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="books.vertical.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="downloads"
              options={{
                title: t('tabs.downloads'),
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="arrow.down.circle.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="update"
              options={{
                title: t('settings.settings'),
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="gearshape.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="media/[type]/[id]"
              options={{
                href: null,
              }}
            />
          </Tabs>
          {isQueueOpen && (
            <QueueDisplay
              isOpen={isQueueOpen}
              onClose={closeQueue}
              musicQueue={musicQueue}
              onTrackSelect={handleQueueTrackSelect}
              currentTrack={musicQueue.currentTrack}
            />
          )}
          {musicQueue.currentTrack && (
            <View style={{ 
              position: 'absolute', 
              left: 0, 
              right: 0, 
              bottom: 64 + insets.bottom, 
              zIndex: 100 
            }}>
              <Player
                track={musicQueue.currentTrack}
                isPlaying={isPlaying}
                onPlayingChange={handlePlayingStateChange}
                musicQueue={musicQueue}
                onQueueToggle={toggleQueue}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </MusicPlayerContext.Provider>
  );
}
