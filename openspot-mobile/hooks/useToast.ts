import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastType(null);
    }, 2000);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(null);
    setToastType(null);
  }, []);

  return { toastMessage, toastType, showToast, hideToast };
}
