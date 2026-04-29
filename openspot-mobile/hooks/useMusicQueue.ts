import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types/music';

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  isShuffled: boolean;
  originalTracks: Track[];
}

const QUEUE_STORAGE_KEY = 'openspot_music_queue';

export function useMusicQueue() {
  const [queue, setQueue] = useState<QueueState>({
    tracks: [],
    currentIndex: -1,
    isShuffled: false,
    originalTracks: [],
  });

  
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.tracks && typeof parsed.currentIndex === 'number') {
            setQueue(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to restore queue:', error);
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
        console.error('Failed to save queue:', error);
      }
    };
    saveQueue();
  }, [queue]);

  
  const setQueueTracks = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueue({
      tracks,
      currentIndex: startIndex,
      isShuffled: false,
      originalTracks: tracks,
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => ({
      ...prev,
      tracks: [...prev.tracks, track],
      originalTracks: [...prev.originalTracks, track],
    }));
  }, []);

  const addNext = useCallback((track: Track) => {
    setQueue(prev => {
      const insertIndex = prev.currentIndex >= 0 ? prev.currentIndex + 1 : prev.tracks.length;
      const nextTracks = [...prev.tracks];
      nextTracks.splice(insertIndex, 0, track);
      const currentTrack = prev.tracks[prev.currentIndex];
      const originalInsertIndex = currentTrack
        ? prev.originalTracks.findIndex(t => t.id === currentTrack.id) + 1
        : prev.originalTracks.length;
      const nextOriginalTracks = [...prev.originalTracks];
      nextOriginalTracks.splice(originalInsertIndex, 0, track);

      return { ...prev, tracks: nextTracks, originalTracks: nextOriginalTracks };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => {
      if (index < 0 || index >= prev.tracks.length) return prev;

      const removedTrack = prev.tracks[index];
      const nextTracks = prev.tracks.filter((_, i) => i !== index);

      const originalIndex = prev.originalTracks.findIndex(t => t.id === removedTrack.id);
      const nextOriginalTracks = originalIndex >= 0
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
        fromIndex < 0 || toIndex < 0 ||
        fromIndex >= prev.tracks.length || toIndex >= prev.tracks.length ||
        fromIndex === toIndex
      ) return prev;

      const nextTracks = [...prev.tracks];
      const [moved] = nextTracks.splice(fromIndex, 1);
      nextTracks.splice(toIndex, 0, moved);

      let nextCurrentIndex = prev.currentIndex;
      if (prev.currentIndex === fromIndex) nextCurrentIndex = toIndex;
      else if (fromIndex < prev.currentIndex && toIndex >= prev.currentIndex) nextCurrentIndex--;
      else if (fromIndex > prev.currentIndex && toIndex <= prev.currentIndex) nextCurrentIndex++;

      return {
        ...prev,
        tracks: nextTracks,
        originalTracks: prev.isShuffled ? prev.originalTracks : nextTracks,
        currentIndex: nextCurrentIndex,
      };
    });
  }, []);

  const getCurrentTrack = useCallback((): Track | null => {
    const q = queueRef.current;
    return q.currentIndex >= 0 && q.currentIndex < q.tracks.length
      ? q.tracks[q.currentIndex]
      : null;
  }, []);

  const playNext = useCallback((): Track | null => {
    const q = queueRef.current;
    const nextIndex = q.currentIndex + 1;
    if (nextIndex >= q.tracks.length) return null;

    const nextTrack = q.tracks[nextIndex];
    setQueue(prev => ({ ...prev, currentIndex: nextIndex }));
    return nextTrack;
  }, []);

  const playPrevious = useCallback((): Track | null => {
    const q = queueRef.current;
    const prevIndex = q.currentIndex - 1;
    if (prevIndex < 0) return null;

    const prevTrack = q.tracks[prevIndex];
    setQueue(prev => ({ ...prev, currentIndex: prevIndex }));
    return prevTrack;
  }, []);

  const setCurrentIndex = useCallback((index: number): Track | null => {
    const q = queueRef.current;
    if (index < 0 || index >= q.tracks.length) return null;
    const track = q.tracks[index];
    setQueue(prev => ({ ...prev, currentIndex: index }));
    return track;
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.tracks.length <= 1) return prev;

      const currentTrack = prev.tracks[prev.currentIndex];
      const shuffled = [...prev.tracks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const newIndex = currentTrack ? shuffled.findIndex(t => t.id === currentTrack.id) : 0;

      return {
        ...prev,
        tracks: shuffled,
        currentIndex: newIndex,
        isShuffled: true,
      };
    });
  }, []);

  const unshuffleQueue = useCallback(() => {
    setQueue(prev => {
      const currentTrack = prev.tracks[prev.currentIndex];
      const newIndex = currentTrack ? prev.originalTracks.findIndex(t => t.id === currentTrack.id) : 0;
      return {
        ...prev,
        tracks: [...prev.originalTracks],
        currentIndex: newIndex,
        isShuffled: false,
      };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    if (queueRef.current.isShuffled) unshuffleQueue();
    else shuffleQueue();
    return !queueRef.current.isShuffled;
  }, [shuffleQueue, unshuffleQueue]);

  const clearQueue = useCallback(() => {
    setQueue({
      tracks: [],
      currentIndex: -1,
      isShuffled: false,
      originalTracks: [],
    });
  }, []);

  const hasNext = useCallback(() => queueRef.current.currentIndex < queueRef.current.tracks.length - 1, []);
  const hasPrevious = useCallback(() => queueRef.current.currentIndex > 0, []);

  const currentTrack = useMemo(() => getCurrentTrack(), [getCurrentTrack]);

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
    toggleShuffle,
    clearQueue,
    hasNext,
    hasPrevious,
    currentTrack,
    currentIndex: queue.currentIndex,
    tracks: queue.tracks,
    isShuffled: queue.isShuffled,
    queueLength: queue.tracks.length,
  };
}