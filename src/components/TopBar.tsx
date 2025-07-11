'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Bell,
  User,
  ShoppingCart,
  Download,
  X,
  Menu,
  Code,
  Linkedin,
  Github,
  Send,
  Globe
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface TopBarProps {
  searchState: {
    query: string;
    setQuery: (query: string) => void;
    results: any[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    searchTracks: (searchQuery: string) => Promise<void>;
    loadMore: () => Promise<void>;
    clearResults: () => void;
  };
  onSearchStart?: () => void;
  onMenuClick?: () => void;
}

export function TopBar({ searchState, onSearchStart, onMenuClick }: TopBarProps) {
  const { query, setQuery, isLoading, clearResults, searchTracks } = searchState;
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check initial size
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Only notify parent when user starts typing (for UI state), but don't search yet
    if (newQuery.trim() && onSearchStart) {
      onSearchStart();
    }
  };

  const handleSearchSubmit = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      console.log('🔍 Initiating search for:', trimmedQuery);
      try {
        await searchTracks(trimmedQuery);
        console.log('✅ Search completed successfully for:', trimmedQuery);
      } catch (error) {
        console.error('❌ Search failed for:', trimmedQuery, error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSearchFocus = () => {
    setIsFocused(true);
    if (onSearchStart) {
      onSearchStart();
    }
  };

  const handleSearchBlur = () => {
    setIsFocused(false);
  };

  const handleClearSearch = () => {
    setQuery('');
    clearResults();
  };

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-black/95 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left Side - Mobile Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMenuClick}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </motion.button>
        </div>
        
        {/* Center - Search Bar */}
        <div className="flex-1 max-w-2xl mx-1 md:mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="What do you want to play?"
              value={query}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-full py-3 md:py-3 pl-4 md:pl-5 pr-20 md:pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:bg-gray-700 transition-all"
            />
            
            {/* Right side buttons container */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {/* Clear button */}
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 md:p-1"
                >
                  <X size={16} />
                </motion.button>
              )}
              
              {/* Loading spinner */}
              {isLoading && (
                <div className="p-1.5 md:p-1">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Search button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSearchSubmit}
                disabled={!query.trim() || isLoading}
                className="text-white bg-green-600 hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 md:p-1 rounded-full min-w-[32px] min-h-[32px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center"
              >
                <Search size={16} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Side - User Actions */}
        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:block text-white hover:text-gray-300 text-sm font-medium transition-colors px-2 py-1"
          >
            <a href="https://github.com/BlackHatDevX/openspot-music-app" target="_blank" rel="noopener noreferrer">
              Github
            </a>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center gap-2 text-white hover:text-gray-300 text-sm font-medium transition-colors px-2 py-1"
          >
            <Download size={16} />
            <span className="hidden md:inline">Install App</span>
          </motion.button>

          
          <div className="relative" ref={profileRef}>
            <motion.button 
              onClick={() => setIsProfileOpen(prev => !prev)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors ml-1"
            >
              <Code size={18} />
            </motion.button>
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-12 right-0 bg-gray-800 rounded-lg shadow-lg w-48 p-2 z-10"
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
      </div>
    </motion.div>
  );
} 