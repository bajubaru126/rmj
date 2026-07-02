import { Attribute, AttributeFormData } from '@/types';
import { API_ENDPOINTS, buildUrl, getDefaultHeaders, ApiError } from '@/config/api';
import { authService } from './authService';

// Mock data for fallback/development
export const mockAttributes: Attribute[] = [
  {
    id: 'attr1',
    name: 'materialQualityRating',
    label: 'Material Quality Rating',
    type: 'number',
    category: 'main',
    level: 0,
    required: false,
    defaultValue: '0',
    options: [],
    attachedTo: 'BOQ',
    accessLevel: 'Modify',
    createdDate: '2024-03-10',
    createdBy: 'Admin',
  },
  {
    id: 'attr2',
    name: 'vendorPerformance',
    label: 'Vendor Performance',
    type: 'select',
    category: 'main',
    level: 0,
    required: false,
    defaultValue: 'Good',
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
    attachedTo: 'Kontrak',
    accessLevel: 'Modify',
    createdDate: '2024-03-08',
    createdBy: 'Admin',
  },
  {
    id: 'attr3',
    name: 'installationPriority',
    label: 'Installation Priority',
    type: 'text',
    category: 'secondary',
    level: 0,
    required: false,
    defaultValue: 'Medium',
    options: [],
    attachedTo: 'Cell',
    accessLevel: 'View Only',
    createdDate: '2024-03-05',
    createdBy: 'Manager',
  },
  {
    id: 'attr4',
    name: 'qualityCheckRequired',
    label: 'Quality Check Required',
    type: 'boolean',
    category: 'main',
    level: 0,
    required: true,
    defaultValue: 'Yes',
    options: ['Yes', 'No'],
    attachedTo: 'Segmentasi',
    accessLevel: 'Modify',
    createdDate: '2024-03-01',
    createdBy: 'Admin',
  },
];

class AttributeService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return getDefaultHeaders(token);
  }

  // Get all attributes
  async getAllAttributes(): Promise<Attribute[]> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ATTRIBUTES.BASE), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch attributes' }));
        throw new ApiError(error.message || 'Failed to fetch attributes', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching attributes:', error);
      // Fallback to mock data if API fails
      console.warn('Falling back to mock data');
      return mockAttributes;
    }
  }

  // Get attribute by ID
  async getAttributeById(id: string): Promise<Attribute | undefined> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ATTRIBUTES.BY_ID(id)), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to fetch attribute' }));
        throw new ApiError(error.message || 'Failed to fetch attribute', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching attribute:', error);
      // Fallback to mock data
      return mockAttributes.find(a => a.id === id);
    }
  }

  // Create new attribute
  async createAttribute(data: AttributeFormData): Promise<Attribute> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ATTRIBUTES.BASE), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create attribute' }));
        throw new ApiError(error.message || 'Failed to create attribute', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating attribute:', error);
      throw error;
    }
  }

  // Update attribute
  async updateAttribute(id: string, data: Partial<AttributeFormData>): Promise<Attribute | null> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ATTRIBUTES.BY_ID(id)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update attribute' }));
        throw new ApiError(error.message || 'Failed to update attribute', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating attribute:', error);
      throw error;
    }
  }

  // Delete attribute
  async deleteAttribute(id: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ATTRIBUTES.BY_ID(id)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete attribute' }));
        throw new ApiError(error.message || 'Failed to delete attribute', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting attribute:', error);
      throw error;
    }
  }
}

export const attributeService = new AttributeService();
