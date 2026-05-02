import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeMode, ThemeModeProvider } from '@/hooks/theme-mode';
import { LikedSongsProvider } from '@/hooks/useLikedSongs';
import { useApiStatus } from '@/hooks/useApiStatus';
import '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { resolvedScheme } = useThemeMode();
  const { apiStatus, loading } = useApiStatus();
  const PROVIDER_KEY = 'openspot_provider_v1';

  useEffect(() => {
    const checkAndSwitchProvider = async () => {
      if (loading || !apiStatus) return;

      try {
        const currentProvider = await AsyncStorage.getItem(PROVIDER_KEY);
        if (!currentProvider) return;

        if (currentProvider === 'ytmusic' && apiStatus.ytmusic?.disabled) {
          await AsyncStorage.setItem(PROVIDER_KEY, 'saavn');
          console.log('Auto-switched provider from ytmusic to saavn (ytmusic disabled)');
        } else if (currentProvider === 'saavn' && apiStatus.saavn?.disabled) {
          await AsyncStorage.setItem(PROVIDER_KEY, 'ytmusic');
          console.log('Auto-switched provider from saavn to ytmusic (saavn disabled)');
        }
      } catch (error) {
        console.error('Failed to check/switch provider:', error);
      }
    };

    checkAndSwitchProvider();
  }, [apiStatus, loading]);

  return (
    <LikedSongsProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </LikedSongsProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeModeProvider>
        <AppNavigation />
      </ThemeModeProvider>
    </SafeAreaProvider>
  );
}