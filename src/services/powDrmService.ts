import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

const authHeader = (): Record<string, string> => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface PowDrmItem {
  id: string;
  created_at: string;
  updated_at: string;
  pow_name: string;
  duration: number;
  start_date: string;
  finish_date: string;
  task_type: string;
  ss_link: string;
  work_category: string;
  sub_category: string | null;
  description: string | null;
  signature_path?: string | null;
  signature_name?: string | null;
  signature_jabatan?: string | null;
}

export interface CreatePowDrmFERequest {
  pow_name: string;         // link_name dari table link
  ss_link: string;          // link_id only (no prefix)
  work_category: string;
  sub_category?: string | null;
  start_date: string;       // ISO datetime
  finish_date: string;      // ISO datetime
  task_type?: string;
  description?: string;
}

export interface UpdatePowDrmRequest {
  duration?: number;
  start_date?: string;
  finish_date?: string;
  task_type?: string;
  work_category?: string;
  sub_category?: string | null;
  description?: string;
}

export interface WorkCategory {
  key: string;
  name: string;
  sub_categories: { key: string; name: string }[];
}

// ── Service ───────────────────────────────────────────────────────────────────
export const powDrmService = {
  /** GET /api/pow-drm/pow/{pow_name} — fetch all items for a link */
  async getByLinkName(powName: string): Promise<PowDrmItem[]> {
    const res = await fetch(buildUrl(`/pow-drm/pow/${encodeURIComponent(powName)}`), {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`Failed to fetch POW: ${res.status}`);
    const data = await res.json();
    return data.data || [];
  },

  /** GET /api/pow-drm/fe/categories */
  async getCategories(): Promise<WorkCategory[]> {
    const res = await fetch(buildUrl('/pow-drm/fe/categories'), { headers: authHeader() });
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    const data = await res.json();
    return data.data?.categories || [];
  },

  /** POST /api/pow-drm/fe/create */
  async create(payload: CreatePowDrmFERequest): Promise<PowDrmItem> {
    const res = await fetch(buildUrl('/pow-drm/fe/create'), {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Create failed: ${res.status}`);
    }
    const data = await res.json();
    return data.data;
  },

  /** PUT /api/pow-drm/{id} */
  async update(id: string, payload: UpdatePowDrmRequest): Promise<PowDrmItem> {
    const cleanId = id.replace('pow_drm:', '');
    const res = await fetch(buildUrl(`/pow-drm/${cleanId}`), {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Update failed: ${res.status}`);
    }
    const data = await res.json();
    return data.data;
  },

  /** DELETE /api/pow-drm/{id} */
  async delete(id: string): Promise<void> {
    const cleanId = id.replace('pow_drm:', '');
    const res = await fetch(buildUrl(`/pow-drm/${cleanId}`), {
      method: 'DELETE',
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  },

  /** POST /api/pow-drm/{id}/upload-signature */
  async uploadSignature(id: string, file: File, signatureName: string, signatureJabatan: string): Promise<any> {
    const cleanId = id.replace('pow_drm:', '');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature_name', signatureName);
    formData.append('signature_jabatan', signatureJabatan);

    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(buildUrl(`/pow-drm/${cleanId}/upload-signature`), {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload signature failed: ${res.status}`);
    }
    return await res.json();
  },

  /** DELETE /api/pow-drm/{id}/signature */
  async deleteSignature(id: string): Promise<void> {
    const cleanId = id.replace('pow_drm:', '');
    const res = await fetch(buildUrl(`/pow-drm/${cleanId}/signature`), {
      method: 'DELETE',
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`Delete signature failed: ${res.status}`);
  },
};
