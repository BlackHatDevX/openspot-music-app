import axios, { isAxiosError } from 'axios';
import { SearchResponse, SearchParams, Track, Album, Artist, PlaylistSearchItem } from '../types/music';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const MusicApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, 
  headers: {
    'Content-Type': 'application/json',
  },
});


function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  return text
    .replace(/&[#\w]+;/g, (match) => {
      if (namedEntities[match]) return namedEntities[match];
      
      const decimal = match.match(/^&#(\d+);$/);
      if (decimal) return String.fromCharCode(parseInt(decimal[1], 10));
      
      const hex = match.match(/^&#x([0-9a-fA-F]+);$/);
      if (hex) return String.fromCharCode(parseInt(hex[1], 16));
      return match;
    });
}



interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;  
const STREAM_CACHE_TTL_MS = 5 * 60 * 1000;  

export class MusicApi {
  private static searchCache = new Map<string, CacheEntry<SearchResponse>>();
  private static streamCache = new Map<string, CacheEntry<string>>();
  
  private static inFlightSearch = new Map<string, Promise<SearchResponse>>();
  private static inFlightStream = new Map<string, Promise<string>>();

  private static getPageFromOffset(offset: number, limit: number): number {
    
    const safeOffset = Math.max(0, offset);
    return Math.floor(safeOffset / limit) + 1;
  }

  

  private static getCachedSearch(key: string): SearchResponse | null {
    const entry = this.searchCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.searchCache.delete(key);
      return null;
    }
    return entry.value;
  }

  private static setCachedSearch(key: string, value: SearchResponse): void {
    this.searchCache.set(key, { value, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  }

  private static getCachedStream(key: string): string | null {
    const entry = this.streamCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.streamCache.delete(key);
      return null;
    }
    return entry.value;
  }

  private static setCachedStream(key: string, value: string): void {
    this.streamCache.set(key, { value, expiresAt: Date.now() + STREAM_CACHE_TTL_MS });
  }

  

  static async search(params: SearchParams): Promise<SearchResponse> {
    if (params.type === 'album') return this.searchAlbums(params.q, params.offset || 0, 20);
    if (params.type === 'artist') return this.searchArtists(params.q, params.offset || 0, 20);
    if (params.type === 'playlist') return this.searchPlaylists(params.q, params.offset || 0, 20);
    return this.searchTracks(params.q, params.offset || 0, 20);
  }

  static async getAlbumSongs(albumId: string): Promise<Track[]> {
    try {
      const response = await MusicApiClient.get('/api/albums', {
        params: { id: albumId, limit: 1000 },
      });
      return this.extractSongsFromEntityResponse(response.data)
        .map((item: any) => this.transformSongToTrack(item));
    } catch (error) {
      console.error('Api album songs error:', error);
      throw new Error(`MusicApi album songs failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  static async getArtistSongs(artistId: string, page = 0): Promise<{ tracks: Track[]; total: number }> {
    try {
      const response = await MusicApiClient.get(`/api/artists/${encodeURIComponent(artistId)}/songs`, {
        params: { sortBy: 'popularity', page },
      });
      const songs = this.extractSongsFromEntityResponse(response.data);
      return {
        tracks: songs.map((item: any) => this.transformSongToTrack(item)),
        total: response.data?.data?.total || 0,
      };
    } catch (error) {
      console.error('Api artist songs error:', error);
      throw new Error(`MusicApi artist songs failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  static async getPlaylistSongs(playlistId: string): Promise<Track[]> {
    try {
      const response = await MusicApiClient.get('/api/playlists', {
        params: { id: playlistId, limit: 1000 },
      });
      return this.extractSongsFromEntityResponse(response.data)
        .map((item: any) => this.transformSongToTrack(item));
    } catch (error) {
      console.error('Api playlist songs error:', error);
      throw new Error(`MusicApi playlist songs failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  static async searchTracks(query: string, offset = 0, limit = 20): Promise<SearchResponse> {
    const key = `tracks_${query}_${offset}_${limit}`;
    const cached = this.getCachedSearch(key);
    if (cached) return cached;

    
    if (this.inFlightSearch.has(key)) return this.inFlightSearch.get(key)!;

    const promise = this.performSearch(query, offset, limit).then(result => {
      this.setCachedSearch(key, result);
      return result;
    }).finally(() => this.inFlightSearch.delete(key));

    this.inFlightSearch.set(key, promise);
    return promise;
  }

  static async searchArtists(query: string, offset = 0, limit = 20): Promise<SearchResponse> {
    const key = `artists_${query}_${offset}_${limit}`;
    const cached = this.getCachedSearch(key);
    if (cached) return cached;

    if (this.inFlightSearch.has(key)) return this.inFlightSearch.get(key)!;

    const promise = this.performArtistSearch(query, offset, limit).then(result => {
      this.setCachedSearch(key, result);
      return result;
    }).finally(() => this.inFlightSearch.delete(key));

    this.inFlightSearch.set(key, promise);
    return promise;
  }

  static async searchPlaylists(query: string, offset = 0, limit = 20): Promise<SearchResponse> {
    const key = `playlists_${query}_${offset}_${limit}`;
    const cached = this.getCachedSearch(key);
    if (cached) return cached;

    if (this.inFlightSearch.has(key)) return this.inFlightSearch.get(key)!;

    const promise = this.performPlaylistSearch(query, offset, limit).then(result => {
      this.setCachedSearch(key, result);
      return result;
    }).finally(() => this.inFlightSearch.delete(key));

    this.inFlightSearch.set(key, promise);
    return promise;
  }

  static async searchAlbums(query: string, offset = 0, limit = 20): Promise<SearchResponse> {
    const key = `albums_${query}_${offset}_${limit}`;
    const cached = this.getCachedSearch(key);
    if (cached) return cached;

    if (this.inFlightSearch.has(key)) return this.inFlightSearch.get(key)!;

    const promise = this.performAlbumSearch(query, offset, limit).then(result => {
      this.setCachedSearch(key, result);
      return result;
    }).finally(() => this.inFlightSearch.delete(key));

    this.inFlightSearch.set(key, promise);
    return promise;
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    const key = `stream_${trackId}`;
    const cached = this.getCachedStream(key);
    if (cached) return cached;

    if (this.inFlightStream.has(key)) return this.inFlightStream.get(key)!;

    const promise = this.performStreamRequest(trackId).then(url => {
      this.setCachedStream(key, url);
      return url;
    }).finally(() => this.inFlightStream.delete(key));

    this.inFlightStream.set(key, promise);
    return promise;
  }

  

  private static async performSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/songs', {
        params: { query, page: this.getPageFromOffset(offset, limit), limit },
      });
      return this.transformSearchResponse(response.data);
    } catch (error) {
      console.error('Api search error:', error);
      throw new Error(`MusicApi search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performArtistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/artists', {
        params: { query, page: this.getPageFromOffset(offset, limit), limit },
      });
      return this.transformArtistSearchResponse(response.data);
    } catch (error) {
      console.error('Api artist search error:', error);
      throw new Error(`MusicApi artist search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performPlaylistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/playlists', {
        params: { query, page: this.getPageFromOffset(offset, limit), limit },
      });
      return this.transformPlaylistSearchResponse(response.data);
    } catch (error) {
      console.error('Api playlist search error:', error);
      throw new Error(`MusicApi playlist search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performAlbumSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const response = await MusicApiClient.get('/api/search/albums', {
        params: { query, page: this.getPageFromOffset(offset, limit), limit },
      });
      return this.transformAlbumSearchResponse(response.data);
    } catch (error) {
      console.error('Api album search error:', error);
      throw new Error(`MusicApi album search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performStreamRequest(trackId: string): Promise<string> {
    try {
      const response = await MusicApiClient.get(`/api/songs/${trackId}`);

      if (!response.data.success || !response.data.data?.[0]) {
        throw new Error('No song data received from MusicApi');
      }

      const downloadUrls = response.data.data[0].downloadUrl || [];
      const streamUrl =
        downloadUrls.find((u: any) => u.quality === '320kbps')?.url ||
        downloadUrls.find((u: any) => u.quality === '128kbps')?.url ||
        downloadUrls[0]?.url || '';

      if (!streamUrl) throw new Error('No stream URL found in MusicApi response');
      return streamUrl;
    } catch (error) {
      console.error('MusicApi stream URL error:', error);
      throw new Error(`MusicApi stream failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  

  private static transformSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) return this.emptyResponse();
    const tracks: Track[] = (data.data.results || []).map((item: any) => this.transformSongToTrack(item));
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

  private static transformAlbumSearchResponse(data: any): SearchResponse {
    if (!data.success || !data.data) return this.emptyResponse();
    const albums: Album[] = (data.data.results || []).map((item: any) => this.transformAlbumToAlbum(item));
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
    if (!data.success || !data.data) return this.emptyResponse();
    const artists: Artist[] = (data.data.results || []).map((item: any) => this.transformArtist(item));
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
    if (!data.success || !data.data) return this.emptyResponse();
    const playlists: PlaylistSearchItem[] = (data.data.results || []).map((item: any) => this.transformPlaylist(item));
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

  private static extractSongsFromEntityResponse(data: any): any[] {
    if (!data?.success || !data?.data) return [];
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

  private static resolveImages(images: any[]) {
    const small = images.find((img: any) => img.quality === '50x50')?.url || images[0]?.url || '';
    const thumbnail = images.find((img: any) => img.quality === '150x150')?.url || images[1]?.url || small;
    const large = images.find((img: any) => img.quality === '500x500')?.url || images[2]?.url || thumbnail;
    return { small, thumbnail, large };
  }

  private static transformSongToTrack(item: any): Track {
    const primaryArtist = item.artists?.primary?.[0]?.name || item.artists?.all?.[0]?.name || 'Unknown';
    const images = item.image || [];
    const { small, thumbnail, large } = this.resolveImages(images);

    
    
    
    const downloadUrls = item.downloadUrl || [];
    const embeddedStreamUrl =
      downloadUrls.find((u: any) => u.quality === '320kbps')?.url ||
      downloadUrls.find((u: any) => u.quality === '128kbps')?.url ||
      downloadUrls[0]?.url || '';

    return {
      id: item.id,
      provider: 'saavn',
      title: decodeHtmlEntities(item.name || item.title || ''),
      artist: decodeHtmlEntities(primaryArtist),
      artistId: 0,
      albumTitle: decodeHtmlEntities(item.album?.name || ''),
      albumCover: large,
      albumId: item.album?.id || '',
      releaseDate: item.releaseDate || item.year || '',
      genre: item.language || '',
      duration: (item.duration || 0) * 1000,
      audioQuality: { maximumBitDepth: 16, maximumSamplingRate: 44100, isHiRes: false },
      version: null,
      label: decodeHtmlEntities(item.label || ''),
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: item.explicitContent || false,
      streamable: true,
      purchasable: false,
      
      previewable: Boolean(embeddedStreamUrl),
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: { small, thumbnail, large, back: null },
      isrc: '',
    };
  }

  private static transformAlbumToAlbum(item: any): Album {
    const images = item.image || [];
    const { small, thumbnail, large } = this.resolveImages(images);
    return {
      id: item.id,
      name: decodeHtmlEntities(item.name || ''),
      description: decodeHtmlEntities(item.description || ''),
      year: item.year || null,
      type: item.type || '',
      playCount: item.playCount || null,
      language: item.language || '',
      explicitContent: item.explicitContent || false,
      artists: item.artists || { primary: [], featured: [], all: [] },
      songCount: item.songCount || null,
      url: item.url || '',
      image: images,
      images: { small, thumbnail, large },
    };
  }

  private static transformArtist(item: any): Artist {
    const images = item.image || [];
    const { small, thumbnail, large } = this.resolveImages(images);
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
      images: { small, thumbnail, large },
    };
  }

  private static transformPlaylist(item: any): PlaylistSearchItem {
    const images = item.image || [];
    const { small, thumbnail, large } = this.resolveImages(images);
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
      images: { small, thumbnail, large },
    };
  }

  

  private static emptyResponse(): SearchResponse {
    return { tracks: [], albums: [], artists: [], playlists: [], pagination: { offset: 0, total: 0, hasMore: false } };
  }

  static async getPopularTracks(): Promise<Track[]> {
    try {
      return (await this.searchTracks('popular', 0, 10)).tracks.slice(0, 10);
    } catch {
      return [];
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    try {
      return (await this.searchTracks('trending', 0, 10)).tracks.slice(0, 10);
    } catch {
      return [];
    }
  }

  static clearCache(): void {
    this.searchCache.clear();
    this.streamCache.clear();
    this.inFlightSearch.clear();
    this.inFlightStream.clear();
  }

  static clearSearchCache(): void {
    this.searchCache.clear();
    this.inFlightSearch.clear();
  }

  static clearStreamCache(): void {
    this.streamCache.clear();
    this.inFlightStream.clear();
  }
}