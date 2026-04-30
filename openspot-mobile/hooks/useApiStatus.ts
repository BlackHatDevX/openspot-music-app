import { useState, useEffect } from 'react';

const API_STATUS_URL = 'https://raw.githubusercontent.com/BlackHatDevX/openspot-config/refs/heads/main/apistatus.json';

export interface ApiStatus {
  ytmusic: { disabled: boolean };
  saavn: { disabled: boolean };
}

export function useApiStatus() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await fetch(API_STATUS_URL);
        const data = await response.json();
        setApiStatus(data);
      } catch (error) {
        console.error('Failed to fetch API status:', error);
        setApiStatus({ ytmusic: { disabled: false }, saavn: { disabled: false } });
      } finally {
        setLoading(false);
      }
    };

    fetchApiStatus();
  }, []);

  const isProviderDisabled = (provider: 'saavn' | 'ytmusic'): boolean => {
    if (!apiStatus) return false;
    return apiStatus[provider]?.disabled || false;
  };

  return { apiStatus, loading, isProviderDisabled };
}
