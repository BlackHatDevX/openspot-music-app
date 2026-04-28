import { useEffect, useState } from 'react';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        try {
          const res = await fetch('https://clients3.google.com/generate_204', {
            method: 'GET',
            signal: controller.signal,
          });
          if (mounted) setIsOnline(res.ok);
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    void check();
    interval = setInterval(check, 2500);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

