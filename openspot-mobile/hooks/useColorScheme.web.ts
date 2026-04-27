import { useThemeMode } from './theme-mode';

export function useColorScheme() {
  return useThemeMode().resolvedScheme;
}
