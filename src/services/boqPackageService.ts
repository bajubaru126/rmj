// BOQ Package Service
import { API_CONFIG } from '@/config/api';

export interface BoqPackageId {
  tb: string;
  id: {
    String: string;
  } | string;
}

export interface BoqPackageResponse {
  id: BoqPackageId;
  designator_id: BoqPackageId;
  designator_name?: string; // From designator_v2.name
  regional_id: BoqPackageId;
  region?: string; // From regional.region (displayed as "Paket" in frontend)
  material: number;
  jasa: number;
  created_at: string;
  created_by: BoqPackageId;
}

export interface CreateBoqPackageRequest {
  designator_id: string;
  regional_id: string;
  material: number;
  jasa: number;
}

export interface UpdateBoqPackageRequest {
  designator_id?: string;
  regional_id?: string;
  material?: number;
  jasa?: number;
}

// Helper to extract ID from Thing object
export const extractId = (thing: BoqPackageId | string): string => {
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

class BoqPackageService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Create a new BOQ package
   */
  async createBoqPackage(
    data: CreateBoqPackageRequest,
    token: string | null
  ): Promise<BoqPackageResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

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
   * Get all BOQ packages (optionally filtered by regional_id)
   */
  async getAllBoqPackages(
    regionalId?: string,
    token?: string | null
  ): Promise<BoqPackageResponse[]> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = regionalId
      ? `${this.baseUrl}/boq-packages?regional_id=${regionalId}`
      : `${this.baseUrl}/boq-packages`;

    console.log('📡 Fetching BOQ packages:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch BOQ packages:', errorText);
      throw new Error(`Failed to fetch BOQ packages: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ BOQ packages fetched:', data);
    return data;
  }

  /**
   * Get BOQ package by ID
   */
  async getBoqPackageById(
    id: string,
    token: string | null
  ): Promise<BoqPackageResponse> {
    const headers: HeadersInit = {};

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
   * Update BOQ package
   */
  async updateBoqPackage(
    id: string,
    data: UpdateBoqPackageRequest,
    token: string | null
  ): Promise<BoqPackageResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

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
  async deleteBoqPackage(id: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

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
  groupByRegional(packages: BoqPackageResponse[]): Map<string, BoqPackageResponse[]> {
    const grouped = new Map<string, BoqPackageResponse[]>();

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

export const boqPackageService = new BoqPackageService();
