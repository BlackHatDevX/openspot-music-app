'use client';

import { motion } from 'framer-motion';
import { Play, Pause, X, Music } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicQueue } from '@/hooks/useMusicQueue';
import { MusicAPI } from '@/lib/music-api';

interface QueueDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  musicQueue: ReturnType<typeof useMusicQueue>;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTrackSelect: (track: Track, index: number) => void;
}

export function QueueDisplay({
  isOpen,
  onClose,
  musicQueue,
  currentTrack,
  isPlaying,
  onTrackSelect
}: QueueDisplayProps) {
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTrackClick = (track: Track, index: number) => {
    musicQueue.setCurrentIndex(index);
    onTrackSelect(track, index);
  };

  const handleRemoveFromQueue = (index: number) => {
    const newTracks = musicQueue.tracks.filter((_, i) => i !== index);
    const newCurrentIndex = index < musicQueue.currentIndex 
      ? musicQueue.currentIndex - 1 
      : musicQueue.currentIndex >= newTracks.length 
        ? Math.max(0, newTracks.length - 1)
        : musicQueue.currentIndex;
    
    if (newTracks.length > 0) {
      musicQueue.setQueueTracks(newTracks, newCurrentIndex);
    } else {
      musicQueue.clearQueue();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 w-full md:w-96 h-full bg-gray-900 z-40 flex flex-col border-l border-gray-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Queue</h2>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </motion.button>
      </div>

      {/* Queue Info */}
      <div className="p-4 border-b border-gray-700">
        <p className="text-sm text-gray-400">
          {musicQueue.queueLength} songs in queue
        </p>
        {musicQueue.repeatMode !== 'off' && (
          <p className="text-xs text-green-400 mt-1">
            Repeat: {musicQueue.repeatMode === 'one' ? 'One' : 'All'}
          </p>
        )}
        {musicQueue.isShuffled && (
          <p className="text-xs text-green-400 mt-1">Shuffle: On</p>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {musicQueue.queueLength === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Music size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No songs in queue</p>
            <p className="text-sm">Add songs to start playing</p>
          </div>
        ) : (
          <div className="p-2">
            {musicQueue.tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id && index === musicQueue.currentIndex;
              
              return (
                <motion.div
                  key={`${track.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isCurrentTrack
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'hover:bg-gray-800'
                  }`}
                  onClick={() => handleTrackClick(track, index)}
                >
                  {/* Track Image */}
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                    <img
                      src={MusicAPI.getOptimalImage(track.images)}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    {isCurrentTrack && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        {isPlaying ? (
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        ) : (
                          <Play size={16} className="text-white" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${
                      isCurrentTrack ? 'text-green-400' : 'text-white'
                    }`}>
                      {track.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {track.artist}
                    </p>
                  </div>

                  {/* Track Duration */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(track.duration)}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromQueue(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue Controls */}
      {musicQueue.queueLength > 0 && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => musicQueue.clearQueue()}
              className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Clear Queue
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => musicQueue.toggleShuffle()}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                musicQueue.isShuffled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              Shuffle
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
} 