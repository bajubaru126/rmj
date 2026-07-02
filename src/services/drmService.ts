import { API_CONFIG } from '@/config/api';

export interface DRMDocument {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan: string;
  status: string;
}

export interface CreateDRMRequest {
  project_id: string;
  link_id?: string;
  start_date?: string;
  end_date?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  progress?: number;
  drm_mom?: DRMDocument[];
  boq_final_docs?: DRMDocument[];
  redline_final_docs?: DRMDocument[];
  matrix_final_docs?: DRMDocument[];
  other_docs?: DRMDocument[];
}

export interface UpdateDRMRequest {
  start_date?: string;
  end_date?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  notes?: string;
  remarks?: string;
  status?: string;
  progress?: number;
  drm_mom?: DRMDocument[];
  boq_final_docs?: DRMDocument[];
  redline_final_docs?: DRMDocument[];
  matrix_final_docs?: DRMDocument[];
  other_docs?: DRMDocument[];
}

export interface EvidenceFile {
  id: {
    tb: string;
    id: { String: string };
  };
  process_id: string;
  project_id: {
    tb: string;
    id: { String: string };
  };
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  keterangan: string;
  status: string;
  created_at: string;
}

export interface DRMResponse {
  id: {
    tb: string;
    id: string | { String: string };
  };
  project_id: {
    tb: string;
    id: string | { String: string };
  };
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: {
    tb: string;
    id: string | { String: string };
  };
  updated_at: string | null;
  drm_mom?: EvidenceFile[];
  boq_final_docs?: EvidenceFile[];
  redline_final_docs?: EvidenceFile[];
  matrix_final_docs?: EvidenceFile[];
  other_docs?: EvidenceFile[];
}

export interface DRMListItem {
  id: {
    tb: string;
    id: string | { String: string };
  };
  project_id: {
    tb: string;
    id: string | { String: string };
  };
  link_id: {
    tb: string;
    id: string | { String: string };
  };
  regional_id?: {
    tb: string;
    id: string | { String: string };
  };
  project_name: string;
  no_kontrak?: string;
  contract_signed?: string;
  contract_duration?: string;
  pelaksana?: string;
  customer?: string;
  link_name: string;
  region?: string;
  witel?: string;
  location?: string;
  sub_pelaksana?: any;
  contract_value?: string | number;
  start_date_plan?: string;
  end_date_plan?: string;
  ss_status: string;
  status: string;
  progress?: number;
  progress_drm?: number;
  last_updated?: string;
  notes?: string;
  remarks?: string;
  created_at: string;
  created_by?: {
    tb: string;
    id: string | { String: string };
  };
  updated_at: string | null;
}

class DRMService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Create DRM
   */
  async createDRM(data: CreateDRMRequest, token: string | null): Promise<DRMResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Creating DRM:', data);

    const response = await fetch(`${this.baseUrl}/drm`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DRM creation failed:', errorText);
      
      if (response.status === 400 && errorText.includes('already has a DRM')) {
        throw new Error('Project already has a DRM. One project can only have one DRM.');
      }
      
      throw new Error(`Failed to create DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('DRM created:', result);
    return result;
  }

  /**
   * Get DRM by ID
   */
  async getDRMById(drmId: string): Promise<DRMResponse> {
    const response = await fetch(`${this.baseUrl}/drm/${drmId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('DRM not found');
      }
      throw new Error(`Failed to fetch DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('DRM fetched:', result);
    return result;
  }

  /**
   * Get DRM by Project ID
   */
  async getDRMByProjectId(projectId: string): Promise<DRMResponse | null> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/drm`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch DRM: ${response.status}`);
    }

    const result = await response.json();
    
    // Check if no DRM found
    if (result.message && result.message.includes('No DRM found')) {
      return null;
    }
    
    console.log('DRM by project fetched:', result);
    return result;
  }

  /**
   * Update DRM
   */
  async updateDRM(
    drmId: string,
    data: UpdateDRMRequest,
    token: string | null
  ): Promise<DRMResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Updating DRM:', drmId, data);

    const response = await fetch(`${this.baseUrl}/drm/${drmId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DRM update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('DRM not found');
      }
      
      throw new Error(`Failed to update DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('DRM updated:', result);
    return result;
  }

  /**
   * Delete DRM
   */
  async deleteDRM(drmId: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Deleting DRM:', drmId);

    const response = await fetch(`${this.baseUrl}/drm/${drmId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DRM deletion failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('DRM not found');
      }
      
      throw new Error(`Failed to delete DRM: ${response.status}`);
    }

    console.log('DRM deleted successfully');
  }

  /**
   * List all DRMs
   */
  async listAllDRMs(): Promise<DRMListItem[]> {
    const response = await fetch(`${this.baseUrl}/drm`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DRMs: ${response.status}`);
    }

    const result = await response.json();
    console.log('DRMs list fetched:', result);
    return result;
  }

  /**
   * Upload evidence file
   */
  async uploadEvidence(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'evidence');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Uploading evidence file:', file.name);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Evidence upload failed:', errorText);
      throw new Error(`Failed to upload evidence: ${response.status}`);
    }

    const result = await response.json();
    console.log('Evidence uploaded:', result);
    return result;
  }
}

export const drmService = new DRMService();
