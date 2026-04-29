import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeMode, ThemeModeProvider } from '@/hooks/theme-mode';
import { LikedSongsProvider } from '@/hooks/useLikedSongs';
import '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { resolvedScheme } = useThemeMode(); 

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