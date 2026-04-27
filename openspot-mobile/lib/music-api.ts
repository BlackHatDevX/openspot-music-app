import { SearchResponse, SearchParams, Track } from '../types/music';
import { MusicApi } from './api';

export class MusicAPI {
  private static searchCache = new Map<string, Promise<SearchResponse>>();
  private static streamCache = new Map<string, Promise<string>>();

  static async search(params: SearchParams): Promise<SearchResponse> {
    return MusicApi.search(params);
  }

  static async searchTracks(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    return MusicApi.searchTracks(query, offset, limit);
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    return MusicApi.getStreamUrl(trackId);
  }

  static async getPopularTracks(): Promise<Track[]> {
    return MusicApi.getPopularTracks();
  }

  static async getRecentlyPlayed(): Promise<Track[]> {
    return [];
  }

  static async getMadeForYou(): Promise<Track[]> {
    return MusicApi.getMadeForYou();
  }

  static formatDuration(seconds: number): string {
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