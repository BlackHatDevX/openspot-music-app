import React, { useState, createContext } from 'react';
import { Tabs } from 'expo-router';
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
  const musicQueue = useMusicQueue();
  const likedSongs = useLikedSongs();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const insets = useSafeAreaInsets();

  const handleTrackSelect = (track: Track, trackList?: Track[], startIndex?: number) => {
    if (musicQueue.currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
      return;
    }
    setIsPlaying(false);
    if (trackList && startIndex !== undefined) {
      musicQueue.setQueueTracks(trackList, startIndex);
    } else {
      musicQueue.setQueueTracks([track], 0);
    }
    setTimeout(() => {
      setIsPlaying(true);
    }, 100);
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
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, position: 'relative' }}>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: '#fff',
              headerShown: false,
              tabBarButton: HapticTab,
              tabBarBackground: TabBarBackground,
              tabBarStyle: {
                backgroundColor: '#000', 
                borderTopWidth: 0,
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
                title: 'Home',
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="house.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: 'Search',
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="magnifyingglass" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: 'Library',
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="books.vertical.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="downloads"
              options={{
                title: 'Downloads',
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="arrow.down.circle.fill" color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="update"
              options={{
                title: 'Update',
                tabBarIcon: ({ color }) => (
                  <IconSymbol size={28} name="checkmark.shield.fill" color={color} />
                ),
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
