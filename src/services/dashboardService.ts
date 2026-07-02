// Dashboard Service
import { API_ENDPOINTS, buildUrl } from '@/config/api';

export interface PhaseProgress {
  percentage: number;
  completed_projects: number;
  total_projects: number;
  breakdown: ProjectBreakdown[];
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  status: string;
}

export interface ProgressData {
  survey: PhaseProgress;
  drm: PhaseProgress;
  installation: PhaseProgress;
}

export interface RiskSummary {
  id: string;
  title: string;
  severity: string;
  category: string;
}

export interface OperationalProgressResponse {
  progress: ProgressData;
  risks: RiskSummary[];
}

export interface DashboardSummary {
  total_projects: number;
  active_projects: number;
  survey_completion: number;
  drm_pending: number;
  install_progress: number;
  risk_count: number;
}

class DashboardService {
  /**
   * Get operational progress (Survey, DRM, Installation)
   */
  async getOperationalProgress(token: string | null): Promise<OperationalProgressResponse> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(API_ENDPOINTS.DASHBOARD.OPERATIONAL_PROGRESS), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch operational progress: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching operational progress:', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary(token: string | null): Promise<DashboardSummary> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(API_ENDPOINTS.DASHBOARD.SUMMARY), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard summary: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
