import { SearchResponse, SearchParams, Track } from '../types/music';
import { MusicApi } from './api';
import { YTMusicAPI } from './ytmusic-api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROVIDER_KEY = 'openspot_provider_v1';

export class MusicAPI {
  private static searchCache = new Map<string, Promise<SearchResponse>>();
  private static streamCache = new Map<string, Promise<string>>();
  private static recentlyPlayedStorageKey = 'openspot_recently_played_tracks_v1';
  private static recentlyPlayedLimit = 30;

  private static async getProvider(): Promise<'saavn' | 'ytmusic'> {
    try {
      const provider = await AsyncStorage.getItem(PROVIDER_KEY);
      return (provider === 'ytmusic' ? 'ytmusic' : 'saavn') as 'saavn' | 'ytmusic';
    } catch {
      return 'saavn';
    }
  }

  private static resolveProviderHint(trackOrProvider?: Track | 'saavn' | 'ytmusic'): 'saavn' | 'ytmusic' | null {
    if (!trackOrProvider) return null;
    if (trackOrProvider === 'saavn' || trackOrProvider === 'ytmusic') {
      return trackOrProvider;
    }
    return trackOrProvider.provider || null;
  }

  static async search(params: SearchParams): Promise<SearchResponse> {
    const provider = await this.getProvider();
    // YT provider currently supports tracks reliably; enforce Saavn for richer media entities.
    if (provider === 'ytmusic' && (!params.type || params.type === 'track')) {
      return YTMusicAPI.search(params);
    }
    return MusicApi.search(params);
  }

  static async searchTracks(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    const provider = await this.getProvider();
    if (provider === 'ytmusic') {
      return YTMusicAPI.search({ q: query, type: 'track' });
    }
    return MusicApi.searchTracks(query, offset, limit);
  }

  static async getStreamUrl(trackId: string, trackOrProvider?: Track | 'saavn' | 'ytmusic'): Promise<string> {
    const hintedProvider = this.resolveProviderHint(trackOrProvider);
    const provider = hintedProvider || await this.getProvider();
    if (provider === 'ytmusic') {
      return YTMusicAPI.getStreamUrl(trackId);
    }
    return MusicApi.getStreamUrl(trackId);
  }

  static async getPopularTracks(): Promise<Track[]> {
    // Trending/popular lists are intentionally forced to Saavn for stability.
    return MusicApi.getPopularTracks();
  }

  static async getAlbumSongs(albumId: string): Promise<Track[]> {
    const provider = await this.getProvider();
    // Enforce Saavn because YT no-login source lacks reliable album entity metadata.
    if (provider === 'ytmusic') return MusicApi.getAlbumSongs(albumId);
    return MusicApi.getAlbumSongs(albumId);
  }

  static async getArtistSongs(artistId: string): Promise<Track[]> {
    const provider = await this.getProvider();
    // Enforce Saavn because YT no-login source lacks reliable artist entity metadata.
    if (provider === 'ytmusic') return MusicApi.getArtistSongs(artistId);
    return MusicApi.getArtistSongs(artistId);
  }

  static async getPlaylistSongs(playlistId: string): Promise<Track[]> {
    const provider = await this.getProvider();
    // Enforce Saavn because YT no-login source lacks reliable playlist entity metadata.
    if (provider === 'ytmusic') return MusicApi.getPlaylistSongs(playlistId);
    return MusicApi.getPlaylistSongs(playlistId);
  }

  static async getRecentlyPlayed(): Promise<Track[]> {
    try {
      const stored = await AsyncStorage.getItem(this.recentlyPlayedStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Track[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to read recently played tracks:', error);
      return [];
    }
  }

  static async addToRecentlyPlayed(track: Track): Promise<void> {
    try {
      const existing = await this.getRecentlyPlayed();
      const deduped = existing.filter((item) => item.id.toString() !== track.id.toString());
      const next = [track, ...deduped].slice(0, this.recentlyPlayedLimit);
      await AsyncStorage.setItem(this.recentlyPlayedStorageKey, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save recently played track:', error);
    }
  }

  static async clearRecentlyPlayed(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.recentlyPlayedStorageKey);
    } catch (error) {
      console.error('Failed to clear recently played tracks:', error);
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    // Trending-like personalized lists are intentionally forced to Saavn for stability.
    return MusicApi.getMadeForYou();
  }

  static async resolveTrackById(trackId: string, preferredProvider?: 'saavn' | 'ytmusic'): Promise<Track | null> {
    const providers: Array<'saavn' | 'ytmusic'> = preferredProvider
      ? [preferredProvider, preferredProvider === 'saavn' ? 'ytmusic' : 'saavn']
      : ['saavn', 'ytmusic'];

    for (const provider of providers) {
      try {
        const response = provider === 'saavn'
          ? await MusicApi.search({ q: trackId, type: 'track' })
          : await YTMusicAPI.search({ q: trackId, type: 'track' });
        if (response.tracks.length > 0) {
          return response.tracks[0];
        }
      } catch {
        // try next provider
      }
    }

    return null;
  }

  static formatDuration(duration: number): string {
    const seconds = duration >= 1000 ? Math.floor(duration / 1000) : duration;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static getOptimalImage(images: { small: string; thumbnail: string; large: string }): string {
    return images.large || images.small || images.thumbnail;
  }

  static isHighQuality(track: Track): boolean {
    return track.audioQuality.isHiRes || track.audioQuality.maximumBitDepth >= 24;
  }

  static getQualityBadge(track: Track): string | null {
    if (track.audioQuality.isHiRes) return 'Hi-Res';
    if (track.audioQuality.maximumBitDepth >= 24) return 'HD';
    return null;
  }

  static clearCache(): void {
    this.searchCache.clear();
    this.streamCache.clear();
  }

  static clearSearchCache(): void {
    this.searchCache.clear();
  }

  static clearStreamCache(): void {
    this.streamCache.clear();
  }
} 