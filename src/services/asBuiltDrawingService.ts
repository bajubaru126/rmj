import { API_CONFIG } from '@/config/api';

export interface AsBuiltDrawingResponse {
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

export interface AsBuiltDrawingRecord {
  evidence_id: string;
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

export const asBuiltDrawingService = {
  async upload(params: {
    file: File;
    projectId: string;
    linkId: string;
    keterangan: string;
    status: 'pending' | 'approved' | 'rejected';
    token: string | null;
  }): Promise<AsBuiltDrawingResponse> {
    const { file, projectId, linkId, keterangan, status, token } = params;

    // Validate .dwg extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'dwg') {
      throw new Error('Hanya file berformat .dwg yang diperbolehkan');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('link_id', linkId);
    formData.append('file_category', 'as_built_drawing');
    formData.append('keterangan', keterangan);
    formData.append('status', status);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Uploading as-built drawing...');
    console.log('🔑 Token available:', !!token);
    console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'null');

    const response = await fetch(`${API_CONFIG.BASE_URL}/upload/as-built-drawing`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  async getByLinkId(projectId: string, linkId: string, token: string | null): Promise<AsBuiltDrawingRecord[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/upload/as-built-drawing/link/${linkId}`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || `Fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
};
