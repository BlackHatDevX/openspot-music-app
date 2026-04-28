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

import { Track, Album, Artist, PlaylistSearchItem } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: PlaylistSearchItem[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  searchType: 'track' | 'album' | 'artist' | 'playlist';
  searchTracks: (searchQuery: string, type?: 'track' | 'album' | 'artist' | 'playlist') => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

interface SearchResultsProps {
  searchState: UseSearchReturn;
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  onAddToQueue?: (track: Track) => void;
  isPlaying: boolean;
  currentTrack: Track | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SearchResults({
  searchState,
  onTrackSelect,
  onAddToQueue,
  isPlaying,
  currentTrack,
}: SearchResultsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { t } = useTranslation();
  const theme = {
    background: isDark ? '#050505' : '#f5efe6',
    surface: isDark ? '#121212' : '#fffaf2',
    surfaceAlt: isDark ? '#1a1a1a' : '#efe4d6',
    textPrimary: isDark ? '#fff' : '#2d2219',
    textSecondary: isDark ? '#888' : '#7a6251',
    border: isDark ? '#272727' : '#e4d5c5',
    accent: isDark ? '#1DB954' : '#167c3a',
  };
  const router = useRouter();
  const { results, albums, artists, playlists, isLoading, error, hasMore, loadMore, query, searchType } = searchState;
  const { isLiked, toggleLike } = useLikedSongs();
  const displayData =
    searchType === 'track'
      ? results
      : searchType === 'album'
      ? albums
      : searchType === 'artist'
      ? artists
      : playlists;

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const isTrackLiked = isLiked(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isCurrentTrack && [styles.currentTrackItem, { borderColor: theme.accent }],
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
              { color: theme.textPrimary },
              isCurrentTrack && [styles.currentTrackText, { color: theme.accent }],
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.trackArtist,
              { color: theme.textSecondary },
              isCurrentTrack && [styles.currentTrackText, { color: theme.accent }],
            ]}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
          <Text style={[styles.trackDuration, { color: theme.textSecondary }]}>
            {MusicAPI.formatDuration(item.duration / 1000)}
          </Text>
        </View>

        <View style={styles.trackActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAddToQueue?.(item)}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item)}
          >
            <Ionicons
              name={isTrackLiked ? "heart" : "heart-outline"}
              size={20}
              color={isTrackLiked ? theme.accent : theme.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onTrackSelect(item, results, index)}
          >
            <Ionicons
              name={isCurrentTrack && isPlaying ? "pause" : "play"}
              size={20}
              color={isCurrentTrack ? theme.accent : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAlbumItem = ({ item }: { item: Album }) => {
    const primaryArtist = item.artists.primary[0]?.name || 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.albumItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() =>
          router.push({
            pathname: '/media/[type]/[id]',
            params: {
              type: 'album',
              id: item.id,
              title: item.name,
              image: MusicAPI.getOptimalImage(item.images),
              from: '/search',
            },
          })
        }
      >
        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.albumCoverLarge}
          contentFit="cover"
        />
        <View style={styles.albumInfo}>
          <Text style={[styles.albumName, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.albumArtist, { color: theme.textSecondary }]} numberOfLines={1}>
            {primaryArtist}
          </Text>
          <Text style={[styles.albumYear, { color: theme.textSecondary }]}>
            {item.year || ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderArtistItem = ({ item }: { item: Artist }) => {
    return (
      <TouchableOpacity
        style={[styles.albumItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() =>
          router.push({
            pathname: '/media/[type]/[id]',
            params: {
              type: 'artist',
              id: item.id,
              title: item.name,
              image: MusicAPI.getOptimalImage(item.images),
              from: '/search',
            },
          })
        }
      >
        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.albumCoverLarge}
          contentFit="cover"
        />
        <View style={styles.albumInfo}>
          <Text style={[styles.albumName, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.albumArtist, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.role || t('components.artist')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlaylistItem = ({ item }: { item: PlaylistSearchItem }) => {
    return (
      <TouchableOpacity
        style={[styles.albumItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() =>
          router.push({
            pathname: '/media/[type]/[id]',
            params: {
              type: 'playlist',
              id: item.id,
              title: item.name,
              image: MusicAPI.getOptimalImage(item.images),
              from: '/search',
            },
          })
        }
      >
        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.albumCoverLarge}
          contentFit="cover"
        />
        <View style={styles.albumInfo}>
          <Text style={[styles.albumName, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.albumArtist, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.songCount ? `${item.songCount} ${t('components.songs')}` : t('components.playlist')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#1DB954" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('components.loading_more')}</Text>
      </View>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  };

  if (isLoading && displayData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('components.searching')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ff4444" />
        <Text style={styles.errorText}>{t('components.search_error')}</Text>
        <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  if (displayData.length === 0 && query.trim()) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textPrimary }]}>{t('components.no_results')}</Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('components.try_searching')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={displayData as any[]}
        key={`search-${searchType}`}
        listKey={`search-${searchType}`}
        renderItem={
          searchType === 'track'
            ? (renderTrackItem as any)
            : searchType === 'album'
            ? (renderAlbumItem as any)
            : searchType === 'artist'
            ? (renderArtistItem as any)
            : (renderPlaylistItem as any)
        }
        keyExtractor={(item, index) => `${searchType}-${item.id?.toString?.() ?? 'unknown'}-${index}`}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={searchType === 'track' ? styles.listContainer : styles.albumListContainer}
        numColumns={searchType === 'track' ? 1 : 2}
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
    paddingBottom: 180,
  },
  albumListContainer: {
    paddingVertical: 8,
    paddingBottom: 180,
    paddingHorizontal: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
  },
  currentTrackItem: {},
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
  albumItem: {
    flex: 1,
    margin: 4,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  albumCoverLarge: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    marginBottom: 8,
  },
  albumInfo: {
    paddingHorizontal: 4,
  },
  albumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  albumYear: {
    fontSize: 11,
    color: '#666',
  },
}); 