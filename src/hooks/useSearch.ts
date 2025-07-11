import { useState, useEffect, useCallback, useRef } from 'react';
import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Track[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  searchTracks: (searchQuery: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  
  // Use ref to track current search operation and prevent race conditions
  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    // Cancel any ongoing search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this search
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
        type: 'track'
      });

      // Check if this search is still current (not cancelled)
      if (currentSearchRef.current === searchQuery && !abortController.signal.aborted) {
        setResults(response.tracks);
        setHasMore(response.pagination.hasMore);
        setOffset(response.tracks.length);
      }
    } catch (err) {
      // Only set error if the request wasn't aborted
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setHasMore(false);
      }
    } finally {
      // Only set loading to false if this is still the current search
      if (currentSearchRef.current === searchQuery && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!query.trim() || isLoading || !hasMore) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await MusicAPI.search({
        q: query,
        offset,
        type: 'track'
      });

      // Check if this request is still valid
      if (!abortController.signal.aborted) {
        setResults(prev => [...prev, ...response.tracks]);
        setHasMore(response.pagination.hasMore);
        setOffset(prev => prev + response.tracks.length);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load more results');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [query, offset, isLoading, hasMore]);

  const clearResults = useCallback(() => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setResults([]);
    setQuery('');
    setError(null);
    setHasMore(false);
    setOffset(0);
    setIsLoading(false);
    currentSearchRef.current = '';
  }, []);

  // Cleanup on unmount
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
    isLoading,
    error,
    hasMore,
    searchTracks,
    loadMore,
    clearResults,
  };
} 