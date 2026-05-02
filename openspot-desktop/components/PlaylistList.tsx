import React from 'react';
import { View } from 'react-native';
import { PlaylistCard } from './PlaylistCard';

interface PlaylistListProps {
  playlists: {
    name: string;
    cover: string;
    trackCount: number;
  }[];
  onPlaylistPress: (playlist: any) => void;
  onPlaylistShuffle?: (playlist: any) => void;
  onPlaylistPlay?: (playlist: any) => void;
  onPlaylistLongPress?: (playlist: any) => void;
  theme?: {
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    icon: string;
  };
}

export function PlaylistList({ playlists, onPlaylistPress, onPlaylistShuffle, onPlaylistPlay, onPlaylistLongPress, theme }: PlaylistListProps) {
  return (
    <View>
      {playlists.map((playlist, idx) => (
        <PlaylistCard
          key={playlist.name + idx}
          playlist={playlist}
          onPress={() => onPlaylistPress(playlist)}
          onShuffle={onPlaylistShuffle ? () => onPlaylistShuffle(playlist) : undefined}
          onPlay={onPlaylistPlay ? () => onPlaylistPlay(playlist) : undefined}
          onLongPress={onPlaylistLongPress ? () => onPlaylistLongPress(playlist) : undefined}
          theme={theme}
        />
      ))}
    </View>
  );
}
