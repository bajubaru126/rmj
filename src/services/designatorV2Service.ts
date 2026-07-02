// Designator V2 Service
// Handles all designator V2-related API calls to the backend

import { buildUrl, getDefaultHeaders } from '@/config/api';

export interface DesignatorV2 {
  id: {
    tb: string;
    id: {
      String: string;
    };
  };
  no: number;
  name: string;
  description: string;
  unit: string;
  status: boolean;
  created_at: string;
  created_by?: {
    tb: string;
    id: {
      String: string;
    };
  };
}

export interface CreateDesignatorV2Request {
  no: number;
  name: string;
  description: string;
  unit: string;
  status: boolean;
}

export interface UpdateDesignatorV2Request {
  no?: number;
  name?: string;
  description?: string;
  unit?: string;
  status?: boolean;
}

export interface SubCategoryResponse {
  sub_category: string;
}

class DesignatorV2Service {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return getDefaultHeaders(token);
  }

  async getAllDesignators(): Promise<DesignatorV2[]> {
    try {
      const response = await fetch(buildUrl('/designators-v2'), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch designators');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching designators:', error);
      throw error;
    }
  }

  async getDesignatorById(id: string): Promise<DesignatorV2> {
    try {
      const response = await fetch(buildUrl(`/designators-v2/${id}`), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch designator');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching designator:', error);
      throw error;
    }
  }

  async createDesignator(data: CreateDesignatorV2Request): Promise<DesignatorV2> {
    try {
      const response = await fetch(buildUrl('/designators-v2'), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create designator');
      }

      return response.json();
    } catch (error) {
      console.error('Error creating designator:', error);
      throw error;
    }
  }

  async updateDesignator(id: string, data: UpdateDesignatorV2Request): Promise<DesignatorV2> {
    try {
      const response = await fetch(buildUrl(`/designators-v2/${id}`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update designator');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating designator:', error);
      throw error;
    }
  }

  async deleteDesignator(id: string): Promise<void> {
    try {
      const response = await fetch(buildUrl(`/designators-v2/${id}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete designator');
      }
    } catch (error) {
      console.error('Error deleting designator:', error);
      throw error;
    }
  }


}

export const designatorV2Service = new DesignatorV2Service();
