// Vendor Service
// Handles all vendor-related API calls to the backend

import { API_CONFIG, buildUrl, getDefaultHeaders } from '@/config/api';

export interface Vendor {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    is_super_vendor?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateVendorRequest {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    is_super_vendor?: boolean;
}

export interface UpdateVendorRequest {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
}

export interface VendorListResponse {
    data: Vendor[];
}

export interface VendorResponse {
    data: Vendor;
    message?: string;
}

export interface DeleteVendorResponse {
    message: string;
}

class VendorService {
    private getAuthHeader(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return getDefaultHeaders(token);
    }

    private getPublicHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
        };
    }

    async getAllVendors(): Promise<Vendor[]> {
        try {
            // This endpoint is public according to the API docs
            const response = await fetch(buildUrl('/vendors'), {
                method: 'GET',
                headers: this.getPublicHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get vendors');
            }

            const result: VendorListResponse = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching vendors:', error);
            throw error;
        }
    }

    async getVendorById(id: string): Promise<Vendor> {
        try {
            const response = await fetch(buildUrl(`/vendors/${id}`), {
                method: 'GET',
                headers: this.getAuthHeader(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 404) {
                    throw new Error('Vendor not found');
                }
                throw new Error(errorData.error || 'Failed to get vendor');
            }

            const result: VendorResponse = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching vendor:', error);
            throw error;
        }
    }

    async createVendor(data: CreateVendorRequest): Promise<Vendor> {
        try {
            console.log('Creating vendor with data:', data);
            const response = await fetch(buildUrl('/vendors'), {
                method: 'POST',
                headers: this.getAuthHeader(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to create vendor';
                
                if (response.status === 400) {
                    if (errorData.error?.includes('already exists')) {
                        errorMessage = 'Vendor code already exists';
                    } else if (errorData.error?.includes('Validation error')) {
                        errorMessage = errorData.error;
                    } else {
                        errorMessage = errorData.error || 'Validation error';
                    }
                } else {
                    errorMessage = errorData.error || errorMessage;
                }
                
                console.error('Backend error:', errorData);
                throw new Error(errorMessage);
            }

            const result: VendorResponse = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error creating vendor:', error);
            throw error;
        }
    }

    async updateVendor(id: string, data: UpdateVendorRequest): Promise<Vendor> {
        try {
            console.log('Updating vendor with data:', data);
            const response = await fetch(buildUrl(`/vendors/${id}`), {
                method: 'PUT',
                headers: this.getAuthHeader(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to update vendor';
                
                if (response.status === 400) {
                    errorMessage = errorData.error || 'Validation error';
                } else if (response.status === 404) {
                    errorMessage = 'Vendor not found';
                } else {
                    errorMessage = errorData.error || errorMessage;
                }
                
                console.error('Backend error:', errorData);
                throw new Error(errorMessage);
            }

            const result: VendorResponse = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error updating vendor:', error);
            throw error;
        }
    }

    async deleteVendor(id: string): Promise<void> {
        try {
            const response = await fetch(buildUrl(`/vendors/${id}`), {
                method: 'DELETE',
                headers: this.getAuthHeader(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to delete vendor';
                
                if (response.status === 400) {
                    errorMessage = errorData.error || 'Vendor not found';
                } else {
                    errorMessage = errorData.error || errorMessage;
                }
                
                console.error('Backend error:', errorData);
                throw new Error(errorMessage);
            }

            // Success - no need to return data for delete
        } catch (error) {
            console.error('Error deleting vendor:', error);
            throw error;
        }
    }
}

export const vendorService = new VendorService();
