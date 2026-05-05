import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MusicAPI } from '@/lib/music-api';
import { Track } from '@/types/music';
import { MusicPlayerContext } from '../../_layout';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useColorScheme } from '@/hooks/useColorScheme';

type MediaType = 'album' | 'artist' | 'playlist';

interface TrackListItemProps {
  item: Track;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  theme: any;
  tracks: Track[];
  onTrackSelect: (track: Track, tracks: Track[], index: number) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  isLiked: boolean;
}

const TrackListItem = React.memo(({ item, index, isCurrentTrack, isPlaying, theme, tracks, onTrackSelect, onToggleLike, onAddToQueue, isLiked }: TrackListItemProps) => {
  const handlePress = useCallback(() => {
    onTrackSelect(item, tracks, index);
  }, [item, tracks, index, onTrackSelect]);

  const handleLike = useCallback(() => {
    onToggleLike(item);
  }, [item, onToggleLike]);

  const handleQueue = useCallback(() => {
    onAddToQueue(item);
  }, [item, onAddToQueue]);

  return (
    <TouchableOpacity style={[styles.trackItem, { backgroundColor: theme.glass }]} onPress={handlePress}>
      <Image
        source={{ uri: MusicAPI.getOptimalImage(item.images) }}
        style={styles.trackCover}
        contentFit="cover"
      />
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: theme.textPrimary }, isCurrentTrack && { color: theme.accent }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.trackArtist, { color: theme.textSecondary }, isCurrentTrack && { color: theme.accent }]} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity style={styles.iconButton} onPress={handleLike}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? theme.accent : theme.textSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={handleQueue}>
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={handlePress}>
        <Ionicons
          name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
          size={20}
          color={isCurrentTrack ? theme.accent : theme.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isCurrentTrack === nextProps.isCurrentTrack &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.index === nextProps.index
  );
});

export default function MediaDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    title?: string;
    image?: string;
    from?: string;
  }>();
  const normalizeParam = (val: string | string[] | undefined): string | undefined =>
    Array.isArray(val) ? val[0] : val;

  const mediaType = useMemo(() => (normalizeParam(params.type) || 'album') as MediaType, [params.type]);
  const mediaId = normalizeParam(params.id) || '';
  const title = normalizeParam(params.title) || 'Details';
  const coverImage = normalizeParam(params.image) || '';
  const fromPath = normalizeParam(params.from);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artistPage, setArtistPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [totalSongs, setTotalSongs] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const { handleTrackSelect, musicQueue, currentTrack, isPlaying } = useContext(MusicPlayerContext);
  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const theme = useMemo(
    () => ({
      base: isDark ? '#000000' : '#f5efe6',
      glass: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
      glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
      textPrimary: isDark ? '#ffffff' : '#1a1a1a',
      textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
      accent: isDark ? '#1DB954' : '#167c3a',
      track: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      icon: isDark ? '#ffffff' : '#1a1a1a',
      disabled: isDark ? '#444' : '#ccc',
    }),
    [isDark]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      if (!mediaId) {
        setError('Missing item id');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setArtistPage(0);
      setHasMoreSongs(true);
      setTotalSongs(0);
      try {
        let fetchedTracks: Track[] = [];
        if (mediaType === 'album') {
          fetchedTracks = await MusicAPI.getAlbumSongs(mediaId);
          setTotalSongs(fetchedTracks.length);
        } else if (mediaType === 'artist') {
          const result = await MusicAPI.getArtistSongs(mediaId, 0);
          fetchedTracks = result.tracks;
          setTotalSongs(result.total);
          setHasMoreSongs(fetchedTracks.length === 10);
        } else {
          fetchedTracks = await MusicAPI.getPlaylistSongs(mediaId);
          setTotalSongs(fetchedTracks.length);
        }

        if (isMounted) {
          setTracks(fetchedTracks);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load songs');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const checkIfSaved = async () => {
      const savedKey = `saved_${mediaType}_${mediaId}`;
      const saved = await AsyncStorage.getItem(savedKey);
      setIsSaved(!!saved);
    };

    fetchDetails();
    checkIfSaved();
    return () => {
      isMounted = false;
    };
  }, [mediaId, mediaType]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handleTrackSelect(tracks[0], tracks, 0);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      handleTrackSelect(shuffled[randomIndex], shuffled, randomIndex);
    }
  };

  const handleToggleSave = async () => {
    const savedKey = `saved_${mediaType}_${mediaId}`;
    if (isSaved) {
      await AsyncStorage.removeItem(savedKey);
      setIsSaved(false);
    } else {
      await AsyncStorage.setItem(savedKey, JSON.stringify({
        type: mediaType,
        id: mediaId,
        title,
        image: coverImage,
        totalSongs,
      }));
      setIsSaved(true);
    }
  };

  const loadMoreArtistSongs = async () => {
    if (mediaType !== 'artist' || isLoadingMore || !hasMoreSongs) return;
    setIsLoadingMore(true);
    const nextPage = artistPage + 1;
    try {
      const result = await MusicAPI.getArtistSongs(mediaId, nextPage);
      if (result.tracks.length > 0) {
        setTracks((prev) => [...prev, ...result.tracks]);
        setArtistPage(nextPage);
        setHasMoreSongs(result.tracks.length === 10);
      } else {
        setHasMoreSongs(false);
      }
    } catch (error) {
      console.error('Failed to load more songs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleBackPress = useCallback(() => {
    if (fromPath) {
      router.replace(fromPath as any);
      return;
    }
    router.back();
  }, [fromPath, router]);

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackPress();
        return true;
      });
      const checkSavedStatus = async () => {
        const savedKey = `saved_${mediaType}_${mediaId}`;
        const saved = await AsyncStorage.getItem(savedKey);
        setIsSaved(!!saved);
      };
      checkSavedStatus();
      return () => subscription.remove();
    }, [handleBackPress, mediaType, mediaId])
  );

  const renderTrackItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;

    return (
      <TrackListItem
        item={item}
        index={index}
        isCurrentTrack={isCurrentTrack}
        isPlaying={isPlaying}
        theme={theme}
        tracks={tracks}
        onTrackSelect={handleTrackSelect}
        onToggleLike={toggleLike}
        onAddToQueue={musicQueue.addToQueue}
        isLiked={isLiked(item.id)}
      />
    );
  }, [currentTrack?.id, isPlaying, theme, tracks, handleTrackSelect, toggleLike, musicQueue.addToQueue, isLiked]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.base }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.base} translucent={false} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={handleToggleSave} style={styles.backButton}>
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? theme.accent : theme.icon} />
        </TouchableOpacity>
      </View>

      <View style={[styles.heroCard, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
        {!!coverImage && <Image source={{ uri: coverImage }} style={styles.heroImage} contentFit="cover" />}
        <View style={styles.heroText}>
          <Text style={[styles.heroType, { color: theme.accent }]}>{t(`media.${mediaType}`).toUpperCase()}</Text>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.accent }]} onPress={handlePlayAll} disabled={tracks.length === 0}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={[styles.playButtonText, { color: '#fff' }]}>{t('media.play_all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.glass, borderColor: theme.glassBorder, borderWidth: 1 }]} onPress={handleShufflePlay} disabled={tracks.length === 0}>
          <Ionicons name="shuffle" size={20} color={theme.icon} />
          <Text style={[styles.playButtonText, { color: theme.icon }]}>{t('player.shuffle')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('media.loading_songs')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={44} color="#ff4444" />
          <Text style={[styles.errorText, { color: theme.textPrimary }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item, index) => `${mediaType}-${item.id?.toString?.() ?? 'unknown'}-${index}`}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          getItemLayout={(data, index) => ({ length: 74, offset: 74 * index, index })}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('media.no_songs_found', { type: t(`media.${mediaType}`) })}</Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={theme.accent} />
              </View>
            ) : null
          }
          onEndReached={mediaType === 'artist' ? loadMoreArtistSongs : undefined}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  heroCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  heroImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  heroText: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  heroType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroMeta: {
    fontSize: 13,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  playButton: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  helperText: {
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 180,
    paddingHorizontal: 8,
  },
  flatList: {
    flex: 1,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  trackCover: {
    width: 46,
    height: 46,
    borderRadius: 6,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
  },
  trackTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  trackArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  currentTrackText: {
  },
  iconButton: {
    padding: 8,
  },
});
