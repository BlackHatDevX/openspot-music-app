import { Track } from '../types/music';
import { MusicAPI } from './music-api';
import { PlaylistStorage } from './playlist-storage';
import { invoke } from '@tauri-apps/api/core';

const SPOTIFY_FETCHER_DOMAIN = process.env.EXPO_PUBLIC_SPOTIFY_FETCHER_DOMAIN;
const SPOTIFY_FETCHER_URL = `https://api.${SPOTIFY_FETCHER_DOMAIN}.com/v2/Transfer`;
const SPOTIFY_FETCHER_TOKEN_URL = 'https://raw.githubusercontent.com/BlackHatDevX/openspot-config/refs/heads/main/spotify-playlist-token.json';

const SPOTIFY_FETCHER_HEADERS: Record<string, string> = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'Accept-Language': 'en-US,en;q=0.7',
  'Origin': `https://www.${SPOTIFY_FETCHER_DOMAIN}.com`,
  'Referer': `https://www.${SPOTIFY_FETCHER_DOMAIN}.com/`,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'x-original-URL': `https://www.${SPOTIFY_FETCHER_DOMAIN}.com/transfer/spotify-to-file`,
  'Cookie': 'ttune=CIKLZkA%22kvvNs]mvkswo[IHIZkA%22kvvNs]mvkswo[M_QeSMrkxqo]IF; PHPSESSID=nk86nb127ufvqlk4pv1f93dslv; TMM_Unique_Cross=X5BOG2LK94NZKMWFYLZH5KYUUNXXVMDFIAEBAIHB',
};

const isTauri = () => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.__TAURI_INTERNALS__ || w.__TAURI__ || w.__TAURI_METADATA__) ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost';
};

async function proxyRequest(url: string, method: string, bodyObj?: object): Promise<any> {
  if (isTauri()) {
    const result: any = await invoke('proxy_http', {
      url,
      method,
      headers: SPOTIFY_FETCHER_HEADERS,
      body: bodyObj ? JSON.stringify(bodyObj) : null,
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`HTTP ${result.status}`);
    }
    return result.data;
  }
  const res = await fetch(url, {
    method,
    headers: SPOTIFY_FETCHER_HEADERS,
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
  });
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getSpotifyFetcherToken(): Promise<string> {
  const data = await proxyRequest(SPOTIFY_FETCHER_TOKEN_URL, 'GET');
  return data.token;
}

export async function importSpotifyPlaylist(
  url: string,
  playlistName: string,
  onProgress?: (msg: string, current?: number, total?: number) => void
): Promise<{ success: boolean; matched: number; total: number }> {
  onProgress?.('Fetching playlist...');

  const account = await getSpotifyFetcherToken();

  const libraryData = await proxyRequest(`${SPOTIFY_FETCHER_URL}/LoadLibrary`, 'POST', {
    source: 'Spotify',
    account,
    sm: 'no',
    url,
    fromUrl: true,
    fromFile: false,
    darkMode: true,
  });

  if (!libraryData.playlists || libraryData.playlists.length === 0) {
    throw new Error('No playlists found in the URL');
  }

  const playlist = libraryData.playlists[0];
  const transferId: string = libraryData.id;
  const playlistCompoundId: string = playlist.id;
  const playlistNameFromSpotify: string = playlist.name || '';

  onProgress?.('Loading tracks...');

  const tracksData = await proxyRequest(`${SPOTIFY_FETCHER_URL}/LoadPlaylistTracks`, 'POST', {
    source: 'Spotify',
    account,
    id: playlistCompoundId,
    type: 'playlist',
    transferId,
  });

  if (!tracksData.success || !tracksData.tracks || tracksData.tracks.length === 0) {
    throw new Error('No tracks found in the playlist');
  }

  const spotifyTracks: { name: string; artist: string; album?: string }[] = tracksData.tracks;
  const total = spotifyTracks.length;
  const matchedTracks: Track[] = [];

  for (let i = 0; i < spotifyTracks.length; i++) {
    const track = spotifyTracks[i];
    const query = `${track.name} ${track.artist}`;
    onProgress?.('Searching...', i + 1, total);

    try {
      const res = await MusicAPI.searchTracks(query);
      if (res.tracks && res.tracks.length > 0) {
        const matched = res.tracks[0];
        matchedTracks.push(matched);
        await PlaylistStorage.saveTrackData(matched);
      }
    } catch (e) {
      console.error(`Error searching for "${query}":`, e);
    }
  }

  const finalName = playlistName.trim() || playlistNameFromSpotify || 'Imported from Spotify';

  const cover = matchedTracks.length > 0
    ? MusicAPI.getOptimalImage(matchedTracks[0].images)
    : '';

  await PlaylistStorage.addPlaylist({
    name: finalName,
    cover,
    trackIds: matchedTracks.map(t => t.id.toString()),
  });

  onProgress?.('Done!', matchedTracks.length, total);

  return { success: true, matched: matchedTracks.length, total };
}
