import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });

    NetInfo.fetch().then(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });

    return () => unsub();
  }, []);

  return { isOnline, isOffline: !isOnline };
}
