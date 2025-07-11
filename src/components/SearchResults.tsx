'use client';

import { motion } from 'framer-motion';
import { Play, MoreHorizontal, Heart, Download } from 'lucide-react';
import { MusicAPI } from '@/lib/music-api';
import { Track } from '@/types/music';

interface SearchResultsProps {
  searchState: {
    query: string;
    setQuery: (query: string) => void;
    results: Track[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    searchTracks: (searchQuery: string) => Promise<void>;
    loadMore: () => Promise<void>;
    clearResults: () => void;
  };
  onTrackSelect?: (track: Track) => void;
}

export function SearchResults({ searchState, onTrackSelect }: SearchResultsProps) {
  const { query, results, isLoading, error, hasMore, loadMore } = searchState;
  const resultsCount = results.length;

  // Debug logging to track component state
  console.log('🎵 SearchResults render:', {
    query,
    resultsCount,
    isLoading,
    error: !!error,
    hasMore
  });

  const handleDownload = async (track: Track) => {
    try {
      console.log('📥 Downloading track:', track.title);
      const streamUrl = await MusicAPI.getStreamUrl(track.id.toString());
      
      const link = document.createElement('a');
      link.href = streamUrl;
      link.download = `${track.artist} - ${track.title}.flac`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download initiated for:', track.title);
    } catch (error) {
      console.error('❌ Download failed for:', track.title, error);
    }
  };

  if (!query) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">Search for music</h3>
          <p className="text-gray-400">Type something in the search box and press Enter or click the search button</p>
        </div>
      </div>
    );
  }

  if (isLoading && results.length === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0 && query && !isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">Ready to search</h3>
          <p className="text-gray-400">Press Enter or click the search button to search for "{query}"</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto p-4 md:p-6 pb-24"
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Search results for "{query}"
        </h2>
        <p className="text-gray-400 text-sm">
          {results.length} tracks found
        </p>
      </div>

      {/* Top Result */}
      {results.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Top result</h3>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800/50 rounded-lg p-4 md:p-6 cursor-pointer group hover:bg-gray-800/70 transition-all"
            onClick={() => onTrackSelect?.(results[0])}
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative">
                <img
                  src={MusicAPI.getOptimalImage(results[0].images)}
                  alt={results[0].title}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover"
                />
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play size={20} className="text-white fill-white md:hidden" />
                  <Play size={24} className="text-white fill-white hidden md:block" />
                </motion.button>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg md:text-xl font-bold text-white mb-1 truncate">{results[0].title}</h4>
                <p className="text-gray-400 mb-2 text-sm md:text-base truncate">{results[0].artist}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">TRACK</span>
                  {MusicAPI.getQualityBadge(results[0]) && (
                    <span className="text-xs bg-green-600 px-2 py-1 rounded">
                      {MusicAPI.getQualityBadge(results[0])}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* All Results */}
      <div className="mb-6">
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Songs</h3>
        <div className="space-y-1 md:space-y-2">
          {results.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg hover:bg-gray-800/50 group cursor-pointer transition-all"
              onClick={() => onTrackSelect?.(track)}
            >
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                <img
                  src={MusicAPI.getOptimalImage(track.images)}
                  alt={track.title}
                  className="w-full h-full rounded object-cover"
                />
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play size={20} className="text-white fill-white md:hidden" />
                  <Play size={24} className="text-white fill-white hidden md:block" />
                </motion.button>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate group-hover:text-green-400 transition-colors text-sm md:text-base">
                  {track.title}
                </h4>
                <p className="text-xs md:text-sm text-gray-400 truncate">{track.artist}</p>
              </div>
              
              <div className="hidden md:flex group-hover:flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 text-gray-400 hover:text-white transition-colors"
                >
                  <Heart size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDownload(track)}
                  className="w-8 h-8 text-gray-400 hover:text-white transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </motion.button>
              </div>
              
              <div className="text-xs md:text-sm text-gray-400 group-hover:hidden md:group-hover:block">
                {MusicAPI.formatDuration(track.duration)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center py-4 md:py-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
} 