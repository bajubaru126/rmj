// Risk Service
import { API_ENDPOINTS, buildUrl } from '@/config/api';

export interface Risk {
  id?: string;
  project_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'survey' | 'drm' | 'installation' | 'other';
  status: 'active' | 'monitoring' | 'resolved';
  location?: string;
  affected_spans?: string[];
  resolution?: string;
  created_at?: string;
  created_by?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface CreateRiskRequest {
  project_id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  location?: string;
  affected_spans?: string[];
}

export interface UpdateRiskRequest {
  title?: string;
  description?: string;
  severity?: string;
  category?: string;
  status?: string;
  location?: string;
  affected_spans?: string[];
  resolution?: string;
}

class RiskService {
  /**
   * Get all risks
   */
  async getAllRisks(token: string | null): Promise<Risk[]> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl('/risks'), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch risks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching risks:', error);
      throw error;
    }
  }

  /**
   * Get active risks only
   */
  async getActiveRisks(token: string | null): Promise<Risk[]> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl('/risks/active'), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch active risks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active risks:', error);
      throw error;
    }
  }

  /**
   * Get risks by project
   */
  async getRisksByProject(projectId: string, token: string | null): Promise<Risk[]> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/projects/${projectId}/risks`), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project risks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching project risks:', error);
      throw error;
    }
  }

  /**
   * Get risk by ID
   */
  async getRiskById(id: string, token: string | null): Promise<Risk> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/risks/${id}`), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch risk: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching risk:', error);
      throw error;
    }
  }

  /**
   * Create new risk
   */
  async createRisk(data: CreateRiskRequest, token: string | null): Promise<Risk> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/projects/${data.project_id}/risks`), {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create risk: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating risk:', error);
      throw error;
    }
  }

  /**
   * Update risk
   */
  async updateRisk(id: string, data: UpdateRiskRequest, token: string | null): Promise<Risk> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/risks/${id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update risk: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating risk:', error);
      throw error;
    }
  }

  /**
   * Delete risk
   */
  async deleteRisk(id: string, token: string | null): Promise<void> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/risks/${id}`), {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete risk: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting risk:', error);
      throw error;
    }
  }
}

export const riskService = new RiskService();
