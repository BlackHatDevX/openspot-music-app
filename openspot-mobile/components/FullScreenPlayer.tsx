import React, { useState } from 'react';
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

import { Track } from '../types/music';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
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
  onDownload: () => void;
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
  onDownload,
  musicQueue,
  onQueueToggle,
}: FullScreenPlayerProps) {
  const { isLiked, toggleLike } = useLikedSongs();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const { t } = useTranslation();

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

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDownload();
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

        {/* Background Image with Blur */}
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('full_screen_player_now_playing')}</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: track.images.large }}
              style={styles.albumArt}
              contentFit="cover"
            />
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>

          {/* Progress Bar */}
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

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={handleLike} style={styles.controlButton}>
              <Ionicons
                name={isLiked(track.id) ? "heart" : "heart-outline"}
                size={24}
                color={isLiked(track.id) ? "#1DB954" : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#000"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDownload} style={styles.controlButton}>
              <Ionicons name="download" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* <TouchableOpacity onPress={handleLike} style={styles.bottomButton}>
              <Ionicons 
                name={isLiked(track.id) ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked(track.id) ? "#1DB954" : "#fff"} 
              />
            </TouchableOpacity> */}

          </View>
        </View>
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
    justifyContent: 'space-between',
  },
  bottomButton: {
    padding: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 20,
  },
  volumeButton: {
    padding: 8,
    marginRight: 12,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
}); 