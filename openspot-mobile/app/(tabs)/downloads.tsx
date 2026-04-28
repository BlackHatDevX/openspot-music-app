import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaylistStorage } from '@/lib/playlist-storage';
import { Track } from '@/types/music';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { MusicAPI } from '@/lib/music-api';
import { MusicPlayerContext } from './_layout';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';
import { useConnectivity } from '@/hooks/useConnectivity';

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { isOffline } = useConnectivity();
  const theme = {
    background: isDark ? '#050505' : '#f5efe6',
    surface: isDark ? '#121212' : '#fffaf2',
    border: isDark ? '#272727' : '#e4d5c5',
    textPrimary: isDark ? '#fff' : '#2d2219',
    textSecondary: isDark ? '#888' : '#7a6251',
    accent: isDark ? '#1DB954' : '#167c3a',
  };
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const { isLiked, toggleLike } = useLikedSongs();
  const { handleTrackSelect } = useContext(MusicPlayerContext);

  
  const fetchOfflineTracks = useCallback(async () => {
    setLoading(true);
    try {
      const playlists = await PlaylistStorage.getPlaylists();
      const offline = playlists.find(pl => pl.name === 'offline');
      if (!offline) {
        setTracks([]);
        setLoading(false);
        return;
      }
      
      const reversedIds = [...offline.trackIds].reverse();
      
      const trackPromises = reversedIds.map(async (id) => {
        try {
          const offlineData = await AsyncStorage.getItem(`offline_${id}`);
          if (offlineData) {
            const { trackData } = JSON.parse(offlineData);
            if (trackData) {
              return trackData;
            }
          }
          
          
          try {
            const resolved = await MusicAPI.resolveTrackById(id);
            if (resolved) {
              return resolved;
            }
          } catch (apiError) {
            console.warn(`API fallback failed for track ${id}:`, apiError);
          }
        } catch (error) {
          console.error(`Failed to load offline data for track ${id}:`, error);
        }
        return null;
      });
      const fetchedTracks = await Promise.all(trackPromises);
      setTracks(fetchedTracks.filter(Boolean) as Track[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchOfflineTracks();
    }, [fetchOfflineTracks])
  );

  
  const handlePlay = (index: number) => {
    if (tracks.length > 0) {
      handleTrackSelect(tracks[index], tracks, index);
    }
  };

  
  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      handleTrackSelect(shuffled[0], shuffled, 0);
    }
  };

  
  const handleDelete = async (track: Track) => {
    Alert.alert('Delete Download', `Remove "${track.title}" from offline music?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          
          await PlaylistStorage.removeTrackFromPlaylist(track.id.toString(), 'offline');
          
          const offlineData = await AsyncStorage.getItem(`offline_${track.id}`);
          if (offlineData) {
            const { fileUri, thumbUri } = JSON.parse(offlineData);
            if (fileUri) await FileSystem.deleteAsync(fileUri, { idempotent: true });
            if (thumbUri) await FileSystem.deleteAsync(thumbUri, { idempotent: true });
            await AsyncStorage.removeItem(`offline_${track.id}`);
          }
          fetchOfflineTracks();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete offline file.');
        }
      }},
    ]);
  };

  
  const DownloadTrackRow = React.memo(({ item, index }: { item: Track; index: number }) => {
    const [thumbUri, setThumbUri] = useState<string | null>(null);
    useEffect(() => {
      let mounted = true;
      (async () => {
        const offlineData = await AsyncStorage.getItem(`offline_${item.id}`);
        if (offlineData) {
          const { thumbUri } = JSON.parse(offlineData);
          if (mounted) setThumbUri(thumbUri);
        }
      })();
      return () => { mounted = false; };
    }, [item.id]);
    return (
      <View style={[styles.trackRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image source={{ uri: thumbUri || item.images.large }} style={styles.albumArt} contentFit="cover" />
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleLike(item)} style={styles.iconButton}>
          <Ionicons name={isLiked(item.id) ? 'heart' : 'heart-outline'} size={22} color={isLiked(item.id) ? theme.accent : theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconButton}>
          <Ionicons name="trash" size={22} color="#ff4444" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePlay(index)} style={styles.iconButton}>
          <Ionicons name="play" size={22} color={theme.accent} />
        </TouchableOpacity>
      </View>
    );
  });

  const renderItem = ({ item, index }: { item: Track; index: number }) => (
    <DownloadTrackRow item={item} index={index} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('components.downloads')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShuffle} style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="shuffle" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handlePlay(0)} style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="play" size={22} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 40 }} />
        ) : tracks.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('components.no_offline_music')}</Text>
        ) : (
          <FlatList
            data={tracks}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  contentOffline: {
    paddingTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    marginBottom: 12,
    padding: 10,
  },
  albumArt: {
    width: 54,
    height: 54,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: '#222',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  artist: {
    color: '#888',
    fontSize: 13,
  },
  iconButton: {
    marginLeft: 4,
    padding: 8,
    borderRadius: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
