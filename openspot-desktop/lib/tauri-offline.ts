import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { open as tauriOpen } from '@tauri-apps/plugin-shell';

export const isTauriRuntime = () => {
  if (typeof window === 'undefined') return false;

  const tauriWindow = window as any;
  return (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    !!tauriWindow.__TAURI__ ||
    !!tauriWindow.__TAURI_INTERNALS__ ||
    !!tauriWindow.__TAURI_METADATA__
  );
};

const sanitizeFileName = (name: string) => {
  const sanitized = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim();
  return sanitized.length > 0 ? sanitized : 'offline_file';
};

export const getTauriOfflineFileName = (
  trackId: string | number,
  extension: 'mp3' | 'jpg'
) => `offline_${sanitizeFileName(String(trackId))}.${extension}`;

export const saveRemoteFileForOffline = async (
  url: string,
  fileName: string
): Promise<string> => {
  const response = await tauriFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('Downloaded file was empty');
  }

  return invoke<string>('save_offline_file', {
    fileName: sanitizeFileName(fileName),
    bytes: Array.from(new Uint8Array(buffer)),
  });
};

export const deleteOfflineFile = async (fileUri?: string | null) => {
  if (!fileUri) return;

  if (isTauriRuntime()) {
    const path = fileUri.startsWith('file://') ? decodeURIComponent(new URL(fileUri).pathname) : fileUri;
    await invoke('delete_offline_file', { path });
    return;
  }

  const { deleteAsync } = await import('expo-file-system');
  await deleteAsync(fileUri, { idempotent: true });
};

export const offlineFileExists = async (fileUri?: string | null) => {
  if (!fileUri) return false;

  if (isTauriRuntime()) {
    const path = fileUri.startsWith('file://') ? decodeURIComponent(new URL(fileUri).pathname) : fileUri;
    return invoke<boolean>('offline_file_exists', { path });
  }

  const { getInfoAsync } = await import('expo-file-system');
  const info = await getInfoAsync(fileUri);
  return info.exists;
};

const objectUrlCache = new Map<string, string>();

export const getPlayableOfflineUri = async (fileUri: string, mimeType = 'audio/mpeg') => {
  if (!isTauriRuntime() || fileUri.startsWith('blob:')) {
    return fileUri;
  }

  const path = fileUri.startsWith('file://') ? decodeURIComponent(new URL(fileUri).pathname) : fileUri;
  const cacheKey = `${mimeType}:${path}`;
  const cached = objectUrlCache.get(cacheKey);
  if (cached) return cached;

  const bytes = await invoke<number[]>('read_offline_file', { path });
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(cacheKey, objectUrl);
  return objectUrl;
};

export const revokeOfflineObjectUrls = () => {
  objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
  objectUrlCache.clear();
};

export const getStoredOfflineUri = (fileUri: string) => {
  return fileUri;
};

export const openExternalUrl = async (url: string) => {
  if (isTauriRuntime()) {
    await tauriOpen(url);
  } else {
    const { Linking } = await import('react-native');
    await Linking.openURL(url);
  }
};
