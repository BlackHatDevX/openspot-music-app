import axios from 'axios';
import { SearchResponse, SearchParams, Track, Album, Artist, PlaylistSearchItem } from '../types/music';

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

  private static getPageFromOffset(offset: number, limit: number): number {
    // Saavn search endpoints are 1-based for page indexing.
    return Math.floor(offset / limit) + 1;
  }

  static async search(params: SearchParams): Promise<SearchResponse> {
    if (params.type === 'album') {
      return this.searchAlbums(params.q, params.offset || 0, 20);
    }
    if (params.type === 'artist') {
      return this.searchArtists(params.q, params.offset || 0, 20);
    }
    if (params.type === 'playlist') {
      return this.searchPlaylists(params.q, params.offset || 0, 20);
    }
    return this.searchTracks(params.q, params.offset || 0, 20);
  }

  static async getAlbumSongs(albumId: string): Promise<Track[]> {
    try {
      const response = await MusicApiClient.get('/api/albums', {
        params: { id: albumId, limit: 1000 },
      });
      const songs = this.extractSongsFromEntityResponse(response.data);
      return songs.map((item: any) => this.transformSongToTrack(item));
    } catch (error) {
      console.error('Api album songs error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi album songs failed: ${error.message}`);
      }
      throw new Error('MusicApi album songs request failed');
    }
  }

  static async getArtistSongs(artistId: string, page: number = 0): Promise<{ tracks: Track[]; total: number }> {
    try {
      const response = await MusicApiClient.get(`/api/artists/${encodeURIComponent(artistId)}/songs`, {
        params: { sortBy: 'popularity', page },
      });
      const songs = this.extractSongsFromEntityResponse(response.data);
      const total = response.data?.data?.total || 0;
      return {
        tracks: songs.map((item: any) => this.transformSongToTrack(item)),
        total,
      };
    } catch (error) {
      console.error('Api artist songs error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi artist songs failed: ${error.message}`);
      }
      throw new Error('MusicApi artist songs request failed');
    }
  }

  static async getPlaylistSongs(playlistId: string): Promise<Track[]> {
    try {
      const response = await MusicApiClient.get('/api/playlists', {
        params: { id: playlistId, limit: 1000 },
      });
      const songs = this.extractSongsFromEntityResponse(response.data);
      return songs.map((item: any) => this.transformSongToTrack(item));
    } catch (error) {
      console.error('Api playlist songs error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi playlist songs failed: ${error.message}`);
      }
      throw new Error('MusicApi playlist songs request failed');
    }
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

  static async searchArtists(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    const cacheKey = `saavn_search_artists_${query}_${offset}_${limit}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const requestPromise = this.performArtistSearch(query, offset, limit);
    this.searchCache.set(cacheKey, requestPromise);

    requestPromise.finally(() => {
      this.searchCache.delete(cacheKey);
    });

    return requestPromise;
  }

  static async searchPlaylists(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    const cacheKey = `saavn_search_playlists_${query}_${offset}_${limit}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const requestPromise = this.performPlaylistSearch(query, offset, limit);
    this.searchCache.set(cacheKey, requestPromise);

    requestPromise.finally(() => {
      this.searchCache.delete(cacheKey);
    });

    return requestPromise;
  }

  static async searchAlbums(query: string, offset: number = 0, limit: number = 20): Promise<SearchResponse> {
    const cacheKey = `saavn_search_albums_${query}_${offset}_${limit}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const requestPromise = this.performAlbumSearch(query, offset, limit);
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
          page: this.getPageFromOffset(offset, limit),
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
        albums: [],
        artists: [],
        playlists: [],
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
      albums: [],
      artists: [],
      playlists: [],
      pagination: {
        offset: data.data.start || 0,
        total: data.data.total || tracks.length,
        hasMore: (data.data.start || 0) + tracks.length < (data.data.total || tracks.length),
      },
    };
  }

  private static extractSongsFromEntityResponse(data: any): any[] {
    if (!data?.success || !data?.data) {
      return [];
    }

    const payload = data.data;
    if (Array.isArray(payload?.songs)) return payload.songs;
    if (Array.isArray(payload?.topSongs)) return payload.topSongs;
    if (Array.isArray(payload?.list)) return payload.list;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload)) {
      const first = payload[0];
      if (Array.isArray(first?.songs)) return first.songs;
      if (Array.isArray(first?.topSongs)) return first.topSongs;
      if (Array.isArray(first?.list)) return first.list;
    }
    return [];
  }

  private static async performArtistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/artists', {
        params: {
          query,
          page: this.getPageFromOffset(offset, limit),
          limit,
        },
      });

      return this.transformArtistSearchResponse(response.data);
    } catch (error) {
      console.error('Api artist search error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi artist search failed: ${error.message}`);
      }
      throw new Error('MusicApi artist search request failed');
    }
  }

  private static async performPlaylistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/playlists', {
        params: {
          query,
          page: this.getPageFromOffset(offset, limit),
          limit,
        },
      });

      return this.transformPlaylistSearchResponse(response.data);
    } catch (error) {
      console.error('Api playlist search error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi playlist search failed: ${error.message}`);
      }
      throw new Error('MusicApi playlist search request failed');
    }
  }

  private static async performAlbumSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/albums', {
        params: {
          query,
          page: this.getPageFromOffset(offset, limit),
          limit,
        },
      });

      return this.transformAlbumSearchResponse(response.data);
    } catch (error) {
      console.error('Api album search error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`MusicApi album search failed: ${error.message}`);
      }
      throw new Error('MusicApi album search request failed');
    }
  }

  private static transformAlbumSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) {
      return {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        pagination: {
          offset: 0,
          total: 0,
          hasMore: false,
        },
      };
    }

    const albums: Album[] = (data.data.results || []).map((item: any) => 
      this.transformAlbumToAlbum(item)
    );

    return {
      tracks: [],
      albums,
      artists: [],
      playlists: [],
      pagination: {
        offset: data.data.start || 0,
        total: data.data.total || albums.length,
        hasMore: (data.data.start || 0) + albums.length < (data.data.total || albums.length),
      },
    };
  }

  private static transformArtistSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) {
      return {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        pagination: {
          offset: 0,
          total: 0,
          hasMore: false,
        },
      };
    }

    const artists: Artist[] = (data.data.results || []).map((item: any) =>
      this.transformArtist(item)
    );

    return {
      tracks: [],
      albums: [],
      artists,
      playlists: [],
      pagination: {
        offset: data.data.start || 0,
        total: data.data.total || artists.length,
        hasMore: (data.data.start || 0) + artists.length < (data.data.total || artists.length),
      },
    };
  }

  private static transformPlaylistSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) {
      return {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        pagination: {
          offset: 0,
          total: 0,
          hasMore: false,
        },
      };
    }

    const playlists: PlaylistSearchItem[] = (data.data.results || []).map((item: any) =>
      this.transformPlaylist(item)
    );

    return {
      tracks: [],
      albums: [],
      artists: [],
      playlists,
      pagination: {
        offset: data.data.start || 0,
        total: data.data.total || playlists.length,
        hasMore: (data.data.start || 0) + playlists.length < (data.data.total || playlists.length),
      },
    };
  }

  private static transformArtist(item: any): Artist {
    const images = item.image || [];
    const smallImage = images.find((img: any) => img.quality === '50x50')?.url || images[0]?.url || '';
    const thumbnailImage = images.find((img: any) => img.quality === '150x150')?.url || images[1]?.url || smallImage;
    const largeImage = images.find((img: any) => img.quality === '500x500')?.url || images[2]?.url || thumbnailImage;

    return {
      id: item.id || '',
      name: decodeHtmlEntities(item.name || ''),
      url: item.url || '',
      followerCount: item.followerCount || null,
      isVerified: Boolean(item.isVerified),
      dominantLanguage: item.dominantLanguage || '',
      dominantType: item.dominantType || '',
      role: item.role || '',
      image: images,
      images: {
        small: smallImage,
        thumbnail: thumbnailImage,
        large: largeImage,
      },
    };
  }

  private static transformPlaylist(item: any): PlaylistSearchItem {
    const images = item.image || [];
    const smallImage = images.find((img: any) => img.quality === '50x50')?.url || images[0]?.url || '';
    const thumbnailImage = images.find((img: any) => img.quality === '150x150')?.url || images[1]?.url || smallImage;
    const largeImage = images.find((img: any) => img.quality === '500x500')?.url || images[2]?.url || thumbnailImage;

    return {
      id: item.id || '',
      name: decodeHtmlEntities(item.name || ''),
      description: decodeHtmlEntities(item.description || ''),
      type: item.type || '',
      songCount: item.songCount || null,
      followerCount: item.followerCount || null,
      explicitContent: Boolean(item.explicitContent),
      language: item.language || '',
      url: item.url || '',
      image: images,
      images: {
        small: smallImage,
        thumbnail: thumbnailImage,
        large: largeImage,
      },
    };
  }

  private static transformAlbumToAlbum(item: any): Album {
    const primaryArtist = item.artists?.primary?.[0]?.name || item.artists?.all?.[0]?.name || 'Unknown';

    const images = item.image || [];
    const smallImage = images.find((img: any) => img.quality === '50x50')?.url || images[0]?.url || '';
    const thumbnailImage = images.find((img: any) => img.quality === '150x150')?.url || images[1]?.url || smallImage;
    const largeImage = images.find((img: any) => img.quality === '500x500')?.url || images[2]?.url || thumbnailImage;

    return {
      id: item.id,
      name: decodeHtmlEntities(item.name || ''),
      description: decodeHtmlEntities(item.description || ''),
      year: item.year || null,
      type: item.type || '',
      playCount: item.playCount || null,
      language: item.language || '',
      explicitContent: item.explicitContent || false,
      artists: item.artists || {
        primary: [],
        featured: [],
        all: [],
      },
      songCount: item.songCount || null,
      url: item.url || '',
      image: images,
      images: {
        small: smallImage,
        thumbnail: thumbnailImage,
        large: largeImage,
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
      provider: 'saavn',
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
    console.log('[MusicApi/Saavn] getStreamUrl:', { trackId, provider: 'saavn' });
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
