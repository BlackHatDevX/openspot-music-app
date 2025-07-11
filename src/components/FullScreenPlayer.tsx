'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  MoreHorizontal,
  Share,
  ListMusic,
  Maximize2,
  Code,
  Linkedin,
  Github,
  Send,
  Globe
} from 'lucide-react';
import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useMusicQueue } from '@/hooks/useMusicQueue';
import { useState, useRef, useEffect } from 'react';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onDownload: () => void;
  isLiked: boolean;
  onToggleLike: (e: React.MouseEvent) => void;
  musicQueue?: ReturnType<typeof useMusicQueue>;
}

export function FullScreenPlayer({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onDownload,
  isLiked,
  onToggleLike,
  musicQueue
}: FullScreenPlayerProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Effect to lock body scroll when player is open
  useEffect(() => {
    if (isOpen) {
      // Store original styles
      const originalStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width
      };
      
      // Apply scroll lock with minimal layout impact
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Cleanup function
      return () => {
        // Restore original styles
        document.body.style.overflow = originalStyle.overflow;
        document.body.style.position = originalStyle.position;
        document.body.style.top = originalStyle.top;
        document.body.style.width = originalStyle.width;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileRef]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onSeek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };

  const handleNext = () => {
    if (musicQueue?.hasNext()) {
      musicQueue.playNext();
    }
  };

  const handlePrevious = () => {
    if (musicQueue?.hasPrevious()) {
      musicQueue.playPrevious();
    }
  };

  const handleRepeat = () => {
    musicQueue?.toggleRepeat();
  };

  const handleShuffle = () => {
    musicQueue?.toggleShuffle();
  };

  const getRepeatIcon = () => {
    if (!musicQueue) return 'off';
    return musicQueue.repeatMode;
  };

  const isShuffled = () => {
    return musicQueue?.isShuffled || false;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 bg-gradient-to-b from-red-900 via-red-800 to-black z-50 flex flex-col overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <ChevronDown size={24} />
            </motion.button>
            
            <div className="text-center">
              <p className="text-xs text-gray-300 uppercase tracking-wide">Playing from Dreamlist</p>
              <p className="text-sm text-white font-medium">OpenSpot</p>
            </div>
            
            <div className="relative" ref={profileRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <Code size={24} />
              </motion.button>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-12 right-0 bg-gray-900 rounded-lg shadow-lg w-48 p-2 z-10"
                  >
                    <a href="https://linkedin.com/in/jash-gro/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                      <Linkedin size={16} />
                      <span>LinkedIn</span>
                    </a>
                    <a href="https://bit.ly/jashgro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                      <Globe size={16} />
                      <span>Portfolio</span>
                    </a>
                    <a href="https://telegram.dog/deveioper_x" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                      <Send size={16} />
                      <span>Telegram</span>
                    </a>
                    <a href="https://github.com/BlackHatDevX" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                      <Github size={16} />
                      <span>GitHub</span>
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around md:justify-center px-4 md:px-12 lg:px-20">
            {/* Album Art */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg pb-4 md:pb-0 md:mr-12 p-4 sm:p-6 md:p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl bg-gray-800"
              >
                {currentTrack ? (
                  <img
                    src={MusicAPI.getOptimalImage(currentTrack.images)}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                    style={{ 
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Play size={64} className="text-gray-600" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Track Info and Controls */}
            <div className="w-full md:max-w-md lg:max-w-lg flex flex-col justify-center">
              {/* Track Info */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center md:text-left pb-4"
              >
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white pb-1 sm:pb-2">
                  {currentTrack?.title || 'No track selected'}
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 pb-2 sm:pb-4">
                  {currentTrack?.artist || 'Choose a song to play'}
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-center md:justify-start gap-4 pb-2 sm:pb-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleLike}
                    disabled={!currentTrack}
                    className={`transition-colors disabled:opacity-50 ${
                      isLiked
                        ? 'text-red-500 hover:text-red-400'
                        : 'text-gray-300 hover:text-white'
                    }`}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart 
                      size={24} 
                      fill={isLiked ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onDownload}
                    disabled={!currentTrack}
                    className="text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Download size={24} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    <Share size={24} />
                  </motion.button>
                </div>
              </motion.div>

              {/* Progress Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pb-4"
              >
                <div className="flex items-center gap-2 sm:gap-3 pb-2">
                  <span className="text-xs text-gray-400 w-10 sm:w-12 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={!currentTrack}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #1db954 0%, #1db954 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 sm:w-12">
                    {formatTime(duration)}
                  </span>
                </div>
              </motion.div>

              {/* Player Controls */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 sm:gap-6 pb-4"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShuffle}
                  disabled={!musicQueue?.queueLength}
                  className={`transition-colors disabled:opacity-50 ${
                    isShuffled()
                      ? 'text-green-500 hover:text-green-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Shuffle size={18} className="block sm:hidden" />
                  <Shuffle size={20} className="hidden sm:block" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrevious}
                  disabled={!musicQueue?.hasPrevious()}
                  className="text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  <SkipBack size={22} className="block sm:hidden" />
                  <SkipBack size={24} className="hidden sm:block" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayPause}
                  disabled={!currentTrack}
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? (
                    <>
                      <Pause size={22} className="block sm:hidden" />
                      <Pause size={24} className="hidden sm:block" />
                    </>
                  ) : (
                    <>
                      <Play size={22} className="ml-1 block sm:hidden" />
                      <Play size={24} className="ml-1 hidden sm:block" />
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  disabled={!musicQueue?.hasNext()}
                  className="text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  <SkipForward size={22} className="block sm:hidden" />
                  <SkipForward size={24} className="hidden sm:block" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRepeat}
                  disabled={!musicQueue?.queueLength}
                  className={`transition-colors disabled:opacity-50 ${
                    getRepeatIcon() !== 'off'
                      ? 'text-green-500 hover:text-green-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Repeat size={18} className="block sm:hidden" />
                    <Repeat size={20} className="hidden sm:block" />
                    {getRepeatIcon() === 'one' && (
                      <span className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        1
                      </span>
                    )}
                  </div>
                </motion.button>
              </motion.div>

              {/* Volume Control */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-3 pb-4"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleMute}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </motion.button>
                
                <div className="w-24 md:w-32">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #1db954 0%, #1db954 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <ListMusic size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <Maximize2 size={20} />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 