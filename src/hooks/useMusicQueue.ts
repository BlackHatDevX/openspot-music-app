import { useState, useCallback, useEffect } from 'react';
import { Track } from '@/types/music';

export type RepeatMode = 'off' | 'one' | 'all';

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  originalTracks: Track[]; // For shuffle/unshuffle
}

const QUEUE_STORAGE_KEY = 'openspot_music_queue';

export function useMusicQueue() {
  const [queue, setQueue] = useState<QueueState>({
    tracks: [],
    currentIndex: -1,
    isShuffled: false,
    repeatMode: 'off',
    originalTracks: []
  });

  // Load queue from session storage on initial mount
  useEffect(() => {
    try {
      const storedQueue = sessionStorage.getItem(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue);
        // Basic validation to ensure we have a valid queue
        if (parsedQueue.tracks && typeof parsedQueue.currentIndex === 'number') {
          setQueue(parsedQueue);
          console.log('🎵 Queue restored from session storage');
        }
      }
    } catch (error) {
      console.error('❌ Failed to restore queue from session storage:', error);
    }
  }, []);

  // Save queue to session storage whenever it changes
  useEffect(() => {
    try {
      // Don't save an empty initial state
      if (queue.tracks.length > 0) {
        sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      } else {
        // Clear storage if queue is empty
        sessionStorage.removeItem(QUEUE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('❌ Failed to save queue to session storage:', error);
    }
  }, [queue]);

  // Add tracks to queue
  const setQueueTracks = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueue(prev => ({
      ...prev,
      tracks,
      currentIndex: startIndex,
      originalTracks: tracks
    }));
  }, []);

  // Add single track to queue
  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => ({
      ...prev,
      tracks: [...prev.tracks, track],
      originalTracks: [...prev.originalTracks, track]
    }));
  }, []);

  // Get current track
  const getCurrentTrack = useCallback((): Track | null => {
    if (queue.currentIndex >= 0 && queue.currentIndex < queue.tracks.length) {
      return queue.tracks[queue.currentIndex];
    }
    return null;
  }, [queue.currentIndex, queue.tracks]);

  // Play next track
  const playNext = useCallback((): Track | null => {
    if (queue.tracks.length === 0) return null;

    let nextIndex = queue.currentIndex + 1;

    // Handle repeat modes
    if (nextIndex >= queue.tracks.length) {
      if (queue.repeatMode === 'all') {
        nextIndex = 0; // Loop back to start
      } else if (queue.repeatMode === 'one') {
        nextIndex = queue.currentIndex; // Stay on current track
      } else {
        return null; // End of queue
      }
    }

    setQueue(prev => ({ ...prev, currentIndex: nextIndex }));
    return queue.tracks[nextIndex];
  }, [queue]);

  // Play previous track
  const playPrevious = useCallback((): Track | null => {
    if (queue.tracks.length === 0) return null;

    let prevIndex = queue.currentIndex - 1;

    // Handle repeat modes
    if (prevIndex < 0) {
      if (queue.repeatMode === 'all') {
        prevIndex = queue.tracks.length - 1; // Loop to end
      } else {
        prevIndex = 0; // Stay at first track
      }
    }

    setQueue(prev => ({ ...prev, currentIndex: prevIndex }));
    return queue.tracks[prevIndex];
  }, [queue]);

  // Set current track by index
  const setCurrentIndex = useCallback((index: number) => {
    if (index >= 0 && index < queue.tracks.length) {
      setQueue(prev => ({ ...prev, currentIndex: index }));
      return queue.tracks[index];
    }
    return null;
  }, [queue.tracks]);

  // Toggle repeat mode
  const toggleRepeat = useCallback((): RepeatMode => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(queue.repeatMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    
    setQueue(prev => ({ ...prev, repeatMode: nextMode }));
    return nextMode;
  }, [queue.repeatMode]);

  // Shuffle queue
  const shuffleQueue = useCallback(() => {
    if (queue.tracks.length <= 1) return;

    const currentTrack = getCurrentTrack();
    const shuffledTracks = [...queue.tracks];
    
    // Fisher-Yates shuffle
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    // Find new index of current track
    const newCurrentIndex = currentTrack 
      ? shuffledTracks.findIndex(track => track.id === currentTrack.id)
      : 0;

    setQueue(prev => ({
      ...prev,
      tracks: shuffledTracks,
      currentIndex: newCurrentIndex,
      isShuffled: true
    }));
  }, [queue.tracks, getCurrentTrack]);

  // Unshuffle queue
  const unshuffleQueue = useCallback(() => {
    const currentTrack = getCurrentTrack();
    const newCurrentIndex = currentTrack 
      ? queue.originalTracks.findIndex(track => track.id === currentTrack.id)
      : 0;

    setQueue(prev => ({
      ...prev,
      tracks: prev.originalTracks,
      currentIndex: newCurrentIndex,
      isShuffled: false
    }));
  }, [queue.originalTracks, getCurrentTrack]);

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    if (queue.isShuffled) {
      unshuffleQueue();
    } else {
      shuffleQueue();
    }
    return !queue.isShuffled;
  }, [queue.isShuffled, shuffleQueue, unshuffleQueue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue({
      tracks: [],
      currentIndex: -1,
      isShuffled: false,
      repeatMode: 'off',
      originalTracks: []
    });
  }, []);

  // Check if there's a next track
  const hasNext = useCallback(() => {
    if (queue.repeatMode === 'one' || queue.repeatMode === 'all') return true;
    return queue.currentIndex < queue.tracks.length - 1;
  }, [queue.currentIndex, queue.tracks.length, queue.repeatMode]);

  // Check if there's a previous track
  const hasPrevious = useCallback(() => {
    if (queue.repeatMode === 'all') return true;
    return queue.currentIndex > 0;
  }, [queue.currentIndex, queue.repeatMode]);

  return {
    queue,
    setQueueTracks,
    addToQueue,
    getCurrentTrack,
    playNext,
    playPrevious,
    setCurrentIndex,
    toggleRepeat,
    toggleShuffle,
    clearQueue,
    hasNext,
    hasPrevious,
    // Getters
    currentTrack: getCurrentTrack(),
    currentIndex: queue.currentIndex,
    tracks: queue.tracks,
    isShuffled: queue.isShuffled,
    repeatMode: queue.repeatMode,
    queueLength: queue.tracks.length
  };
} 