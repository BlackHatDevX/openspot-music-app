import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types/music';

export type RepeatMode = 'off' | 'one' | 'all';

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  originalTracks: Track[]; 
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

  
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        if (storedQueue) {
          const parsedQueue = JSON.parse(storedQueue);
          
          if (parsedQueue.tracks && typeof parsedQueue.currentIndex === 'number') {
            setQueue(parsedQueue);
          }
        }
      } catch (error) {
        console.error('Failed to restore queue from AsyncStorage:', error);
      }
    };

    loadQueue();
  }, []);

  
  useEffect(() => {
    const saveQueue = async () => {
      try {
        
        if (queue.tracks.length > 0) {
          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        } else {
          
          await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to save queue to AsyncStorage:', error);
      }
    };

    saveQueue();
  }, [queue]);

  
  const setQueueTracks = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueue(prev => ({
      ...prev,
      tracks,
      currentIndex: startIndex,
      originalTracks: tracks
    }));
  }, []);

  
  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => ({
      ...prev,
      tracks: [...prev.tracks, track],
      originalTracks: [...prev.originalTracks, track]
    }));
  }, []);

  const addNext = useCallback((track: Track) => {
    setQueue(prev => {
      const insertIndex = prev.currentIndex >= 0 ? prev.currentIndex + 1 : prev.tracks.length;
      const nextTracks = [...prev.tracks];
      nextTracks.splice(insertIndex, 0, track);

      const nextOriginalTracks = [...prev.originalTracks];
      const originalInsertIndex = prev.isShuffled
        ? nextOriginalTracks.length
        : insertIndex;
      nextOriginalTracks.splice(originalInsertIndex, 0, track);

      return {
        ...prev,
        tracks: nextTracks,
        originalTracks: nextOriginalTracks,
      };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => {
      if (index < 0 || index >= prev.tracks.length) {
        return prev;
      }

      const removedTrack = prev.tracks[index];
      const nextTracks = prev.tracks.filter((_, i) => i !== index);
      const originalIndex = prev.originalTracks.findIndex((item) => item.id === removedTrack.id);
      const nextOriginalTracks =
        originalIndex >= 0
          ? prev.originalTracks.filter((_, i) => i !== originalIndex)
          : prev.originalTracks;

      let nextCurrentIndex = prev.currentIndex;
      if (nextTracks.length === 0) {
        nextCurrentIndex = -1;
      } else if (index === prev.currentIndex) {
        nextCurrentIndex = Math.min(index, nextTracks.length - 1);
      } else if (index < prev.currentIndex) {
        nextCurrentIndex = prev.currentIndex - 1;
      }

      return {
        ...prev,
        tracks: nextTracks,
        originalTracks: nextOriginalTracks,
        currentIndex: nextCurrentIndex,
      };
    });
  }, []);

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.tracks.length ||
        toIndex >= prev.tracks.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      const nextTracks = [...prev.tracks];
      const [movedTrack] = nextTracks.splice(fromIndex, 1);
      nextTracks.splice(toIndex, 0, movedTrack);

      let nextCurrentIndex = prev.currentIndex;
      if (prev.currentIndex === fromIndex) {
        nextCurrentIndex = toIndex;
      } else if (fromIndex < prev.currentIndex && toIndex >= prev.currentIndex) {
        nextCurrentIndex = prev.currentIndex - 1;
      } else if (fromIndex > prev.currentIndex && toIndex <= prev.currentIndex) {
        nextCurrentIndex = prev.currentIndex + 1;
      }

      return {
        ...prev,
        tracks: nextTracks,
        originalTracks: prev.isShuffled ? prev.originalTracks : nextTracks,
        currentIndex: nextCurrentIndex,
      };
    });
  }, []);

  
  const getCurrentTrack = useCallback((): Track | null => {
    if (queue.currentIndex >= 0 && queue.currentIndex < queue.tracks.length) {
      return queue.tracks[queue.currentIndex];
    }
    return null;
  }, [queue.currentIndex, queue.tracks]);

  
  const playNext = useCallback((): Track | null => {
    if (queue.tracks.length === 0) return null;

    let nextIndex = queue.currentIndex + 1;

    
    if (nextIndex >= queue.tracks.length) {
      if (queue.repeatMode === 'all') {
        nextIndex = 0; 
      } else if (queue.repeatMode === 'one') {
        nextIndex = queue.currentIndex; 
      } else {
        return null; 
      }
    }

    setQueue(prev => ({ ...prev, currentIndex: nextIndex }));
    return queue.tracks[nextIndex];
  }, [queue]);

  
  const playPrevious = useCallback((): Track | null => {
    if (queue.tracks.length === 0) return null;

    let prevIndex = queue.currentIndex - 1;

    
    if (prevIndex < 0) {
      if (queue.repeatMode === 'all') {
        prevIndex = queue.tracks.length - 1; 
      } else {
        prevIndex = 0; 
      }
    }

    setQueue(prev => ({ ...prev, currentIndex: prevIndex }));
    return queue.tracks[prevIndex];
  }, [queue]);

  
  const setCurrentIndex = useCallback((index: number) => {
    if (index >= 0 && index < queue.tracks.length) {
      setQueue(prev => ({ ...prev, currentIndex: index }));
      return queue.tracks[index];
    }
    return null;
  }, [queue.tracks]);

  
  const toggleRepeat = useCallback((): RepeatMode => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(queue.repeatMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    
    setQueue(prev => ({ ...prev, repeatMode: nextMode }));
    return nextMode;
  }, [queue.repeatMode]);

  
  const shuffleQueue = useCallback(() => {
    if (queue.tracks.length <= 1) return;

    const currentTrack = getCurrentTrack();
    const shuffledTracks = [...queue.tracks];
    
    
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    
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

  
  const toggleShuffle = useCallback(() => {
    if (queue.isShuffled) {
      unshuffleQueue();
    } else {
      shuffleQueue();
    }
    return !queue.isShuffled;
  }, [queue.isShuffled, shuffleQueue, unshuffleQueue]);

  
  const clearQueue = useCallback(() => {
    setQueue({
      tracks: [],
      currentIndex: -1,
      isShuffled: false,
      repeatMode: 'off',
      originalTracks: []
    });
  }, []);

  
  const hasNext = useCallback(() => {
    if (queue.repeatMode === 'one' || queue.repeatMode === 'all') return true;
    return queue.currentIndex < queue.tracks.length - 1;
  }, [queue.currentIndex, queue.tracks.length, queue.repeatMode]);

  
  const hasPrevious = useCallback(() => {
    if (queue.repeatMode === 'all') return true;
    return queue.currentIndex > 0;
  }, [queue.currentIndex, queue.repeatMode]);

  return {
    queue,
    setQueueTracks,
    addToQueue,
    addNext,
    removeFromQueue,
    moveQueueItem,
    getCurrentTrack,
    playNext,
    playPrevious,
    setCurrentIndex,
    toggleRepeat,
    toggleShuffle,
    clearQueue,
    hasNext,
    hasPrevious,
    
    currentTrack: getCurrentTrack(),
    currentIndex: queue.currentIndex,
    tracks: queue.tracks,
    isShuffled: queue.isShuffled,
    repeatMode: queue.repeatMode,
    queueLength: queue.tracks.length
  };
} 