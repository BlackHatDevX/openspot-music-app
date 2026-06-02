import { Track } from '../types/music';

interface MediaSessionHandlers {
  musicQueue: { currentIndex: number; tracks: Track[]; setCurrentIndex: (index: number) => void };
  onPlayingChange: (playing: boolean) => void;
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
}

let handlers: MediaSessionHandlers | null = null;

export function setupMediaSession(h: MediaSessionHandlers) {
  handlers = h;

  if (typeof navigator === 'undefined' || !navigator.mediaSession) return;

  navigator.mediaSession.setActionHandler('play', () => {
    handlers?.onPlayingChange(true);
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    handlers?.onPlayingChange(false);
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    const h = handlers;
    if (!h) return;
    const prevIndex = Math.max(0, h.musicQueue.currentIndex - 1);
    const track = h.musicQueue.tracks[prevIndex];
    if (track) {
      h.musicQueue.setCurrentIndex(prevIndex);
      h.onTrackSelect(track, h.musicQueue.tracks, prevIndex);
    }
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    const h = handlers;
    if (!h) return;
    const nextIndex = Math.min(h.musicQueue.tracks.length - 1, h.musicQueue.currentIndex + 1);
    const track = h.musicQueue.tracks[nextIndex];
    if (track) {
      h.musicQueue.setCurrentIndex(nextIndex);
      h.onTrackSelect(track, h.musicQueue.tracks, nextIndex);
    }
  });

  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime != null) {
      // Seek handled by TrackPlayer internally — just metadata position
    }
  });
}

export function updateMediaSession(track: Track | null, isPlaying: boolean) {
  if (typeof navigator === 'undefined' || !navigator.mediaSession) return;

  if (!track) {
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

  const artwork = track.images?.large || track.albumCover || '';
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.albumTitle || '',
    artwork: artwork
      ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }]
      : [],
  });
}
