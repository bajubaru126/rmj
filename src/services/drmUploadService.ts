import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

// ============================================
// INTERFACES
// ============================================

export interface DrmUploadDoc {
  [key: string]: any;
}

export interface DrmUploadRecord {
  id: string;
  project_id: string;
  project_name: string;
  link_id: string;
  link_name: string;
  doc: DrmUploadDoc[];
  source: string;   // "finalize" | "manual"
  label: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DrmUploadRequest {
  project_id: string;
  project_name?: string;
  link_id: string;
  link_name?: string;
  doc: DrmUploadDoc[];
  source: 'finalize' | 'manual';
  label?: string;
}

export interface DrmAllVersionsResponse {
  success: boolean;
  data: DrmUploadRecord[];
  count: number;
}

// ============================================
// DRM UPLOAD SERVICE
// ============================================

type DrmType = 'boq' | 'matrix' | 'redline';

function getEndpointPrefix(type: DrmType): string {
  switch (type) {
    case 'boq': return '/boq-drm';
    case 'matrix': return '/matrix-drm';
    case 'redline': return '/redline-drm';
  }
}

class DrmUploadService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Upload a document (BOQ/Matrix/Redline) to DRM.
   * Does NOT delete existing data — creates a new version.
   */
  async upload(type: DrmType, data: DrmUploadRequest): Promise<DrmUploadRecord> {
    const prefix = getEndpointPrefix(type);
    console.log(`📤 Uploading ${type} DRM (source: ${data.source})`, data.link_id);

    const response = await fetch(buildUrl(`${prefix}/upload`), {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Failed to upload ${type}` }));
      console.error(`❌ Upload ${type} error:`, error);
      throw new Error(error.error || `Failed to upload ${type}`);
    }

    const result = await response.json();
    console.log(`✅ ${type} uploaded:`, result);
    return result;
  }

  /**
   * Get the latest single record (backward compatible).
   */
  async getLatestByLink(type: DrmType, linkId: string): Promise<DrmUploadRecord | null> {
    const prefix = getEndpointPrefix(type);

    const response = await fetch(buildUrl(`${prefix}/link/${linkId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data || null;
  }

  /**
   * Get ALL versions for a link (for dropdown selector).
   */
  async getAllByLink(type: DrmType, linkId: string): Promise<DrmUploadRecord[]> {
    const prefix = getEndpointPrefix(type);
    console.log(`📥 Fetching all ${type} versions for link:`, linkId);

    const response = await fetch(buildUrl(`${prefix}/link/${linkId}/all`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch all ${type} versions`);
      return [];
    }

    const result: DrmAllVersionsResponse = await response.json();
    console.log(`✅ ${type} versions fetched:`, result.count);
    return result.data || [];
  }

  /**
   * Helper to format/clean SurrealDB record ID for API endpoints.
   * Handles objects like { tb: "...", id: "..." } or { id: { String: "..." } } or string prefixes like "boq_drm:abc".
   */
  formatRecordId(id: any): string {
    if (!id) return '';
    
    if (typeof id === 'object') {
      if ('String' in id) {
        return id.String;
      }
      if ('id' in id) {
        const innerId = id.id;
        if (typeof innerId === 'string') {
          return innerId.includes(':') ? innerId.split(':')[1] : innerId;
        }
        if (typeof innerId === 'object' && 'String' in innerId) {
          return innerId.String;
        }
      }
    }
    
    if (typeof id === 'string') {
      return id.includes(':') ? id.split(':')[1] : id;
    }
    
    return String(id);
  }

  /**
   * Update the document data array (doc) for a specific record by ID.
   */
  async updateDoc(type: DrmType, recordId: string, doc: DrmUploadDoc[]): Promise<DrmUploadRecord> {
    const prefix = getEndpointPrefix(type);
    const cleanId = this.formatRecordId(recordId);
    console.log(`📝 Updating ${type} doc for record:`, cleanId);

    const response = await fetch(buildUrl(`${prefix}/${cleanId}`), {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ doc }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Failed to update ${type}` }));
      throw new Error(error.error || `Failed to update ${type}`);
    }

    const result = await response.json();
    console.log(`✅ ${type} record doc updated`);
    return result;
  }

  /**
   * Delete a specific record by ID.
   */
  async deleteById(type: DrmType, recordId: string): Promise<void> {
    const prefix = getEndpointPrefix(type);
    const cleanId = this.formatRecordId(recordId);
    console.log(`🗑️ Deleting ${type} record:`, cleanId);

    const response = await fetch(buildUrl(`${prefix}/${cleanId}`), {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Failed to delete ${type}` }));
      throw new Error(error.error || `Failed to delete ${type}`);
    }

    console.log(`✅ ${type} record deleted`);
  }

  // ── Convenience wrappers ──

  uploadBoq = (data: DrmUploadRequest) => this.upload('boq', data);
  uploadMatrix = (data: DrmUploadRequest) => this.upload('matrix', data);
  uploadRedline = (data: DrmUploadRequest) => this.upload('redline', data);

  getAllBoqByLink = (linkId: string) => this.getAllByLink('boq', linkId);
  getAllMatrixByLink = (linkId: string) => this.getAllByLink('matrix', linkId);
  getAllRedlineByLink = (linkId: string) => this.getAllByLink('redline', linkId);

  deleteBoq = (id: string) => this.deleteById('boq', id);
  deleteMatrix = (id: string) => this.deleteById('matrix', id);
  deleteRedline = (id: string) => this.deleteById('redline', id);
}

export const drmUploadService = new DrmUploadService();
