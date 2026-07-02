// User Management Service
import { buildUrl, getDefaultHeaders } from '@/config/api';

export interface UserData {
    id: string;
    email: string;
    username: string;
    role: string;
    vendor_id?: string;
    created_at: string;
}

export interface CreateUserRequest {
    email: string;
    username: string;
    password: string;
    role: string;
    vendor_id?: string;
}

export interface UpdateUserRequest {
    email?: string;
    username?: string;
    role?: string;
    vendor_id?: string;
}

export interface UsersListResponse {
    data: UserData[];
}

class UserService {
    private getAuthHeader(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return getDefaultHeaders(token);
    }

    async getAllUsers(): Promise<UserData[]> {
        try {
            const response = await fetch(buildUrl('/users'), {
                method: 'GET',
                headers: this.getAuthHeader(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const result: UsersListResponse = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    async createUser(data: CreateUserRequest): Promise<UserData> {
        try {
            const response = await fetch(buildUrl('/users'), {
                method: 'POST',
                headers: this.getAuthHeader(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(id: string, data: UpdateUserRequest): Promise<UserData> {
        try {
            const response = await fetch(buildUrl(`/users/${id}`), {
                method: 'PUT',
                headers: this.getAuthHeader(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user');
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            const response = await fetch(buildUrl(`/users/${id}`), {
                method: 'DELETE',
                headers: this.getAuthHeader(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

export const userService = new UserService();
