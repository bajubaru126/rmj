import { API_CONFIG } from '@/config/api';

export interface RecordId {
  tb: string;
  id: {
    String: string;
  };
}

export interface DesignatorInfo {
  id: RecordId;
  no: number;
  name: string;
  description: string;
  unit: string;
  status: boolean;
  created_at: string;
  created_by: RecordId;
}

export interface MappingItem {
  id: RecordId;
  name: string;
  created_at: string;
  created_by: RecordId;
}

export interface DesignatorPackage {
  designator_id: RecordId;
  designator_info: DesignatorInfo;
  mappings: MappingItem[];
}

export interface DesignatorMapping {
  id: RecordId;
  name: string;
  designator_id: RecordId;
  created_at: string;
  created_by: RecordId;
}

export interface CreateMappingRequest {
  name: string;
  designator_id: string;
}

export interface UpdateMappingRequest {
  name?: string;
  designator_id?: string;
}

class DesignatorMappingService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all designator mappings grouped by designator
   */
  async getGroupedMappings(): Promise<DesignatorPackage[]> {
    console.log('🔍 Fetching grouped designator mappings...');
    
    const response = await fetch(`${this.baseUrl}/designator-mapping/grouped`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch grouped mappings:', response.status);
      throw new Error(`Failed to fetch grouped mappings: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Grouped mappings fetched:', result);
    return result;
  }

  /**
   * Get all designator mappings (flat list)
   */
  async getAllMappings(): Promise<DesignatorMapping[]> {
    console.log('🔍 Fetching all designator mappings...');
    
    const response = await fetch(`${this.baseUrl}/designator-mapping`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch mappings:', response.status);
      throw new Error(`Failed to fetch mappings: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Mappings fetched:', result);
    return result;
  }

  /**
   * Get designator mapping by ID
   */
  async getMappingById(mappingId: string): Promise<DesignatorMapping> {
    console.log('🔍 Fetching mapping by ID:', mappingId);
    
    const response = await fetch(`${this.baseUrl}/designator-mapping/${mappingId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Designator mapping not found');
      }
      console.error('❌ Failed to fetch mapping:', response.status);
      throw new Error(`Failed to fetch mapping: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Mapping fetched:', result);
    return result;
  }

  /**
   * Create a new designator mapping
   */
  async createMapping(data: CreateMappingRequest, token: string | null): Promise<DesignatorMapping> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Token exists, length:', token.length);
      console.log('🔑 Authorization header:', headers['Authorization'].substring(0, 50) + '...');
    } else {
      console.log('⚠️ No token found in localStorage!');
    }

    console.log('📝 Creating designator mapping:', data);
    console.log('📤 Request headers:', headers);

    const response = await fetch(`${this.baseUrl}/designator-mapping`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapping creation failed:', response.status, errorText);
      throw new Error(`Failed to create mapping: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Mapping created:', result);
    return result;
  }

  /**
   * Update an existing designator mapping
   */
  async updateMapping(
    mappingId: string,
    data: UpdateMappingRequest,
    token: string | null
  ): Promise<DesignatorMapping> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📝 Updating mapping:', mappingId, data);

    const response = await fetch(`${this.baseUrl}/designator-mapping/${mappingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapping update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('Designator mapping not found');
      }
      
      throw new Error(`Failed to update mapping: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Mapping updated:', result);
    return result;
  }

  /**
   * Delete a designator mapping
   */
  async deleteMapping(mappingId: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🗑️ Deleting mapping:', mappingId);

    const response = await fetch(`${this.baseUrl}/designator-mapping/${mappingId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapping deletion failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('Designator mapping not found');
      }
      
      throw new Error(`Failed to delete mapping: ${response.status}`);
    }

    console.log('✅ Mapping deleted successfully');
  }
}

export const designatorMappingService = new DesignatorMappingService();
