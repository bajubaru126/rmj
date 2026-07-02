// Authentication Service
// Handles all auth-related API calls to the backend

import { API_CONFIG, API_ENDPOINTS, buildUrl, getDefaultHeaders, ApiError } from '@/config/api';

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    role: string; // "admin", "surveyor", "pm", etc.
    vendor_id?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    device_info?: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    role: string; // "admin", "surveyor", "pm", etc.
    vendor_id?: string;
    created_at: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

class AuthService {
    private getAuthHeader(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return getDefaultHeaders(token);
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        try {
            const response = await fetch(buildUrl(API_ENDPOINTS.AUTH.REGISTER), {
                method: 'POST',
                headers: getDefaultHeaders(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const result: AuthResponse = await response.json();

            // Save token and user data
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));

            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Registration failed');
        }
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        try {
            // Add default device_info as "web" if not provided
            const loginData = {
                ...data,
                device_info: data.device_info || "web"
            };

            const response = await fetch(buildUrl(API_ENDPOINTS.AUTH.LOGIN), {
                method: 'POST',
                headers: getDefaultHeaders(),
                body: JSON.stringify(loginData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const result: AuthResponse = await response.json();

            // Save token and user data
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));

            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Login failed');
        }
    }

    async getCurrentUser(): Promise<User> {
        try {
            console.log('🔍 Fetching current user...');
            const token = this.getToken();
            
            if (!token) {
                throw new Error('No token available');
            }

            const url = buildUrl(API_ENDPOINTS.AUTH.ME);
            console.log('📡 Calling:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeader(),
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    // Dispatch custom event for token expiration
                    window.dispatchEvent(new CustomEvent('token-expired', { 
                        detail: { message: 'Token expired or invalid' } 
                    }));
                    throw new Error('Unauthorized: Token is invalid or expired');
                } else if (response.status === 403) {
                    throw new Error('Forbidden: Access denied');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Error response:', errorText);
                    throw new Error(`Failed to get user data: ${response.status}`);
                }
            }

            const responseData = await response.json();
            console.log('📦 Raw API response:', responseData);
            
            // Backend wraps response in {status: "success", data: user}
            // Extract the actual user data
            const user: User = responseData.data || responseData;
            console.log('✅ User fetched:', user.email, 'Username:', user.username);

            // Update stored user data
            localStorage.setItem('user_data', JSON.stringify(user));

            return user;
        } catch (error) {
            console.error('❌ getCurrentUser error:', error);
            if (error instanceof Error) {
                // Re-throw with more context
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    throw new Error('Network error: Unable to connect to server');
                }
                throw error;
            }
            throw new Error('Failed to get user data');
        }
    }

    logout(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
    }

    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    getStoredUser(): User | null {
        const userData = localStorage.getItem('user_data');
        console.log('📦 getStoredUser - Raw data from localStorage:', userData);
        
        if (!userData) {
            console.log('⚠️ getStoredUser - No user data found');
            return null;
        }

        try {
            const parsed = JSON.parse(userData);
            console.log('✅ getStoredUser - Parsed user:', parsed);
            return parsed;
        } catch (error) {
            console.error('❌ getStoredUser - Parse error:', error);
            return null;
        }
    }

    // Check if we have any authentication data (token or cached user)
    hasAuthData(): boolean {
        return this.isAuthenticated() || !!this.getStoredUser();
    }
}

export const authService = new AuthService();
