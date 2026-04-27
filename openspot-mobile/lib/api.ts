import axios from 'axios';
import { SearchResponse, SearchParams, Track } from '../types/music';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const MusicApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function decodeHtmlEntities(text: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
  };

  return text.replace(/&[#\w]+;/g, (match) => entityMap[match] || match);
}

export class MusicApi {
  private static searchCache = new Map<string, Promise<SearchResponse>>();
  private static streamCache = new Map<string, Promise<string>>();

  static async search(params: SearchParams): Promise<SearchResponse> {
    return this.searchTracks(params.q, params.offset || 0, 20);
  }

  static async searchTracks(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    const cacheKey = `saavn_search_${query}_${offset}_${limit}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const requestPromise = this.performSearch(query, offset, limit);
    this.searchCache.set(cacheKey, requestPromise);

    requestPromise.finally(() => {
      this.searchCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private static async performSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/songs', {
        params: {
          query,
          page: Math.floor(offset / limit),
          limit,
        },
      });

      return this.transformSearchResponse(response.data);
    } catch (error) {
      console.error('Api search error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi search failed: ${error.message}`);
      }
      throw new Error('MusicApi search request failed');
    }
  }

  private static transformSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) {
      return {
        tracks: [],
        pagination: {
          offset: 0,
          total: 0,
          hasMore: false,
        },
      };
    }

    const tracks: Track[] = (data.data.results || []).map((item: any) => 
      this.transformSongToTrack(item)
    );

    return {
      tracks,
      pagination: {
        offset: data.data.start || 0,
        total: data.data.total || tracks.length,
        hasMore: (data.data.start || 0) + tracks.length < (data.data.total || tracks.length),
      },
    };
  }

  private static transformSongToTrack(item: any): Track {
    const primaryArtist = item.artists?.primary?.[0]?.name || item.artists?.all?.[0]?.name || 'Unknown';
    const albumName = item.album?.name || '';

    const images = item.image || [];
    const smallImage = images.find((img: any) => img.quality === '50x50')?.url || images[0]?.url || '';
    const thumbnailImage = images.find((img: any) => img.quality === '150x150')?.url || images[1]?.url || smallImage;
    const largeImage = images.find((img: any) => img.quality === '500x500')?.url || images[2]?.url || thumbnailImage;

    const downloadUrls = item.downloadUrl || [];
    const streamUrl = downloadUrls.find((url: any) => url.quality === '320kbps')?.url ||
                      downloadUrls.find((url: any) => url.quality === '128kbps')?.url ||
                      downloadUrls[0]?.url || '';

    return {
      id: item.id,
      title: decodeHtmlEntities(item.name || item.title || ''),
      artist: decodeHtmlEntities(primaryArtist),
      artistId: 0,
      albumTitle: decodeHtmlEntities(albumName),
      albumCover: largeImage,
      albumId: item.album?.id || '',
      releaseDate: item.releaseDate || item.year || '',
      genre: item.language || '',
      duration: (item.duration || 0) * 1000,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false,
      },
      version: null,
      label: decodeHtmlEntities(item.label || ''),
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: item.explicitContent || false,
      streamable: true,
      purchasable: false,
      previewable: true,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: {
        small: smallImage,
        thumbnail: thumbnailImage,
        large: largeImage,
        back: null,
      },
      isrc: '',
    };
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    const cacheKey = `saavn_stream_${trackId}`;

    if (this.streamCache.has(cacheKey)) {
      return this.streamCache.get(cacheKey)!;
    }

    const requestPromise = this.performStreamRequest(trackId);
    this.streamCache.set(cacheKey, requestPromise);

    requestPromise.finally(() => {
      this.streamCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private static async performStreamRequest(trackId: string): Promise<string> {
    try {
      const response = await MusicApiClient.get(`/api/songs/${trackId}`);

      if (!response.data.success || !response.data.data || !response.data.data[0]) {
        throw new Error('No song data received from MusicApi');
      }

      const songData = response.data.data[0];
      const downloadUrls = songData.downloadUrl || [];
      
      const streamUrl = downloadUrls.find((url: any) => url.quality === '320kbps')?.url || 
                        downloadUrls.find((url: any) => url.quality === '128kbps')?.url || 
                        downloadUrls[0]?.url || '';

      if (!streamUrl) {
        throw new Error('No stream URL found in MusicApi response');
      }

      return streamUrl;
    } catch (error) {
      console.error('MusicApi stream URL error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi stream request failed: ${error.message}`);
      }
      throw new Error('MusicApi stream request failed');
    }
  }

  static async getPopularTracks(): Promise<Track[]> {
    try {
      const response = await this.searchTracks('popular', 0, 10);
      return response.tracks.slice(0, 10);
    } catch (error) {
      console.error('Error fetching MusicApi popular tracks:', error);
      return [];
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    try {
      const response = await this.searchTracks('trending', 0, 10);
      return response.tracks.slice(0, 10);
    } catch (error) {
      console.error('Error fetching MusicApi made for you tracks:', error);
      return [];
    }
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
