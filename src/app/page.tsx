'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { LikedSongs } from '@/components/LikedSongs';
import { SearchResults } from '@/components/SearchResults';
import { Player } from '@/components/Player';
import { QueueDisplay } from '@/components/QueueDisplay';
import { Track } from '@/types/music';
import { useSearch } from '@/hooks/useSearch';
import { useMusicQueue } from '@/hooks/useMusicQueue';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'search'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const searchState = useSearch();
  const { query, clearResults } = searchState;
  const musicQueue = useMusicQueue();

  const handleTrackSelect = (track: Track, trackList?: Track[], startIndex?: number) => {
    if (trackList && startIndex !== undefined) {
      // Playing from a list (like liked songs) - set entire queue
      musicQueue.setQueueTracks(trackList, startIndex);
    } else {
      // Single track selection - add to queue or replace
      musicQueue.setQueueTracks([track], 0);
    }
    setIsPlaying(true);
    console.log('Selected track:', track.title, 'by', track.artist);
    
    // Optional: Show a toast notification
    if (typeof window !== 'undefined') {
      console.log(`Now playing: ${track.title} - ${track.artist}`);
    }
  };

  const handleQueueTrackSelect = (track: Track, index: number) => {
    // When selecting from queue, just set the current index
    musicQueue.setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handlePlayingStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleViewChange = (view: 'home' | 'search') => {
    setCurrentView(view);
    
    // If switching to home, clear search results
    if (view === 'home') {
      clearResults();
    }

    // Close sidebar on mobile when view changes
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSearchClick = () => {
    // Focus on search input when search is clicked
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleSearchStart = () => {
    // Switch to search view when user starts typing
    if (currentView !== 'search') {
      setCurrentView('search');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  const closeQueue = () => {
    setIsQueueOpen(false);
  };

  // Determine current view based on search query and sidebar state
  const isSearchView = currentView === 'search' || query.trim() !== '';

  return (
    <div className="h-dvh w-full bg-black text-white grid grid-rows-[1fr_auto]">
      {/* Main Content Area (including sidebar and scrollable view) */}
      <main className="flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-[60] md:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block
        `}>
          <Sidebar 
            currentView={isSearchView ? 'search' : 'home'}
            onViewChange={handleViewChange}
            onSearchClick={handleSearchClick}
            onClose={closeSidebar}
          />
        </div>
        
        {/* Main View (Top Bar + Content) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar 
            searchState={searchState} 
            onSearchStart={handleSearchStart}
            onMenuClick={toggleSidebar}
          />
          
          <div className="flex-1 overflow-y-auto">
            {isSearchView ? (
              <SearchResults searchState={searchState} onTrackSelect={handleTrackSelect} />
            ) : (
              <LikedSongs 
                onTrackSelect={handleTrackSelect} 
                currentTrack={musicQueue.currentTrack}
                isPlaying={isPlaying}
              />
            )}
          </div>
        </div>

        {/* Queue Display */}
        <QueueDisplay
          isOpen={isQueueOpen}
          onClose={closeQueue}
          musicQueue={musicQueue}
          currentTrack={musicQueue.currentTrack}
          isPlaying={isPlaying}
          onTrackSelect={handleQueueTrackSelect}
        />
      </main>
      
      {/* Player Area */}
      <div className="z-50">
        <Player 
          currentTrack={musicQueue.currentTrack} 
          onPlayingStateChange={handlePlayingStateChange}
          musicQueue={musicQueue}
          onQueueClick={toggleQueue}
        />
      </div>
    </div>
  );
}
