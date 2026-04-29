import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import TrackPlayer, { Capability, Event, State, useProgress } from 'react-native-track-player';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import { Track } from '../types/music';
import { MusicAPI } from '../lib/music-api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenPlayer } from './FullScreenPlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useColorScheme } from '../hooks/useColorScheme';
import { useTranslation } from 'react-i18next';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  musicQueue: any;
  onQueueToggle: () => void;
  pendingAutoPlayRef?: React.MutableRefObject<boolean>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function Player({
  track,
  isPlaying,
  onPlayingChange,
  musicQueue,
  onQueueToggle,
  pendingAutoPlayRef: externalPendingAutoPlayRef,
}: PlayerProps) {
  const playerReadyRef = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const internalPendingAutoPlayRef = useRef(false);
  const pendingAutoPlayRef = externalPendingAutoPlayRef || internalPendingAutoPlayRef;
  const lastQueueSignatureRef = useRef<string | null>(null);
  const lastTrackIdRef = useRef<string | number | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const theme = useMemo(
    () => ({
      card: isDark ? '#181a1f' : '#fffaf2',
      cardSubtle: isDark ? '#222733' : '#efe4d6',
      textPrimary: isDark ? '#ffffff' : '#2d2219',
      textSecondary: isDark ? '#b9c0d6' : '#7a6251',
      icon: isDark ? '#ffffff' : '#2d2219',
      accent: isDark ? '#1DB954' : '#167c3a',
      progressBg: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(45,34,25,0.18)',
      progressFill: isDark ? '#ffffff' : '#2d2219',
      border: isDark ? '#2a2f3a' : '#e4d5c5',
    }),
    [isDark]
  );
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isSeeking] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState<string>('');
  const [shareMode, setShareMode] = useState(false);

  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();
  const rotationValue = useRef(new Animated.Value(0)).current;
  const rotationAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const downloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTrackIdRef = useRef<string | number | null>(null);
  const queueBuildAbortRef = useRef<AbortController | null>(null);
  const queueBuildGenRef = useRef(0);
  const queueBuildDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);
  const isInternalChangeRef = useRef(false);
  const { position: tpPosition, duration: tpDuration } = useProgress(250);

  
  useEffect(() => {
    const setupPlayer = async () => {
      try {
        if (!playerReadyRef.current) {
          try {
            await TrackPlayer.setupPlayer();
          } catch (setupError: any) {
            if (!setupError?.message?.includes('already been initialized')) {
              throw setupError;
            }
          }
          
          await TrackPlayer.reset();
          await TrackPlayer.updateOptions({
            capabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.SkipToNext,
              Capability.SkipToPrevious,
              Capability.SeekTo,
              Capability.Stop,
            ],
            compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
          });
          await TrackPlayer.setVolume(volume);
          playerReadyRef.current = true;
          if (isMountedRef.current) {
            setPlayerReady(true);
          }
        }
      } catch (error) {
        console.error('Failed to setup TrackPlayer:', error);
      }
    };

    setupPlayer();

    return () => {
      isMountedRef.current = false;
      currentTrackIdRef.current = null;
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
      if (downloadAbortRef.current) {
        downloadAbortRef.current.abort();
      }
      if (queueBuildAbortRef.current) {
        queueBuildAbortRef.current.abort();
      }
      if (queueBuildDebounceRef.current) {
        clearTimeout(queueBuildDebounceRef.current);
      }
      stopRotation();
      TrackPlayer.stop().catch(() => {});
      TrackPlayer.reset().catch(() => {});
    };
  }, [volume]);

  
  useEffect(() => {
    if (!isSeeking) {
      setPosition(tpPosition * 1000);
    }
    setDuration(tpDuration * 1000);
  }, [tpPosition, tpDuration, isSeeking]);

  
  useEffect(() => {
    if (!playerReady) return;
    isInternalChangeRef.current = true;
    if (isPlaying) {
      pendingAutoPlayRef.current = true;
      TrackPlayer.play().catch(() => {});
    } else {
      TrackPlayer.pause().catch(() => {});
    }
    const timer = setTimeout(() => { isInternalChangeRef.current = false; }, 800);
    return () => clearTimeout(timer);
  }, [isPlaying, playerReady, pendingAutoPlayRef]);

  
  const startRotation = useCallback(() => {
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
  }, [rotationValue]);

  const stopRotation = useCallback(() => {
    if (rotationAnimationRef.current) {
      rotationAnimationRef.current.stop();
      rotationAnimationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startRotation();
    } else {
      stopRotation();
    }
    return () => stopRotation();
  }, [isPlaying, startRotation]);

  
  const resolveTrackUrl = async (t: Track): Promise<string> => {
    try {
      const offlineData = await AsyncStorage.getItem(`offline_${t.id}`);
      if (offlineData) {
        const { fileUri } = JSON.parse(offlineData);
        if (fileUri) {
          const info = await FileSystem.getInfoAsync(fileUri);
          if (info.exists) return fileUri;
        }
      }
    } catch {}
    return MusicAPI.getStreamUrl(t.id.toString(), t);
  };

  
  const musicQueueRef = useRef(musicQueue);
  useEffect(() => {
    musicQueueRef.current = musicQueue;
  }, [musicQueue]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const queue = musicQueueRef.current;
    const nextTrack = queue.playNext();
    if (nextTrack) {
      isInternalChangeRef.current = true;
      onPlayingChange(true);
      setTimeout(() => { isInternalChangeRef.current = false; }, 500);
    } else {
      onPlayingChange(false);
    }
  }, [onPlayingChange]);

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const queue = musicQueueRef.current;
    const prevTrack = queue.playPrevious();
    if (prevTrack) {
      
      isInternalChangeRef.current = true;
      pendingAutoPlayRef.current = true;
      onPlayingChange(true);
      setTimeout(() => { isInternalChangeRef.current = false; }, 500);
    }
  }, [pendingAutoPlayRef, onPlayingChange]);

  
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      pendingAutoPlayRef.current = true;
      handleNext();
    });
    return () => sub.remove();
  }, [handleNext, pendingAutoPlayRef]);

  
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      
      if (isInternalChangeRef.current) return;

      
      if (event.state === State.Playing) {
        if (!isPlaying) onPlayingChange(true);
      } else if (event.state === State.Paused) {
        if (isPlaying) onPlayingChange(false);
      }
    });
    return () => sub.remove();
  }, [isPlaying, onPlayingChange]);
  
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      if (isInternalChangeRef.current) return;
      const activeTrack = event.track;
      if (activeTrack?.id && musicQueueRef.current?.tracks?.length) {
        const queueIndex = musicQueueRef.current.tracks.findIndex(
          (t: Track) => t.id.toString() === activeTrack.id
        );
        if (queueIndex >= 0 && musicQueueRef.current.setCurrentIndex) {
          musicQueueRef.current.setCurrentIndex(queueIndex);
        }
      }
    });
    return () => sub.remove();
  }, []);

  
  const syncTrackPlayerQueue = useCallback(async () => {
    if (!playerReady) return;
    if (!musicQueue?.tracks?.length || musicQueue.currentIndex < 0) return;
    if (!track) return;

    if (queueBuildDebounceRef.current) {
      clearTimeout(queueBuildDebounceRef.current);
    }
    if (queueBuildAbortRef.current) {
      queueBuildAbortRef.current.abort();
      queueBuildAbortRef.current = null;
    }

    queueBuildGenRef.current = -(Math.abs(queueBuildGenRef.current) + 1);
    const myGen = Math.abs(queueBuildGenRef.current);

    queueBuildDebounceRef.current = setTimeout(async () => {
      queueBuildDebounceRef.current = null;
      if (Math.abs(queueBuildGenRef.current) !== myGen) return;

      const queueTracks = musicQueue.tracks as Track[];
      const startIndex = musicQueue.currentIndex as number;
      const orderHash = queueTracks.map(t => t.id).join(',');
      const currentTrack = queueTracks[startIndex];
      const signature = `${currentTrack?.id}|${queueTracks.length}|${startIndex}|${orderHash}`;
      const isSameSignature = lastQueueSignatureRef.current === signature;

      const currentTrackId = String(currentTrack?.id);
      if (lastTrackIdRef.current !== currentTrackId) {
        lastTrackIdRef.current = currentTrackId;
        lastQueueSignatureRef.current = null;
      }

      if (isSameSignature) {
        if (pendingAutoPlayRef.current || isPlaying) {
          pendingAutoPlayRef.current = false;
          await TrackPlayer.play();
        } else {
          await TrackPlayer.pause();
        }
        return;
      }

      lastQueueSignatureRef.current = signature;
      currentTrackIdRef.current = currentTrack?.id;

      const current = queueTracks[startIndex];
      if (!current) return;

      const shouldPlayNow = pendingAutoPlayRef.current || isPlaying;
      pendingAutoPlayRef.current = false;

      
      isInternalChangeRef.current = true;
      const suppressTimer = setTimeout(() => { isInternalChangeRef.current = false; }, 1500);

      const activeTrack = await TrackPlayer.getActiveTrack();
      const isSameTrack = activeTrack?.id === current.id.toString();

      try {
        if (isSameTrack) {
          
          const tpQueue = await TrackPlayer.getQueue();
          const currentIndexInTp = tpQueue.findIndex(item => item.id === current.id.toString());
          if (currentIndexInTp !== -1) {
            for (let i = tpQueue.length - 1; i >= 0; i--) {
              if (i !== currentIndexInTp) {
                try {
                  await TrackPlayer.remove(i);
                } catch {}
              }
            }
          }
        } else {
          let currentUrl: string;
          try {
            currentUrl = await resolveTrackUrl(current);
          } catch (streamError) {
            console.error('[Player] Failed to resolve stream URL:', streamError);
            await TrackPlayer.pause();
            onPlayingChange(false);
            Alert.alert(
              t('player.stream_error_title'),
              t('player.stream_error_message')
            );
            return;
          }
          const currentItem = {
            id: current.id.toString(),
            url: currentUrl,
            title: current.title,
            artist: current.artist,
            artwork: MusicAPI.getOptimalImage(current.images),
            duration: current.duration ? Math.floor(current.duration / 1000) : undefined,
          };
          await TrackPlayer.reset();
          await TrackPlayer.add([currentItem]);
          if (shouldPlayNow) await TrackPlayer.play();
          else await TrackPlayer.pause();
        }
      } finally {
        clearTimeout(suppressTimer);
        
        setTimeout(() => { isInternalChangeRef.current = false; }, 800);
      }

      if (queueBuildAbortRef.current) {
        queueBuildAbortRef.current.abort();
      }
      queueBuildAbortRef.current = new AbortController();

      void (async () => {
        const signal = queueBuildAbortRef.current?.signal;
        if (!signal) return;
        try {
          for (let i = startIndex + 1; i < queueTracks.length; i++) {
            if (signal.aborted) break;
            const t = queueTracks[i];
            try {
              const url = await resolveTrackUrl(t);
              await TrackPlayer.add([
                {
                  id: t.id.toString(),
                  url,
                  title: t.title,
                  artist: t.artist,
                  artwork: MusicAPI.getOptimalImage(t.images),
                  duration: t.duration ? Math.floor(t.duration / 1000) : undefined,
                },
              ]);
            } catch {}
          }
          for (let i = startIndex - 1; i >= 0; i--) {
            if (signal.aborted) break;
            const t = queueTracks[i];
            try {
              const url = await resolveTrackUrl(t);
              await TrackPlayer.add(
                [
                  {
                    id: t.id.toString(),
                    url,
                    title: t.title,
                    artist: t.artist,
                    artwork: MusicAPI.getOptimalImage(t.images),
                    duration: t.duration ? Math.floor(t.duration / 1000) : undefined,
                  },
                ],
                0
              );
            } catch (e) {console.error(e)}
          }
        } catch (error) {
          console.error('[Player] Queue build error (gen:', myGen, '):', error);
        } finally {
          if (Math.abs(queueBuildGenRef.current) === myGen) {
            queueBuildGenRef.current = myGen;
          }
          if (queueBuildAbortRef.current?.signal === signal) {
            queueBuildAbortRef.current = null;
          }
        }
      })();
    }, 50);
  }, [playerReady, musicQueue?.tracks, musicQueue?.currentIndex, track, isPlaying, onPlayingChange, pendingAutoPlayRef, t]);

  
  useEffect(() => {
    if (!playerReady) return;
    void syncTrackPlayerQueue();
  }, [playerReady, syncTrackPlayerQueue]);

  
  const handlePlayPause = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      
      isInternalChangeRef.current = true;
      
      if (isPlaying) {
        await TrackPlayer.pause();
        onPlayingChange(false);
      } else {
        pendingAutoPlayRef.current = true;
        await TrackPlayer.play();
        onPlayingChange(true);
      }
      
      
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 500);
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
      isInternalChangeRef.current = false;
    }
  }, [isPlaying, onPlayingChange, pendingAutoPlayRef]);

  const handleSeek = async (value: number) => {
    try {
      setPosition(value);
      await TrackPlayer.seekTo(value / 1000);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    await TrackPlayer.setVolume(isMuted ? 0 : value).catch(() => {});
  };
  const handleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    await TrackPlayer.setVolume(newMutedState ? 0 : volume).catch(() => {});
  };
  const handleShuffle = () => musicQueue.toggleShuffle();

  
  const handleShare = async () => {
    if (!track) return;
    if (downloadStatus === 'downloading') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isPlaying) {
      TrackPlayer.pause().catch(() => {});
      onPlayingChange(false);
    }

    if (isMountedRef.current) {
      setShareMode(true);
      setDownloadProgress(0);
      setDownloadStatus('idle');
      setDownloadError('');
      setIsDownloadModalOpen(true);
    }

    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
    }
    downloadAbortRef.current = new AbortController();

    try {
      const signal = downloadAbortRef.current.signal;
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        if (isMountedRef.current) {
          setDownloadError('Sharing is not available on this device');
          setDownloadStatus('error');
        }
        return;
      }

      if (isMountedRef.current) setDownloadStatus('downloading');
      const audioUrl = await MusicAPI.getDownloadUrl(track.id.toString(), track);

      const sanitizeFileName = (name: string): string => {
        if (!name) return 'unknown';
        const sanitized = name.replace(/[<>:"/\\|?*]/g, '').trim();
        return sanitized.length > 0 ? sanitized.substring(0, 50) : 'unknown';
      };
      const safeTitle = sanitizeFileName(track.title);
      const safeArtist = sanitizeFileName(track.artist);
      const safeFileName = `${safeTitle}_${safeArtist}_${Date.now()}.mp3`;
      const fileUri = FileSystem.documentDirectory + safeFileName;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        if (isMountedRef.current) {
          setDownloadError('File already exists. Please try again for a unique filename.');
          setDownloadStatus('error');
        }
        return;
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        fileUri,
        {},
        (downloadProgress) => {
          if (isMountedRef.current && !signal.aborted) {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(Math.round(progress * 100));
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (signal.aborted) return;

      if (downloadResult) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'audio/mpeg',
          dialogTitle: `Share ${track.title} by ${track.artist}`,
          UTI: 'public.audio',
        });

        if (isMountedRef.current) {
          setDownloadStatus('success');
          if (downloadTimeoutRef.current) clearTimeout(downloadTimeoutRef.current);
          downloadTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setIsDownloadModalOpen(false);
              downloadTimeoutRef.current = null;
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      if (isMountedRef.current) {
        setDownloadError('Download failed. Please check your internet connection and try again.');
        setDownloadStatus('error');
      }
    }
  };

  const handleCloseDownloadModal = () => {
    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
    }
    if (downloadTimeoutRef.current) {
      clearTimeout(downloadTimeoutRef.current);
      downloadTimeoutRef.current = null;
    }
    if (isMountedRef.current) {
      setIsDownloadModalOpen(false);
      setShareMode(false);
    }
  };

  if (!track) return null;

  
  return (
    <>
      <View style={styles.cardroot}>
        <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={[styles.cardArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardIconButton} onPress={() => toggleLike(track)} activeOpacity={0.7}>
            <Ionicons
              name={isLiked(track.id) ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked(track.id) ? theme.accent : theme.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardIconButton} onPress={onQueueToggle} activeOpacity={0.7}>
            <Ionicons name="list" size={24} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardIconButton} onPress={handlePlayPause} activeOpacity={0.7}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={theme.icon} />
          </TouchableOpacity>
        </View>
        <View style={[styles.whiteProgressBarBg, { backgroundColor: theme.progressBg }]}>
          <View
            style={[
              styles.whiteProgressBarFill,
              {
                backgroundColor: theme.progressFill,
                width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
              },
            ]}
          />
        </View>
      </View>

      {/* Download Modal */}
      <Modal visible={isDownloadModalOpen} transparent animationType="fade" onRequestClose={handleCloseDownloadModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModal}>
            <LinearGradient colors={['#1a1a1a', '#2a2a2a']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <Ionicons name="download" size={24} color="#1DB954" />
                <Text style={styles.modalTitle}>{shareMode ? t('player.share') : t('components.download')}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseDownloadModal}>
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
                    <Text style={styles.statusText}>{t('components.preparing_download')}</Text>
                  )}
                  {downloadStatus === 'downloading' && (
                    <>
                      <ActivityIndicator size="large" color="#1DB954" style={styles.spinner} />
                      <Text style={styles.statusText}>{t('components.downloading')}</Text>
                      <Text style={styles.statusText}>{t('components.download_hint')}</Text>
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
                      <Text style={styles.successText}>{t('components.download_complete')}</Text>
                    </>
                  )}
                  {downloadStatus === 'error' && (
                    <>
                      <Ionicons name="alert-circle" size={48} color="#ff4444" style={styles.errorIcon} />
                      <Text style={styles.errorText}>{t('components.download_failed')}</Text>
                      <Text style={styles.errorSubtext}>{downloadError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          handleCloseDownloadModal();
                          setTimeout(() => handleShare(), 300);
                        }}
                      >
                        <Text style={styles.retryButtonText}>{t('components.try_again')}</Text>
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
    borderWidth: 1,
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
    backgroundColor: 'transparent',
    borderRadius: 16,
    flexDirection: 'column',
  },
});