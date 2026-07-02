// Link Service for API calls
import { API_CONFIG } from '@/config/api';

export interface LinkResponse {
  id: { 
    tb: string; 
    id: {
      String: string;
    } | string;
  };
  project_id?: {
    tb: string;
    id: {
      String: string;
    } | string;
  };
  link_name: string;
  regional?: {
    tb: string;
    id: {
      String: string;
    } | string;
  } | string; // NEW: Regional reference
  witel?: string; // NEW: Witel name
  sub_pelaksana?: string;
  ss_status?: string;
  ss_contract_value?: string;
  created_at?: string;
}

class LinkService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all links for a project (simple - only id and link_name)
   */
  async getLinksByProjectId(projectId: string, token: string | null): Promise<LinkResponse[]> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Fetching links for project:', projectId);

    const response = await fetch(`${this.baseUrl}/links/project/${projectId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch links:', errorText);
      throw new Error(`Failed to fetch links: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Links fetched:', data);
    return data;
  }

  /**
   * Get link by ID
   */
  async getLinkById(linkId: string, token: string | null): Promise<LinkResponse> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Fetching link by ID:', linkId);

    const response = await fetch(`${this.baseUrl}/links/${linkId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch link:', errorText);
      throw new Error(`Failed to fetch link: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Link fetched:', data);
    return data;
  }
}

export const linkService = new LinkService();
