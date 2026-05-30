import { Track } from '../types/music';
import { MusicAPI } from './music-api';
import { PlaylistStorage } from './playlist-storage';

const SPOTIFY_FETCHER_DOMAIN = 'tunemymusic';
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

async function getSpotifyFetcherToken(): Promise<string> {
  const res = await fetch(SPOTIFY_FETCHER_TOKEN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Spotify token (${res.status})`);
  }
  const data = await res.json();
  return data.token;
}

export async function importSpotifyPlaylist(
  url: string,
  playlistName: string,
  onProgress?: (msg: string, current?: number, total?: number) => void
): Promise<{ success: boolean; matched: number; total: number }> {
  onProgress?.('Fetching playlist...');

  const account = await getSpotifyFetcherToken();

  const loadLibraryRes = await fetch(`${SPOTIFY_FETCHER_URL}/LoadLibrary`, {
    method: 'POST',
    headers: SPOTIFY_FETCHER_HEADERS,
    body: JSON.stringify({
      source: 'Spotify',
      account,
      sm: 'no',
      url,
      fromUrl: true,
      fromFile: false,
      darkMode: true,
    }),
  });

  if (!loadLibraryRes.ok) {
    let body = '';
    try { body = await loadLibraryRes.text(); } catch {}
    throw new Error(`SpotifyFetcher LoadLibrary (${loadLibraryRes.status}): ${body.slice(0, 200)}`);
  }

  const libraryData = await loadLibraryRes.json();

  if (!libraryData.playlists || libraryData.playlists.length === 0) {
    throw new Error('No playlists found in the URL');
  }

  const playlist = libraryData.playlists[0];
  const transferId: string = libraryData.id;
  const playlistCompoundId: string = playlist.id;
  const playlistNameFromSpotify: string = playlist.name || '';

  onProgress?.('Loading tracks...');

  const loadTracksRes = await fetch(`${SPOTIFY_FETCHER_URL}/LoadPlaylistTracks`, {
    method: 'POST',
    headers: SPOTIFY_FETCHER_HEADERS,
    body: JSON.stringify({
      source: 'Spotify',
      account,
      id: playlistCompoundId,
      type: 'playlist',
      transferId,
    }),
  });

  if (!loadTracksRes.ok) {
    let body = '';
    try { body = await loadTracksRes.text(); } catch {}
    throw new Error(`SpotifyFetcher LoadPlaylistTracks (${loadTracksRes.status}): ${body.slice(0, 200)}`);
  }

  const tracksData = await loadTracksRes.json();

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
