import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface PlaylistCardProps {
  playlist: {
    name: string;
    cover: string;
    trackCount: number;
  };
  onPress: () => void;
  onShuffle?: () => void;
  onPlay?: () => void;
  onLongPress?: () => void;
  theme?: {
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    icon: string;
  };
}

export function PlaylistCard({ playlist, onPress, onShuffle, onPlay, onLongPress, theme }: PlaylistCardProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, theme && { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity
        style={styles.infoArea}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.85}
       >
        <Image source={{ uri: playlist.cover }} style={[styles.cover, theme && { borderColor: theme.border }]} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={[styles.name, theme && { color: theme.textPrimary }]} numberOfLines={1}>{playlist.name}</Text>
          <Text style={[styles.count, theme && { color: theme.textSecondary }]}>{playlist.trackCount} {playlist.trackCount === 1 ? t('components.song') : t('components.songs')}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.iconButton} onPress={onShuffle}>
          <Ionicons name="shuffle" size={20} color={theme?.icon ?? "#fff"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onPlay}>
          <Ionicons name="play" size={20} color={theme?.accent ?? "#1DB954"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    marginBottom: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  infoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: '#222',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  count: {
    color: '#888',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    marginLeft: 4,
    padding: 8,
    borderRadius: 16,
  },
}); 