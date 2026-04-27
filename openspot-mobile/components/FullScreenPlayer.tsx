import React, { useState, useEffect } from 'react';
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

  const { isLiked, toggleLike } = useLikedSongs();
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
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.backgroundContainer}>
          <Image
            source={{ uri: track.images.large }}
            style={styles.backgroundImage}
            contentFit="cover"
          />
          <BlurView intensity={80} style={styles.blurOverlay} />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#000']}
            style={styles.gradient}
          />
        </View>

                <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity style={styles.moreButton} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

                <View style={[styles.content, IS_LANDSCAPE && styles.contentLandscape]}>
                    <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: track.images.large }}
              style={[styles.albumArt, IS_LANDSCAPE && styles.albumArtLandscape, IS_TABLET && styles.albumArtTablet]}
              contentFit="cover"
            />
          </View>

                    <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, IS_TABLET && styles.trackTitleTablet]} numberOfLines={2}>
              {track.title}
            </Text>
            <Text style={[styles.trackArtist, IS_TABLET && styles.trackArtistTablet]} numberOfLines={2}>
              {track.artist}
            </Text>
          </View>

                    <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Text style={styles.timeText}>{formatTime(isSeeking ? seekPosition : position)}</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={isSeeking ? seekPosition : position}
                  onValueChange={handleSliderChange}
                  onSlidingStart={handleSliderStart}
                  onSlidingComplete={handleSliderComplete}
                  minimumTrackTintColor="#1DB954"
                  maximumTrackTintColor="#4B5563"
                  thumbTintColor="#1DB954"
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

                    <View style={styles.controls}>
            <TouchableOpacity onPress={handleLike} style={styles.controlButton}>
            <Ionicons
                name={isLiked(track.id) ? "heart" : "heart-outline"}
                size={IS_TABLET ? 28 : 24}
                color={isLiked(track.id) ? "#1DB954" : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={IS_TABLET ? 40 : 32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePlayPause} style={[styles.playButton, IS_TABLET && styles.playButtonTablet]}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={IS_TABLET ? 40 : 32}
                color="#000"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={IS_TABLET ? 40 : 32} color="#fff" />
            </TouchableOpacity>
            <DownloadButton track={track} style={styles.controlButton} />
          </View>

                    <View style={styles.bottomControls}>
            <TouchableOpacity
              onPress={async () => {
                const pls = await PlaylistStorage.getPlaylists();
                setPlaylists(pls);
                const preSelected = pls.filter(pl => pl.trackIds.includes(track.id.toString())).map(pl => pl.name);
                setSelected(preSelected);
                setShowAddModal(true);
              }}
              style={styles.addPlaylistButton}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["black", "black"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addPlaylistButtonGradient}
              >
                <Ionicons name="add-circle" size={IS_TABLET ? 28 : 24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.addPlaylistButtonText, IS_TABLET && styles.addPlaylistButtonTextTablet]}>Add to Playlist</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
                <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.addModalOverlay}>
            <View style={styles.addModalBox}>
              <Text style={styles.addModalTitle}>Add to Playlist</Text>
              {playlists.filter(pl => pl.name !== 'offline').length === 0 && <Text style={{ color: '#888', marginBottom: 12 }}>No playlists found.</Text>}
              {playlists.filter(pl => pl.name !== 'offline').map(pl => (
                <TouchableOpacity
                  key={pl.name}
                  style={styles.addModalItem}
                  onPress={() => toggleSelect(pl.name)}
                >
                  <Ionicons
                    name={selected.includes(pl.name) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected.includes(pl.name) ? '#1DB954' : '#888'}
                  />
                  <Text style={{ color: '#fff', marginLeft: 10 }}>{pl.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.addModalButton, { backgroundColor: '#1DB954' }]} onPress={handleAddToPlaylist} disabled={adding}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{adding ? 'Updating...' : 'Update'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addModalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={{ color: '#fff', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              {addSuccess && <Text style={{ color: '#1DB954', marginTop: 10 }}>Added to playlist!</Text>}
            </View>
          </View>
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
  closeButton: {
    padding: 8,
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
  albumArt: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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
    paddingHorizontal: 20,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: '#1DB954',
    borderRadius: 32,
    padding: 16,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  bottomButton: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalBox: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
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
  },
  addModalButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  addModalCancel: {
    marginTop: 10,
  },
  addPlaylistButton: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 16,
  },
  addPlaylistButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 32,
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
    width: SCREEN_HEIGHT * 0.5,
    height: SCREEN_HEIGHT * 0.5,
  },
  albumArtTablet: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
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