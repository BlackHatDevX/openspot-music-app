import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../types/music';

const LIKED_SONGS_STORAGE_KEY = 'openspot_liked_songs';

interface LikedSong {
  id: string | number;
  title: string;
  artist: string;
  albumTitle?: string;
  duration?: number;
  images: {
    small: string;
    thumbnail: string;
    large: string;
    back: string | null;
  };
  likedAt: string; 
}

interface LikedSongsContextType {
  likedSongs: LikedSong[];
  isLoading: boolean;
  isLiked: (trackId: string | number) => boolean;
  likeSong: (track: Track) => void;
  unlikeSong: (trackId: string | number) => void;
  toggleLike: (track: Track) => void;
  likedCount: number;
  recentlyLiked: LikedSong[];
  clearAllLiked: () => void;
  getLikedSongsAsTrack: () => Track[];
}

const LikedSongsContext = createContext<LikedSongsContextType | undefined>(undefined);

interface LikedSongsProviderProps {
  children: ReactNode;
}

export function LikedSongsProvider({ children }: LikedSongsProviderProps) {
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  
  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        const savedLikedSongs = await AsyncStorage.getItem(LIKED_SONGS_STORAGE_KEY);
        if (savedLikedSongs) {
          const parsed = JSON.parse(savedLikedSongs) as LikedSong[];
          setLikedSongs(parsed);
        }
      } catch (error) {
        console.error('Failed to load liked songs from AsyncStorage:', error);
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLikedSongs();
  }, []);

  
  const saveLikedSongs = useCallback(async (songs: LikedSong[]) => {
    try {
      await AsyncStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(songs));
    } catch (error) {
      console.error('Failed to save liked songs to AsyncStorage:', error);
    }
  }, []);

  
  const isLiked = useCallback((trackId: string | number): boolean => {
    return likedSongs.some(song => song.id === trackId);
  }, [likedSongs]);

  
  const likeSong = useCallback((track: Track) => {
    if (isLiked(track.id)) {
      return;
    }

    const likedSong: LikedSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumTitle: track.albumTitle,
      duration: track.duration,
      images: track.images,
      likedAt: new Date().toISOString()
    };

    const updatedLikedSongs = [likedSong, ...likedSongs]; 
    setLikedSongs(updatedLikedSongs);
    saveLikedSongs(updatedLikedSongs);
  }, [likedSongs, isLiked, saveLikedSongs]);

  
  const unlikeSong = useCallback((trackId: string | number) => {
    const songToUnlike = likedSongs.find(song => song.id === trackId);
    if (!songToUnlike) {
      return;
    }

    const updatedLikedSongs = likedSongs.filter(song => song.id !== trackId);
    setLikedSongs(updatedLikedSongs);
    saveLikedSongs(updatedLikedSongs);
  }, [likedSongs, saveLikedSongs]);

  
  const toggleLike = useCallback((track: Track) => {
    if (isLiked(track.id)) {
      unlikeSong(track.id);
    } else {
      likeSong(track);
    }
  }, [isLiked, likeSong, unlikeSong]);

  
  const likedCount = likedSongs.length;

  
  const recentlyLiked = likedSongs.slice(0, 10);

  
  const clearAllLiked = useCallback(() => {
    setLikedSongs([]);
    saveLikedSongs([]);
  }, [saveLikedSongs]);

  
  const getLikedSongsAsTrack = useCallback((): Track[] => {
    return likedSongs.map(song => ({
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
  }, [likedSongs]);

  const contextValue: LikedSongsContextType = {
    likedSongs,
    isLoading,
    isLiked,
    likeSong,
    unlikeSong,
    toggleLike,
    likedCount,
    recentlyLiked,
    clearAllLiked,
    getLikedSongsAsTrack
  };

  return (
    <LikedSongsContext.Provider value={contextValue}>
      {children}
    </LikedSongsContext.Provider>
  );
}

export function useLikedSongs(): LikedSongsContextType {
  const context = useContext(LikedSongsContext);
  if (context === undefined) {
    throw new Error('useLikedSongs must be used within a LikedSongsProvider');
  }
  return context;
} 