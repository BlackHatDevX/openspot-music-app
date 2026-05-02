import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';

export interface Playlist {
  name: string;
  cover: string;
  trackIds: string[];
}

const PLAYLISTS_KEY = 'user_playlists';
const TRACK_DATA_KEY = 'user_track_data';

export const PlaylistStorage = {
  async getPlaylists(): Promise<Playlist[]> {
    const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  async savePlaylists(playlists: Playlist[]) {
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  },
  async addPlaylist(playlist: Playlist) {
    const playlists = await this.getPlaylists();
    playlists.push(playlist);
    await this.savePlaylists(playlists);
  },
  async addTrackToPlaylists(track: Track, playlistNames: string[]) {
    const playlists = await this.getPlaylists();
    for (const pl of playlists) {
      if (playlistNames.includes(pl.name)) {
        const trackId = track.id.toString();
        if (!pl.trackIds.includes(trackId)) {
          pl.trackIds.push(trackId);
        }
      }
    }
    await this.savePlaylists(playlists);
    
    
    await this.saveTrackData(track);
  },
  async removeTrackFromPlaylist(trackId: string, playlistName: string) {
    const playlists = await this.getPlaylists();
    for (const pl of playlists) {
      if (pl.name === playlistName) {
        pl.trackIds = pl.trackIds.filter(id => id !== trackId);
      }
    }
    await this.savePlaylists(playlists);
  },
  async saveTrackData(track: Track) {
    try {
      const trackId = track.id.toString();
      const key = `${TRACK_DATA_KEY}_${trackId}`;
      await AsyncStorage.setItem(key, JSON.stringify(track));
    } catch (error) {
      console.error('Failed to save track data:', error);
    }
  },
  async getTrackData(trackId: string): Promise<Track | null> {
    try {
      const key = `${TRACK_DATA_KEY}_${trackId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get track data:', error);
      return null;
    }
  },
  async getPlaylistTracks(playlist: Playlist) {
    const tracks: Track[] = [];
    for (const id of playlist.trackIds) {
      
      const storedTrack = await this.getTrackData(id);
      if (storedTrack) {
        tracks.push(storedTrack);
        continue;
      }
      
      
      try {
        const track = await MusicAPI.resolveTrackById(id);
        if (track) {
          tracks.push(track);
          await this.saveTrackData(track);
        }
      } catch {}
    }
    return tracks;
  },
};
