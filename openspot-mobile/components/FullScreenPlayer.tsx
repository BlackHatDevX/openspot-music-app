import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing } from 'react-native';

import { Track } from '../types/music';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { PlaylistStorage, Playlist } from '@/lib/playlist-storage';
import { DownloadButton } from './DownloadButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const IS_LANDSCAPE = SCREEN_WIDTH > SCREEN_HEIGHT;

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  position: number;
  duration: number;
  onSeek: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onShare: () => void;
  musicQueue?: any;
  onQueueToggle?: () => void;
}

export function FullScreenPlayer({
  isOpen,
  onClose,
  track,
  isPlaying,
  onPlayingChange,
  position,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  onNext,
  onPrevious,
  onShuffle,
  onRepeat,
  onShare,
  musicQueue,
  onQueueToggle,
  onPlaylistsUpdated,
}: FullScreenPlayerProps & { onPlaylistsUpdated?: () => void }) {
  if (!track) {
    return null;
  }
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const theme = useMemo(
    () => ({
      base: isDark ? '#000000' : '#f5efe6',
      glass: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
      glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
      textPrimary: isDark ? '#ffffff' : '#1a1a1a',
      textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
      accent: isDark ? '#1DB954' : '#167c3a',
      track: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      icon: isDark ? '#ffffff' : '#1a1a1a',
      shadow: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)',
    }),
    [isDark]
  );

  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  React.useEffect(() => {
    const fetchPlaylists = async () => {
      const pls = await PlaylistStorage.getPlaylists();
      setPlaylists(pls);
      const preSelected = pls.filter(pl => pl.trackIds.includes(track.id.toString())).map(pl => pl.name);
      setSelected(preSelected);
    };
    fetchPlaylists();
  }, [track.id]);

  const handleAddToPlaylist = async () => {
    setAdding(true);
    await PlaylistStorage.addTrackToPlaylists(track, selected);
    const toRemove = playlists.filter(pl => !selected.includes(pl.name) && pl.trackIds.includes(track.id.toString()));
    for (const pl of toRemove) {
      await PlaylistStorage.removeTrackFromPlaylist(track.id.toString(), pl.name);
    }
    setAdding(false);
    setShowAddModal(false);
    setSelected([]);
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 1500);
    if (typeof onPlaylistsUpdated === 'function') {
      onPlaylistsUpdated();
    } else {
      const updatePlaylists = async () => {
        const pls = await PlaylistStorage.getPlaylists();
        setPlaylists(pls);
        const preSelected = pls.filter(pl => pl.trackIds.includes(track.id.toString())).map(pl => pl.name);
        setSelected(preSelected);
      };
      updatePlaylists();
    }
  };

  const toggleSelect = (name: string) => {
    setSelected(sel => sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayingChange(!isPlaying);
  };

  const handleSliderStart = () => {
    setIsSeeking(true);
  };

  const handleSliderChange = (value: number) => {
    if (isSeeking) {
      setSeekPosition(value);
    }
  };

  const handleSliderComplete = (value: number) => {
    onSeek(value);
    setIsSeeking(false);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(track);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleQueueToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onQueueToggle) {
      onQueueToggle();
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.base} />
        <View style={styles.backgroundContainer}>
          <Image
            source={{ uri: track.images.large }}
            style={styles.backgroundImage}
            contentFit="cover"
          />
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={styles.blurOverlay} />
          <LinearGradient
            colors={isDark ? ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)'] : ['rgba(245,239,230,0.3)', 'rgba(245,239,230,0.6)', '#f5efe6']}
            style={styles.gradient}
          />
        </View>

                <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={[styles.headerButton, { backgroundColor: theme.glass }] }>
            <Ionicons name="chevron-down" size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('player.now_playing')}</Text>
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.glass }]} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color={theme.icon} />
          </TouchableOpacity>
        </View>

                <View style={[styles.content, IS_LANDSCAPE && styles.contentLandscape]}>
                    <View style={styles.albumArtContainer}>
            <View style={[styles.albumArtWrapper, IS_LANDSCAPE && styles.albumArtWrapperLandscape, IS_TABLET && styles.albumArtWrapperTablet]}>
              <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.albumArtGlass}>
                <Image
                  source={{ uri: track.images.large }}
                  style={[styles.albumArt, IS_LANDSCAPE && styles.albumArtLandscape, IS_TABLET && styles.albumArtTablet]}
                  contentFit="cover"
                />
              </BlurView>
            </View>
          </View>

                    <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.textPrimary }, IS_TABLET && styles.trackTitleTablet]} numberOfLines={2}>
              {track.title}
            </Text>
            <Text style={[styles.trackArtist, { color: theme.textSecondary }, IS_TABLET && styles.trackArtistTablet]} numberOfLines={2}>
              {track.artist}
            </Text>
          </View>

                    <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(isSeeking ? seekPosition : position)}</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={isSeeking ? seekPosition : position}
                  onValueChange={handleSliderChange}
                  onSlidingStart={handleSliderStart}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor={theme.accent}
                  maximumTrackTintColor={theme.track}
                  thumbTintColor={theme.accent}
                />
              </View>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
            </View>
          </View>

                    <View style={styles.controls}>
            <TouchableOpacity onPress={handleLike} style={[styles.glassButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]}>
            <Ionicons
                name={isLiked(track.id) ? "heart" : "heart-outline"}
                size={IS_TABLET ? 28 : 24}
                color={isLiked(track.id) ? theme.accent : theme.icon}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePrevious} style={[styles.glassButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]}>
              <Ionicons name="play-skip-back" size={IS_TABLET ? 40 : 32} color={theme.icon} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePlayPause} style={[styles.playButton, { backgroundColor: theme.accent }, IS_TABLET && styles.playButtonTablet]}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={IS_TABLET ? 40 : 32}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={[styles.glassButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]}>
              <Ionicons name="play-skip-forward" size={IS_TABLET ? 40 : 32} color={theme.icon} />
            </TouchableOpacity>
            <DownloadButton track={track} style={[styles.glassButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]} iconColor={theme.icon} accentColor={theme.accent} />
          </View>

                    <View style={styles.bottomControls}>
            <TouchableOpacity
              onPress={handleQueueToggle}
              style={[styles.glassButton, styles.bottomButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]}
              activeOpacity={0.85}
            >
              <Ionicons name="list" size={IS_TABLET ? 26 : 22} color={theme.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                const pls = await PlaylistStorage.getPlaylists();
                setPlaylists(pls);
                const preSelected = pls.filter(pl => pl.trackIds.includes(track.id.toString())).map(pl => pl.name);
                setSelected(preSelected);
                setShowAddModal(true);
              }}
              style={[styles.glassButton, { backgroundColor: theme.glass }, isDark && styles.glassButtonShadow]}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={IS_TABLET ? 26 : 22} color={theme.icon} />
            </TouchableOpacity>
          </View>
        </View>
                <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
          <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.addModalOverlay}>
            <View style={[styles.addModalBox, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: theme.glassBorder }]}>
              <Text style={[styles.addModalTitle, { color: theme.textPrimary }]}>{t('components.add_to_playlist')}</Text>
              {playlists.filter(pl => pl.name !== 'offline').length === 0 && <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>{t('components.no_playlists')}</Text>}
              {playlists.filter(pl => pl.name !== 'offline').map(pl => (
                <TouchableOpacity
                  key={pl.name}
                  style={[styles.addModalItem, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}
                  onPress={() => toggleSelect(pl.name)}
                >
                  <Ionicons
                    name={selected.includes(pl.name) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected.includes(pl.name) ? theme.accent : theme.textSecondary}
                  />
                  <Text style={{ color: theme.textPrimary, marginLeft: 10 }}>{pl.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.addModalButton, { backgroundColor: theme.accent }]} onPress={handleAddToPlaylist} disabled={adding}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{adding ? t('components.updating') : t('components.update')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.addModalCancelText, { color: theme.textPrimary }]}>{t('components.cancel')}</Text>
              </TouchableOpacity>
              {addSuccess && <Text style={{ color: theme.accent, marginTop: 10 }}>{t('components.added_to_playlist')}</Text>}
            </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    zIndex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(20px)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    zIndex: 1,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  albumArtWrapper: {
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  albumArtGlass: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  albumArt: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 16,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 18,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: '#B3B3B3',
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 24,
    gap: 16,
  },
  glassButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 32,
  },
  bottomButton: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalBox: {
    borderRadius: 24,
    padding: 28,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  addModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  addModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  addModalButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  addModalCancel: {
    marginTop: 12,
  },
  addModalCancelText: {
    fontSize: 15,
  },
  addPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  addPlaylistButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  downloadAlertBox: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: '#1DB954',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    zIndex: 999,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  contentLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  albumArtLandscape: {
    width: SCREEN_HEIGHT * 0.45,
    height: SCREEN_HEIGHT * 0.45,
  },
  albumArtWrapperLandscape: {
    padding: 3,
  },
  albumArtWrapperTablet: {
    padding: 3,
  },
  albumArtTablet: {
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.32,
  },
  trackTitleTablet: {
    fontSize: 28,
  },
  trackArtistTablet: {
    fontSize: 22,
  },
  playButtonTablet: {
    padding: 20,
    borderRadius: 40,
  },
  addPlaylistButtonTextTablet: {
    fontSize: 18,
  },
}); 