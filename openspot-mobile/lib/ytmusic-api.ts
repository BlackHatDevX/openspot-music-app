import { Track, SearchResponse } from '@/types/music';

type YtApiSearchItem = {
  type?: string;
  videoId?: string;
  title?: string;
  author?: string;
  authorId?: string;
  lengthSeconds?: number;
  videoThumbnails?: { url: string; quality?: string; width?: number; height?: number }[];
};

type YtApiVideoData = {
  adaptiveFormats?: {
    itag?: number;
    type?: string;
    bitrate?: number;
    url?: string;
  }[];
};

const getEnvInstances = (): string[] => {
  const raw = process.env.EXPO_PUBLIC_YT_API_INSTANCES || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

const getDiscoveryUrl = (): string | null => {
  return process.env.EXPO_PUBLIC_YT_API_DISCOVERY || null;
};

export class YTMusicAPI {
  private static readonly STATIC_INSTANCES: string[] = getEnvInstances();

  private static dynamicInstances: string[] | null = null;
  private static lastWorkingInstance: string | null = null;
  private static instancesFetchedAt = 0;
  private static readonly INSTANCES_TTL_MS = 30 * 60 * 1000;

  private static async getInstances(): Promise<string[]> {
    const now = Date.now();
    const stale = now - this.instancesFetchedAt > this.INSTANCES_TTL_MS;

    if (!this.dynamicInstances || stale) {
      const discoveryUrl = getDiscoveryUrl();
      if (discoveryUrl) {
        try {
          const res = await this.fetchWithTimeout(discoveryUrl, 5000);
          if (res.ok) {
            const json: [string, { api: boolean; uri: string; type: string }][] = await res.json();
            const fresh = json
              .filter(([, info]) => info.api && info.type === 'https' && !info.uri.includes('.onion'))
              .map(([, info]) => info.uri.replace(/\/$/, ''))
              .slice(0, 12);
            if (fresh.length > 0) {
              this.dynamicInstances = fresh;
              this.instancesFetchedAt = now;
            }
          }
        } catch (e) {
          console.warn('[YT API] Discovery fetch failed', e);
        }
      }
    }

    const base = this.dynamicInstances ?? this.STATIC_INSTANCES;
    const seen = new Set(base);
    const extra = this.STATIC_INSTANCES.filter(i => !seen.has(i));
    return [...base, ...extra];
  }

  private static async getOrderedInstances(): Promise<string[]> {
    const all = await this.getInstances();
    if (this.lastWorkingInstance && all.includes(this.lastWorkingInstance)) {
      return [
        this.lastWorkingInstance,
        ...all.filter(i => i !== this.lastWorkingInstance),
      ];
    }
    return all;
  }


  private static async fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private static async fetchFromAnyInstance<T>(path: string): Promise<T> {
    const instances = await this.getOrderedInstances();
    let lastError: unknown = null;
    for (const instance of instances) {
      const start = Date.now();
      try {
        const res = await this.fetchWithTimeout(`${instance}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.lastWorkingInstance = instance; // cache winner
        console.log(`[YT API] ${instance} OK in ${Date.now() - start}ms`);
        return (await res.json()) as T;
      } catch (err) {
        console.warn(`[YT API] ${instance} failed (${Date.now() - start}ms):`, err);
        // If this was our cached winner and it just failed, clear the cache
        if (instance === this.lastWorkingInstance) {
          this.lastWorkingInstance = null;
        }
        lastError = err;
      }
    }
    throw new Error(`All instances failed: ${String(lastError)}`);
  }

  private static async fetchWithInstance<T>(path: string): Promise<{ data: T; instance: string }> {
    const instances = await this.getOrderedInstances();
    let lastError: unknown = null;
    for (const instance of instances) {
      const start = Date.now();
      try {
        const res = await this.fetchWithTimeout(`${instance}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.lastWorkingInstance = instance;
        console.log(`[YT API] ${instance} OK in ${Date.now() - start}ms`);
        return { data: (await res.json()) as T, instance };
      } catch (err) {
        console.warn(`[YT API] ${instance} failed (${Date.now() - start}ms):`, err);
        if (instance === this.lastWorkingInstance) this.lastWorkingInstance = null;
        lastError = err;
      }
    }
    throw new Error(`All instances failed: ${String(lastError)}`);
  }


  private static getBestThumbnail(item: YtApiSearchItem): string {
    if (item.videoId) return `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
    return item.videoThumbnails?.[0]?.url || '';
  }

  private static toImageSet(url: string) {
    return { small: url, thumbnail: url, large: url, back: null };
  }

  private static normalizeTrack(item: YtApiSearchItem): Track {
    const thumb = this.getBestThumbnail(item);
    return {
      id: item.videoId || '',
      provider: 'ytmusic',
      title: item.title || 'Unknown title',
      artist: item.author || 'Unknown Artist',
      artistId: 0,
      albumTitle: '',
      albumCover: thumb,
      albumId: '',
      releaseDate: '',
      genre: '',
      duration: (item.lengthSeconds || 0) * 1000,
      audioQuality: { maximumBitDepth: 16, maximumSamplingRate: 44100, isHiRes: false },
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
      images: this.toImageSet(thumb),
      isrc: '',
    };
  }

  private static pickBestAudioFormat(
    adaptiveFormats: YtApiVideoData['adaptiveFormats'] = [],
    instance: string,
    trackId: string
  ): string {
    const audioFormats = adaptiveFormats
      .filter(f => (f.type || '').startsWith('audio/'))
      .sort((a, b) => {
        const aIsMp4 = (a.type || '').includes('audio/mp4') ? 1 : 0;
        const bIsMp4 = (b.type || '').includes('audio/mp4') ? 1 : 0;
        if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });

    if (!audioFormats.length) throw new Error('No audio formats found');
    const best = audioFormats[0];

    if (best.itag) {
      const url = `${instance}/latest_version?id=${encodeURIComponent(trackId)}&itag=${best.itag}&local=true`;
      console.log(`[YT API] Using local redirect (itag=${best.itag}) via ${instance}`);
      return url;
    }
    if (best.url) return best.url;
    throw new Error('No usable audio URL');
  }


  static async search(params: { q: string; type?: 'track' }): Promise<SearchResponse> {
    try {
      const results = await this.fetchFromAnyInstance<YtApiSearchItem[]>(
        `/api/v1/search?q=${encodeURIComponent(params.q)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`
      );

      const seen = new Set<string>();
      const tracks: Track[] = [];
      for (const item of results) {
        if (!item.videoId || seen.has(item.videoId)) continue;
        seen.add(item.videoId);
        tracks.push(this.normalizeTrack(item));
      }

      return {
        tracks,
        albums: [],
        artists: [],
        playlists: [],
        pagination: { offset: 0, total: tracks.length, hasMore: false },
      };
    } catch (error) {
      console.error('[YTMusicAPI] search error:', error);
      return { tracks: [], albums: [], artists: [], playlists: [], pagination: { offset: 0, total: 0, hasMore: false } };
    }
  }

  static async getStreamUrl(trackId: string): Promise<string> {
    console.log('[YTMusicAPI] getStreamUrl:', { trackId });
    try {
      const { data, instance } = await this.fetchWithInstance<YtApiVideoData>(
        `/api/v1/videos/${encodeURIComponent(trackId)}?fields=adaptiveFormats`
      );
      return this.pickBestAudioFormat(data.adaptiveFormats, instance, trackId);
    } catch (error) {
      console.error('[YTMusicAPI] getStreamUrl error:', error);
      throw new Error('Failed to get stream URL');
    }
  }

  static async getDownloadUrl(trackId: string): Promise<string> {
    return this.getStreamUrl(trackId);
  }

  static async getAlbumSongs(_albumId: string): Promise<Track[]> { return []; }
  static async getArtistSongs(_artistId: string): Promise<Track[]> { return []; }
  static async getPlaylistSongs(_playlistId: string): Promise<Track[]> { return []; }
  static async getPopularTracks(): Promise<Track[]> { return []; }
  static async getMadeForYou(): Promise<Track[]> { return []; }
}