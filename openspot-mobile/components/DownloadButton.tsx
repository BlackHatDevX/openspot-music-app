import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Track } from '../types/music';
import { PlaylistStorage } from '@/lib/playlist-storage';
import { useTranslation } from 'react-i18next';

interface DownloadButtonProps {
  track: Track;
  style?: any;
  onDownloaded?: (filePath: string) => void;
  iconColor?: string;
  accentColor?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ track, style, onDownloaded, iconColor = '#fff', accentColor = '#1DB954' }) => {
  const { t } = useTranslation();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadAlert, setShowDownloadAlert] = useState(false);
  const [downloadedPath, setDownloadedPath] = useState<string | null>(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const checkDownloaded = async () => {
      try {
        const offlineData = await AsyncStorage.getItem(`offline_${track.id}`);
        if (offlineData) {
          const { fileUri } = JSON.parse(offlineData);
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (isMounted) setIsDownloaded(!!fileInfo.exists);
        } else {
          if (isMounted) setIsDownloaded(false);
        }
      } catch {
        if (isMounted) setIsDownloaded(false);
      }
    };
    checkDownloaded();
    return () => { isMounted = false; };
  }, [track.id]);

  useEffect(() => {
    if (isDownloading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
    }
  }, [isDownloading]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      let playlists = await PlaylistStorage.getPlaylists();
      let offline = playlists.find(pl => pl.name === 'offline');
      if (!offline) {
        offline = { name: 'offline', cover: track.images.large, trackIds: [] };
        playlists.push(offline);
        await PlaylistStorage.savePlaylists(playlists);
      }
      
      if (!offline.trackIds.includes(track.id.toString())) {
        offline.trackIds.push(track.id.toString());
        await PlaylistStorage.savePlaylists(playlists);
      }
      
      const audioUrl = await import('../lib/music-api').then(m => m.MusicAPI.getStreamUrl(track.id.toString(), track));
      const safeFileName = `offline_${track.id}.mp3`;
      const fileUri = FileSystem.documentDirectory + safeFileName;
      const downloadResumable = FileSystem.createDownloadResumable(audioUrl, fileUri);
      await downloadResumable.downloadAsync();
      
      const thumbUrl = track.images.large;
      const thumbFileName = `offline_${track.id}.jpg`;
      const thumbUri = FileSystem.documentDirectory + thumbFileName;
      try {
        await FileSystem.downloadAsync(thumbUrl, thumbUri);
      } catch (e) {
        
      }
      
      await AsyncStorage.setItem(`offline_${track.id}`, JSON.stringify({ 
        fileUri, 
        thumbUri, 
        trackData: track 
      }));
      
      setIsDownloaded(true);
      setDownloadedPath(fileUri);
      setShowDownloadAlert(true);
      setTimeout(() => setShowDownloadAlert(false), 2500);
      if (onDownloaded) onDownloaded(fileUri);
    } catch (e) {
      console.error('Offline download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {isDownloaded ? (
        <View style={[styles.controlButton, style, { borderRadius: 50, opacity: 0.7, alignItems: 'center' }]}
        >
          <Ionicons name="checkmark" size={20} color={iconColor} />
        </View>
      ) : isDownloading ? (
        <View style={[styles.controlButton, style, { borderRadius: 50, opacity: 0.7, alignItems: 'center' }]}
        >
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <Ionicons name="cloud-download-outline" size={20} color={accentColor} style={{ marginRight: 4 }} />
          </Animated.View>
        </View>
      ) : (
        <TouchableOpacity onPress={handleDownload} style={[styles.controlButton, style]}>
          <Ionicons name="download" size={24} color={iconColor} />
        </TouchableOpacity>
      )}
      {showDownloadAlert && downloadedPath && (
        <View style={[styles.downloadAlertBox, { backgroundColor: accentColor, shadowColor: accentColor }]}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('components.downloaded')}</Text>
            <Text style={{ color: '#fff', fontSize: 13, marginTop: 2, flexWrap: 'wrap' }}>{downloadedPath}</Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  controlButton: {
    padding: 12,
  },
  downloadAlertBox: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: '#1DB954',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    zIndex: 999,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
}); 