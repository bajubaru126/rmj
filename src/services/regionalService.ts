import axios from 'axios';
import { API_CONFIG } from '@/config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// ============================================
// INTERFACES
// ============================================

export interface Regional {
  id: string;
  region: string;
  created_at: string;
  created_by: string;
}

export interface Witel {
  id: string;
  witel: string;
  region_id: string;
  created_at: string;
  created_by: string;
}

export interface CreateRegionalRequest {
  region: string;
}

export interface CreateWitelRequest {
  witel: string;
  region_id: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract plain ID from various formats
 * - "regional:abc123" → "abc123"
 * - { tb: "regional", id: "abc123" } → "abc123"
 * - "abc123" → "abc123"
 */
export const extractId = (id: any): string => {
  if (!id) return '';
  
  if (typeof id === 'string') {
    // Handle "regional:abc123" format
    if (id.includes(':')) {
      return id.split(':')[1];
    }
    return id;
  }
  
  if (typeof id === 'object') {
    // Handle { tb: "regional", id: "abc123" } format
    if (id.id) {
      if (typeof id.id === 'string') {
        return id.id;
      }
      if (typeof id.id === 'object' && id.id.String) {
        return id.id.String;
      }
    }
    // Handle { String: "abc123" } format
    if (id.String) {
      return id.String;
    }
  }
  
  return String(id);
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all regionals
 */
export const getAllRegionals = async (): Promise<Regional[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/regional`);
    return response.data.map((regional: any) => ({
      ...regional,
      id: extractId(regional.id),
    }));
  } catch (error: any) {
    console.error('Error fetching regionals:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch regionals');
  }
};

/**
 * Get regional by ID
 */
export const getRegionalById = async (id: string): Promise<Regional> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/regional/${id}`);
    return {
      ...response.data,
      id: extractId(response.data.id),
    };
  } catch (error: any) {
    console.error('Error fetching regional:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch regional');
  }
};

/**
 * Create new regional (requires authentication)
 */
export const createRegional = async (
  data: CreateRegionalRequest,
  token: string
): Promise<Regional> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/regional`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return {
      ...response.data,
      id: extractId(response.data.id),
    };
  } catch (error: any) {
    console.error('Error creating regional:', error);
    throw new Error(error.response?.data?.message || 'Failed to create regional');
  }
};

/**
 * Get all witels
 */
export const getAllWitels = async (): Promise<Witel[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/witel`);
    return response.data.map((witel: any) => ({
      ...witel,
      id: extractId(witel.id),
      region_id: extractId(witel.region_id),
    }));
  } catch (error: any) {
    console.error('Error fetching witels:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch witels');
  }
};

/**
 * Get witel by ID
 */
export const getWitelById = async (id: string): Promise<Witel> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/witel/${id}`);
    return {
      ...response.data,
      id: extractId(response.data.id),
      region_id: extractId(response.data.region_id),
    };
  } catch (error: any) {
    console.error('Error fetching witel:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch witel');
  }
};

/**
 * Get witels by region ID
 */
export const getWitelsByRegionId = async (regionId: string): Promise<Witel[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/witel/by-region/${regionId}`);
    return response.data.map((witel: any) => ({
      ...witel,
      id: extractId(witel.id),
      region_id: extractId(witel.region_id),
    }));
  } catch (error: any) {
    console.error('Error fetching witels by region:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch witels by region');
  }
};

/**
 * Create new witel (requires authentication)
 */
export const createWitel = async (
  data: CreateWitelRequest,
  token: string
): Promise<Witel> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/witel`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return {
      ...response.data,
      id: extractId(response.data.id),
      region_id: extractId(response.data.region_id),
    };
  } catch (error: any) {
    console.error('Error creating witel:', error);
    throw new Error(error.response?.data?.message || 'Failed to create witel');
  }
};
