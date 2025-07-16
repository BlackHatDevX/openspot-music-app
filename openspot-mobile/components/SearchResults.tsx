import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useTranslation } from 'react-i18next';

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Track[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  searchTracks: (searchQuery: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

interface SearchResultsProps {
  searchState: UseSearchReturn;
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  isPlaying: boolean;
  currentTrack: Track | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SearchResults({
  searchState,
  onTrackSelect,
  isPlaying,
  currentTrack,
}: SearchResultsProps) {
  const { results, isLoading, error, hasMore, loadMore, query } = searchState;
  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const isTrackLiked = isLiked(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isCurrentTrack && styles.currentTrackItem,
        ]}
        onPress={() => onTrackSelect(item, results, index)}
      >
        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.albumCover}
          contentFit="cover"
        />

        <View style={styles.trackInfo}>
          <Text
            style={[
              styles.trackTitle,
              isCurrentTrack && styles.currentTrackText,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.trackArtist,
              isCurrentTrack && styles.currentTrackText,
            ]}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
          <Text style={styles.trackDuration}>
            {MusicAPI.formatDuration(item.duration)}
          </Text>
        </View>

        <View style={styles.trackActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item)}
          >
            <Ionicons
              name={isTrackLiked ? "heart" : "heart-outline"}
              size={20}
              color={isTrackLiked ? "#1DB954" : "#888"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onTrackSelect(item, results, index)}
          >
            <Ionicons
              name={isCurrentTrack && isPlaying ? "pause" : "play"}
              size={20}
              color={isCurrentTrack ? "#1DB954" : "#888"}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#1DB954" />
        <Text style={styles.loadingText}>{t('search_results_loading_more')}</Text>
      </View>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  };

  if (isLoading && results.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>{t('search_results_loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ff4444" />
        <Text style={styles.errorText}>{t('search_results_error_title')}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  if (results.length === 0 && query.trim()) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color="#888" />
        <Text style={styles.emptyText}>{t('search_results_empty_title')}</Text>
        <Text style={styles.emptySubtext}>{t('search_results_empty_subtitle')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContainer: {
    paddingVertical: 8,
    paddingBottom: 180, // Space for music player + 2 items
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginVertical: 2,
  },
  currentTrackItem: {
    backgroundColor: '#1a1a1a',
  },
  albumCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  trackDuration: {
    fontSize: 12,
    color: '#666',
  },
  currentTrackText: {
    color: '#1DB954',
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  playingIndicator: {
    marginLeft: 8,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
}); 