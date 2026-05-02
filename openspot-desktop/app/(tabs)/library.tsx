import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Text, Modal, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaylistList } from '@/components/PlaylistList';
import { PlaylistCard } from '@/components/PlaylistCard';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { MusicPlayerContext } from './_layout';
import { Ionicons } from '@expo/vector-icons';
import { PlaylistStorage, Playlist } from '@/lib/playlist-storage';
import { MusicAPI } from '@/lib/music-api';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';

export default function LibraryScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const theme = {
    background: isDark ? '#050505' : '#f5efe6',
    surface: isDark ? '#121212' : '#fffaf2',
    surfaceAlt: isDark ? '#1b1b1b' : '#efe4d6',
    textPrimary: isDark ? '#fff' : '#2d2219',
    textSecondary: isDark ? '#888' : '#7a6251',
    border: isDark ? '#272727' : '#e4d5c5',
    accent: isDark ? '#1DB954' : '#167c3a',
  };
  const { handleTrackSelect } = useContext(MusicPlayerContext);
  const { getLikedSongsAsTrack, isLiked, toggleLike } = useLikedSongs();
  const likedTracks = getLikedSongsAsTrack();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [showLikedSongs, setShowLikedSongs] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  
  const refreshSelectedPlaylistTracks = async (playlistName: string) => {
    const updated = (await PlaylistStorage.getPlaylists()).find(pl => pl.name === playlistName);
    if (!updated) {
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      return;
    }
    setSelectedPlaylist(updated);
    const tracks = await PlaylistStorage.getPlaylistTracks(updated);
    setPlaylistTracks(tracks);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPlaylists();
    }, [])
  );

  const fetchPlaylists = async () => {
    const pls = await PlaylistStorage.getPlaylists();
    
    const filteredPlaylists = pls.filter(pl => pl.name !== 'offline');
    setPlaylists(filteredPlaylists);
  };

  const handlePlaylistPress = async (playlist: Playlist) => {
    await refreshSelectedPlaylistTracks(playlist.name);
  };

  const handleCreatePlaylist = async () => {
    setShowCreateModal(true);
  };

  const handleCreatePlaylistSubmit = async () => {
    if (!newPlaylistName.trim()) return;
    await PlaylistStorage.addPlaylist({
      name: newPlaylistName.trim(),
      cover: '',
      trackIds: [],
    });
    setNewPlaylistName('');
    setShowCreateModal(false);
    fetchPlaylists();
  };

  const handleBackToLibrary = () => {
    setSelectedPlaylist(null);
    setShowLikedSongs(false);
    setPlaylistTracks([]);
  };

  const handleRemoveTrackFromPlaylist = async (trackId: string, playlistName: string) => {
    await PlaylistStorage.removeTrackFromPlaylist(trackId, playlistName);
    await fetchPlaylists();
    if (selectedPlaylist) await refreshSelectedPlaylistTracks(playlistName);
  };

  const handlePlaylistPlay = async (playlist: Playlist, shuffle = false) => {
    const tracks = await PlaylistStorage.getPlaylistTracks(playlist);
    if (tracks.length > 0) {
      let playTracks = tracks;
      if (shuffle) {
        playTracks = [...tracks].sort(() => Math.random() - 0.5);
      }
      handleTrackSelect(playTracks[0], playTracks, 0);
    }
  };

  const handleLikedSongsPlay = (shuffle = false) => {
    let playTracks = likedTracks;
    if (shuffle) {
      playTracks = [...likedTracks].sort(() => Math.random() - 0.5);
    }
    if (playTracks.length > 0) {
      handleTrackSelect(playTracks[0], playTracks, 0);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete the playlist "${playlist.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const all = await PlaylistStorage.getPlaylists();
            const updated = all.filter(pl => pl.name !== playlist.name);
            await PlaylistStorage.savePlaylists(updated);
            fetchPlaylists();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} translucent={false} />
      {showLikedSongs ? (
        <View style={[styles.scrollContent, { flex: 1 }]}> 
          <TouchableOpacity onPress={handleBackToLibrary} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            <Text style={{ color: theme.textPrimary, fontSize: 16, marginLeft: 4 }}>{t('components.back_to_library')}</Text>
          </TouchableOpacity>
          <PlaylistCard
            playlist={{
              name: t('library.liked_songs'),
              cover: likedTracks[0]?.images?.large || 'https://misc.scdn.co/liked-songs/liked-songs-640.png',
              trackCount: likedTracks.length,
            }}
            onPress={() => {}}
            onShuffle={() => handleLikedSongsPlay(true)}
            onPlay={() => handleLikedSongsPlay(false)}
            theme={{ surface: theme.surface, border: theme.border, textPrimary: theme.textPrimary, textSecondary: theme.textSecondary, accent: theme.accent, icon: theme.textPrimary }}
          />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('components.tracks')}</Text>
          <FlatList
            data={likedTracks}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item, index }) => (
              <>
                <View style={[styles.trackRowBox, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.trackRow, { flex: 1, backgroundColor: 'transparent' }]}
                    onPress={() => handleTrackSelect(item, likedTracks, index)}
                  >
                    <Text style={[styles.trackRowTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.trackRowArtist, { color: theme.textSecondary }]}>{item.artist}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => toggleLike(item)}
                    >
                      <Ionicons
                        name={isLiked(item.id) ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isLiked(item.id) ? theme.accent : theme.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {index < likedTracks.length - 1 && <View style={[styles.trackDivider, { backgroundColor: theme.border }]} />}
              </>
            )}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary, marginTop: 16 }}>{t('components.no_liked_songs')}</Text>}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        </View>
      ) : !selectedPlaylist ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('components.your_library')}</Text>
          <PlaylistCard
            playlist={{
              name: t('library.liked_songs'),
              cover: likedTracks[0]?.images?.large || 'https://misc.scdn.co/liked-songs/liked-songs-640.png',
              trackCount: likedTracks.length,
            }}
            onPress={() => setShowLikedSongs(true)}
            onShuffle={() => handleLikedSongsPlay(true)}
            onPlay={() => handleLikedSongsPlay(false)}
            theme={{ surface: theme.surface, border: theme.border, textPrimary: theme.textPrimary, textSecondary: theme.textSecondary, accent: theme.accent, icon: theme.textPrimary }}
          />
          <PlaylistList
            playlists={playlists.map(pl => {
              let cover = 'https://misc.scdn.co/liked-songs/liked-songs-640.png';
              if (pl.trackIds.length > 0) {
                const lastTrackId = pl.trackIds[pl.trackIds.length - 1];
                const track = [...likedTracks, ...playlistTracks].find(t => t.id.toString() === lastTrackId);
                if (track && track.images) {
                  cover = MusicAPI.getOptimalImage(track.images);
                }
              }
              return {
                ...pl,
                trackCount: pl.trackIds.length,
                cover,
              };
            })}
            onPlaylistPress={handlePlaylistPress}
            onPlaylistShuffle={pl => handlePlaylistPlay(pl, true)}
            onPlaylistPlay={pl => handlePlaylistPlay(pl, false)}
            onPlaylistLongPress={handleDeletePlaylist}
            theme={{ surface: theme.surface, border: theme.border, textPrimary: theme.textPrimary, textSecondary: theme.textSecondary, accent: theme.accent, icon: theme.textPrimary }}
          />
          <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleCreatePlaylist}>
            <Ionicons name="add-circle" size={24} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.createButtonText, { color: theme.accent }]}>{t('components.create_playlist')}</Text>
          </TouchableOpacity>
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1 }]}> 
          <TouchableOpacity onPress={handleBackToLibrary} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            <Text style={{ color: theme.textPrimary, fontSize: 16, marginLeft: 4 }}>{t('components.back_to_library')}</Text>
          </TouchableOpacity>
          <PlaylistCard
            playlist={{
              ...selectedPlaylist,
              trackCount: selectedPlaylist.trackIds.length,
              cover: (() => {
                if (selectedPlaylist.trackIds.length > 0) {
                  const lastTrackId = selectedPlaylist.trackIds[selectedPlaylist.trackIds.length - 1];
                  const track = [...likedTracks, ...playlistTracks].find(t => t.id.toString() === lastTrackId);
                  if (track && track.images) {
                    return MusicAPI.getOptimalImage(track.images);
                  }
                }
                return 'https://misc.scdn.co/liked-songs/liked-songs-640.png';
              })(),
            }}
            onPress={() => {}}
            onShuffle={() => handlePlaylistPlay(selectedPlaylist, true)}
            onPlay={() => handlePlaylistPlay(selectedPlaylist, false)}
            theme={{ surface: theme.surface, border: theme.border, textPrimary: theme.textPrimary, textSecondary: theme.textSecondary, accent: theme.accent, icon: theme.textPrimary }}
          />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('components.tracks')}</Text>
          <FlatList
            data={playlistTracks}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item, index }) => (
              <>
                <View style={[styles.trackRowBox, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.trackRow, { flex: 1, backgroundColor: 'transparent' }]}
                    onPress={() => handleTrackSelect(item, playlistTracks, index)}
                  >
                    <Text style={[styles.trackRowTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.trackRowArtist, { color: theme.textSecondary }]}>{item.artist}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => toggleLike(item)}
                    >
                      <Ionicons
                        name={isLiked(item.id) ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isLiked(item.id) ? theme.accent : theme.textPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleRemoveTrackFromPlaylist(item.id.toString(), selectedPlaylist.name)}
                    >
                      <Ionicons name="trash" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                {index < playlistTracks.length - 1 && <View style={[styles.trackDivider, { backgroundColor: theme.border }]} />}
              </>
            )}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary, marginTop: 16 }}>{t('components.no_tracks_playlist')}</Text>}
            contentContainerStyle={{ paddingBottom: 120 }}
            extraData={playlistTracks}
          />
      </View>
      )}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('components.create_playlist')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder={t('components.playlist_name')}
              placeholderTextColor={theme.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <TouchableOpacity
              style={[styles.createButtonIconOnly, { marginTop: 18, backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleCreatePlaylistSubmit}
            >
              <Ionicons name="add-circle" size={32} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
              <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{t('components.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    marginLeft: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: 18,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButtonIconOnly: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 12,
    fontSize: 15,
  },
  cancelButton: {
    marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginLeft: 2,
  },
  trackRow: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  trackRowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  trackRowArtist: {
    color: '#888',
    fontSize: 12,
  },
  trackRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  trackDivider: {
    height: 1,
    marginVertical: 2,
    marginLeft: 8,
    marginRight: 8,
  },
  iconButton: {
    marginHorizontal: 2,
    padding: 8,
    borderRadius: 16,
  },
  removeButton: {
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});
