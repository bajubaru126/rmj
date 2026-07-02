import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Custom hook to use authentication context
 * Provides access to auth state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
