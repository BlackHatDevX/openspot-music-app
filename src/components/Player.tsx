'use client';

import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  Download,
  ListMusic
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { FullScreenPlayer } from './FullScreenPlayer';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useMusicQueue, RepeatMode } from '@/hooks/useMusicQueue';

interface PlayerState {
  volume: number;
  isMuted: boolean;
  currentTime: number;
  trackId: string | null;
}

const PLAYER_STATE_KEY = 'openspot_player_state';

interface PlayerProps {
  currentTrack?: Track | null;
  onPlayingStateChange?: (isPlaying: boolean) => void;
  musicQueue?: ReturnType<typeof useMusicQueue>;
  onQueueClick?: () => void;
}

export function Player({ currentTrack, onPlayingStateChange, musicQueue, onQueueClick }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [initialChunkUrl, setInitialChunkUrl] = useState<string | null>(null);
  const [fullBlobUrl, setFullBlobUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null); // For seamless transitions
  const loadingAbortController = useRef<AbortController | null>(null);
  const fullDownloadController = useRef<AbortController | null>(null);
  const currentTrackId = useRef<string | null>(null);
  const isAutoPlaying = useRef<boolean>(false);
  const isTransitioning = useRef<boolean>(false);
  const transitionStartTime = useRef<number>(0);
  const hasRestoredTime = useRef<boolean>(false);

  // Liked songs functionality
  const { isLiked, toggleLike } = useLikedSongs();

  // Restore player state from session storage
  useEffect(() => {
    try {
      const storedState = sessionStorage.getItem(PLAYER_STATE_KEY);
      if (storedState) {
        const parsedState: PlayerState = JSON.parse(storedState);
        setVolume(parsedState.volume);
        setIsMuted(parsedState.isMuted);
        
        // Restore time only if track is the same
        if (currentTrack && parsedState.trackId === currentTrack.id.toString()) {
          setCurrentTime(parsedState.currentTime);
        }
        console.log('▶️ Player state restored from session storage');
      }
    } catch (error) {
      console.error('❌ Failed to restore player state:', error);
    }
  }, []); // Run only on initial mount

  // Save player state to session storage
  useEffect(() => {
    const saveState = () => {
      try {
        const state: PlayerState = {
          volume,
          isMuted,
          currentTime,
          trackId: currentTrack?.id.toString() || null,
        };
        sessionStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('❌ Failed to save player state:', error);
      }
    };
    
    // Save state when component unloads
    window.addEventListener('beforeunload', saveState);
    
    return () => {
      window.removeEventListener('beforeunload', saveState);
    };
  }, [volume, isMuted, currentTime, currentTrack]);

  // Handle smooth audio source switching with crossfade
  const switchAudioSource = useCallback(async (newSrc: string, preserveTime: boolean = true) => {
    const primaryAudio = audioRef.current;
    const secondaryAudio = secondaryAudioRef.current;
    if (!primaryAudio || !secondaryAudio) return false;

    // Prevent multiple simultaneous transitions
    if (isTransitioning.current) {
      console.log('🔄 Transition already in progress, skipping...');
      return false;
    }

    try {
      isTransitioning.current = true;
      
      const currentTime = preserveTime ? primaryAudio.currentTime : 0;
      const wasPlaying = !primaryAudio.paused;
      const originalVolume = primaryAudio.volume;
      transitionStartTime.current = currentTime;

      console.log('🔄 Starting seamless audio transition...', { currentTime, wasPlaying, originalVolume });

      // Prepare secondary audio element with minimal DOM impact
      secondaryAudio.src = newSrc;
      secondaryAudio.volume = 0; // Start secondary audio at 0 volume for fade-in
      secondaryAudio.preload = 'auto';
      
      // Wait for secondary audio to be ready with shorter timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Secondary audio load timeout'));
        }, 800); // Reduced timeout for faster transitions

        const handleCanPlay = () => {
          clearTimeout(timeout);
          secondaryAudio.removeEventListener('canplay', handleCanPlay);
          secondaryAudio.removeEventListener('error', handleError);
          resolve(void 0);
        };

        const handleError = (e: Event) => {
          clearTimeout(timeout);
          secondaryAudio.removeEventListener('canplay', handleCanPlay);
          secondaryAudio.removeEventListener('error', handleError);
          reject(e);
        };

        secondaryAudio.addEventListener('canplay', handleCanPlay);
        secondaryAudio.addEventListener('error', handleError);
      });

      // Set the time on secondary audio
      if (preserveTime && currentTime > 0) {
        secondaryAudio.currentTime = currentTime;
      }

      // Start secondary audio if primary was playing
      if (wasPlaying) {
        await secondaryAudio.play();
        console.log('▶️ Secondary audio started at', secondaryAudio.currentTime);
      }

      // Ultra-fast crossfade to minimize UI disruption
      if (wasPlaying) {
        const crossfadeDuration = 50; // Reduced to 50ms for minimal glitch
        const steps = 3; // Reduced steps for faster execution
        const stepDuration = crossfadeDuration / steps;
        
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const primaryVol = (1 - progress) * originalVolume;
          const secondaryVol = progress * originalVolume;
          
          primaryAudio.volume = Math.max(0, primaryVol);
          secondaryAudio.volume = Math.min(1, secondaryVol);
          
          if (i < steps) {
            await new Promise(resolve => setTimeout(resolve, stepDuration));
          }
        }
      }

      // Pause primary audio after crossfade
      primaryAudio.pause();
      
      // Swap audio elements: make secondary the new primary
      primaryAudio.src = secondaryAudio.src;
      primaryAudio.currentTime = secondaryAudio.currentTime;
      primaryAudio.volume = originalVolume;
      
      // Stop secondary audio and clean up
      secondaryAudio.pause();
      secondaryAudio.src = '';
      
      // Resume primary audio if it was playing
      if (wasPlaying) {
        await primaryAudio.play();
      }

      console.log('✅ Seamless audio transition completed successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ Seamless transition failed, attempting fallback:', error);
      
      // Fallback: direct source change without viewport locking
      try {
        const currentTime = preserveTime ? primaryAudio.currentTime : 0;
        const wasPlaying = !primaryAudio.paused;
        
        if (wasPlaying) {
          primaryAudio.pause();
        }
        
        primaryAudio.src = newSrc;
        primaryAudio.load();
        
        if (preserveTime && currentTime > 0) {
          primaryAudio.currentTime = currentTime;
        }
        
        if (wasPlaying) {
          await primaryAudio.play();
        }
        
        console.log('✅ Fallback transition completed');
        return true;
      } catch (fallbackError) {
        console.error('❌ Both seamless and fallback transitions failed:', fallbackError);
        return false;
      }
    } finally {
      isTransitioning.current = false;
    }
  }, []);

  // Fetch initial chunk (4MB) for immediate playback
  const fetchInitialChunk = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";

      xhr.addEventListener("load", function () {
        if (xhr.status === 200 || xhr.status === 206) {
          const URL = window.URL || window.webkitURL;
          const blobUrl = URL.createObjectURL(xhr.response);
          console.log('✅ Initial chunk (4MB) downloaded, ready for immediate playback');
          resolve(blobUrl);
        } else {
          reject(new Error(`Failed to download initial chunk: ${xhr.status}`));
        }
      }, false);

      xhr.addEventListener("error", function() {
        reject(new Error("Network error during initial chunk download"));
      }, false);

      xhr.addEventListener("abort", function() {
        reject(new Error("Initial chunk download was aborted"));
      }, false);

      // Request first 4MB for immediate playback for a more robust buffer
      xhr.setRequestHeader('Range', 'bytes=0-8194303'); // 4MB = 4 * 1024 * 1024 - 1
      xhr.setRequestHeader('Accept', 'audio/*');
      xhr.send();
    });
  }, []);

  // Fetch full audio file in background for complete playback and download
  const fetchFullAudioFile = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";

      xhr.addEventListener("load", function () {
        if (xhr.status === 200 || xhr.status === 206) {
          const URL = window.URL || window.webkitURL;
          const blobUrl = URL.createObjectURL(xhr.response);
          console.log('✅ Full audio file downloaded and cached');
          resolve(blobUrl);
        } else {
          reject(new Error(`Failed to download full audio: ${xhr.status}`));
        }
      }, false);

      xhr.addEventListener("progress", function(event) {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setDownloadProgress(progress);
          console.log(`📥 Full download progress: ${progress}%`);
        }
      }, false);

      xhr.addEventListener("error", function() {
        reject(new Error("Network error during full audio download"));
      }, false);

      xhr.addEventListener("abort", function() {
        reject(new Error("Full audio download was aborted"));
      }, false);

      // Request full file without Range header
      xhr.setRequestHeader('Accept', 'audio/*');
      xhr.send();
    });
  }, []);

  // Load stream URL when track changes
  useEffect(() => {
    if (currentTrack) {
      // Immediately stop current playback when switching tracks
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPlayingStateChange?.(false);
        console.log('⏸️ Stopped current track for new selection');
      }
      
      // Reset auto-playing flag
      isAutoPlaying.current = false;
      hasRestoredTime.current = false;
      
      loadStreamUrl(currentTrack.id.toString());
    } else {
      // Cancel any ongoing loading
      if (loadingAbortController.current) {
        loadingAbortController.current.abort();
      }
      if (fullDownloadController.current) {
        fullDownloadController.current.abort();
      }
      // Clean up blob URLs
      if (initialChunkUrl) {
        URL.revokeObjectURL(initialChunkUrl);
        setInitialChunkUrl(null);
      }
      if (fullBlobUrl) {
        URL.revokeObjectURL(fullBlobUrl);
        setFullBlobUrl(null);
      }
      // Reset current track ID
      currentTrackId.current = null;
      setStreamUrl(null);
      setIsPlaying(false);
      setIsLoading(false);
      setIsBuffering(false);
      setDownloadProgress(0);
    }
  }, [currentTrack]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Restore currentTime when audio is ready
    if (currentTime > 0 && !hasRestoredTime.current && audio.readyState > 0) {
      audio.currentTime = currentTime;
      hasRestoredTime.current = true;
      console.log(` resumed at ${currentTime}`);
    }

    const handleTimeUpdate = () => {
      // Reduce update frequency during transitions to prevent layout shifts
      if (isTransitioning.current) {
        return;
      }
      
      setCurrentTime(audio.currentTime);
      
      // Check if we're near the end of the initial chunk and need to switch to full audio
      if (initialChunkUrl && fullBlobUrl && audio.src && audio.src.includes(initialChunkUrl) && !isTransitioning.current) {
        const duration = audio.duration;
        const currentTime = audio.currentTime;
        
        // Only switch if we have valid duration and are approaching the end
        if (duration && currentTime > 0 && !isNaN(duration) && !isNaN(currentTime)) {
          // Switch to full audio when we're 8 seconds from the end or at 80% of chunk duration
          // More conservative switching to prevent interruptions
          const shouldSwitch = currentTime >= duration - 8 || currentTime >= duration * 0.8;
          
          if (shouldSwitch && !isAutoPlaying.current) {
            console.log('🔄 Switching to full audio proactively...', {
              currentTime,
              duration,
              percentPlayed: (currentTime / duration) * 100,
              timeRemaining: duration - currentTime
            });
            
            // Prevent multiple switch attempts
            isAutoPlaying.current = true;
            
            // Add slight delay to ensure smooth transition
            setTimeout(() => {
              switchAudioSource(fullBlobUrl, true).then(success => {
                if (success) {
                  console.log('✅ Time-based switch to full audio completed seamlessly!');
                } else {
                  console.warn('⚠️ Failed to switch to full audio');
                }
              }).finally(() => {
                isAutoPlaying.current = false;
              });
            }, 50);
          }
        }
      }
    };
    
    const handleDurationChange = () => setDuration(audio.duration);
    
    const handleEnded = () => {
      // If we ended on the initial chunk and have full audio, switch to it
      if (initialChunkUrl && fullBlobUrl && audio.src.includes(initialChunkUrl) && !isTransitioning.current) {
        console.log('🔄 Initial chunk ended, switching to full audio for continuation...');
        switchAudioSource(fullBlobUrl, false).then(success => {
          if (success && audioRef.current) {
            // Continue playing from where we left off
            audioRef.current.play().catch(console.error);
          }
        });
        return;
      }
      
      // Normal end of track behavior
      setIsPlaying(false);
      onPlayingStateChange?.(false);
      
      // Auto-play next track if available
      if (musicQueue) {
        const nextTrack = musicQueue.playNext();
        if (nextTrack) {
          console.log('🎵 Auto-playing next track:', nextTrack.title);
        }
      }
    };
    
    const handleLoadStart = () => {
      if (!isTransitioning.current) {
        setIsBuffering(true);
      }
    };
    
    const handleCanPlay = () => {
      if (!isTransitioning.current) {
        setIsBuffering(false);
        setIsLoading(false);
        console.log('🎵 Audio ready to play');
      }
    };
    
    const handleWaiting = () => {
      if (!isTransitioning.current) {
        setIsBuffering(true);
        console.log('⏳ Audio buffering...');
      }
    };
    
    const handlePlaying = () => {
      if (!isTransitioning.current) {
        setIsBuffering(false);
        console.log('▶️ Audio playing smoothly');
      }
    };
    
    const handleError = (e: Event) => {
      // Skip error handling during transitions as they're expected
      if (isTransitioning.current) {
        console.log('🔄 Audio error during transition (expected), ignoring...');
        return;
      }
      
      console.error('Audio error:', e);
      
      // Try to recover from the error if we have alternative sources
      const audio = audioRef.current;
      if (audio && (fullBlobUrl || initialChunkUrl || streamUrl)) {
        console.log('🔄 Attempting to recover from audio error...');
        
        // Try to switch to an alternative source
        const fallbackSrc = fullBlobUrl || initialChunkUrl || streamUrl;
        if (fallbackSrc && audio.src !== fallbackSrc) {
          console.log('🔄 Switching to fallback audio source...');
          
          setTimeout(() => {
            try {
              const wasPlaying = isPlaying;
              const currentTime = audio.currentTime || 0;
              
              audio.src = fallbackSrc;
              audio.load();
              
              if (currentTime > 0) {
                audio.currentTime = currentTime;
              }
              
              if (wasPlaying) {
                audio.play().catch(console.error);
              }
              
              console.log('✅ Successfully recovered from audio error');
            } catch (recoveryError) {
              console.error('❌ Failed to recover from audio error:', recoveryError);
              setIsLoading(false);
              setIsBuffering(false);
              setIsPlaying(false);
              onPlayingStateChange?.(false);
            }
          }, 500);
        } else {
          // No fallback available
          setIsLoading(false);
          setIsBuffering(false);
          setIsPlaying(false);
          onPlayingStateChange?.(false);
        }
      } else {
        // No audio element or sources available
        setIsLoading(false);
        setIsBuffering(false);
        setIsPlaying(false);
        onPlayingStateChange?.(false);
      }
    };
    
    const handleLoadedData = () => {
      if (!isTransitioning.current) {
        console.log('✅ Audio data loaded');
        setIsLoading(false);
        setIsBuffering(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack, onPlayingStateChange, musicQueue, initialChunkUrl, fullBlobUrl, switchAudioSource]);

  // Effect to proactively switch from initial chunk to full blob as soon as it's ready
  useEffect(() => {
    const audio = audioRef.current;
    
    // Conditions for proactive switch:
    // 1. The full audio blob URL is available.
    // 2. The initial chunk URL is also set (meaning we started with a chunk).
    // 3. The audio element is currently playing the initial chunk.
    // 4. We are not already in the middle of another transition.
    if (fullBlobUrl && initialChunkUrl && audio && audio.src === initialChunkUrl && !isTransitioning.current) {
      console.log('🚀 Full audio downloaded, switching proactively for seamless experience.');
      
      // Add a small delay to ensure the audio is stable before switching
      setTimeout(() => {
        if (fullBlobUrl && initialChunkUrl && audio && audio.src === initialChunkUrl && !isTransitioning.current) {
          switchAudioSource(fullBlobUrl, true).then(success => {
            if (success) {
              console.log('✅ Proactive switch to full audio completed seamlessly.');
            } else {
              console.warn('⚠️ Proactive switch to full audio failed.');
            }
          });
        }
      }, 100); // Small delay for stability
    }
  }, [fullBlobUrl, initialChunkUrl, switchAudioSource]);

  const loadStreamUrl = useCallback(async (trackId: string) => {
    // Don't reload if we're already loading this track
    if (currentTrackId.current === trackId && (isLoading || initialChunkUrl)) {
      console.log('🔄 Track already loading or loaded:', trackId);
      return;
    }

    // Cancel any previous loading request
    if (loadingAbortController.current) {
      loadingAbortController.current.abort();
    }
    if (fullDownloadController.current) {
      fullDownloadController.current.abort();
    }

    // Set current track ID
    currentTrackId.current = trackId;

    // Create new abort controllers
    const abortController = new AbortController();
    const fullAbortController = new AbortController();
    loadingAbortController.current = abortController;
    fullDownloadController.current = fullAbortController;

    try {
      setIsLoading(true);
      setDownloadProgress(0);
      console.log('🎵 Loading stream URL for track:', trackId);
      
      // Get the streaming URL from API
      const url = await MusicAPI.getStreamUrl(trackId);
      
      // Only proceed if this request wasn't cancelled
      if (!abortController.signal.aborted && currentTrackId.current === trackId) {
        console.log('🔗 Stream URL received, fetching initial chunk for immediate playback...');
        setStreamUrl(url);
        
        try {
          // Fetch initial 4MB chunk for immediate playback
          const chunkBlobUrl = await fetchInitialChunk(url);
          
          if (!abortController.signal.aborted && currentTrackId.current === trackId) {
            setInitialChunkUrl(chunkBlobUrl);
            console.log('✅ Initial chunk ready, starting playback...');
            setIsLoading(false);
            
            // Auto-play the initial chunk immediately
            if (audioRef.current && !isAutoPlaying.current) {
              const audio = audioRef.current;
              isAutoPlaying.current = true;
              
              // Small delay to ensure any previous operations are complete
              setTimeout(async () => {
                try {
                  // Only proceed if we're still loading the same track
                  if (currentTrackId.current === trackId && !abortController.signal.aborted) {
                    audio.src = chunkBlobUrl;
                    
                    // Wait for the audio to be ready
                    await new Promise((resolve) => {
                      const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        resolve(void 0);
                      };
                      audio.addEventListener('canplay', handleCanPlay);
                      
                      // Fallback timeout
                      setTimeout(resolve, 1000);
                    });
                    
                    // Start playback if still the current track
                    if (currentTrackId.current === trackId && !abortController.signal.aborted) {
                      await audio.play();
                      setIsPlaying(true);
                      onPlayingStateChange?.(true);
                      console.log('▶️ Auto-playing initial chunk');
                    }
                  }
                } catch (error) {
                  console.warn('⚠️ Auto-play failed, user interaction may be required:', error);
                  setIsPlaying(false);
                  onPlayingStateChange?.(false);
                } finally {
                  isAutoPlaying.current = false;
                }
              }, 100);
            }
            
            // Start full download in background
            console.log('📥 Starting full audio download in background...');
            fetchFullAudioFile(url).then(fullBlobUrl => {
              if (!fullAbortController.signal.aborted && currentTrackId.current === trackId) {
                setFullBlobUrl(fullBlobUrl);
                console.log('✅ Full audio file cached and ready for seamless transition');
              } else {
                // Clean up if cancelled
                URL.revokeObjectURL(fullBlobUrl);
              }
            }).catch(error => {
              if (!fullAbortController.signal.aborted) {
                console.warn('⚠️ Full download failed, continuing with progressive streaming:', error);
              }
            });
          } else {
            // Clean up if cancelled
            URL.revokeObjectURL(chunkBlobUrl);
          }
        } catch (chunkError) {
          if (!abortController.signal.aborted && currentTrackId.current === trackId) {
            console.warn('⚠️ Initial chunk failed, falling back to direct streaming:', chunkError);
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      if (!abortController.signal.aborted && currentTrackId.current === trackId) {
        console.error('❌ Failed to load stream URL:', error);
        setIsLoading(false);
        setDownloadProgress(0);
      }
    }
  }, [fetchInitialChunk, fetchFullAudioFile, switchAudioSource]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (loadingAbortController.current) {
        loadingAbortController.current.abort();
      }
      if (fullDownloadController.current) {
        fullDownloadController.current.abort();
      }
      if (initialChunkUrl) {
        URL.revokeObjectURL(initialChunkUrl);
      }
      if (fullBlobUrl) {
        URL.revokeObjectURL(fullBlobUrl);
      }
    };
  }, []);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    // Use full blob if available, otherwise initial chunk, otherwise stream URL
    const audioSrc = fullBlobUrl || initialChunkUrl || streamUrl;
    if (!audioSrc) return;

    const audio = audioRef.current;

    try {
      if (isPlaying) {
        // Pause the audio
        audio.pause();
        setIsPlaying(false);
        onPlayingStateChange?.(false);
      } else {
        // Only update source if it's different and not already set
        if (!audio.src || audio.src !== audioSrc) {
          console.log('🔄 Updating audio source before play...');
          audio.src = audioSrc;
          // Small delay to ensure source is loaded
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Play the audio
        await audio.play();
        setIsPlaying(true);
        onPlayingStateChange?.(true);
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      onPlayingStateChange?.(false);
      
      // If play failed, try to reload the audio source
      if (!isPlaying && audioSrc) {
        console.log('🔄 Retrying with fresh audio source...');
        try {
          audio.load();
          await new Promise(resolve => setTimeout(resolve, 200));
          await audio.play();
          setIsPlaying(true);
          onPlayingStateChange?.(true);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    handleSeek(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const handleVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    handleVolumeChange(newVolume);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    try {
      // Use full blob if available, otherwise initial chunk, otherwise stream URL
      const downloadUrl = fullBlobUrl || initialChunkUrl || streamUrl;
      if (!downloadUrl) return;

      console.log('📥 Starting download for:', currentTrack.title);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${currentTrack.artist} - ${currentTrack.title}.flac`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ Download initiated');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayerClick = () => {
    if (currentTrack) {
      setIsFullScreenOpen(true);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTrack) {
      toggleLike(currentTrack);
    }
  };

  const handleNext = () => {
    if (musicQueue) {
      const nextTrack = musicQueue.playNext();
      if (nextTrack) {
        console.log('⏭️ Playing next track:', nextTrack.title);
      }
    }
  };

  const handlePrevious = () => {
    if (musicQueue) {
      const prevTrack = musicQueue.playPrevious();
      if (prevTrack) {
        console.log('⏮️ Playing previous track:', prevTrack.title);
      }
    }
  };

  const handleRepeat = () => {
    if (musicQueue) {
      const newMode = musicQueue.toggleRepeat();
      console.log('🔁 Repeat mode changed to:', newMode);
    }
  };

  const handleShuffle = () => {
    if (musicQueue) {
      const isShuffled = musicQueue.toggleShuffle();
      console.log('🔀 Shuffle toggled:', isShuffled ? 'ON' : 'OFF');
    }
  };

  const getRepeatIcon = (): RepeatMode => {
    return musicQueue?.repeatMode || 'off';
  };

  const isShuffled = () => {
    return musicQueue?.isShuffled || false;
  };

  return (
    <>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-900 border-t border-gray-800 w-full overflow-hidden"
      >
        {/* Hidden Audio Element */}
        {(fullBlobUrl || initialChunkUrl || streamUrl) && (
          <>
            <audio
              ref={audioRef}
              preload="auto"
            />
            <audio
              ref={secondaryAudioRef}
              preload="none"
              style={{ display: 'none' }}
            />
          </>
        )}

        {/* Progress Bar - Top of Player (Mobile) */}
        <div className="md:hidden">
          <div className="flex items-center gap-1 px-3 py-1">
            <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeekInput}
                disabled={!currentTrack || !fullBlobUrl}
                className={`w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider ${
                  !fullBlobUrl ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  background: `linear-gradient(to right, #1db954 0%, #1db954 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                }}
                title={!fullBlobUrl ? 'Seeking disabled until full audio is downloaded' : 'Seek to position'}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Main Player Content */}
        <div className="px-2 md:px-4 py-2 md:py-3">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Song Info - Horizontal Layout Above Controls */}
            {currentTrack && (
              <motion.div 
                className="flex items-center gap-3 mb-3 cursor-pointer"
                onClick={handlePlayerClick}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="w-12 h-12 bg-gray-800 rounded-md overflow-hidden flex-shrink-0 relative">
                  <img
                    src={MusicAPI.getOptimalImage(currentTrack.images)}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Loading/Buffering Indicator */}
                  {(isLoading || isBuffering) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {/* Download Progress */}
                  {downloadProgress > 0 && downloadProgress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-medium text-sm truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-gray-400 text-xs truncate">
                    {currentTrack.artist}
                    {/* {isBuffering && (
                      <span className="ml-2 text-yellow-400">• Buffering</span>
                    )}
                    {fullBlobUrl && (
                      <span className="ml-2 text-green-400">• Cached</span>
                    )} */}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLikeClick}
                  className={`transition-colors p-1 flex-shrink-0 ${
                    currentTrack && isLiked(currentTrack.id)
                      ? 'text-red-500 hover:text-red-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={currentTrack && isLiked(currentTrack.id) ? 'Unlike' : 'Like'}
                >
                  <Heart 
                    size={16} 
                    fill={currentTrack && isLiked(currentTrack.id) ? 'currentColor' : 'none'}
                  />
                </motion.button>
              </motion.div>
            )}

            {/* Controls - Mobile */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDownload}
                  disabled={!currentTrack || (!fullBlobUrl && !initialChunkUrl && !streamUrl)}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  title={fullBlobUrl ? "Download (Full Quality)" : initialChunkUrl ? "Download (Preview)" : "Download"}
                >
                  <Download size={16} />
                </motion.button>
              </div>

              {/* Center Controls */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrevious}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!musicQueue || !musicQueue.hasPrevious()}
                  title="Previous track"
                >
                  <SkipBack size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlayPause}
                  disabled={!currentTrack || (!fullBlobUrl && !initialChunkUrl && !streamUrl)}
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause size={20} className="ml-0.5" />
                  ) : (
                    <Play size={20} className="ml-1" />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!musicQueue || !musicQueue.hasNext()}
                  title="Next track"
                >
                  <SkipForward size={20} />
                </motion.button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShuffle}
                  className={`transition-colors ${
                    isShuffled() 
                      ? 'text-green-500 hover:text-green-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={!musicQueue || musicQueue.queueLength <= 1}
                  title={isShuffled() ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRepeat}
                  className={`transition-colors ${
                    getRepeatIcon() !== 'off'
                      ? 'text-green-500 hover:text-green-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={!musicQueue}
                  title={
                    getRepeatIcon() === 'off' ? 'Enable repeat' :
                    getRepeatIcon() === 'all' ? 'Repeat all' : 'Repeat one'
                  }
                >
                  <div className="relative">
                    <Repeat size={16} />
                    {getRepeatIcon() === 'one' && (
                      <span className="absolute -top-1 -right-1 text-xs font-bold">1</span>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between w-full max-w-screen-xl mx-auto min-w-0">
            {/* Track Info - Desktop */}
            <motion.div 
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer max-w-[35%]"
              onClick={handlePlayerClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentTrack ? (
                <>
                  <div className="w-14 h-14 bg-gray-800 rounded-md overflow-hidden flex-shrink-0 relative">
                    <img
                      src={MusicAPI.getOptimalImage(currentTrack.images)}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Loading/Buffering Indicator */}
                    {(isLoading || isBuffering) && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {/* Download Progress */}
                    {downloadProgress > 0 && downloadProgress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <h4 className="text-white font-medium text-sm hover:underline truncate">
                      {currentTrack.title}
                    </h4>
                    <p className="text-gray-400 text-xs hover:underline truncate">
                      {currentTrack.artist}
                      {/* {isBuffering && (
                        <span className="ml-2 text-yellow-400">• Buffering</span>
                      )}
                      {fullBlobUrl && (
                        <span className="ml-2 text-green-400">• Cached</span>
                      )} */}
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLikeClick}
                    className={`transition-colors p-1 flex-shrink-0 ${
                      currentTrack && isLiked(currentTrack.id)
                        ? 'text-red-500 hover:text-red-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title={currentTrack && isLiked(currentTrack.id) ? 'Unlike' : 'Like'}
                  >
                    <Heart 
                      size={16} 
                      fill={currentTrack && isLiked(currentTrack.id) ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                    <Play size={20} className="text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-gray-400 text-sm">No track selected</h4>
                    <p className="text-gray-500 text-xs">Choose a song to play</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Player Controls - Desktop */}
            <div className="flex flex-col items-center gap-2 flex-1 max-w-md mx-4 min-w-0">
              {/* Control Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShuffle}
                  className={`transition-colors ${
                    isShuffled() 
                      ? 'text-green-500 hover:text-green-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={!musicQueue || musicQueue.queueLength <= 1}
                  title={isShuffled() ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle size={16} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrevious}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!musicQueue || !musicQueue.hasPrevious()}
                  title="Previous track"
                >
                  <SkipBack size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlayPause}
                  disabled={!currentTrack || (!fullBlobUrl && !initialChunkUrl && !streamUrl)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause size={16} className="ml-0.5" />
                  ) : (
                    <Play size={16} className="ml-0.5" />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!musicQueue || !musicQueue.hasNext()}
                  title="Next track"
                >
                  <SkipForward size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRepeat}
                  className={`transition-colors ${
                    getRepeatIcon() !== 'off'
                      ? 'text-green-500 hover:text-green-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={!musicQueue}
                  title={
                    getRepeatIcon() === 'off' ? 'Enable repeat' :
                    getRepeatIcon() === 'all' ? 'Repeat all' : 'Repeat one'
                  }
                >
                  <div className="relative">
                    <Repeat size={16} />
                    {getRepeatIcon() === 'one' && (
                      <span className="absolute -top-1 -right-1 text-xs font-bold">1</span>
                    )}
                  </div>
                </motion.button>
              </div>

              {/* Progress Bar - Desktop */}
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekInput}
                    disabled={!currentTrack || !fullBlobUrl}
                    className={`w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider ${
                      !fullBlobUrl ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      background: `linear-gradient(to right, #1db954 0%, #1db954 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                    }}
                    title={!fullBlobUrl ? 'Seeking disabled until full audio is downloaded' : 'Seek to position'}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 flex-shrink-0">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume & Additional Controls - Desktop */}
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onQueueClick}
                disabled={!musicQueue || musicQueue.queueLength === 0}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Show queue"
              >
                <ListMusic size={16} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDownload}
                disabled={!currentTrack || (!fullBlobUrl && !initialChunkUrl && !streamUrl)}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title={fullBlobUrl ? "Download (Full Quality)" : initialChunkUrl ? "Download (Preview)" : "Download"}
              >
                <Download size={16} />
              </motion.button>
              
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Volume2 size={16} />
                </motion.button>
                
                <div className="w-20">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeInput}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #1db954 0%, #1db954 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full Screen Player */}
      <FullScreenPlayer
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        currentTrack={currentTrack || null}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        onPlayPause={togglePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        onDownload={handleDownload}
        isLiked={currentTrack ? isLiked(currentTrack.id) : false}
        onToggleLike={handleLikeClick}
        musicQueue={musicQueue}
      />
    </>
  );
}