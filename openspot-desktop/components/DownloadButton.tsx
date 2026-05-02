import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Track } from '../types/music';
import { PlaylistStorage } from '@/lib/playlist-storage';
import { useTranslation } from 'react-i18next';
import { MusicAPI } from '../lib/music-api';
import {
  deleteOfflineFile,
  getTauriOfflineFileName,
  isTauriRuntime,
  offlineFileExists,
  saveRemoteFileForOffline,
} from '@/lib/tauri-offline';


const ANIMATION_DURATION = 350;
const ANIMATION_BOUNCE_HEIGHT = -10;
const ICON_SIZE = 24;

interface DownloadButtonProps {
  track: Track;
  style?: StyleProp<ViewStyle>;
  onDownloaded?: (filePath: string) => void;
  iconColor?: string;
  accentColor?: string;
  showNotification: (message: string, type: 'success' | 'error') => void;
  iconSize?: number;
  showText?: boolean;
  textColor?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  track,
  style,
  onDownloaded,
  iconColor = '#fff',
  accentColor = '#1DB954',
  showNotification,
  iconSize,
  showText = false,
  textColor
}) => {
  const { t } = useTranslation();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);

  const getOfflineFilePath = useCallback((extension: 'mp3' | 'jpg') => {
    if (!track || !track.id) {
      console.error("Track or track.id is undefined in getOfflineFilePath");
      return `${FileSystem.documentDirectory}offline_unknown.${extension}`;
    }
    return `${FileSystem.documentDirectory}offline_${track.id}.${extension}`;
  }, [track]);

  useEffect(() => {
    let isMounted = true;

    const checkDownloaded = async () => {
      if (!track || !track.id) return;

      try {
        const offlineData = await AsyncStorage.getItem(`offline_${track.id}`);
        if (!isMounted) return;

        if (offlineData) {
          const { fileUri } = JSON.parse(offlineData);
          if (typeof fileUri === 'string') {
            if (isTauriRuntime()) {
              setIsDownloaded(await offlineFileExists(fileUri));
              return;
            }
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (isMounted) {
              setIsDownloaded(fileInfo.exists);
            }
          } else {
            if (isMounted) setIsDownloaded(false);
            await AsyncStorage.removeItem(`offline_${track.id}`);
          }
        } else {
          if (isMounted) setIsDownloaded(false);
        }
      } catch (error) {
        console.error('Error checking download status:', error);
        if (isMounted) setIsDownloaded(false);
      }
    };

    checkDownloaded();

    return () => {
      isMounted = false;
    };
  }, [track]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isDownloading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: ANIMATION_BOUNCE_HEIGHT,
            duration: ANIMATION_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isDownloading, bounceAnim]);

  useEffect(() => {
    return () => {
      if (downloadRef.current) {
        downloadRef.current.pauseAsync().catch(() => { });
      }
    };
  }, []);

  const ensureDirectoryExists = async () => {
    try {
      const directoryUri = FileSystem.documentDirectory!;
      const dirInfo = await FileSystem.getInfoAsync(directoryUri);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directoryUri, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      throw new Error('Cannot access storage directory');
    }
  };


  const handleDownload = async () => {
    if (isDownloading || isDownloaded) return;
    if (!track || !track.id) {
      console.error("Cannot download: Track or track.id is undefined.");
      showNotification(t('components.download_error_track_missing') || 'Could not download track. Track data is missing.', 'error');
      return;
    }

    let pendingAudioUri: string | null = null;
    let pendingThumbUri: string | null = null;

    try {
      setIsDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!isTauriRuntime()) {
        await ensureDirectoryExists();
      }

      let playlists = await PlaylistStorage.getPlaylists();
      let offline = playlists.find(pl => pl.name === 'offline');

      if (!offline) {
        offline = {
          name: 'offline',
          cover: track.images?.large || '',
          trackIds: []
        };
        playlists.push(offline);
      }

      const trackIdStr = track.id.toString();
      if (!offline.trackIds.includes(trackIdStr)) {
        offline.trackIds.push(trackIdStr);
        await PlaylistStorage.savePlaylists(playlists);
      }

      const audioUrl = await MusicAPI.getDownloadUrl(trackIdStr, track);
      const fileUri = isTauriRuntime()
        ? await saveRemoteFileForOffline(audioUrl, getTauriOfflineFileName(trackIdStr, 'mp3'))
        : getOfflineFilePath('mp3');
      pendingAudioUri = fileUri;

      let downloadedAudioUri = fileUri;
      if (!isTauriRuntime()) {
        downloadRef.current = FileSystem.createDownloadResumable(audioUrl, fileUri);
        const result = await downloadRef.current.downloadAsync();

        if (!result || !result.uri) {
          throw new Error('Download failed or was cancelled');
        }
        downloadedAudioUri = result.uri;
      }

      let thumbUri: string | null = null;
      try {
        if (track.images?.large) {
          thumbUri = isTauriRuntime()
            ? await saveRemoteFileForOffline(track.images.large, getTauriOfflineFileName(trackIdStr, 'jpg'))
            : getOfflineFilePath('jpg');
          pendingThumbUri = thumbUri;
          if (!isTauriRuntime()) {
            await FileSystem.downloadAsync(track.images.large, thumbUri);
          }
        } else {
          console.warn('No thumbnail URL found for this track, skipping thumbnail download.');
        }
      } catch (e) {
        console.warn('Thumbnail download failed, continuing without it:', e);
      }

      await AsyncStorage.setItem(`offline_${track.id}`, JSON.stringify({
        fileUri: downloadedAudioUri,
        thumbUri,
        trackData: track,
        downloadedAt: new Date().toISOString(),
      }));

      setIsDownloaded(true);
      showNotification(t('components.downloaded') || 'Downloaded', 'success'); 

      if (onDownloaded) {
        onDownloaded(downloadedAudioUri);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (e: any) {
      console.error('Offline download failed:', e);

      try {
        if (downloadRef.current) {
          await downloadRef.current.cancelAsync();
        }
        const fileUri = pendingAudioUri || getOfflineFilePath('mp3');
        if (isTauriRuntime()) {
          await deleteOfflineFile(fileUri);
        } else {
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri);
          }
        }
        const thumbUri = pendingThumbUri || getOfflineFilePath('jpg');
        if (isTauriRuntime()) {
          await deleteOfflineFile(thumbUri);
        } else {
          const thumbInfo = await FileSystem.getInfoAsync(thumbUri);
          if (thumbInfo.exists) {
            await FileSystem.deleteAsync(thumbUri);
          }
        }
        await AsyncStorage.removeItem(`offline_${track?.id}`);
        await PlaylistStorage.removeTrackFromPlaylist(track.id.toString(), 'offline');
      } catch (cleanupError) {
        console.error("Error during cleanup after download failure:", cleanupError);
      }

      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      showNotification(t('components.download_failed') || `Download failed: ${errorMessage}`, 'error'); // Call parent notification

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    } finally {
      setIsDownloading(false);
      downloadRef.current = null;
    }
  };


  const renderButtonContent = () => {
    const size = iconSize || ICON_SIZE;
    if (isDownloaded) {
      return <Ionicons name="checkmark" size={size} color={iconColor} />;
    } else if (isDownloading) {
      return (
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <Ionicons name="cloud-download-outline" size={size} color={accentColor} />
        </Animated.View>
      );
    } else {
      return <Ionicons name="download" size={size} color={iconColor} />;
    }
  };

  return (
    <TouchableOpacity
      onPress={handleDownload}
      style={[style, showText ? styles.downloadButtonWithText : styles.downloadButton]}
      activeOpacity={0.7}
      disabled={isDownloading}
    >
      {renderButtonContent()}
      {showText && (
        <Text style={[styles.downloadButtonText, { color: textColor || iconColor }]}>
          {isDownloaded ? (t('components.downloaded') || 'Downloaded') : (t('components.download') || 'Download')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  downloadButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButtonWithText: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  downloadButtonText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
