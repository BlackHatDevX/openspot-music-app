import { useEffect, useState, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useWindowDimensions } from 'react-native';

export type Orientation = 'portrait' | 'landscape' | 'unknown';

export function useScreenOrientation() {
  const { width, height } = useWindowDimensions();
  const [orientation, setOrientation] = useState<Orientation>(
    width > height ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    setOrientation(width > height ? 'landscape' : 'portrait');
  }, [width, height]);

  const lockOrientation = useCallback(async (orientationLock: ScreenOrientation.OrientationLock) => {
    await ScreenOrientation.lockAsync(orientationLock);
  }, []);

  const unlockOrientation = useCallback(async () => {
    await ScreenOrientation.unlockAsync();
  }, []);

  const getCurrentOrientation = useCallback(async () => {
    const current = await ScreenOrientation.getOrientationAsync();
    const isLandscape =
      current === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
      current === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    return isLandscape ? 'landscape' : 'portrait';
  }, []);

  return {
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
    lockOrientation,
    unlockOrientation,
    getCurrentOrientation,
    OrientationLock: ScreenOrientation.OrientationLock,
  };
}
