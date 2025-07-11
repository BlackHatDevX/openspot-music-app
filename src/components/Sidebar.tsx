'use client';

import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  Library, 
  Heart,
  X
} from 'lucide-react';
import { useLikedSongs } from '@/hooks/useLikedSongs';

interface SidebarProps {
  currentView?: 'home' | 'search';
  onViewChange?: (view: 'home' | 'search') => void;
  onSearchClick?: () => void;
  onClose?: () => void;
}

export function Sidebar({ currentView = 'home', onViewChange, onSearchClick, onClose }: SidebarProps) {
  const { likedCount } = useLikedSongs();

  const handleHomeClick = () => {
    onViewChange?.('home');
  };

  const handleSearchClick = () => {
    onViewChange?.('search');
    onSearchClick?.();
  };

  return (
    <motion.div 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-56 bg-black h-full flex flex-col border-r border-gray-800 md:border-r-0"
    >
      {/* Mobile Close Button */}
      <div className="md:hidden flex justify-end p-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </motion.button>
      </div>

      {/* Top Navigation */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-4 pb-6">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="text-white font-bold text-lg">OpenSpot</span>
        </div>
        
        <nav className="space-y-3">
          <motion.button 
            onClick={handleHomeClick}
            className={`flex items-center gap-4 transition-colors group py-1 w-full text-left ${
              currentView === 'home' 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            whileHover={{ x: 5 }}
          >
            <Home size={24} />
            <span className="font-medium">Home</span>
            {currentView === 'home' && (
              <motion.div 
                layoutId="activeIndicator"
                className="ml-auto w-1 h-6 bg-green-500 rounded-full"
              />
            )}
          </motion.button>
          <motion.button 
            onClick={handleSearchClick}
            className={`flex items-center gap-4 transition-colors group py-4 w-full text-left ${
              currentView === 'search' 
                ? 'text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            whileHover={{ x: 5 }}
          >
            <Search size={24} />
            <span className="font-medium">Search</span>
            {currentView === 'search' && (
              <motion.div 
                layoutId="activeIndicator"
                className="ml-auto w-1 h-6 bg-green-500 rounded-full"
              />
            )}
          </motion.button>
        </nav>
      </div>

      {/* Your Library */}
      <div className="flex-1 px-6 overflow-hidden">
        <div className="flex items-center gap-3 text-gray-400 pb-6">
          <Library size={24} />
          <span className="font-medium">Your Library</span>
        </div>

        {/* Liked Songs */}
        <motion.div
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          onClick={handleHomeClick}
          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-white" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-medium truncate pb-0.5">
              Liked Songs
            </h4>
            <p className="text-gray-400 text-xs truncate">
              {likedCount > 0 ? `${likedCount} songs` : 'No songs yet'}
            </p>
          </div>
        </motion.div>

        {/* Encouragement when no liked songs */}
        {likedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gray-900/50 rounded-lg"
          >
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              Start exploring music and tap the ❤️ to build your collection
            </p>
          </motion.div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 mt-auto">
        <a 
          href="https://linkedin.com/in/jash-gro/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-gray-500 hover:text-gray-400 transition-colors text-center block"
        >
          Made with ❤️ by Jash Gro
        </a>
      </div>
    </motion.div>
  );
} 