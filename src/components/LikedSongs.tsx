'use client';

import { motion } from 'framer-motion';
import { Heart, Play, Download, Clock, Trash2 } from 'lucide-react';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { MusicAPI } from '@/lib/music-api';
import { Track } from '@/types/music';

interface LikedSongsProps {
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
}

export function LikedSongs({ onTrackSelect, currentTrack, isPlaying }: LikedSongsProps) {
  const { 
    likedSongs, 
    isLoading, 
    likedCount, 
    toggleLike, 
    clearAllLiked, 
    getLikedSongsAsTrack 
  } = useLikedSongs();

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '--:--';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const handleTrackClick = (song: any, index: number) => {
    const track: Track = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: 0,
      albumTitle: song.albumTitle || '',
      albumCover: song.images.large,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: song.duration || 0,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false
      },
      version: null,
      label: '',
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: false,
      streamable: true,
      purchasable: false,
      previewable: true,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: song.images,
      isrc: ''
    };

    // Convert all liked songs to Track format
    const allTracks = likedSongs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: 0,
      albumTitle: s.albumTitle || '',
      albumCover: s.images.large,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: s.duration || 0,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false
      },
      version: null,
      label: '',
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: false,
      streamable: true,
      purchasable: false,
      previewable: true,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: s.images,
      isrc: ''
    }));

    onTrackSelect(track, allTracks, index);
  };

  const handlePlayAll = () => {
    if (likedSongs.length === 0) return;
    
    // Convert all liked songs to Track format
    const allTracks = likedSongs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: 0,
      albumTitle: song.albumTitle || '',
      albumCover: song.images.large,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: song.duration || 0,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false
      },
      version: null,
      label: '',
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: false,
      streamable: true,
      purchasable: false,
      previewable: true,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: song.images,
      isrc: ''
    }));

    // Start playing from the first song
    onTrackSelect(allTracks[0], allTracks, 0);
  };

  const handleUnlike = (e: React.MouseEvent, song: any) => {
    e.stopPropagation();
    const track: Track = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: 0,
      albumTitle: song.albumTitle || '',
      albumCover: song.images.large,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: song.duration || 0,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false
      },
      version: null,
      label: '',
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: false,
      streamable: true,
      purchasable: false,
      previewable: true,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: song.images,
      isrc: ''
    };
    toggleLike(track);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto pb-4"></div>
          <p className="text-gray-400">Loading liked songs...</p>
        </div>
      </div>
    );
  }

  if (likedCount === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center max-w-md mx-auto px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="pb-8"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center text-center justify-center mr-auto ml-auto">
              <Heart size={48} className="text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white pb-4">Start building your library</h2>
            <p className="text-gray-400 text-lg leading-relaxed pb-8">
              Songs you like will appear here. Start exploring and tap the heart icon to save your favorites.
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-semibold cursor-pointer"
              onClick={() => {
                // Focus on search to encourage exploration
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                }
              }}
            >
              <Heart size={20} />
              Find music you love
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-900 to-black p-6 pb-24">
      {/* Header */}
      <div className="flex items-end gap-6 pb-8">
        <div className="w-40 h-40 md:w-60 md:h-60 bg-gradient-to-br from-purple-800 via-blue-600 to-blue-800 rounded-lg shadow-2xl flex items-center justify-center">
          <Heart size={60} className="block md:hidden text-white" fill="currentColor" />
          <Heart size={80} className="hidden md:block text-white" fill="currentColor" />
        </div>
        
        <div className="flex-1">
          <p className="text-sm text-gray-400 uppercase tracking-wide pb-2">Playlist</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white pb-4">Liked Songs</h1>
          <div className="flex items-center gap-2 text-gray-400">
            <span>{likedCount} songs</span>
            {likedCount > 0 && (
              <>
                <span>•</span>
                <span>About {Math.ceil(likedSongs.reduce((acc, song) => acc + (song.duration || 180), 0) / 60)} min</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayAll}
          className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-black hover:bg-green-400 transition-colors"
        >
          <Play size={20} className="ml-1" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={clearAllLiked}
          className="text-gray-400 hover:text-white transition-colors p-2"
          title="Clear all liked songs"
        >
          <Trash2 size={20} />
        </motion.button>
      </div>

      {/* Songs List */}
      <div className="space-y-1">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-800">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6">Title</div>
          <div className="col-span-3">Date Added</div>
          <div className="col-span-1 text-center">
            <Clock size={16} />
          </div>
          <div className="col-span-1"></div>
        </div>

        {/* Song Rows */}
        {likedSongs.map((song, index) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleTrackClick(song, index)}
            className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group ${
              currentTrack?.id === song.id ? 'bg-gray-800' : ''
            }`}
          >
            <div className="col-span-1 flex items-center justify-center">
              {currentTrack?.id === song.id && isPlaying ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="flex space-x-0.5">
                    <div className="w-0.5 h-4 bg-green-500 animate-pulse"></div>
                    <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 group-hover:hidden">{index + 1}</span>
              )}
              <Play size={16} className="text-white hidden group-hover:block" />
            </div>
            
            <div className="col-span-6 flex items-center gap-3">
              <img
                src={song.images.large}
                alt={song.title}
                className="w-10 h-10 rounded"
              />
              <div className="min-w-0">
                <p className={`font-medium truncate ${
                  currentTrack?.id === song.id ? 'text-green-500' : 'text-white'
                }`}>
                  {song.title}
                </p>
                <p className="text-sm text-gray-400 truncate">{song.artist}</p>
              </div>
            </div>
            
            <div className="col-span-3 flex items-center">
              <span className="text-gray-400 text-sm">{formatDate(song.likedAt)}</span>
            </div>
            
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{formatTime(song.duration || 0)}</span>
            </div>
            
            <div className="col-span-1 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleUnlike(e, song)}
                className="text-red-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Unlike"
              >
                <Heart size={16} fill="currentColor" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 