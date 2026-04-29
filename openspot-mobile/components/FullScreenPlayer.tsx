import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { FlatList } from 'react-native-gesture-handler';

import { Track } from '../types/music';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { PlaylistStorage, Playlist } from '@/lib/playlist-storage';
import { DownloadButton } from './DownloadButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const IS_LANDSCAPE = SCREEN_WIDTH > SCREEN_HEIGHT;
const ANIMATION_DURATION = 300;
const SUCCESS_TOAST_DURATION = 2000;

const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
};

const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
  onShare: () => void;
  musicQueue?: any;
  onQueueToggle?: () => void;
  onPlaylistsUpdated?: () => void;
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
  onShare,
  musicQueue,
  onQueueToggle,
  onPlaylistsUpdated,
}: FullScreenPlayerProps) {
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();

  const theme = useMemo(
    () => ({
      base: isDark ? '#0a0a0f' : '#fdf5ed',
      glass: isDark ? 'rgba(30,30,45,0.85)' : 'rgba(255,245,235,0.85)',
      glassBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      textPrimary: isDark ? '#ffffff' : '#1e1e2a',
      textSecondary: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
      accent: '#1DB954',
      accentGlow: isDark ? 'rgba(29,185,84,0.3)' : 'rgba(29,185,84,0.15)',
      track: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
      icon: isDark ? '#ffffff' : '#1e1e2a',
      shadow: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)',
      danger: '#FF3B30',
    }),
    [isDark]
  );

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Off);

  const albumScaleAnim = useRef(new Animated.Value(1)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  useEffect(() => {
    if (!track) return;
    const loadPlaylists = async () => {
      const pls = await PlaylistStorage.getPlaylists();
      setPlaylists(pls);
      const preSel = pls
        .filter(pl => pl.trackIds.includes(track.id.toString()))
        .map(pl => pl.name);
      setSelected(preSel);
    };
    loadPlaylists();
  }, [track]);

  useEffect(() => {
    if (isOpen) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isOpen, fadeAnim]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(albumScaleAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(albumScaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      albumScaleAnim.stopAnimation();
      albumScaleAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isPlaying, albumScaleAnim]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPlayingChange(!isPlaying);
  }, [isPlaying, onPlayingChange]);

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  }, [onPrevious]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  }, [onNext]);

  const handleLike = useCallback(() => {
    if (!track) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(likeScaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    toggleLike(track);
  }, [track, toggleLike, likeScaleAnim]);

  const handleShufflePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShuffle();
  }, [onShuffle]);

  const handleQueueToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQueueToggle?.();
  }, [onQueueToggle]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare();
  }, [onShare]);

  const handleSliderStart = useCallback(() => {
    setIsSeeking(true);
    setSeekPosition(position);
  }, [position]);

  const handleSliderChange = useCallback((value: number) => {
    setSeekPosition(value);
  }, []);

  const handleSliderComplete = useCallback((value: number) => {
    onSeek(value);
    setIsSeeking(false);
  }, [onSeek]);

  const handleRepeatToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMode = repeatMode === RepeatMode.Off ? RepeatMode.Track : RepeatMode.Off;

    try {
      await TrackPlayer.setRepeatMode(newMode);
      setRepeatMode(newMode);
    } catch (_e) {
      console.debug('TrackPlayer not ready, repeat mode change ignored',_e);
    }
  }, [repeatMode]);

  const getRepeatIcon = useCallback(() => {
    return repeatMode !== RepeatMode.Off ? 'repeat' : 'repeat-outline';
  }, [repeatMode]);

  const toggleSelect = useCallback((name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  const handleAddToPlaylist = useCallback(async () => {
    if (!track) return;
    setAdding(true);
    try {
      await PlaylistStorage.addTrackToPlaylists(track, selected);

      const toRemove = playlists.filter(
        pl => !selected.includes(pl.name) && pl.trackIds.includes(track.id.toString())
      );

      for (const pl of toRemove) {
        await PlaylistStorage.removeTrackFromPlaylist(track.id.toString(), pl.name);
      }

      setAddSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setAddSuccess(false);
        setShowAddModal(false);
      }, SUCCESS_TOAST_DURATION);

      onPlaylistsUpdated?.();

      const updated = await PlaylistStorage.getPlaylists();
      setPlaylists(updated);
      const newSelected = updated
        .filter(pl => pl.trackIds.includes(track.id.toString()))
        .map(pl => pl.name);
      setSelected(newSelected);
    } catch (_e) {
      Alert.alert(t('components.error'), t('components.playlist_update_failed'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(_e);
    } finally {
      setAdding(false);
    }
  }, [track, selected, playlists, onPlaylistsUpdated, t]);

  const openPlaylistModal = useCallback(async () => {
    if (!track) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pls = await PlaylistStorage.getPlaylists();
    setPlaylists(pls);
    const preSel = pls
      .filter(pl => pl.trackIds.includes(track.id.toString()))
      .map(pl => pl.name);
    setSelected(preSel);
    setShowAddModal(true);
  }, [track]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, SUCCESS_TOAST_DURATION);
  }, []);

  
  if (!track) return null;

  
  const displayedPosition = isSeeking ? seekPosition : position;

  const PlaylistModal = (
    <Modal
      visible={showAddModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddModal(false)}
    >
      <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: isDark ? '#1c1c24' : '#fff' }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            {t('components.add_to_playlist') || 'Add to Playlist'}
          </Text>
          <FlatList
            data={playlists.filter(p => p.name !== 'offline')}
            keyExtractor={item => item.name}
            style={{ width: '100%', maxHeight: 300 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: theme.glass }]}
                onPress={() => toggleSelect(item.name)}
              >
                <Ionicons
                  name={selected.includes(item.name) ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={selected.includes(item.name) ? theme.accent : theme.textSecondary}
                />
                <Text style={{ color: theme.textPrimary, marginLeft: 12 }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.accent }]}
            onPress={handleAddToPlaylist}
            disabled={adding}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {adding ? (t('components.updating') || 'Updating...') : (t('components.update') || 'Update')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalCancel}
            onPress={() => setShowAddModal(false)}
          >
            <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>
              {t('components.cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
          {addSuccess && (
            <Text style={{ color: theme.accent, marginTop: 10 }}>
              {t('components.added_to_playlist') || 'Playlists updated!'}
            </Text>
          )}
        </View>
      </BlurView>
    </Modal>
  );

  const Toast = (() => {
    if (!toastMessage) return null;
    const isSuccess = toastType === 'success';
    return (
      <Animated.View
        style={[
          styles.toastContainer,
          { backgroundColor: isSuccess ? theme.accent : theme.danger, opacity: fadeAnim },
        ]}
      >
        <Ionicons
          name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
          size={24}
          color="#fff"
          style={styles.toastIcon}
        />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    );
  })();

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.base }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {Toast}

        <View style={styles.backgroundContainer}>
          <Image
            source={{ uri: track.images.large }}
            style={styles.backgroundImage}
            contentFit="cover"
          />
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={styles.blurOverlay} />
          <LinearGradient
            colors={
              isDark
                ? ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']
                : ['rgba(245,239,230,0.3)', 'rgba(245,239,230,0.6)', '#fdf5ed']
            }
            style={styles.gradient}
          />
        </View>

        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.headerButton, { backgroundColor: theme.glass }]}
            >
              <Ionicons name="chevron-down" size={24} color={theme.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {t('player.now_playing') || 'Now Playing'}
            </Text>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.glass }]}
              onPress={handleShare}
            >
              <Ionicons name="share-social" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <View style={[styles.content, IS_LANDSCAPE && IS_TABLET && styles.contentLandscape]}>
            <View style={styles.albumArtContainer}>
              <Animated.View
                style={[
                  styles.albumArtWrapper,
                  IS_TABLET && styles.albumArtWrapperTablet,
                  { transform: [{ scale: albumScaleAnim }] },
                ]}
              >
                <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.albumArtGlass}>
                  <Image
                    source={{ uri: track.images.large }}
                    style={[styles.albumArt, IS_TABLET && styles.albumArtTablet]}
                    contentFit="cover"
                  />
                </BlurView>
              </Animated.View>
            </View>

            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                {decodeHtmlEntities(track.title)}
              </Text>
              <Text style={[styles.trackArtist, { color: theme.textSecondary }]} numberOfLines={2}>
                {decodeHtmlEntities(track.artist)}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {formatTime(displayedPosition)}
                </Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={displayedPosition}
                    onValueChange={handleSliderChange}
                    onSlidingStart={handleSliderStart}
                    onSlidingComplete={handleSliderComplete}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor={theme.track}
                    thumbTintColor={theme.accent}
                  />
                </View>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            <View style={styles.controls}>
              <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                <TouchableOpacity
                  onPress={handleLike}
                  style={[styles.controlButton, { backgroundColor: theme.glass }]}
                >
                  <Ionicons
                    name={isLiked(track.id) ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isLiked(track.id) ? theme.accent : theme.icon}
                  />
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                onPress={handlePrevious}
                style={[styles.controlButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons name="play-skip-back" size={28} color={theme.icon} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlayPause}
                style={[styles.playButton, { backgroundColor: theme.accent }]}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.controlButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons name="play-skip-forward" size={28} color={theme.icon} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShufflePress}
                style={[styles.controlButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons
                  name="shuffle"
                  size={22}
                  color={musicQueue?.isShuffled ? theme.accent : theme.icon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryControls}>
              <TouchableOpacity
                onPress={handleRepeatToggle}
                style={[styles.secondaryButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons
                  name={getRepeatIcon()}
                  size={20}
                  color={repeatMode !== RepeatMode.Off ? theme.accent : theme.icon}
                />
                {repeatMode === RepeatMode.Track && (
                  <View style={styles.repeatBadge}>
                    <Text style={styles.repeatBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                onPress={handleQueueToggle}
                style={[styles.bottomButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons name="list" size={22} color={theme.icon} />
                <Text style={[styles.bottomButtonText, { color: theme.textSecondary }]}>
                  {t('components.queue') || 'Queue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openPlaylistModal}
                style={[styles.bottomButton, { backgroundColor: theme.glass }]}
              >
                <Ionicons name="add-circle" size={22} color={theme.icon} />
                <Text style={[styles.bottomButtonText, { color: theme.textSecondary }]}>
                  {t('components.playlist') || 'Playlist'}
                </Text>
              </TouchableOpacity>

              <DownloadButton
                track={track}
                style={[styles.bottomButton, { backgroundColor: theme.glass }]}
                iconColor={theme.icon}
                accentColor={theme.accent}
                showNotification={showToast}
              />
            </View>
          </View>
        </Animated.View>

        {PlaylistModal}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backgroundImage: { width: '100%', height: '100%' },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mainContent: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    zIndex: 2,
  },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    zIndex: 1,
  },
  contentLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 40,
  },
  albumArtContainer: { alignItems: 'center', marginBottom: 24 },
  albumArtWrapper: {
    borderRadius: 24,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  albumArtWrapperTablet: { padding: 8 },
  albumArtGlass: { borderRadius: 20, overflow: 'hidden' },
  albumArt: { width: SCREEN_WIDTH * 0.7, height: SCREEN_WIDTH * 0.7, borderRadius: 20 },
  albumArtTablet: {
    width: IS_LANDSCAPE ? SCREEN_HEIGHT * 0.5 : SCREEN_WIDTH * 0.45,
    height: IS_LANDSCAPE ? SCREEN_HEIGHT * 0.5 : SCREEN_WIDTH * 0.45,
  },
  trackInfo: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 16 },
  trackTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6, letterSpacing: -0.3, lineHeight: 34, minHeight: 68 },
  trackArtist: { fontSize: 18, textAlign: 'center', opacity: 0.8, lineHeight: 24, minHeight: 48 },
  progressContainer: { marginBottom: 32 },
  progressBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeText: { fontSize: 12, width: 40, textAlign: 'center', fontWeight: '500' },
  sliderContainer: { flex: 1 },
  slider: { width: '100%', height: 40 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 20 },
  controlButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  secondaryControls: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  secondaryButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  repeatBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  repeatBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginBottom: 20, paddingHorizontal: 8, gap: 12 },
  bottomButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 40, gap: 8 },
  bottomButtonText: { fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBox: { borderRadius: 28, padding: 24, width: '80%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, width: '100%', marginBottom: 8 },
  modalButton: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 40, alignItems: 'center' },
  modalCancel: { marginTop: 12 },
  modalCancelText: { fontSize: 15 },
  toastContainer: {
    position: 'absolute',
    top: 10,
    left: 24,
    right: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 24,
  },
  toastIcon: { marginRight: 10 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
});
