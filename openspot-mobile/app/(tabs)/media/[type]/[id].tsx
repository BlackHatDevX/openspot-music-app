import React, { useState, useContext, useMemo, useEffect } from 'react';
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

import { MusicAPI } from '@/lib/music-api';
import { Track } from '@/types/music';
import { MusicPlayerContext } from '../../_layout';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useColorScheme } from '@/hooks/useColorScheme';

type MediaType = 'album' | 'artist' | 'playlist';

export default function MediaDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    title?: string;
    image?: string;
    from?: string;
  }>();
  const mediaType = useMemo(() => (params.type || 'album') as MediaType, [params.type]);
  const mediaId = params.id || '';
  const title = params.title || 'Details';
  const coverImage = params.image || '';
  const fromPath = Array.isArray(params.from) ? params.from[0] : params.from;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      try {
        let fetchedTracks: Track[] = [];
        if (mediaType === 'album') {
          fetchedTracks = await MusicAPI.getAlbumSongs(mediaId);
        } else if (mediaType === 'artist') {
          fetchedTracks = await MusicAPI.getArtistSongs(mediaId);
        } else {
          fetchedTracks = await MusicAPI.getPlaylistSongs(mediaId);
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

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [mediaId, mediaType]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handleTrackSelect(tracks[0], tracks, 0);
    }
  };

  const handleBackPress = () => {
    if (fromPath) {
      router.replace(fromPath as any);
      return;
    }
    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackPress();
        return true;
      });
      return () => subscription.remove();
    }, [fromPath])
  );

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;

    return (
      <TouchableOpacity style={[styles.trackItem, { backgroundColor: theme.glass }]} onPress={() => handleTrackSelect(item, tracks, index)}>
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
        <TouchableOpacity style={styles.iconButton} onPress={() => toggleLike(item)}>
          <Ionicons
            name={isLiked(item.id) ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked(item.id) ? theme.accent : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => musicQueue.addToQueue(item)}>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleTrackSelect(item, tracks, index)}>
          <Ionicons
            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
            size={20}
            color={isCurrentTrack ? theme.accent : theme.textSecondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
        <View style={styles.backButton} />
      </View>

      <View style={[styles.heroCard, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
        {!!coverImage && <Image source={{ uri: coverImage }} style={styles.heroImage} contentFit="cover" />}
        <View style={styles.heroText}>
          <Text style={[styles.heroType, { color: theme.accent }]}>{t(`media.${mediaType}`).toUpperCase()}</Text>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.heroMeta, { color: theme.textSecondary }]}>
            {tracks.length} {tracks.length === 1 ? t('media.song') : t('media.songs')}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.playAllButton, { backgroundColor: theme.accent }]} onPress={handlePlayAll} disabled={tracks.length === 0}>
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.playAllText}>{t('media.play_all')}</Text>
      </TouchableOpacity>

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
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('media.no_songs_found', { type: t(`media.${mediaType}`) })}</Text>
            </View>
          }
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
  playAllButton: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  playAllText: {
    color: '#fff',
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
