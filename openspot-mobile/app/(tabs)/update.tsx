import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';

const APP_LOGO = require('@/assets/images/adaptive-icon.png'); 
const APP_NAME = 'OpenSpot';
const CURRENT_VERSION = 'v2.0.5';
const RELEASES_URL = 'https://github.com/BlackHatDevX/openspot-music-app/releases';
const GITHUB_REPO_URL = 'https://github.com/BlackHatDevX/openspot-music-app';

export default function UpdateScreen() {
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    
    fetch('https://api.github.com/repos/BlackHatDevX/openspot-music-app/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data && data.tag_name) {
          setLatestVersion(data.tag_name);
          if (data.tag_name !== CURRENT_VERSION) {
            setUpdateAvailable(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
      <Image source={APP_LOGO} style={styles.logo} />
      </View>
      <Text style={styles.appName}>{APP_NAME}</Text>
      <Text style={styles.description}>
        OpenSpot is a free and open-source music streaming application designed for a seamless, high-fidelity listening experience. 
      </Text>
      <Text style={styles.credit}>Made with ❤️ by <Text style={styles.creditName}>jashgro</Text></Text>
      <Text style={styles.version}>Current Version: <Text style={{ color: '#1DB954' }}>{CURRENT_VERSION}</Text></Text>
      <Text style={styles.version}>Latest Version: <Text style={{ color: updateAvailable ? '#ff4444' : '#1DB954' }}>{latestVersion}</Text></Text>
      {updateAvailable ? (
        <TouchableOpacity style={styles.updateButton} onPress={() => Linking.openURL(RELEASES_URL)}>
          <Text style={styles.updateButtonText}>Update Available - Click to Update</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.updateButton} onPress={() => Linking.openURL(GITHUB_REPO_URL)}>
          <Text style={styles.updateButtonText}>View on GitHub</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 90,
    padding: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 18,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  version: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 4,
  },
  updateButton: {
    marginTop: 24,
    backgroundColor: '#1DB954',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    marginBottom: 18,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 22,
  },
  credit: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  creditName: {
    color: '#1DB954',
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
});
