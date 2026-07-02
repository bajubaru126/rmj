import { createContext, useState, ReactNode, useEffect, useContext } from 'react';
import { authService, type User, type LoginRequest, type RegisterRequest } from '@/services/authService';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  userEmail: string;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state with stored user data immediately
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const hasToken = !!authService.getToken();
    console.log('🔐 AuthProvider Init - Has token:', hasToken);
    return hasToken;
  });
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = authService.getStoredUser();
    console.log('👤 AuthProvider Init - Stored user:', storedUser);
    return storedUser;
  });
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = authService.getToken();
    console.log('🔑 AuthProvider Init - Token:', storedToken ? `${storedToken.substring(0, 20)}...` : 'null');
    return storedToken;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 Starting auth initialization...');
      console.log('📦 localStorage keys:', Object.keys(localStorage));
      
      try {
        const token = authService.getToken();
        console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
        
        if (!token) {
          // No token, user needs to login
          console.log('ℹ️ No token found, showing login');
          setIsLoggedIn(false);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Token exists, get stored user data first
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          // Use stored user data immediately
          setUser(storedUser);
          setToken(token);
          setIsLoggedIn(true);
          console.log('✅ Using stored user data:', storedUser.email, 'Username:', storedUser.username);
          
          // Set loading to false immediately since we have user data
          setIsLoading(false);
        } else {
          // No stored user but have token - this shouldn't happen
          console.warn('⚠️ Token exists but no stored user data');
          authService.logout();
          setIsLoggedIn(false);
          setUser(null);
          setToken(null);
          setIsLoading(false);
          return;
        }

        // Optional: Try to validate token in background (don't block UI)
        // If this fails, we still keep the user logged in with stored data
        console.log('🔑 Token found, validating in background (optional)...');
        
        authService.getCurrentUser()
          .then(userData => {
            console.log('✅ Token validated, updating user data:', userData.email, 'Username:', userData.username);
            setUser(userData);
          })
          .catch(apiError => {
            console.warn('⚠️ Token validation failed, but keeping stored user:', apiError);
            // Keep using stored user data - don't logout
          });
          
      } catch (err) {
        console.error('❌ Auth init error:', err);
        // Don't logout if we have stored user
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          console.log('✅ Error during init but using stored user');
          setUser(storedUser);
          setToken(token);
          setIsLoggedIn(true);
        } else {
          authService.logout();
          setIsLoggedIn(false);
          setUser(null);
          setToken(null);
        }
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login(data);
      
      setUser(response.user);
      setToken(response.token);
      setIsLoggedIn(true);
      
      // Backward compatibility with old localStorage keys
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', response.user.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.register(data);
      
      setUser(response.user);
      setToken(response.token);
      setIsLoggedIn(true);
      
      // Backward compatibility with old localStorage keys
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', response.user.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
    setError(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      // Also refresh token in case it changed
      const currentToken = authService.getToken();
      setToken(currentToken);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      // If refresh fails, user might need to login again
      logout();
      throw err;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        user,
        userEmail: user?.email || '', 
        token,
        isLoading,
        error,
        login, 
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
