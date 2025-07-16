import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Track } from '@/types/music';
import { MusicAPI } from '@/lib/music-api';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useTranslation } from 'react-i18next';

interface QueueDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  musicQueue: any; // We'll type this properly later
  onTrackSelect: (track: Track, index: number) => void;
  currentTrack: Track | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function QueueDisplay({
  isOpen,
  onClose,
  musicQueue,
  onTrackSelect,
  currentTrack,
}: QueueDisplayProps) {
  const { isLiked, toggleLike } = useLikedSongs();
  const { t } = useTranslation();

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const isTrackLiked = isLiked(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isCurrentTrack && styles.currentTrackItem,
        ]}
        onPress={() => onTrackSelect(item, index)}
      >
        <View style={styles.trackNumber}>
          <Text style={[
            styles.trackNumberText,
            isCurrentTrack && styles.currentTrackText,
          ]}>
            {index + 1}
          </Text>
        </View>

        <Image
          source={{ uri: MusicAPI.getOptimalImage(item.images) }}
          style={styles.albumCover}
          contentFit="cover"
        />

        <View style={styles.trackInfo}>
          <Text
            style={[
              styles.trackTitle,
              isCurrentTrack && styles.currentTrackText,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.trackArtist,
              isCurrentTrack && styles.currentTrackText,
            ]}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
          <Text style={styles.trackDuration}>
            {MusicAPI.formatDuration(item.duration)}
          </Text>
        </View>

        <View style={styles.trackActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item)}
          >
            <Ionicons
              name={isTrackLiked ? "heart" : "heart-outline"}
              size={20}
              color={isTrackLiked ? "#1DB954" : "#888"}
            />
          </TouchableOpacity>

          {isCurrentTrack && (
            <View style={styles.playingIndicator}>
              <Ionicons name="volume-high" size={16} color="#1DB954" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t('queue_display_header_title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('queue_display_queue_length', { count: musicQueue.tracks.length })}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderQueueControls = () => (
    <View style={styles.queueControls}>
      <TouchableOpacity
        style={[
          styles.controlButton,
          musicQueue.isShuffled && styles.activeControlButton
        ]}
        onPress={musicQueue.toggleShuffle}
      >
        <Ionicons
          name="shuffle"
          size={20}
          color={musicQueue.isShuffled ? "#fff" : "#888"}
        />
        <Text style={[
          styles.controlButtonText,
          musicQueue.isShuffled && styles.activeControlButtonText
        ]}>
          Shuffle
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.controlButton,
          musicQueue.repeatMode !== 'off' && styles.activeControlButton
        ]}
        onPress={musicQueue.toggleRepeat}
      >
        <Ionicons
          name={musicQueue.repeatMode === 'one' ? "repeat-outline" : "repeat"}
          size={20}
          color={musicQueue.repeatMode !== 'off' ? "#fff" : "#888"}
        />
        <Text style={[
          styles.controlButtonText,
          musicQueue.repeatMode !== 'off' && styles.activeControlButtonText
        ]}>
          {musicQueue.repeatMode === 'one' ? 'Repeat One' : 'Repeat'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.controlButton}
        onPress={musicQueue.clearQueue}
      >
        <Ionicons name="trash-outline" size={20} color="#888" />
        <Text style={styles.controlButtonText}>{t('queue_display_clear')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list-outline" size={64} color="#888" />
      <Text style={styles.emptyTitle}>{t('queue_display_queue_empty_title')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('queue_display_queue_empty_subtitle')}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={10} style={styles.blurContainer}>
          {renderHeader()}
          {renderQueueControls()}

          {musicQueue.tracks.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={musicQueue.tracks}
              renderItem={renderTrackItem}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              initialScrollIndex={Math.max(0, musicQueue.currentIndex - 2)}
              getItemLayout={(data, index) => ({
                length: 70,
                offset: 70 * index,
                index,
              })}
            />
          )}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  blurContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerGradient: {
    paddingVertical: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  queueControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  activeControlButton: {
    backgroundColor: '#1DB954',
  },
  controlButtonText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 6,
  },
  activeControlButtonText: {
    color: '#fff',
  },
  listContainer: {
    paddingVertical: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 4,
  },
  currentTrackItem: {
    backgroundColor: '#1a1a1a',
  },
  trackNumber: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  trackNumberText: {
    fontSize: 14,
    color: '#888',
  },
  albumCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  trackDuration: {
    fontSize: 10,
    color: '#666',
  },
  currentTrackText: {
    color: '#1DB954',
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  playingIndicator: {
    marginLeft: 8,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
}); 