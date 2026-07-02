// BOQ Paket Service
// Handles all BOQ Package-related operations with real API

import { API_CONFIG } from '@/config/api';

export interface BOQPaketId {
  tb: string;
  id: {
    String: string;
  } | string;
}

export interface BOQPaket {
  id: BOQPaketId;
  designator_id: BOQPaketId;
  designator_name?: string; // From designator_v2.name
  regional_id: BOQPaketId;
  region?: string; // From regional.region (displayed as "Paket" in frontend)
  material: number;
  jasa: number;
  created_at: string;
  created_by: BOQPaketId;
}

// Alias for compatibility
export type BoqPackageResponse = BOQPaket;

export interface CreateBOQPaketRequest {
  designator_id: string;
  regional_id: string;
  material: number;
  jasa: number;
}

export interface UpdateBOQPaketRequest {
  designator_id?: string;
  regional_id?: string;
  material?: number;
  jasa?: number;
}

// Helper to extract ID from Thing object
export const extractId = (thing: BOQPaketId | string): string => {
  if (typeof thing === 'string') {
    return thing;
  }
  if (thing.id) {
    if (typeof thing.id === 'string') {
      return thing.id;
    }
    if ('String' in thing.id) {
      return thing.id.String;
    }
  }
  return '';
};

class BOQPaketService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all BOQ packages (optionally filtered by regional_id)
   */
  async getAllBoqPackages(regionalId?: string, token?: string): Promise<BOQPaket[]> {
    const headers: HeadersInit = {};
    const authToken = token || localStorage.getItem('auth_token') || localStorage.getItem('token');

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const url = regionalId
      ? `${this.baseUrl}/boq-packages?regional_id=${regionalId}`
      : `${this.baseUrl}/boq-packages`;

    console.log('📡 Fetching BOQ packages from:', url);
    console.log('📡 Token present:', !!authToken);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch BOQ packages:', errorText);
        throw new Error(`Failed to fetch BOQ packages: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ BOQ packages fetched:', data);
      console.log('✅ Is array:', Array.isArray(data));
      console.log('✅ Length:', data?.length);
      
      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllBOQPakets:', error);
      throw error;
    }
  }

  /**
   * Get BOQ package by ID
   */
  async getBOQPaketById(id: string): Promise<BOQPaket> {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Fetching BOQ package by ID:', id);

    const response = await fetch(`${this.baseUrl}/boq-packages/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch BOQ package:', errorText);
      throw new Error(`Failed to fetch BOQ package: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ BOQ package fetched:', data);
    return data;
  }

  /**
   * Create a new BOQ package
   */
  async createBOQPaket(data: CreateBOQPaketRequest): Promise<BOQPaket> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Creating BOQ package:', data);

    const response = await fetch(`${this.baseUrl}/boq-packages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create BOQ package:', errorText);
      throw new Error(`Failed to create BOQ package: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ BOQ package created:', result);
    return result;
  }

  /**
   * Update BOQ package
   */
  async updateBOQPaket(id: string, data: UpdateBOQPaketRequest): Promise<BOQPaket> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Updating BOQ package:', id, data);

    const response = await fetch(`${this.baseUrl}/boq-packages/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update BOQ package:', errorText);
      throw new Error(`Failed to update BOQ package: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ BOQ package updated:', result);
    return result;
  }

  /**
   * Delete BOQ package
   */
  async deleteBOQPaket(id: string): Promise<void> {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🗑️ Deleting BOQ package:', id);

    const response = await fetch(`${this.baseUrl}/boq-packages/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to delete BOQ package:', errorText);
      throw new Error(`Failed to delete BOQ package: ${response.status}`);
    }

    console.log('✅ BOQ package deleted');
  }

  /**
   * Group BOQ packages by regional (for displaying as "Paket" tabs)
   */
  groupByRegional(packages: BOQPaket[]): Map<string, BOQPaket[]> {
    const grouped = new Map<string, BOQPaket[]>();

    packages.forEach(pkg => {
      const regionalId = extractId(pkg.regional_id);
      const regionalName = pkg.region || `Paket ${regionalId}`;

      if (!grouped.has(regionalName)) {
        grouped.set(regionalName, []);
      }

      grouped.get(regionalName)!.push(pkg);
    });

    return grouped;
  }
}

export const boqPaketService = new BOQPaketService();
