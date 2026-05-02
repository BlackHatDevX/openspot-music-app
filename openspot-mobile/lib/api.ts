import axios, { isAxiosError } from 'axios';
import CryptoJS from 'crypto-js';
import { SearchResponse, SearchParams, Track, Album, Artist, PlaylistSearchItem } from '../types/music';

const JIO_SAAVN_API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const buildApiUrl = (endpoint: string, params: Record<string, string | number> = {}) => {
  const url = new URL(JIO_SAAVN_API_URL);
  url.searchParams.append('__call', endpoint);
  url.searchParams.append('_format', 'json');
  url.searchParams.append('_marker', '0');
  url.searchParams.append('api_version', '4');
  url.searchParams.append('ctx', 'web6dot0');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  return url.toString();
};

const fetchJioSaavn = async (endpoint: string, params: Record<string, string | number> = {}) => {
  const url = buildApiUrl(endpoint, params);
  const response = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': getRandomUserAgent(),
    },
    timeout: 15000,
  });
  return response.data;
};

export const createDownloadLinks = (encryptedMediaUrl: string) => {
  if (!encryptedMediaUrl) return [];

  const qualities = [
    { id: '_12', bitrate: '12kbps' },
    { id: '_48', bitrate: '48kbps' },
    { id: '_96', bitrate: '96kbps' },
    { id: '_160', bitrate: '160kbps' },
    { id: '_320', bitrate: '320kbps' }
  ];

  const key = CryptoJS.enc.Utf8.parse('38346591');
  const iv = CryptoJS.enc.Utf8.parse('00000000');

  const decrypted = CryptoJS.DES.decrypt(
    encryptedMediaUrl,
    key,
    { iv: iv, mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  );

  const decryptedLink = decrypted.toString(CryptoJS.enc.Utf8);

  return qualities.map((quality) => ({
    quality: quality.bitrate,
    url: decryptedLink.replace('_96', quality.id)
  }));
};

export const createImageLinks = (link: string) => {
  if (!link) return [];

  const qualities = ['50x50', '150x150', '500x500'];
  const qualityRegex = /150x150|50x50/;
  const protocolRegex = /^http:\/\//;

  return qualities.map((quality) => ({
    quality,
    url: link.replace(qualityRegex, quality).replace(protocolRegex, 'https://')
  }));
};


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
      const data = await fetchJioSaavn('content.getAlbumDetails', { albumid: albumId });
      const songs = this.extractSongsFromEntityResponse(data);
      return songs.map((item: any) => this.transformSongToTrack(item));
    } catch (error) {
      console.error('Api album songs error:', error);
      throw new Error(`MusicApi album songs failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  static async getArtistSongs(artistId: string, page = 0): Promise<{ tracks: Track[]; total: number }> {
    try {
      const data = await fetchJioSaavn('artist.getArtistMoreSong', { 
        artistId, 
        page: page + 1, 
        n_song: 20 
      });
      const songs = this.extractSongsFromEntityResponse(data);
      const total = data?.topSongs?.total || data?.total_songs || data?.song_count || songs.length;
      return {
        tracks: songs.map((item: any) => this.transformSongToTrack(item)),
        total: parseInt(String(total)) || songs.length,
      };
    } catch (error) {
      console.error('Api artist songs error:', error);
      throw new Error(`MusicApi artist songs failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  static async getPlaylistSongs(playlistId: string): Promise<Track[]> {
    try {
      const data = await fetchJioSaavn('playlist.getDetails', { listid: playlistId });
      const songs = this.extractSongsFromEntityResponse(data);
      return songs.map((item: any) => this.transformSongToTrack(item));
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
      const data = await fetchJioSaavn('search.getResults', { 
        q: query, 
        p: this.getPageFromOffset(offset, limit), 
        n: limit 
      });
      return this.transformSearchResponse(data);
    } catch (error) {
      console.error('Api search error:', error);
      throw new Error(`MusicApi search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performArtistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const data = await fetchJioSaavn('search.getArtistResults', { 
        q: query, 
        p: this.getPageFromOffset(offset, limit), 
        n: limit 
      });
      return this.transformArtistSearchResponse(data);
    } catch (error) {
      console.error('Api artist search error:', error);
      throw new Error(`MusicApi artist search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performPlaylistSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const data = await fetchJioSaavn('search.getPlaylistResults', { 
        q: query, 
        p: this.getPageFromOffset(offset, limit), 
        n: limit 
      });
      return this.transformPlaylistSearchResponse(data);
    } catch (error) {
      console.error('Api playlist search error:', error);
      throw new Error(`MusicApi playlist search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performAlbumSearch(query: string, offset: number, limit: number): Promise<SearchResponse> {
    try {
      const data = await fetchJioSaavn('search.getAlbumResults', { 
        q: query, 
        p: this.getPageFromOffset(offset, limit), 
        n: limit 
      });
      return this.transformAlbumSearchResponse(data);
    } catch (error) {
      console.error('Api album search error:', error);
      throw new Error(`MusicApi album search failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static async performStreamRequest(trackId: string): Promise<string> {
    try {
      const data = await fetchJioSaavn('song.getDetails', { pids: trackId });
      
      if (!data?.songs || !data.songs[0]) {
        throw new Error('No song data received from JioSaavn');
      }

      const song = data.songs[0];
      const encryptedMediaUrl = song.more_info?.encrypted_media_url;
      
      if (!encryptedMediaUrl) {
        throw new Error('No encrypted media URL found in song data');
      }

      const downloadLinks = createDownloadLinks(encryptedMediaUrl);
      const streamUrl = 
        downloadLinks.find((u: any) => u.quality === '320kbps')?.url ||
        downloadLinks.find((u: any) => u.quality === '160kbps')?.url ||
        downloadLinks.find((u: any) => u.quality === '96kbps')?.url ||
        downloadLinks[0]?.url || '';

      if (!streamUrl) throw new Error('No stream URL found after decryption');
      return streamUrl;
    } catch (error) {
      console.error('MusicApi stream URL error:', error);
      throw new Error(`MusicApi stream failed: ${isAxiosError(error) ? error.message : 'unknown'}`);
    }
  }

  private static transformSearchResponse(data: any): SearchResponse {
    const songs = data?.response?.songs || data?.songs || data?.results || [];
    if (!Array.isArray(songs) || songs.length === 0) return this.emptyResponse();
    const tracks: Track[] = songs.map((item: any) => this.transformSongToTrack(item));
    return {
      tracks,
      albums: [],
      artists: [],
      playlists: [],
      pagination: {
        offset: 0,
        total: tracks.length,
        hasMore: false,
      },
    };
  }

  private static transformAlbumSearchResponse(data: any): SearchResponse {
    const albums = data?.response?.albums || data?.albums || data?.results || [];
    if (!Array.isArray(albums) || albums.length === 0) return this.emptyResponse();
    const transformedAlbums: Album[] = albums.map((item: any) => this.transformAlbumToAlbum(item));
    return {
      tracks: [],
      albums: transformedAlbums,
      artists: [],
      playlists: [],
      pagination: {
        offset: 0,
        total: transformedAlbums.length,
        hasMore: false,
      },
    };
  }

  private static transformArtistSearchResponse(data: any): SearchResponse {
    const artists = data?.response?.artists || data?.artists || data?.results || [];
    if (!Array.isArray(artists) || artists.length === 0) return this.emptyResponse();
    const transformedArtists: Artist[] = artists.map((item: any) => this.transformArtist(item));
    return {
      tracks: [],
      albums: [],
      artists: transformedArtists,
      playlists: [],
      pagination: {
        offset: 0,
        total: transformedArtists.length,
        hasMore: false,
      },
    };
  }

  private static transformPlaylistSearchResponse(data: any): SearchResponse {
    const playlists = data?.response?.playlists || data?.playlists || data?.results || [];
    if (!Array.isArray(playlists) || playlists.length === 0) return this.emptyResponse();
    const transformedPlaylists: PlaylistSearchItem[] = playlists.map((item: any) => this.transformPlaylist(item));
    return {
      tracks: [],
      albums: [],
      artists: [],
      playlists: transformedPlaylists,
      pagination: {
        offset: 0,
        total: transformedPlaylists.length,
        hasMore: false,
      },
    };
  }

  private static extractSongsFromEntityResponse(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data?.songs)) return data.songs;
    if (Array.isArray(data?.topSongs)) return data.topSongs;
    if (Array.isArray(data?.topSongs?.songs)) return data.topSongs.songs;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.response?.songs)) return data.response.songs;
    if (Array.isArray(data?.response?.topSongs)) return data.response.topSongs;
    if (Array.isArray(data?.response?.topSongs?.songs)) return data.response.topSongs.songs;
    if (Array.isArray(data?.response?.list)) return data.response.list;
    if (Array.isArray(data?.artistPage?.topSongs)) return data.artistPage.topSongs;
    if (Array.isArray(data?.artistPage?.topSongs?.songs)) return data.artistPage.topSongs.songs;
    if (Array.isArray(data?.artistPage?.songs)) return data.artistPage.songs;
    if (Array.isArray(data)) {
      const first = data[0];
      if (Array.isArray(first?.songs)) return first.songs;
      if (Array.isArray(first?.topSongs)) return first.topSongs;
      if (Array.isArray(first?.topSongs?.songs)) return first.topSongs.songs;
      if (Array.isArray(first?.list)) return first.list;
    }
    return [];
  }

  private static resolveImages(image: string) {
    if (!image) return { small: '', thumbnail: '', large: '' };
    const imageLinks = createImageLinks(image);
    const small = imageLinks.find((img: any) => img.quality === '50x50')?.url || '';
    const thumbnail = imageLinks.find((img: any) => img.quality === '150x150')?.url || small;
    const large = imageLinks.find((img: any) => img.quality === '500x500')?.url || thumbnail;
    return { small, thumbnail, large };
  }

  private static transformSongToTrack(item: any): Track {
    const primaryArtist = item.more_info?.artistMap?.primary_artists?.[0]?.name || 
                         item.artists?.primary?.[0]?.name || 
                         item.primary_artists || 
                         'Unknown';
    const image = item.image || '';
    const { small, thumbnail, large } = this.resolveImages(image);

    return {
      id: item.id,
      provider: 'saavn',
      title: decodeHtmlEntities(item.title || item.song || ''),
      artist: decodeHtmlEntities(primaryArtist),
      artistId: 0,
      albumTitle: decodeHtmlEntities(item.more_info?.album || item.album || ''),
      albumCover: large,
      albumId: item.more_info?.album_id || item.albumid || '',
      releaseDate: item.more_info?.release_date || item.year || '',
      genre: item.language || '',
      duration: (parseInt(item.more_info?.duration || item.duration || '0') || 0) * 1000,
      audioQuality: { maximumBitDepth: 16, maximumSamplingRate: 44100, isHiRes: false },
      version: null,
      label: decodeHtmlEntities(item.more_info?.label || item.label || ''),
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
      images: { small, thumbnail, large, back: null },
      isrc: '',
    };
  }

  private static transformAlbumToAlbum(item: any): Album {
    const image = item.image || '';
    const { small, thumbnail, large } = this.resolveImages(image);
    
    const primaryArtists = (item.artists || item.primary_artists || item.more_info?.artistMap?.primary_artists || []).map((artist: any) => ({
      id: artist.id || '',
      name: artist.name || '',
      role: artist.role || '',
      type: artist.type || '',
      image: artist.image ? createImageLinks(artist.image) : [],
      url: artist.url || artist.perma_url || '',
    }));

    return {
      id: item.id || item.albumid || '',
      name: decodeHtmlEntities(item.title || item.name || ''),
      description: decodeHtmlEntities(item.description || ''),
      year: item.year ? parseInt(item.year) : null,
      type: item.type || '',
      playCount: item.play_count ? parseInt(item.play_count) : null,
      language: item.language || '',
      explicitContent: false,
      artists: {
        primary: primaryArtists,
        featured: [],
        all: primaryArtists,
      },
      songCount: item.more_info?.song_count ? parseInt(item.more_info.song_count) : null,
      url: item.perma_url || item.url || '',
      image: createImageLinks(image),
      images: { small, thumbnail, large },
    };
  }

  private static transformArtist(item: any): Artist {
    const image = item.image || item.artistImage || '';
    const { small, thumbnail, large } = this.resolveImages(image);
    
    return {
      id: item.id || item.artistId || '',
      name: decodeHtmlEntities(item.name || ''),
      url: item.perma_url || item.url || item.urls?.overview || '',
      followerCount: item.follower_count ? parseInt(item.follower_count) : null,
      isVerified: false,
      dominantLanguage: item.dominant_language || item.language || '',
      dominantType: item.dominant_type || '',
      role: item.role || '',
      image: createImageLinks(image),
      images: { small, thumbnail, large },
    };
  }

  private static transformPlaylist(item: any): PlaylistSearchItem {
    const image = item.image || '';
    const { small, thumbnail, large } = this.resolveImages(image);
    
    return {
      id: item.id || item.listid || '',
      name: decodeHtmlEntities(item.title || item.name || ''),
      description: decodeHtmlEntities(item.description || ''),
      type: item.type || '',
      songCount: item.song_count ? parseInt(item.song_count) : null,
      followerCount: item.follower_count ? parseInt(item.follower_count) : null,
      explicitContent: false,
      language: item.language || '',
      url: item.perma_url || item.url || '',
      image: createImageLinks(image),
      images: { small, thumbnail, large },
    };
  }

  private static emptyResponse(): SearchResponse {
    return { tracks: [], albums: [], artists: [], playlists: [], pagination: { offset: 0, total: 0, hasMore: false } };
  }

  static async getPopularTracks(): Promise<Track[]> {
    try {
      const data = await fetchJioSaavn('content.getTrending');
      const songs = this.extractSongsFromEntityResponse(data);
      return songs.slice(0, 10).map((item: any) => this.transformSongToTrack(item));
    } catch {
      return [];
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    try {
      const data = await fetchJioSaavn('content.getTrending');
      const songs = this.extractSongsFromEntityResponse(data);
      return songs.slice(0, 10).map((item: any) => this.transformSongToTrack(item));
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