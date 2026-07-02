import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

// ============================================
// INTERFACES
// ============================================

export interface KMLFinalizeRequest {
  project_id: string;
  force_refinalize?: boolean;
  kml_project: any[];
  kml_survey: any[];
  survey_record: any[];
  survey_kml_tracking: any[];
  kml_span: any[];
}

export interface KmlDrmSummary {
  file_category: string;
  kml_type: string;
  file_count: number;
  total_size: number;
  finalized_at: string | null;
  finalized_by: any | null;
}

export interface KMLFinalizeResponse {
  success: boolean;
  message: string;
  project_files_copied: number;
  survey_files_copied: number;
  total_files_copied: number;
  kml_drm_summary: KmlDrmSummary[];
}

export interface KmlDrmItem {
  id?: string;
  project_id: string;
  process_id: string;
  original_evidence_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  keterangan: string;
  status: string;
  kml_type: string;
  link_id?: string | null;
  span_item_id?: string | null;
  item_name?: string | null;
  original_created_at: string;
  created_at?: string;
  updated_at?: string;
  finalized_at?: string;
  finalized_by?: any;
}

export interface KmlDrmListResponse {
  kml_drm_items: KmlDrmItem[];
  summary: KmlDrmSummary[];
  total_project_files: number;
  total_survey_files: number;
  total_size: number;
}

export interface KmlDrmStatusResponse {
  success: boolean;
  project_id: string;
  is_finalized: boolean;
  message: string;
  finalized_at?: string;
  finalized_by?: any;
  files_count?: number;
}

// ============================================
// SERVICE
// ============================================

class KMLFinalizeService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Finalize KML data - Processes kml_project and kml_survey and copies to kml_drm
   * POST /api/kml/finalize
   */
  async finalizeKml(request: KMLFinalizeRequest): Promise<KMLFinalizeResponse> {
    console.log('🔄 Finalizing KML for project:', request.project_id);

    const response = await fetch(buildUrl('/kml/finalize'), {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to finalize KML' }));
      console.error('❌ Finalize KML error:', error);
      throw new Error(error.error || 'Failed to finalize KML');
    }

    const data = await response.json();
    console.log('✅ KML finalized:', data);
    return data;
  }

  /**
   * Get all finalized KML data for a specific link (SS/Link)
   * GET /api/kml-drm/link/{link_id}
   */
  async getFinalizedKmlByLink(linkId: string): Promise<KmlDrmListResponse> {
    console.log('🔄 Fetching finalized KML for link:', linkId);

    const response = await fetch(buildUrl(`/kml-drm/link/${linkId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get finalized KML by link' }));
      console.error('❌ Get finalized KML by link error:', error);
      throw new Error(error.error || 'Failed to get finalized KML by link');
    }

    const data = await response.json();
    console.log('✅ Finalized KML (by link) fetched:', data);
    return data;
  }

  /**
   * Check if project KML is already finalized
   * GET /api/kml-drm/project/{project_id}/status
   */
  async isProjectFinalized(projectId: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(`/kml-drm/project/${projectId}/status`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return false;
      const data: KmlDrmStatusResponse = await response.json();
      return data.is_finalized;
    } catch (error) {
      console.error('❌ Error checking KML finalize status:', error);
      return false;
    }
  }

  /**
   * Delete individual KML DRM entry
   * DELETE /api/kml-drm/{id}
   */
  async deleteKmlDrmEntry(id: string): Promise<void> {
    console.log('🗑️ Deleting KML DRM entry:', id);

    const response = await fetch(buildUrl(`/kml-drm/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete KML DRM entry' }));
      console.error('❌ Delete KML DRM entry error:', error);
      throw new Error(error.error || 'Failed to delete KML DRM entry');
    }

    console.log('✅ KML DRM entry deleted successfully');
  }
}

export const kmlFinalizeService = new KMLFinalizeService();
