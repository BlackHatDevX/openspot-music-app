import React, { useContext, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearch } from '@/hooks/useSearch';
import { TopBar } from '@/components/TopBar';
import { SearchResults } from '@/components/SearchResults';
import { MusicPlayerContext } from './_layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchScreen() {
  const searchState = useSearch();
  const { handleTrackSelect, musicQueue, isPlaying, currentTrack } = useContext(MusicPlayerContext);
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const background = isDark ? '#050505' : '#f5efe6';
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.q && typeof params.q === 'string') {
      searchState.setQuery(params.q);
      if (params.type && typeof params.type === 'string') {
        searchState.setSearchType(params.type as 'track' | 'album' | 'artist' | 'playlist');
      }
      searchState.searchTracks(params.q, params.type as 'track' | 'album' | 'artist' | 'playlist');
    }
  }, [params, searchState]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={background} translucent={false} />
      <TopBar
        currentView="search"
        onViewChange={() => {}}
        onSearchClick={() => {}}
        onSearchStart={() => {}}
        searchState={searchState}
        placeholderFontSize={SCREEN_WIDTH > 400 ? 18 : 15}
      />
      <View style={styles.mainContent}>
        <SearchResults
          searchState={searchState}
          onTrackSelect={handleTrackSelect}
          onAddToQueue={musicQueue.addToQueue}
          isPlaying={isPlaying}
          currentTrack={currentTrack}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    paddingTop: 16,
    flex: 1,
    paddingHorizontal: 2,
  },
});
