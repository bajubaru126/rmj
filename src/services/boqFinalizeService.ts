import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

// ============================================
// INTERFACES
// ============================================

export interface BOQFinalizeItem {
  designator_boq_id: string;
  designator_name: string;
  designator_number: number;
  description: string;
  unit: string;
  material: number;
  jasa: number;
  drm: number;
  tambah: number;
  kurang: number;
}

export interface BOQFinalizeLink {
  link_id: string;
  link_name: string;
  boq_items: BOQFinalizeItem[];
}

export interface BOQFinalizeRequest {
  project_id: string;
  links: BOQFinalizeLink[];
}

export interface BOQFinalizeResponse {
  success: boolean;
  message: string;
  project_id: string;
  links_finalized: number;
  items_finalized: number;
  finalized_at: string;
}

export interface BOQDrmItem {
  id: string;
  project_id: string;
  link_id: string;
  link_name: string;
  designator_boq_id: string;
  designator_name: string;
  designator_number: number;
  description: string;
  unit: string;
  material: number;
  jasa: number;
  drm: number;
  tambah: number;
  kurang: number;
  total_material: number;
  total_jasa: number;
  total_drm: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  finalized_at: string;
  finalized_by: string;
}

export interface BOQDrmSummary {
  total_material: number;
  total_jasa: number;
  total_drm: number;
  grand_total: number;
  total_items: number;
}

export interface BOQFinalizedStatus {
  is_finalized: boolean;
}

export interface BOQDeleteResponse {
  success: boolean;
  message: string;
}

// ============================================
// SERVICE
// ============================================

class BOQFinalizeService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Build finalize request from BOQ matrix data
   * Converts boqItems (from getBOQMatrixByProjectId) to finalize request format
   */
  buildFinalizeRequest(
    projectId: string,
    linkId: string,
    linkName: string,
    boqItems: Array<{
      no: number;
      designator: string;
      uraian_pekerjaan: string;
      satuan: string;
      material: number;
      jasa: number;
      drm?: number;
      aktual?: number;
      tambah?: number;
      kurang?: number;
    }>
  ): BOQFinalizeRequest {
    const items: BOQFinalizeItem[] = boqItems.map(item => ({
      designator_boq_id: item.designator, // Use designator name as ID (backend will resolve)
      designator_name: item.designator,
      designator_number: item.no,
      description: item.uraian_pekerjaan || '',
      unit: item.satuan || 'meter',
      material: item.material || 0,
      jasa: item.jasa || 0,
      drm: item.drm || 0,
      tambah: item.tambah || 0,
      kurang: item.kurang || 0,
    }));

    return {
      project_id: projectId,
      links: [{
        link_id: linkId,
        link_name: linkName,
        boq_items: items,
      }],
    };
  }

  /**
   * Finalize BOQ - copy from boq_project_detail to boq_drm
   * POST /api/boq-drm/finalize
   */
  async finalizeBoq(request: BOQFinalizeRequest): Promise<BOQFinalizeResponse> {
    console.log('🔄 Finalizing BOQ for project:', request.project_id);
    console.log('📊 Links to finalize:', request.links.length);

    const response = await fetch(buildUrl('/boq-drm/finalize'), {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to finalize BOQ' }));
      console.error('❌ Finalize BOQ error:', error);
      throw new Error(error.error || 'Failed to finalize BOQ');
    }

    const data = await response.json();
    console.log('✅ BOQ finalized:', data);
    return data;
  }

  /**
   * Get finalized BOQ by project
   * GET /api/boq-drm/project/{project_id}
   */
  async getFinalizedBoqByProject(projectId: string): Promise<BOQDrmItem[]> {
    console.log('🔄 Fetching finalized BOQ for project:', projectId);

    const response = await fetch(buildUrl(`/boq-drm/project/${projectId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No finalized BOQ found for project:', projectId);
        return [];
      }
      const error = await response.json().catch(() => ({ error: 'Failed to get finalized BOQ' }));
      throw new Error(error.error || 'Failed to get finalized BOQ');
    }

    const data = await response.json();
    console.log('✅ Finalized BOQ fetched:', data.length, 'items');
    return data;
  }

  /**
   * Get finalized BOQ by link
   * GET /api/boq-drm/link/{link_id}
   */
  async getFinalizedBoqByLink(linkId: string): Promise<BOQDrmItem[]> {
    console.log('🔄 Fetching finalized BOQ for link:', linkId);

    const response = await fetch(buildUrl(`/boq-drm/link/${linkId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      const error = await response.json().catch(() => ({ error: 'Failed to get finalized BOQ' }));
      throw new Error(error.error || 'Failed to get finalized BOQ');
    }

    const data = await response.json();
    console.log('✅ Finalized BOQ by link fetched:', data.length, 'items');
    return data;
  }

  /**
   * Check if project BOQ is finalized
   * GET /api/boq-drm/project/{project_id}/is-finalized
   */
  async isProjectFinalized(projectId: string): Promise<boolean> {
    const response = await fetch(buildUrl(`/boq-drm/project/${projectId}/is-finalized`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const data: BOQFinalizedStatus = await response.json();
    return data.is_finalized;
  }

  /**
   * Check if link BOQ is finalized
   * GET /api/boq-drm/link/{link_id}/is-finalized
   */
  async isLinkFinalized(linkId: string): Promise<boolean> {
    const response = await fetch(buildUrl(`/boq-drm/link/${linkId}/is-finalized`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const data: BOQFinalizedStatus = await response.json();
    return data.is_finalized;
  }

  /**
   * Get project BOQ summary
   * GET /api/boq-drm/project/{project_id}/summary
   */
  async getProjectSummary(projectId: string): Promise<BOQDrmSummary | null> {
    const response = await fetch(buildUrl(`/boq-drm/project/${projectId}/summary`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Delete finalized BOQ by project (for re-finalization)
   * DELETE /api/boq-drm/project/{project_id}
   */
  async deleteFinalizedBoqByProject(projectId: string): Promise<BOQDeleteResponse> {
    const response = await fetch(buildUrl(`/boq-drm/project/${projectId}`), {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete finalized BOQ' }));
      throw new Error(error.error || 'Failed to delete finalized BOQ');
    }

    return await response.json();
  }

  /**
   * Delete finalized BOQ by link
   * DELETE /api/boq-drm/link/{link_id}
   */
  async deleteFinalizedBoqByLink(linkId: string): Promise<BOQDeleteResponse> {
    const response = await fetch(buildUrl(`/boq-drm/link/${linkId}`), {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete finalized BOQ' }));
      throw new Error(error.error || 'Failed to delete finalized BOQ');
    }

    return await response.json();
  }

  /**
   * Update a finalized BOQ item
   * PATCH /api/boq-drm/{id}
   */
  async updateFinalizedBoqItem(
    id: string,
    updates: { material?: number; jasa?: number; drm?: number; tambah?: number; kurang?: number }
  ): Promise<BOQDrmItem> {
    const response = await fetch(buildUrl(`/boq-drm/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update finalized BOQ' }));
      throw new Error(error.error || 'Failed to update finalized BOQ');
    }

    return await response.json();
  }
}

export const boqFinalizeService = new BOQFinalizeService();
