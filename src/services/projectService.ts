// Project Service
import { buildUrl } from '@/config/api';

export interface Project {
  id?: string;
  name: string;
  status: string;
  no_kontrak: string;
  created_at?: string;
  created_by?: string;
  contract_signed?: string;
  contract_duration?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  employeer?: string;
  main_vendor?: string;
  // Removed fields (moved to link table):
  // region -> now link.regional
  // location -> now link.witel
  // kml_path, boq_id, pelaksana -> deprecated
}

class ProjectService {
  /**
   * Get all projects
   */
  async getAllProjects(token: string | null): Promise<Project[]> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl('/projects'), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string, token: string | null): Promise<Project> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(`/projects/${id}`), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
