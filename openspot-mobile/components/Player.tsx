import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import { Track } from '../types/music';
import { MusicAPI } from '../lib/music-api';
import { NotificationService } from '../lib/notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenPlayer } from './FullScreenPlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  musicQueue: any; 
  onQueueToggle: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function Player({
  track,
  isPlaying,
  onPlayingChange,
  musicQueue,
  onQueueToggle,
}: PlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);

  if (!track) {
    return null;
  }
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);


  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState<string>('');

  const { isLiked, toggleLike } = useLikedSongs();
  const rotationValue = useRef(new Animated.Value(0)).current;
  const rotationAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const downloadTimeoutRef = useRef<number | null>(null);
  const currentTrackIdRef = useRef<string | number | null>(null);
  const lastSeekTimeRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);


  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to configure audio session:', error);
      }
    };

    configureAudioSession();

    NotificationService.initialize();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      currentTrackIdRef.current = null;
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }

      if (soundRef.current) {
        try {
          soundRef.current.unloadAsync();
        } catch (e) {
          console.warn('Sound unload on unmount failed:', e);
        }
      }
    };
  }, []); 

  
  useEffect(() => {
    console.log('MusicQueue state:', {
      isShuffled: musicQueue.isShuffled,
      repeatMode: musicQueue.repeatMode,
      currentIndex: musicQueue.currentIndex,
      queueLength: musicQueue.queue.length
    });
  }, [musicQueue.isShuffled, musicQueue.repeatMode, musicQueue.currentIndex, musicQueue.queue.length]);

  
  useEffect(() => {
    if (track) {
      loadAudio();

      NotificationService.showOrUpdateMediaNotification(track, isPlaying);
    }
  }, [track.id]); 

  
  useEffect(() => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.playAsync();
      } else {
        soundRef.current.pauseAsync();
      }
    }

    if (track) {
      NotificationService.showOrUpdateMediaNotification(track, isPlaying);
    }
  }, [isPlaying, track]);


  useEffect(() => {
    if (isPlaying) {
      startRotation();
    } else {
      stopRotation();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!soundRef.current) return;

    const updateStatus = (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        const timeSinceLastSeek = Date.now() - lastSeekTimeRef.current;
        if (!isSeeking && timeSinceLastSeek > 200) {
          setPosition(status.positionMillis);
        }
        setDuration(status.durationMillis || 0);

        if (status.didJustFinish) {
          handleNext();
        }
      }
    };

    soundRef.current.setOnPlaybackStatusUpdate(updateStatus);

    return () => {
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
      }
    };
  }, [soundRef.current, isSeeking, musicQueue.repeatMode]);

  const startRotation = () => {
    if (rotationAnimationRef.current) {
      rotationAnimationRef.current.stop();
    }
    
    rotationAnimationRef.current = Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    );
    
    rotationAnimationRef.current.start();
  };

  const stopRotation = () => {
    if (rotationAnimationRef.current) {
      rotationAnimationRef.current.stop();
      rotationAnimationRef.current = null;
    }
  };

  const loadAudio = async () => {
    if (!track) return;

    if (isLoading) {
      return;
    }

    if (currentTrackIdRef.current === track.id) {
      return;
    }
    setIsLoading(true);
    currentTrackIdRef.current = track.id;
    try {

      setPosition(0);
      setDuration(0);

      let audioUrl: string | null = null;
      try {
        const offlineData = await AsyncStorage.getItem(`offline_${track.id}`);
        if (offlineData) {
          const { fileUri } = JSON.parse(offlineData);

          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            audioUrl = fileUri;
          }
        }
      } catch (e) {

      }

      if (!audioUrl) {
        audioUrl = await MusicAPI.getStreamUrl(track.id.toString());
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: !isInitialLoadRef.current, volume: isMuted ? 0 : volume },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            const timeSinceLastSeek = Date.now() - lastSeekTimeRef.current;
            if (!isSeeking && timeSinceLastSeek > 200) {
              setPosition(status.positionMillis);
            }
            setDuration(status.durationMillis || 0);

            if (status.didJustFinish) {
              handleNext();
            }
          }
        }
      );

      soundRef.current = sound;

      if (!isInitialLoadRef.current && !isPlaying) {
        onPlayingChange(true);
      }

      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error loading audio:', error);

      Alert.alert('Playback Error', 'Failed to load audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (soundRef.current) {
      try {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        onPlayingChange(!isPlaying);
      } catch (error) {
        console.error('Error in handlePlayPause:', error);
      }
    }
  }, [isPlaying, onPlayingChange]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (musicQueue.repeatMode === 'one') {
      if (soundRef.current) {
        soundRef.current.replayAsync();
        onPlayingChange(true);
      }
      return;
    }


    const nextTrack = musicQueue.playNext();
    if (nextTrack) {
      onPlayingChange(true);
    } else {
      onPlayingChange(false);
    }
  }, [musicQueue.repeatMode, onPlayingChange]);

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevTrack = musicQueue.playPrevious();
    if (prevTrack) {
      onPlayingChange(true);
    }
  }, [onPlayingChange]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      console.log('Action identifier:', response.actionIdentifier);

      switch (response.actionIdentifier) {
        case 'previous':
          console.log('Previous button pressed');
          handlePrevious();
          break;
        case 'play_pause':
          console.log('Play/Pause button pressed');
          handlePlayPause();
          break;
        case 'next':
          console.log('Next button pressed');
          handleNext();
          break;
        case 'close':
          console.log('Close button pressed');
          NotificationService.hideMediaNotification();
          onPlayingChange(false);
          break;
        default:
          console.log('Unknown action:', response.actionIdentifier);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handlePrevious, handlePlayPause, handleNext, onPlayingChange]);

  const handleSeek = async (value: number) => {
    if (soundRef.current) {
      try {

        setPosition(value);

        await soundRef.current.setPositionAsync(value);

        lastSeekTimeRef.current = Date.now();
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const handleSliderStart = () => {
    setIsSeeking(true);
  };

  const handleSliderComplete = async (value: number) => {
    if (soundRef.current) {
      try {

        setPosition(value);

        await soundRef.current.setPositionAsync(value);

        lastSeekTimeRef.current = Date.now();
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
    setIsSeeking(false);
  };

  const handleSliderChange = (value: number) => {
    
    if (isSeeking) {
      setPosition(value);
    }
  };

  const handleVolumeChange = async (value: number) => {

    setVolume(value);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(isMuted ? 0 : value);
    }
  };

  const handleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(newMutedState ? 0 : volume);
    }
  };

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newShuffleState = musicQueue.toggleShuffle();
  };

  const handleRepeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRepeatMode = musicQueue.toggleRepeat();
  };

  const handleShare= async () => {
    
    if (downloadStatus === 'downloading') {
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);


    if (isPlaying && soundRef.current) {
      soundRef.current.pauseAsync();
      onPlayingChange(false);
    }
    
    
    if (isMountedRef.current) {
      setDownloadProgress(0);
      setDownloadStatus('idle');
      setDownloadError('');
      setIsDownloadModalOpen(true);
    }
    
    try {
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        if (isMountedRef.current) {
          setDownloadError('Sharing is not available on this device');
          setDownloadStatus('error');
        }
        return;
      }
      
      if (isMountedRef.current) {
        setDownloadStatus('downloading');
      }
      const audioUrl = await MusicAPI.getStreamUrl(track.id.toString());
      
      
      const safeFileName = `${track.title.replace(/[^a-zA-Z0-9\s]/g, '')}_${track.artist.replace(/[^a-zA-Z0-9\s]/g, '')}.mp3`;
      const fileUri = FileSystem.documentDirectory + safeFileName;
      
      
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        fileUri,
        {},
        (downloadProgress) => {
          if (isMountedRef.current) {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(Math.round(progress * 100));
          }
        }
      );
      
      const downloadResult = await downloadResumable.downloadAsync();
      
      if (downloadResult) {
        try {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'audio/mpeg',
            dialogTitle: `Share ${track.title} by ${track.artist}`,
            UTI: 'public.audio'
          });
        } catch (shareError) {
        }
        
        try {
          if (isMountedRef.current) {
            setDownloadStatus('success');
            
            
            if (downloadTimeoutRef.current) {
              clearTimeout(downloadTimeoutRef.current);
            }
            
            
            downloadTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                try {
                  setIsDownloadModalOpen(false);
                  downloadTimeoutRef.current = null;
                } catch (error) {
                  console.error('Error closing download modal:', error);
                }
              }
            }, 3000);
          }
        } catch (stateError) {
          console.error('Error updating download state:', stateError);
          
          if (isMountedRef.current) {
            try {
              setIsDownloadModalOpen(false);
            } catch (closeError) {
              console.error('Error closing modal on fallback:', closeError);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      if (isMountedRef.current) {
        try {
          setDownloadError('Download failed. Please check your internet connection and try again.');
          setDownloadStatus('error');
        } catch (stateError) {
          console.error('Error updating error state:', stateError);
        }
      }
    }
  };

  const handleCloseDownloadModal = () => {
    try {
      
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
        downloadTimeoutRef.current = null;
      }
      
      if (isMountedRef.current) {
        setIsDownloadModalOpen(false);
      }
    } catch (error) {
      console.error('Error closing download modal:', error);
    }
  };

  const handlePlayerClick = () => {
    setIsFullScreenOpen(true);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const spin = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <>
    <View style={styles.cardroot}>
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.cardTouchable}
          activeOpacity={0.85}
          onPress={() => setIsFullScreenOpen(true)}
        >
          <Image
            source={{ uri: MusicAPI.getOptimalImage(track.images) }}
            style={styles.cardAlbumArt}
            contentFit="cover"
          />
          <View style={styles.cardInfoArea}>
            <Text style={styles.cardTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.cardArtist} numberOfLines={1}>{track.artist}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardIconButton}
          onPress={() => toggleLike(track)}
          activeOpacity={0.7}
        >
          <Ionicons name={isLiked(track.id) ? 'heart' : 'heart-outline'} size={24} color={isLiked(track.id) ? '#1DB954' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardIconButton}
          onPress={handlePlayPause}
          activeOpacity={0.7}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
        </TouchableOpacity>
        </View>
        <View style={styles.whiteProgressBarBg}>
        <View style={[styles.whiteProgressBarFill, { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }]} />
      </View>
      </View>
      

            <Modal
        visible={isDownloadModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseDownloadModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModal}>
            <LinearGradient
              colors={['#1a1a1a', '#2a2a2a']}
              style={styles.modalGradient}
            >
                            <View style={styles.modalHeader}>
                <Ionicons name="download" size={24} color="#1DB954" />
                <Text style={styles.modalTitle}>Download</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseDownloadModal}
                >
                  <Ionicons name="close" size={20} color="#888" />
                </TouchableOpacity>
              </View>
                            <View style={styles.modalContent}>
                                <View style={styles.trackInfo}>
                  <Image
                    source={{ uri: MusicAPI.getOptimalImage(track.images) }}
                    style={styles.modalAlbumArt}
                    contentFit="cover"
                  />
                  <View style={styles.trackDetails}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                </View>

                                <View style={styles.statusContainer}>
                  {downloadStatus === 'idle' && (
                    <Text style={styles.statusText}>Preparing download...</Text>
                  )}
                  
                  {downloadStatus === 'downloading' && (
                    <>
                      <ActivityIndicator size="large" color="#1DB954" style={styles.spinner} />
                      <Text style={styles.statusText}>Downloading...</Text>
                      <Text style={styles.statusText}>To save media, share it to your music library</Text>
                      <View style={styles.downloadProgressContainer}>
                        <View style={styles.downloadProgressBar}>
                          <View style={[styles.progressFillBar, { width: `${downloadProgress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{downloadProgress}%</Text>
                      </View>
                    </>
                  )}
                  
                  {downloadStatus === 'success' && (
                    <>
                      <Ionicons name="checkmark-circle" size={48} color="#1DB954" style={styles.successIcon} />
                      <Text style={styles.successText}>Download Complete!</Text>
                    </>
                  )}
                  
                  {downloadStatus === 'error' && (
                    <>
                      <Ionicons name="alert-circle" size={48} color="#ff4444" style={styles.errorIcon} />
                      <Text style={styles.errorText}>Download Failed</Text>
                      <Text style={styles.errorSubtext}>{downloadError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          handleCloseDownloadModal();
                          setTimeout(() => handleShare(), 300);
                        }}
                      >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

            <FullScreenPlayer
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        track={track}
        isPlaying={isPlaying}
        onPlayingChange={onPlayingChange}
        position={position}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onMuteToggle={handleMute}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onShuffle={handleShuffle}
        onRepeat={handleRepeat}
        onShare={handleShare}
        musicQueue={musicQueue}
        onQueueToggle={onQueueToggle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    backgroundColor: '#1a2341',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardAlbumArt: {
    width: 54,
    height: 54,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: '#222',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardInfoArea: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardArtist: {
    color: '#bfc8e6',
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
  },
  cardIconButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  downloadModal: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalGradient: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    paddingVertical: 10,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalAlbumArt: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#888',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 10,
  },
  spinner: {
    marginBottom: 10,
  },
  downloadProgressContainer: {
    alignItems: 'center',
  },
  downloadProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFillBar: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#888',
  },
  successIcon: {
    marginBottom: 10,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 5,
  },
  successSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: 10,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  visualProgressBarContainer: {
    width: '100%',
    height: 5,
    backgroundColor: 'transparent',
    margin: 0,
    padding: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  visualProgressBarBg: {
    width: '100%',
    height: 5,
    backgroundColor: '#222',
    borderRadius: 0,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
  visualProgressBarFill: {
    height: 10,
    backgroundColor: '#1DB954',
    borderRadius: 0,
    margin: 0,
    padding: 0,
  },
  songTitleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  songTitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 0.2,
  },


  whiteProgressBarBg: {
    marginHorizontal: 8,
    height: 4,
    backgroundColor: '#fff',
    opacity: 0.18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    marginTop: -4,
    marginBottom: 0,
  },
  whiteProgressBarFill: {
    height: 4,
    backgroundColor: '#fff',
    opacity: 1,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardroot: {
    width: '100%',
    backgroundColor: '#1a2341',
    borderRadius: 16,
    flexDirection: 'column',
  },
}); 
 