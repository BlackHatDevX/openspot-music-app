import { useState, useEffect, useCallback, useRef } from 'react';
import { Track, Album, Artist, PlaylistSearchItem } from '../types/music';
import { MusicAPI } from '../lib/music-api';

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: PlaylistSearchItem[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  searchType: 'track' | 'album' | 'artist' | 'playlist';
  setSearchType: (type: 'track' | 'album' | 'artist' | 'playlist') => void;
  searchTracks: (searchQuery: string, type?: 'track' | 'album' | 'artist' | 'playlist') => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchType, setSearchType] = useState<'track' | 'album' | 'artist' | 'playlist'>('track');


  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingMoreRef = useRef(false);

  const mergeUniqueById = useCallback(<T extends { id: string | number }>(existing: T[], incoming: T[]) => {
    const seen = new Set(existing.map((item) => item.id.toString()));
    const merged = [...existing];
    let addedCount = 0;
    for (const item of incoming) {
      const key = item.id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
        addedCount += 1;
      }
    }
    return { merged, addedCount };
  }, []);

  const searchTracks = useCallback(async (searchQuery: string, type?: 'track' | 'album' | 'artist' | 'playlist') => {
    if (!searchQuery.trim()) {
      setResults([]);
      setAlbums([]);
      setArtists([]);
      setPlaylists([]);
      setHasMore(false);
      return;
    }


    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }


    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    currentSearchRef.current = searchQuery;

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      const response = await MusicAPI.search({
        q: searchQuery,
        offset: 0,
        type: type || searchType
      });

      const searchTypeToUse = type || searchType;

      if (currentSearchRef.current === searchQuery && !abortController.signal.aborted) {
        if (searchTypeToUse === 'track') {
          setResults(response.tracks);
          setAlbums([]);
          setArtists([]);
          setPlaylists([]);
          setOffset(response.tracks.length);
        } else if (searchTypeToUse === 'album') {
          setAlbums(response.albums);
          setResults([]);
          setArtists([]);
          setPlaylists([]);
          setOffset(response.albums.length);
        } else if (searchTypeToUse === 'artist') {
          setArtists(response.artists);
          setResults([]);
          setAlbums([]);
          setPlaylists([]);
          setOffset(response.artists.length);
        } else {
          setPlaylists(response.playlists);
          setResults([]);
          setAlbums([]);
          setArtists([]);
          setOffset(response.playlists.length);
        }
        setHasMore(response.pagination.hasMore);
      }
    } catch (err) {

      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setAlbums([]);
        setArtists([]);
        setPlaylists([]);
        setHasMore(false);
      }
    } finally {

      if (currentSearchRef.current === searchQuery && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchType]);

  const handleSetSearchType = useCallback((type: 'track' | 'album' | 'artist' | 'playlist') => {
    if (type !== searchType) {
      setSearchType(type);
      setResults([]);
      setAlbums([]);
      setArtists([]);
      setPlaylists([]);
      setOffset(0);
      setHasMore(false);
      if (query.trim()) {
        searchTracks(query, type);
      }
    }
  }, [searchType, query, searchTracks]);

  const loadMore = useCallback(async () => {
    if (!query.trim() || !hasMore || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const response = await MusicAPI.search({
        q: query,
        offset,
        type: searchType
      });

      if (searchType === 'track') {
        const { merged, addedCount } = mergeUniqueById(results, response.tracks);
        setResults(merged);
        setOffset(prev => prev + addedCount);
        setHasMore(addedCount > 0 && response.pagination.hasMore);
      } else if (searchType === 'album') {
        const { merged, addedCount } = mergeUniqueById(albums, response.albums);
        setAlbums(merged);
        setOffset(prev => prev + addedCount);
        setHasMore(addedCount > 0 && response.pagination.hasMore);
      } else if (searchType === 'artist') {
        const { merged, addedCount } = mergeUniqueById(artists, response.artists);
        setArtists(merged);
        setOffset(prev => prev + addedCount);
        setHasMore(addedCount > 0 && response.pagination.hasMore);
      } else {
        const { merged, addedCount } = mergeUniqueById(playlists, response.playlists);
        setPlaylists(merged);
        setOffset(prev => prev + addedCount);
        setHasMore(addedCount > 0 && response.pagination.hasMore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more results');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoading(false);
    }
  }, [query, offset, hasMore, searchType, mergeUniqueById, results, albums, artists, playlists]);

  const clearResults = useCallback(() => {

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults([]);
    setAlbums([]);
    setArtists([]);
    setPlaylists([]);
    setQuery('');
    setError(null);
    setHasMore(false);
    setOffset(0);
    setIsLoading(false);
    isLoadingMoreRef.current = false;
    currentSearchRef.current = '';
  }, []);


  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    albums,
    artists,
    playlists,
    isLoading,
    error,
    hasMore,
    searchType,
    setSearchType: handleSetSearchType,
    searchTracks,
    loadMore,
    clearResults,
  };
} 