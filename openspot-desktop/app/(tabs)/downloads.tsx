import React, { useState, useCallback, useContext, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { deleteOfflineFile, getPlayableOfflineUri, isTauriRuntime } from '@/lib/tauri-offline';

type SortKey = 'dateAdded' | 'title' | 'artist';

interface OfflineTrackMeta {
  trackData: Track;
  fileUri?: string;
  thumbUri?: string;
}

interface TrackRowProps {
  item: Track;
  thumbUri: string | null;
  isLikedTrack: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  isActiveTrack: boolean;      
  isCurrentlyPlaying: boolean; 
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  surface: string;
  border: string;
  onPlay: () => void;
  onLike: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  onSelect: () => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const DownloadTrackRow = React.memo(({
  item, thumbUri, isLikedTrack, isSelected, selectionMode,
  isActiveTrack, isCurrentlyPlaying,
  accentColor, textPrimary, textSecondary, surface, border,
  onPlay, onLike, onDelete, onLongPress, onSelect,
}: TrackRowProps) => (
  <TouchableOpacity
    onPress={selectionMode ? onSelect : onPlay}
    onLongPress={onLongPress}
    activeOpacity={0.75}
    style={[
      styles.trackRow,
      { backgroundColor: surface, borderColor: isSelected ? accentColor : isActiveTrack ? accentColor : border },
      (isSelected || isActiveTrack) && { borderWidth: 1.5 },
    ]}
  >
    <View style={styles.albumArtWrapper}>
      <Image
        source={{ uri: thumbUri || item.images?.large || item.albumCover }}
        style={styles.albumArt}
        contentFit="cover"
      />
      {isSelected && (
        <View style={[styles.artOverlay, { backgroundColor: accentColor + 'cc' }]}>
          <Ionicons name="checkmark" size={22} color="#fff" />
        </View>
      )}
      {isActiveTrack && !isSelected && (
        <View style={[styles.artOverlay, { backgroundColor: '#000000aa' }]}>
          <Ionicons
            name={isCurrentlyPlaying ? 'musical-notes' : 'pause'}
            size={18}
            color={accentColor}
          />
        </View>
      )}
    </View>

    <View style={styles.info}>
      <Text
        style={[styles.title, { color: isActiveTrack ? accentColor : textPrimary }]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      <Text style={[styles.artist, { color: textSecondary }]} numberOfLines={1}>
        {item.artist}
      </Text>
    </View>

    {/* Action buttons — hidden in selection mode */}
    {!selectionMode && (
      <>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation();
            onLike();
          }}
          style={styles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons
            name={isLikedTrack ? 'heart' : 'heart-outline'}
            size={22}
            color={isLikedTrack ? accentColor : textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          style={styles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="trash" size={22} color="#ff4444" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation();
            onPlay();
          }}
          style={styles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons
            name={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
            size={26}
            color={accentColor}
          />
        </TouchableOpacity>
      </>
    )}
  </TouchableOpacity>
));
DownloadTrackRow.displayName = 'DownloadTrackRow';


export default function DownloadsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { isOffline } = useConnectivity();

  const theme = useMemo(() => ({
    background: isDark ? '#050505' : '#f5efe6',
    surface: isDark ? '#121212' : '#fffaf2',
    border: isDark ? '#272727' : '#e4d5c5',
    textPrimary: isDark ? '#fff' : '#2d2219',
    textSecondary: isDark ? '#888' : '#7a6251',
    accent: isDark ? '#1DB954' : '#167c3a',
  }), [isDark]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const { isLiked, toggleLike } = useLikedSongs();

  
  const { handleTrackSelect, currentTrack, isPlaying } = useContext(MusicPlayerContext);

  const searchInputRef = useRef<TextInput>(null);
  const tracksRef = useRef<Track[]>([]);
  tracksRef.current = tracks;


  const fetchOfflineTracks = useCallback(async () => {
    setLoading(true);
    try {
      const playlists = await PlaylistStorage.getPlaylists();
      const offline = playlists.find(pl => pl.name === 'offline');
      if (!offline) { setTracks([]); return; }

      const reversedIds = [...offline.trackIds].reverse();

      const entries = await Promise.all(
        reversedIds.map(async (id) => {
          try {
            const raw = await AsyncStorage.getItem(`offline_${id}`);
            if (raw) {
              const meta: OfflineTrackMeta = JSON.parse(raw);
              if (meta.trackData) return { id, meta };
            }
          } catch { /* ignore corrupt entries */ }

          if (!isOffline) {
            try {
              const resolved = await MusicAPI.resolveTrackById(id);
              if (resolved) return { id, meta: { trackData: resolved } as OfflineTrackMeta };
            } catch (e) {
              console.warn(`API fallback failed for track ${id}:`, e);
            }
          }
          return null;
        })
      );

      const valid = entries.filter(Boolean) as { id: string; meta: OfflineTrackMeta }[];
      const tracksWithOfflineUri = await Promise.all(valid.map(async (e) => ({
        ...e.meta.trackData,
        offlineUri: e.meta.fileUri,
        offlineThumbUri: e.meta.thumbUri
          ? await getPlayableOfflineUri(e.meta.thumbUri, 'image/jpeg')
          : undefined,
      })));
      setTracks(tracksWithOfflineUri);

      const newThumbMap: Record<string, string> = {};
      for (const { id, meta } of valid) {
        if (meta.thumbUri) {
          newThumbMap[id] = await getPlayableOfflineUri(meta.thumbUri, 'image/jpeg');
        }
      }
      setThumbMap(newThumbMap);
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useFocusEffect(
    React.useCallback(() => {
      fetchOfflineTracks();
      return () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [fetchOfflineTracks])
  );


  const displayedTracks = useMemo(() => {
    let result = [...tracks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    if (sortKey === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortKey === 'artist') result.sort((a, b) => a.artist.localeCompare(b.artist));
    return result;
  }, [tracks, searchQuery, sortKey]);

  

  const handlePlay = useCallback((track: Track, indexInDisplayed: number) => {
    if (displayedTracks.length === 0) return;
    handleTrackSelect(track, displayedTracks, indexInDisplayed);
  }, [displayedTracks, handleTrackSelect]);

  const handleShuffle = useCallback(() => {
    if (displayedTracks.length === 0) return;
    const shuffled = [...displayedTracks].sort(() => Math.random() - 0.5);
    handleTrackSelect(shuffled[0], shuffled, 0);
  }, [displayedTracks, handleTrackSelect]);

  const handlePlayAll = useCallback(() => {
    if (displayedTracks.length > 0) {
      handleTrackSelect(displayedTracks[0], displayedTracks, 0);
    }
  }, [displayedTracks, handleTrackSelect]);

  const deleteTrack = useCallback(async (track: Track) => {
    const trackId = track.id.toString();
    try {
      await PlaylistStorage.removeTrackFromPlaylist(trackId, 'offline');
      const raw = await AsyncStorage.getItem(`offline_${trackId}`);
      if (raw) {
        const { fileUri, thumbUri } = JSON.parse(raw);
        if (fileUri) await deleteOfflineFile(fileUri);
        if (thumbUri) await deleteOfflineFile(thumbUri);
      }
      await AsyncStorage.removeItem(`offline_${trackId}`);
      
      setTracks(prev => prev.filter(t => t.id.toString() !== trackId));
      setThumbMap(prev => {
        const next = { ...prev };
        delete next[trackId];
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        if (next.size === 0) setSelectionMode(false);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete offline file:', error);
      Alert.alert('Error', 'Failed to delete offline file.');
    }
  }, []);

  const handleDelete = useCallback((track: Track) => {
    if (isTauriRuntime()) {
      void deleteTrack(track);
      return;
    }

    const message = `Remove "${track.title}" from offline music?`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void deleteTrack(track);
      }
      return;
    }

    Alert.alert(
      t('components.delete_download') || 'Delete Download',
      message,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.delete') || 'Delete', style: 'destructive', onPress: () => deleteTrack(track) },
      ]
    );
  }, [deleteTrack, t]);

  const handleDeleteSelected = useCallback(() => {
    const deleteSelected = async () => {
      const toDelete = tracksRef.current.filter(t => selectedIds.has(t.id.toString()));
      for (const track of toDelete) {
        await deleteTrack(track);
      }
      setSelectionMode(false);
      setSelectedIds(new Set());
    };

    if (isTauriRuntime()) {
      void deleteSelected();
      return;
    }

    const message = `Remove ${selectedIds.size} track${selectedIds.size > 1 ? 's' : ''} from offline music?`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void deleteSelected();
      }
      return;
    }

    Alert.alert(
      'Delete Selected',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: deleteSelected,
        },
      ]
    );
  }, [selectedIds, deleteTrack]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(displayedTracks.map(t => t.id.toString())));
  }, [displayedTracks]);


  const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const isActiveTrack = currentTrack?.id?.toString() === item.id?.toString();
    const isCurrentlyPlaying = isActiveTrack && isPlaying;

    return (
      <DownloadTrackRow
        item={item}
        thumbUri={thumbMap[item.id.toString()] ?? null}
        isLikedTrack={isLiked(item.id)}
        isSelected={selectedIds.has(item.id.toString())}
        selectionMode={selectionMode}
        isActiveTrack={isActiveTrack}
        isCurrentlyPlaying={isCurrentlyPlaying}
        accentColor={theme.accent}
        textPrimary={theme.textPrimary}
        textSecondary={theme.textSecondary}
        surface={theme.surface}
        border={theme.border}
        onPlay={() => handlePlay(item, index)}
        onLike={() => toggleLike(item)}
        onDelete={() => handleDelete(item)}
        onLongPress={() => enterSelectionMode(item.id.toString())}
        onSelect={() => toggleSelection(item.id.toString())}
      />
    );
  }, [
    thumbMap, isLiked, selectedIds, selectionMode, theme,
    currentTrack, isPlaying, 
    handlePlay, toggleLike, handleDelete, enterSelectionMode, toggleSelection,
  ]);

  const keyExtractor = useCallback((item: Track) => item.id.toString(), []);

  const SORT_LABELS: Record<SortKey, string> = {
    dateAdded: t('downloads.date_added'),
    title: t('downloads.title'),
    artist: t('downloads.artist'),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          {selectionMode ? (
            <>
              <TouchableOpacity onPress={exitSelectionMode} hitSlop={HIT_SLOP}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                {selectedIds.size} selected
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={selectAll}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="checkmark-done" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteSelected}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="trash" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                {t('components.downloads')}
                {tracks.length > 0 && (
                  <Text style={[styles.trackCount, { color: theme.textSecondary }]}>
                    {' '}({tracks.length})
                  </Text>
                )}
              </Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => { setShowSearch(v => !v); setShowSortMenu(false); }}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="search" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowSortMenu(v => !v); setShowSearch(false); }}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="filter" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShuffle}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="shuffle" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePlayAll}
                  style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="play" size={20} color={theme.accent} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Search bar */}
        {showSearch && (
          <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search downloads..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={HIT_SLOP}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sort menu */}
        {showSortMenu && (
          <View style={[styles.sortMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => { setSortKey(key); setShowSortMenu(false); }}
                style={[
                  styles.sortOption,
                  sortKey === key && { backgroundColor: theme.accent + '22' },
                ]}
              >
                <Text style={[styles.sortLabel, { color: sortKey === key ? theme.accent : theme.textPrimary }]}>
                  {SORT_LABELS[key]}
                </Text>
                {sortKey === key && <Ionicons name="checkmark" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active filter chips */}
        {(sortKey !== 'dateAdded' || searchQuery) && !showSearch && !showSortMenu && (
          <View style={styles.activeFilters}>
            {searchQuery ? (
              <View style={[styles.filterChip, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                <Text style={[styles.filterChipText, { color: theme.accent }]}>&quot;{searchQuery}&quot;</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={HIT_SLOP}>
                  <Ionicons name="close" size={12} color={theme.accent} />
                </TouchableOpacity>
              </View>
            ) : null}
            {sortKey !== 'dateAdded' && (
              <View style={[styles.filterChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.filterChipText, { color: theme.textSecondary }]}>
                  {SORT_LABELS[sortKey]}
                </Text>
                <TouchableOpacity onPress={() => setSortKey('dateAdded')} hitSlop={HIT_SLOP}>
                  <Ionicons name="close" size={12} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : displayedTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-download-outline" size={52} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : t('components.no_offline_music')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedTracks}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingBottom: 120 }}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={8}
            initialNumToRender={12}
            getItemLayout={(_, index) => ({ length: 78, offset: 78 * index, index })}
          />
        )}
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingTop: 20, paddingHorizontal: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  trackCount: { fontSize: 16, fontWeight: '400' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { padding: 8, borderRadius: 20, borderWidth: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  sortMenu: { borderWidth: 1, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  sortOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sortLabel: { fontSize: 15 },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  filterChipText: { fontSize: 13 },
  trackRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, marginBottom: 10, padding: 10,
  },
  albumArtWrapper: { position: 'relative', marginRight: 14 },
  albumArt: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#222' },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  artist: { fontSize: 13 },
  iconButton: { padding: 6, borderRadius: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
