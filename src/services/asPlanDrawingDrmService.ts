import { API_CONFIG } from '@/config/api';

export interface AsPlanDrawingDrmUploadResponse {
  success: boolean;
  message: string;
  evidence_id: string;
  process_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_category: string;
  created_at: string;
}

export interface AsPlanDrawingDrmRecord {
  id?: string;
  evidence_id?: string;
  process_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_category: string;
  keterangan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const asPlanDrawingDrmService = {
  async upload(params: {
    file: File;
    projectId: string;
    drmId: string;
    keterangan: string;
    status: 'pending' | 'approved' | 'rejected';
    token: string | null;
  }): Promise<AsPlanDrawingDrmUploadResponse> {
    const { file, projectId, drmId, keterangan, status, token } = params;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('drm_id', drmId);
    formData.append('file_category', 'as_plan_drawing_drm');
    formData.append('keterangan', keterangan);
    formData.append('status', status);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_CONFIG.BASE_URL}/upload/as-plan-drawing-drm`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.message || err.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  async getByDrmId(
    drmId: string,
    token: string | null,
    filters?: { file_category?: string; status?: string }
  ): Promise<AsPlanDrawingDrmRecord[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = new URLSearchParams();
    if (filters?.file_category) params.set('file_category', filters.file_category);
    if (filters?.status) params.set('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/upload/as-plan-drawing-drm/drm/${drmId}${query}`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.message || err.error || `Fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getByProjectId(
    projectId: string,
    token: string | null,
    filters?: { file_category?: string; status?: string }
  ): Promise<AsPlanDrawingDrmRecord[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = new URLSearchParams();
    if (filters?.file_category) params.set('file_category', filters.file_category);
    if (filters?.status) params.set('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/upload/as-plan-drawing-drm/project/${projectId}${query}`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.message || err.error || `Fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getMetadata(evidenceId: string, token: string | null): Promise<AsPlanDrawingDrmRecord> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/upload/as-plan-drawing-drm/${evidenceId}/metadata`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.message || err.error || `Fetch failed: ${response.status}`);
    }

    return response.json();
  },

  getDownloadUrl(evidenceId: string): string {
    return `${API_CONFIG.BASE_URL}/upload/as-plan-drawing-drm/${evidenceId}`;
  },
};
