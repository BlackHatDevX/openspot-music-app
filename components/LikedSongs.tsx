import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useTranslation } from 'react-i18next';

interface LikedSongsProps {
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  isPlaying: boolean;
  currentTrack: Track | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function LikedSongs({
  onTrackSelect,
  isPlaying,
  currentTrack,
}: LikedSongsProps) {
  const { likedSongs, isLoading, toggleLike, getLikedSongsAsTrack } = useLikedSongs();
  const scrollY = useRef(new Animated.Value(0)).current;

  const likedTracks = getLikedSongsAsTrack();
  const { t } = useTranslation();

  // Animation values for header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [200, 0],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isCurrentTrack && styles.currentTrackItem,
        ]}
        onPress={() => onTrackSelect(item, likedTracks, index)}
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
              name="heart"
              size={20}
              color="#1DB954"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onTrackSelect(item, likedTracks, index)}
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

  const renderHeader = () => (
    <Animated.View style={[
      styles.header,
      {
        height: headerHeight,
        opacity: headerOpacity,
        transform: [{ scale: headerScale }],
      }
    ]}>
      <LinearGradient
        colors={['#7C3AED', '#2563EB', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="heart" size={80} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Liked Songs</Text>
          <Text style={styles.headerSubtitle}>
            {likedSongs.length} song{likedSongs.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderPlayAllButton = () => {
    if (likedTracks.length === 0) return null;

    return (
      <View style={styles.playAllContainer}>
        <TouchableOpacity
          style={styles.playAllButton}
          onPress={() => onTrackSelect(likedTracks[0], likedTracks, 0)}
        >
          <Ionicons name="play" size={24} color="#fff" />
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#888" />
      <Text style={styles.emptyTitle}>{t('no_liked_songs_title')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('no_liked_songs_subtitle')}
      </Text>
      <Text style={styles.emptyHint}>
        {t('no_liked_songs_empty_hint')}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('no_liked_songs_loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={likedTracks}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderPlayAllButton()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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
    flexGrow: 1,
    paddingBottom: 180, // Space for music player + 2 items
  },
  header: {
    height: 200,
    marginBottom: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  playAllContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1DB954',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  playAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
}); 