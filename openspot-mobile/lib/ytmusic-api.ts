import { Track, Album, Artist, PlaylistSearchItem, SearchResponse } from '@/types/music';

type YtApiSearchItem = {
  type?: string;
  videoId?: string;
  title?: string;
  author?: string;
  authorId?: string;
  lengthSeconds?: number;
  videoThumbnails?: Array<{ url: string; quality?: string; width?: number; height?: number }>;
};

type YtApiVideoData = {
  adaptiveFormats?: Array<{
    itag?: number;
    type?: string;
    bitrate?: number;
    url?: string;
  }>;
};

export class YTMusicAPI {
  private static readonly ytApiInstances = this.loadInstancesFromEnv();

  private static loadInstancesFromEnv(): string[] {
    const envVar = process.env.EXPO_PUBLIC_YT_API_INSTANCES;
    if (!envVar) {
      throw new Error('EXPO_PUBLIC_YT_API_INSTANCES environment variable is not set');
    }
    return envVar.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }

  private static pickBestThumbnail(thumbnails?: Array<{ url: string }>): string {
    if (!thumbnails?.length) return '';
    const ranked = [...thumbnails].sort((a, b) => {
      const aw = this.extractSizeFromUrl(a.url);
      const bw = this.extractSizeFromUrl(b.url);
      return bw - aw;
    });
    return ranked[0]?.url || thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
  }

  private static extractSizeFromUrl(url: string): number {
    const match = url.match(/(?:w|width)=([0-9]{2,4})/i) || url.match(/\/([0-9]{2,4})x([0-9]{2,4})\//i);
    if (!match) return 0;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : 0;
  }

  private static buildHighResThumbnail(videoId?: string, fallback?: string): string {
    if (!videoId) return fallback || '';
    // Prefer maxres, with hq as fallback to avoid very blurry default/thumb variants.
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  private static getBestThumbnail(item: YtApiSearchItem): string {
    const bestFromSource = this.pickBestThumbnail(item.videoThumbnails);
    if (item.videoId) {
      return this.buildHighResThumbnail(item.videoId, bestFromSource);
    }
    return bestFromSource;
  }

  private static toImageSet(url: string) {
    return {
      small: url,
      thumbnail: url,
      large: url,
    };
  }

  private static mapSearchType(type?: string): 'track' | 'album' | 'artist' | 'playlist' {
    const normalized = (type || '').toLowerCase();
    if (normalized.includes('playlist')) return 'playlist';
    if (normalized.includes('channel') || normalized.includes('artist')) return 'artist';
    if (normalized.includes('album')) return 'album';
    return 'track';
  }

  private static async fetchFromAnyInstance<T>(path: string): Promise<T> {
    let lastError: unknown = null;
    for (const instance of this.ytApiInstances) {
      try {
        const response = await this.fetchWithTimeout(`${instance}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${instance}`);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `All no-login YouTube providers failed${lastError ? `: ${String(lastError)}` : ''}`
    );
  }

  private static async fetchWithInstance<T>(path: string): Promise<{ data: T; instance: string }> {
    let lastError: unknown = null;
    for (const instance of this.ytApiInstances) {
      try {
        const response = await this.fetchWithTimeout(`${instance}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${instance}`);
        }
        return { data: (await response.json()) as T, instance };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `All no-login YouTube providers failed${lastError ? `: ${String(lastError)}` : ''}`
    );
  }

  private static async fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private static normalizeTrack(item: YtApiSearchItem): Track {
    const thumb = this.getBestThumbnail(item);
    const artistName = item.author || 'Unknown Artist';

    return {
      id: item.videoId || '',
      provider: 'ytmusic',
      title: item.title || 'Unknown title',
      artist: artistName,
      artistId: 0,
      albumTitle: '',
      albumCover: thumb,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: (item.lengthSeconds || 0) * 1000,
      audioQuality: {
        maximumBitDepth: 16,
        maximumSamplingRate: 44100,
        isHiRes: false,
      },
      version: null,
      label: '',
      labelId: 0,
      upc: '',
      mediaCount: 1,
      parental_warning: false,
      streamable: true,
      purchasable: false,
      previewable: false,
      genreId: 0,
      genreSlug: '',
      genreColor: '',
      releaseDateStream: '',
      releaseDateDownload: '',
      maximumChannelCount: 2,
      images: {
        small: thumb,
        thumbnail: thumb,
        large: thumb,
        back: null,
      },
      isrc: '',
    };
  }

  private static normalizeAlbum(item: YtApiSearchItem): Album {
    const thumb = this.getBestThumbnail(item);
    const artist = item.author || 'Unknown Artist';

    return {
      id: item.videoId || '',
      name: item.title || 'Unknown Album',
      description: '',
      year: null,
      type: 'album',
      playCount: null,
      language: '',
      explicitContent: false,
      artists: {
        primary: [{
          id: item.authorId || '',
          name: artist,
          role: 'primary',
          type: 'artist',
          image: thumb ? [{ quality: 'default', url: thumb }] : [],
          url: item.authorId ? `https://www.youtube.com/channel/${item.authorId}` : '',
        }],
        featured: [],
        all: [{
          id: item.authorId || '',
          name: artist,
          role: 'primary',
          type: 'artist',
          image: thumb ? [{ quality: 'default', url: thumb }] : [],
          url: item.authorId ? `https://www.youtube.com/channel/${item.authorId}` : '',
        }],
      },
      songCount: null,
      url: item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : '',
      image: thumb ? [{ quality: 'default', url: thumb }] : [],
      images: this.toImageSet(thumb),
    };
  }

  private static normalizeArtist(item: YtApiSearchItem): Artist {
    const thumb = this.getBestThumbnail(item);

    return {
      id: item.authorId || '',
      name: item.author || item.title || 'Unknown Artist',
      url: item.authorId ? `https://www.youtube.com/channel/${item.authorId}` : '',
      followerCount: null,
      isVerified: false,
      dominantLanguage: '',
      dominantType: 'artist',
      role: 'artist',
      image: thumb ? [{ quality: 'default', url: thumb }] : [],
      images: {
        small: thumb,
        thumbnail: thumb,
        large: thumb,
      },
    };
  }

  private static normalizePlaylist(item: YtApiSearchItem): PlaylistSearchItem {
    const thumb = this.getBestThumbnail(item);

    return {
      id: item.videoId || '',
      name: item.title || 'Unknown Playlist',
      description: '',
      type: 'playlist',
      songCount: null,
      followerCount: null,
      explicitContent: false,
      language: '',
      url: item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : '',
      image: thumb ? [{ quality: 'default', url: thumb }] : [],
      images: {
        small: thumb,
        thumbnail: thumb,
        large: thumb,
      },
    };
  }

  static async search(params: { q: string; type?: 'track' | 'album' | 'artist' | 'playlist' }): Promise<SearchResponse> {
    try {
      const results = await this.fetchFromAnyInstance<YtApiSearchItem[]>(
        `/api/v1/search?q=${encodeURIComponent(params.q)}&type=video`
      );

      const response: SearchResponse = {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        pagination: {
          offset: 0,
          total: results.length || 0,
          hasMore: false,
        },
      };

      for (const item of results) {
        const mappedType = this.mapSearchType(item.type);
        if (mappedType === 'track' && (!params.type || params.type === 'track')) {
          response.tracks.push(this.normalizeTrack(item));
        } else if (mappedType === 'album' && (!params.type || params.type === 'album')) {
          response.albums.push(this.normalizeAlbum(item));
        } else if (mappedType === 'artist' && (!params.type || params.type === 'artist')) {
          response.artists.push(this.normalizeArtist(item));
        } else if (mappedType === 'playlist' && (!params.type || params.type === 'playlist')) {
          response.playlists.push(this.normalizePlaylist(item));
        }
      }

      return response;
    } catch (error) {
      console.error('YTMusic search error:', error);
      return {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        pagination: { offset: 0, total: 0, hasMore: false },
      };
    }
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    try {
      const { data: videoData, instance } = await this.fetchWithInstance<YtApiVideoData>(
        `/api/v1/videos/${encodeURIComponent(trackId)}`
      );

      const audioFormats = (videoData.adaptiveFormats || [])
        .filter((format) => (format.type || '').startsWith('audio/'))
        .sort((a, b) => {
          const aIsMp4 = (a.type || '').includes('audio/mp4') ? 1 : 0;
          const bIsMp4 = (b.type || '').includes('audio/mp4') ? 1 : 0;
          if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
          return (b.bitrate || 0) - (a.bitrate || 0);
        });

      const bestAudio = audioFormats[0];
      if (!bestAudio) {
        throw new Error('No audio stream found');
      }

      // Use instance-local redirect endpoint to avoid IP-bound Google URLs causing random 403 on device.
      if (bestAudio.itag) {
        return `${instance}/latest_version?id=${encodeURIComponent(trackId)}&itag=${bestAudio.itag}&local=true`;
      }

      if (bestAudio.url) {
        return bestAudio.url;
      }

      throw new Error('No usable audio stream URL found');
    } catch (error) {
      console.error('YTMusic stream error:', error);
      throw new Error('Failed to get stream URL');
    }
  }

  static async getAlbumSongs(albumId: string): Promise<Track[]> {
    try {
      const results = await this.search({ q: albumId, type: 'track' });
      return results.tracks;
    } catch (error) {
      console.error('YTMusic album songs error:', error);
      return [];
    }
  }

  static async getArtistSongs(artistId: string): Promise<Track[]> {
    try {
      const results = await this.search({ q: artistId, type: 'track' });
      return results.tracks;
    } catch (error) {
      console.error('YTMusic artist songs error:', error);
      return [];
    }
  }

  static async getPlaylistSongs(playlistId: string): Promise<Track[]> {
    try {
      const results = await this.search({ q: playlistId, type: 'track' });
      return results.tracks;
    } catch (error) {
      console.error('YTMusic playlist songs error:', error);
      return [];
    }
  }

  static async getPopularTracks(): Promise<Track[]> {
    try {
      const results = await this.search({ q: 'popular music', type: 'track' });
      return results.tracks.slice(0, 20);
    } catch (error) {
      console.error('YTMusic popular tracks error:', error);
      return [];
    }
  }

  static async getMadeForYou(): Promise<Track[]> {
    try {
      const results = await this.search({ q: 'trending music', type: 'track' });
      return results.tracks.slice(0, 20);
    } catch (error) {
      console.error('YTMusic made for you error:', error);
      return [];
    }
  }
}
