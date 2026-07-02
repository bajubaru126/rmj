import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UseTokenExpirationOptions {
  checkInterval?: number; // Check every X milliseconds (default: 30 seconds)
  warningTime?: number; // Show warning X seconds before expiration (default: 60 seconds)
  countdownTime?: number; // Countdown time in modal (default: 10 seconds)
}

export function useTokenExpiration(options: UseTokenExpirationOptions = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    warningTime = 60000, // 60 seconds
    countdownTime = 10
  } = options;

  const { token, logout, isLoggedIn } = useAuth();
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Function to decode JWT and get expiration time
  const getTokenExpiration = useCallback((token: string): number | null => {
    try {
      if (!token || token.split('.').length !== 3) {
        return null;
      }
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, []);

  // Function to check if token is expired or about to expire
  const checkTokenExpiration = useCallback(() => {
    // Don't check if user is not logged in or no token
    if (!isLoggedIn || !token) {
      setShowExpiredModal(false);
      return;
    }

    const expirationTime = getTokenExpiration(token);
    if (!expirationTime) {
      console.warn('⚠️ Could not get token expiration time');
      return;
    }

    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;

    console.log('🔍 Token check:', {
      currentTime: new Date(currentTime).toISOString(),
      expirationTime: new Date(expirationTime).toISOString(),
      timeUntilExpiration: Math.round(timeUntilExpiration / 1000) + 's',
      isLoggedIn
    });

    // If token is already expired or will expire within warning time
    if (timeUntilExpiration <= warningTime) {
      console.log('⚠️ Token expired or about to expire, showing modal');
      setShowExpiredModal(true);
    }
  }, [token, getTokenExpiration, warningTime, isLoggedIn]);

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log('🚪 Logging out due to token expiration');
    setShowExpiredModal(false);
    logout();
  }, [logout]);

  // Set up periodic token checking
  useEffect(() => {
    // Reset modal state when user logs out
    if (!isLoggedIn || !token) {
      setShowExpiredModal(false);
      return;
    }

    // Add a small delay to ensure token is properly set
    const timeoutId = setTimeout(() => {
      checkTokenExpiration();
    }, 100);

    // Set up interval checking
    const interval = setInterval(() => {
      // Double check that user is still logged in before checking token
      if (isLoggedIn && token) {
        checkTokenExpiration();
      }
    }, checkInterval);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [token, checkTokenExpiration, checkInterval, isLoggedIn]);

  // Listen for API 401 responses (token expired)
  useEffect(() => {
    const handleUnauthorized = () => {
      // Only show modal if user is currently logged in
      if (isLoggedIn) {
        console.log('🚫 Received 401 unauthorized event');
        setShowExpiredModal(true);
      }
    };

    // Listen for custom unauthorized events
    window.addEventListener('token-expired' as any, handleUnauthorized);

    return () => {
      window.removeEventListener('token-expired' as any, handleUnauthorized);
    };
  }, [isLoggedIn]);

  return {
    showExpiredModal: showExpiredModal && isLoggedIn, // Only show if logged in
    handleLogout,
    countdownTime,
    // Utility function to manually trigger token expired modal
    triggerTokenExpired: () => {
      if (isLoggedIn) {
        setShowExpiredModal(true);
      }
    }
  };
}