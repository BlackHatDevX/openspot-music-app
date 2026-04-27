import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HorizontalTrackListProps {
  title: string;
  tracks: Track[];
  onTrackSelect: (track: Track, trackList?: Track[], startIndex?: number) => void;
  onAddToQueue?: (track: Track) => void;
  isPlaying: boolean;
  currentTrack: Track | null;
}

export function HorizontalTrackList({ title, tracks, onTrackSelect, onAddToQueue, isPlaying, currentTrack }: HorizontalTrackListProps) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const accent = isDark ? '#1DB954' : '#167c3a';
  const { t } = useTranslation();
  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: isDark ? '#181818' : '#fffaf2', borderColor: isDark ? '#232323' : '#e4d5c5' },
            isCurrentTrack && [styles.currentTrackCard, { borderColor: accent }],
          ]}
          onPress={() => onTrackSelect(item, tracks, index)}
          activeOpacity={0.85}
        >
          <View style={styles.albumArtWrapper}>
            <Image
              source={{ uri: MusicAPI.getOptimalImage(item.images) }}
              style={styles.albumArt}
              contentFit="cover"
            />
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: accent }]}
              onPress={() => onTrackSelect(item, tracks, index)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardTextContainer}>
            <Text
              style={[
                styles.trackTitle,
                { color: isDark ? '#fff' : '#2d2219' },
                isCurrentTrack && [styles.currentTrackText, { color: accent }],
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!isCurrentTrack && (
              <Text style={[styles.trackArtist, { color: isDark ? '#888' : '#7a6251' }]} numberOfLines={1}>
                {item.artist}
              </Text>
            )}
            {onAddToQueue && (
              <TouchableOpacity
                style={[styles.queueButton, { borderColor: isDark ? '#2d2d2d' : '#d8c8b8' }]}
                onPress={() => onAddToQueue(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={isDark ? '#fff' : '#2d2219'} />
                <Text style={[styles.queueButtonText, { color: isDark ? '#fff' : '#2d2219' }]}>{t('components.queue')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#2d2219' }]}>{title}</Text>
      <FlatList
        data={tracks}
        renderItem={renderTrackItem}
        keyExtractor={item => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
}

const CARD_WIDTH = 138;
const CARD_HEIGHT = 194;
const ALBUM_SIZE = 120;

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  horizontalList: {
    paddingLeft: 12,
    paddingBottom: 8,
  },
  cardWrapper: {
    marginRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  currentTrackCard: {
    borderColor: '#1DB954',
    borderWidth: 2,
  },
  albumArtWrapper: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 16,
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#1DB954',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTextContainer: {
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 2,
    paddingBottom: 10,
    minHeight: 56,
    justifyContent: 'flex-start',
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
    lineHeight: 18,
  },
  trackArtist: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  currentTrackText: {
    color: '#1DB954',
  },
  queueButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  queueButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
}); 