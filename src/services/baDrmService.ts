// BA DRM Service - Finalized BA Survey Management
import { API_CONFIG } from '@/config/api';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface DocumentMetadata {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan?: string;
  status?: string;
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

export interface BADrmResponse {
  id: {
    tb: string;
    id: string | { String: string };
  };
  project_id: {
    tb: string;
    id: string | { String: string };
  };
  link_id?: {
    tb: string;
    id: string | { String: string };
  };
  lokasi: string;
  tanggal: string;
  // NEW: Metadata fields (fully stored in DB now)
  nama_proyek: string;
  nomor_kontrak: string;
  no_ba_drm: string;
  no_amandemen: string;
  pelaksana: string;
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
  created_at: string;
  created_by?: {
    tb: string;
    id: string | { String: string };
  };
  // Approval fields
  approved_by_user1?: boolean;
  approved_by_user2?: boolean;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
  documents: EvidenceFile[];
}

export interface FinalizeBASurveyItem {
  link_id?: string;
  lokasi: string;
  tanggal: string;
  documents: DocumentMetadata[];
  // NEW: Metadata fields to copy from BA Survey
  nama_proyek?: string;
  nomor_kontrak?: string;
  no_ba_drm?: string;
  no_amandemen?: string;
  pelaksana?: string;
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
}

export interface FinalizeBASurveyRequest {
  project_id: string;
  ba_surveys: FinalizeBASurveyItem[];
}

export interface FinalizeBASurveyResponse {
  success: boolean;
  message: string;
  project_id: string;
  ba_surveys_finalized: number;
  finalized_at: string;
}

export interface CreateBADrmRequest {
  project_id: string;
  link_id?: string;
  lokasi: string;
  tanggal: string;
  document?: DocumentMetadata;
  // NEW: Metadata fields
  nama_proyek?: string;
  nomor_kontrak?: string;
  no_ba_drm?: string;
  no_amandemen?: string;
  pelaksana?: string;
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
}

export interface UpdateBADrmRequest {
  lokasi?: string;
  tanggal?: string;
  documents?: DocumentMetadata[];
  // NEW: Metadata fields
  nama_proyek?: string;
  nomor_kontrak?: string;
  no_ba_drm?: string;
  no_amandemen?: string;
  pelaksana?: string;
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
}

export interface UpdateApprovalRequest {
  approved_by_user1?: boolean;
  approved_by_user2?: boolean;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
}

export interface ApprovalResponse {
  success: boolean;
  message: string;
  id: string;
  approved_by_user1: boolean;
  approved_by_user2: boolean;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
}

// ============================================
// BA DRM SERVICE
// ============================================

class BADrmService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Create BA DRM directly (NEW)
   * POST /api/ba-drm
   */
  async createBADrm(
    data: CreateBADrmRequest,
    token: string | null
  ): Promise<BADrmResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🔄 [BA DRM] Creating BA DRM:', data);

    const response = await fetch(`${this.baseUrl}/ba-drm`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Creation failed:', errorText);
      throw new Error(`Failed to create BA DRM: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] BA DRM created:', result);
    return result;
  }

  /**
   * Finalize BA Survey (CREATE to ba_drm)
   * POST /api/ba-surveys/finalize
   */
  async finalizeBASurvey(
    data: FinalizeBASurveyRequest,
    token: string | null
  ): Promise<FinalizeBASurveyResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🔄 [BA DRM] Finalizing BA Survey:', data);

    const response = await fetch(`${this.baseUrl}/ba-surveys/finalize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Finalization failed:', errorText);
      throw new Error(`Failed to finalize BA Survey: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] BA Survey finalized:', result);
    return result;
  }

  /**
   * Get all finalized BA Surveys (ba_drm)
   * GET /api/ba-drm?project_id={project_id}
   * GET /api/ba-drm?link_id={link_id}
   */
  async getAllBADrm(projectId?: string, linkId?: string): Promise<BADrmResponse[]> {
    let url = `${this.baseUrl}/ba-drm`;
    
    const params = new URLSearchParams();
    if (projectId) {
      params.append('project_id', projectId);
    }
    if (linkId) {
      params.append('link_id', linkId);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('📋 [BA DRM] Fetching BA DRM:', url);

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Fetch failed:', errorText);
      throw new Error(`Failed to fetch BA DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] BA DRM fetched:', result);
    return result;
  }

  /**
   * Get BA DRM by ID
   * GET /api/ba-drm/{id}
   */
  async getBADrmById(id: string): Promise<BADrmResponse> {
    console.log('📋 [BA DRM] Fetching BA DRM by ID:', id);

    const response = await fetch(`${this.baseUrl}/ba-drm/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Finalized BA Survey not found');
      }
      const errorText = await response.text();
      console.error('❌ [BA DRM] Fetch failed:', errorText);
      throw new Error(`Failed to fetch BA DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] BA DRM fetched:', result);
    return result;
  }

  /**
   * Update BA DRM (ba_drm only, does not affect original BA Survey)
   * PATCH /api/ba-drm/{id}
   */
  async updateBADrm(
    id: string,
    data: UpdateBADrmRequest,
    token: string | null
  ): Promise<BADrmResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📝 [BA DRM] Updating BA DRM:', id, data);

    const response = await fetch(`${this.baseUrl}/ba-drm/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('Finalized BA Survey not found');
      }
      
      throw new Error(`Failed to update BA DRM: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] BA DRM updated:', result);
    return result;
  }

  /**
   * Delete BA DRM (ba_drm only, does not affect original BA Survey)
   * DELETE /api/ba-drm/{id}
   */
  async deleteBADrm(id: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🗑️ [BA DRM] Deleting BA DRM:', id);

    const response = await fetch(`${this.baseUrl}/ba-drm/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Deletion failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('Finalized BA Survey not found');
      }
      
      throw new Error(`Failed to delete BA DRM: ${response.status} - ${errorText}`);
    }

    console.log('✅ [BA DRM] BA DRM deleted successfully');
  }

  /**
   * Upload document file for BA DRM
   * POST /api/upload (with file_category = 'ba_drm')
   */
  async uploadDocument(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'ba_drm');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 [BA DRM] Uploading document:', file.name);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Document upload failed:', errorText);
      throw new Error(`Failed to upload document: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] Document uploaded:', result);
    return result;
  }

  /**
   * Save document metadata to BA DRM
   * POST /api/ba-drm/{id}/documents
   */
  async saveDocument(
    baDrmId: string,
    document: DocumentMetadata,
    token: string | null
  ): Promise<EvidenceFile> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('💾 [BA DRM] Saving document metadata:', baDrmId, document);

    const response = await fetch(`${this.baseUrl}/ba-drm/${baDrmId}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Save document failed:', errorText);
      throw new Error(`Failed to save document: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] Document saved:', result);
    return result;
  }

  /**
   * Helper: Extract ID string from Thing object
   */
  extractId(thing: { tb: string; id: string | { String: string } } | string): string {
    if (typeof thing === 'string') {
      return thing;
    }
    
    if (typeof thing.id === 'string') {
      return thing.id;
    }
    
    return thing.id.String;
  }

  /**
   * Update BA DRM Approval
   * PATCH /api/ba-drm/{id}/approval
   */
  async updateApproval(
    id: string,
    data: UpdateApprovalRequest,
    token: string | null
  ): Promise<ApprovalResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 [BA DRM] Updating BA DRM approval:', id, data);

    const response = await fetch(`${this.baseUrl}/ba-drm/${id}/approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BA DRM] Approval update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA DRM not found');
      }
      
      throw new Error(`Failed to update approval: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] Approval updated:', result);
    return result;
  }

  /**
   * Get Approved BA DRM (both user1 and user2 approved)
   * GET /api/ba-drm/approved?project_id={project_id}
   * GET /api/ba-drm/approved?link_id={link_id}
   */
  async getApprovedBADrm(projectId?: string, linkId?: string): Promise<BADrmResponse[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (linkId) params.append('link_id', linkId);

    const url = `${this.baseUrl}/ba-drm/approved${params.toString() ? '?' + params.toString() : ''}`;

    console.log('📥 [BA DRM] Fetching approved BA DRM:', url);

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approved BA DRM: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [BA DRM] Approved BA DRM fetched:', result);
    return result;
  }

  /**
   * Helper: Format BA DRM response for display
   */
  formatBADrmForDisplay(baDrm: BADrmResponse) {
    return {
      id: this.extractId(baDrm.id),
      projectId: this.extractId(baDrm.project_id),
      linkId: baDrm.link_id ? this.extractId(baDrm.link_id) : undefined,
      lokasi: baDrm.lokasi,
      tanggal: new Date(baDrm.tanggal).toLocaleString('id-ID'),
      createdAt: new Date(baDrm.created_at).toLocaleString('id-ID'),
      createdBy: baDrm.created_by ? this.extractId(baDrm.created_by) : undefined,
      approvedByUser1: baDrm.approved_by_user1,
      approvedByUser2: baDrm.approved_by_user2,
      approvedByUser1Name: baDrm.approved_by_user1_name,
      approvedByUser1Jabatan: baDrm.approved_by_user1_jabatan,
      approvedByUser2Name: baDrm.approved_by_user2_name,
      approvedByUser2Jabatan: baDrm.approved_by_user2_jabatan,
      documents: baDrm.documents.map(doc => ({
        id: this.extractId(doc.id),
        fileName: doc.file_name,
        filePath: doc.file_path,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        keterangan: doc.keterangan,
        status: doc.status,
        createdAt: new Date(doc.created_at).toLocaleString('id-ID'),
      })),
    };
  }
}

export const baDrmService = new BADrmService();
