import axios, { AxiosResponse } from 'axios';
import { SearchResponse, SearchParams, Track } from '@/types/music';

// Use local API routes as proxy to avoid CORS issues
const API_BASE_URL = '/api';

// Configure axios instance for local API calls
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export class MusicAPI {
  // Separate caches for different types of requests to prevent interference
  private static searchCache = new Map<string, Promise<any>>();
  private static streamCache = new Map<string, Promise<any>>();
  
  static async search(params: SearchParams): Promise<SearchResponse> {
    const { q, offset = 0, type = 'track' } = params;
    
    const searchParams = new URLSearchParams({
      q,
      offset: offset.toString(),
      type,
    });

    // Create a unique cache key for this search request
    const cacheKey = `search_${searchParams.toString()}`;
    
    // If the same search request is already in progress, return the existing promise
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const requestPromise = this.performSearch(searchParams);
    
    // Store the promise in search cache
    this.searchCache.set(cacheKey, requestPromise);
    
    // Clean up cache after request completes (success or failure)
    requestPromise.finally(() => {
      this.searchCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private static async performSearch(searchParams: URLSearchParams): Promise<SearchResponse> {
    try {
      // Use local API route as proxy
      const response: AxiosResponse<SearchResponse> = await apiClient.get(`/search?${searchParams}`);
      return response.data;
    } catch (error) {
      console.error('Search API error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed with status ${error.response?.status || 'unknown'}: ${error.message}`);
      }
      throw new Error('Search request failed');
    }
  }

  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static getOptimalImage(images: { small: string; thumbnail: string; large: string }): string {
    return images.large || images.small || images.thumbnail;
  }

  static async searchTracks(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    try {
      // Use local API route as proxy
      const searchParams = new URLSearchParams({
        q: query,
        offset: offset.toString(),
        type: 'track'
      });

      const response: AxiosResponse<SearchResponse> = await apiClient.get(`/search?${searchParams}`);
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`HTTP error! status: ${error.response?.status || 'unknown'}: ${error.message}`);
      }
      throw error;
    }
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    const cacheKey = `stream_${trackId}`;
    
    // Check if stream request is already in progress - use separate cache
    if (this.streamCache.has(cacheKey)) {
      return this.streamCache.get(cacheKey);
    }

    const requestPromise = this.performStreamRequest(trackId);
    
    // Store the promise in stream cache (separate from search cache)
    this.streamCache.set(cacheKey, requestPromise);
    
    // Clean up cache after request completes
    requestPromise.finally(() => {
      this.streamCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private static async performStreamRequest(trackId: string): Promise<string> {
    try {
      // Use local API route as proxy
      const response: AxiosResponse<{ url: string }> = await apiClient.get(`/stream?trackId=${trackId}`, {
        timeout: 15000 // 15 second timeout for streams
      });
      
      if (!response.data.url) {
        throw new Error('No stream URL received');
      }
      
      return response.data.url;
    } catch (error) {
      console.error('Stream URL error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Stream request failed with status ${error.response?.status || 'unknown'}: ${error.message}`);
      }
      throw error;
    }
  }

  static async getPopularTracks(): Promise<Track[]> {
    try {
      // Using a popular search term to get trending tracks
      const response = await this.search({ q: 'arijit singh', offset: 0, type: 'track' });
      return response.tracks.slice(0, 10); // Return top 10
    } catch (error) {
      console.error('Error fetching popular tracks:', error);
      return [];
    }
  }

  static async getRecentlyPlayed(): Promise<Track[]> {
    // For now, return a mix of popular tracks
    // In a real app, this would come from user's listening history
    try {
      const response = await this.search({ q: 'bollywood hits', offset: 0, type: 'track' });
      return response.tracks.slice(0, 6);
    } catch (error) {
      console.error('Error fetching recently played:', error);
      return [];
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    // Simulated personalized recommendations
    try {
      const response = await this.search({ q: 'indian music', offset: 0, type: 'track' });
      return response.tracks.slice(0, 8);
    } catch (error) {
      console.error('Error fetching made for you:', error);
      return [];
    }
  }

  static getTrackUrl(track: Track): string {
    // This would typically return a streaming URL
    // For now, return a placeholder or preview URL if available
    return `#track-${track.id}`;
  }

  static isHighQuality(track: Track): boolean {
    return track.audioQuality.isHiRes || 
           track.audioQuality.maximumBitDepth > 16 || 
           track.audioQuality.maximumSamplingRate > 44.1;
  }

  static getQualityBadge(track: Track): string | null {
    if (track.audioQuality.isHiRes) return 'Hi-Res';
    if (track.audioQuality.maximumBitDepth === 24) return 'HD';
    return null;
  }

  // Method to clear all cached requests (useful for cleanup)
  static clearCache(): void {
    this.searchCache.clear();
    this.streamCache.clear();
  }

  // Method to clear only search cache (useful when you want to force fresh searches)
  static clearSearchCache(): void {
    this.searchCache.clear();
  }

  // Method to clear only stream cache
  static clearStreamCache(): void {
    this.streamCache.clear();
  }
} 