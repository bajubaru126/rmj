import { useState, useCallback } from 'react';
import { ToastType } from '@/components/ui/Toast';

interface ToastState {
  isOpen: boolean;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({
      isOpen: true,
      message,
      type
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
}
