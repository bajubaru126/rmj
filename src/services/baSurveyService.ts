//basurvey
import { API_CONFIG } from '@/config/api';

export interface BASurveyDocument {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan: string;
  status: string;
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

export interface BASurveyResponse {
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
  } | string;
  lokasi: string;
  // NEW: 3 separate date fields (REQUIRED)
  tanggal_kontrak: string;
  tanggal_ba: string;
  tanggal_amandemen: string;
  // NEW: Required fields
  nama_proyek: string;
  nomor_kontrak: string;
  no_ba_drm: string;
  no_amandemen: string;
  pelaksana: string;
  // NEW: Optional content field
  content?: string;
  // NEW: Approval fields
  approved_by_user1?: boolean;
  approved_by_user2?: boolean;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user1_id?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
  approved_by_user2_id?: string;
  state: string;
  rejection_reason?: string;
  created_at: string;
  created_by?: {
    tb: string;
    id: string | { String: string };
  };
  documents?: EvidenceFile[];
}

export interface CreateBASurveyRequest {
  project_id: string;
  link_id?: string; // Optional link ID
  lokasi: string;
  // NEW: 3 separate date fields (REQUIRED)
  tanggal_kontrak: string; // Format: "2024-11-19T00:00:00Z"
  tanggal_ba: string; // Format: "2025-03-27T00:00:00Z"
  tanggal_amandemen: string; // Format: "2025-04-24T00:00:00Z"
  // NEW: Required fields
  nama_proyek: string;
  nomor_kontrak: string;
  no_ba_drm: string;
  no_amandemen: string;
  pelaksana: string;
  // NEW: Optional content field
  content?: string;
  document?: BASurveyDocument;
  approved_by_user1_id?: string;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_id?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
}

export interface UpdateBASurveyRequest {
  lokasi?: string;
  // NEW: 3 separate date fields (all optional for update)
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
  // NEW: Optional fields for update
  nama_proyek?: string;
  nomor_kontrak?: string;
  no_ba_drm?: string;
  no_amandemen?: string;
  pelaksana?: string;
  content?: string;
  document?: BASurveyDocument;
  approved_by_user1?: boolean;
  approved_by_user2?: boolean;
  approved_by_user1_id?: string;
  approved_by_user1_name?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_id?: string;
  approved_by_user2_name?: string;
  approved_by_user2_jabatan?: string;
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

class BASurveyService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Create BA Survey
   */
  async createBASurvey(data: CreateBASurveyRequest, token: string | null): Promise<BASurveyResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Creating BA Survey:', data);

    const response = await fetch(`${this.baseUrl}/ba-surveys`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BA Survey creation failed:', errorText);
      throw new Error(`Failed to create BA Survey: ${response.status}`);
    }

    const result = await response.json();
    console.log('BA Survey created:', result);
    return result;
  }

  /**
   * Get all BA Surveys (optionally filter by project_id)
   */
  async getAllBASurveys(projectId?: string): Promise<BASurveyResponse[]> {
    const url = projectId 
      ? `${this.baseUrl}/ba-surveys?project_id=${projectId}`
      : `${this.baseUrl}/ba-surveys`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch BA Surveys: ${response.status}`);
    }

    const result = await response.json();
    console.log('BA Surveys fetched:', result);
    return result;
  }

  /**
   * Get BA Survey by ID
   */
  async getBASurveyById(id: string): Promise<BASurveyResponse> {
    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      throw new Error(`Failed to fetch BA Survey: ${response.status}`);
    }

    const result = await response.json();
    console.log('BA Survey fetched:', result);
    return result;
  }

  /**
   * Update BA Survey
   */
  async updateBASurvey(
    id: string,
    data: UpdateBASurveyRequest,
    token: string | null
  ): Promise<BASurveyResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Updating BA Survey:', id, data);

    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BA Survey update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      
      throw new Error(`Failed to update BA Survey: ${response.status}`);
    }

    const result = await response.json();
    console.log('BA Survey updated:', result);
    return result;
  }

  /**
   * Delete BA Survey
   */
  async deleteBASurvey(id: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Deleting BA Survey:', id);

    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BA Survey deletion failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      
      throw new Error(`Failed to delete BA Survey: ${response.status}`);
    }

    console.log('BA Survey deleted successfully');
  }

  /**
   * Upload document file for BA Survey
   */
  async uploadDocument(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'ba_survey');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Uploading BA Survey document:', file.name);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Document upload failed:', errorText);
      throw new Error(`Failed to upload document: ${response.status}`);
    }

    const result = await response.json();
    console.log('Document uploaded:', result);
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
   * Helper: Format BA Survey response for display
   */
  formatBASurveyForDisplay(baSurvey: BASurveyResponse) {
    return {
      id: this.extractId(baSurvey.id),
      projectId: this.extractId(baSurvey.project_id),
      linkId: baSurvey.link_id ? this.extractId(baSurvey.link_id) : undefined,
      lokasi: baSurvey.lokasi,
      tanggalKontrak: new Date(baSurvey.tanggal_kontrak).toLocaleDateString('id-ID'),
      tanggalBa: new Date(baSurvey.tanggal_ba).toLocaleDateString('id-ID'),
      tanggalAmandemen: new Date(baSurvey.tanggal_amandemen).toLocaleDateString('id-ID'),
      namaProyek: baSurvey.nama_proyek,
      nomorKontrak: baSurvey.nomor_kontrak,
      noBaDrm: baSurvey.no_ba_drm,
      noAmandemen: baSurvey.no_amandemen,
      pelaksana: baSurvey.pelaksana,
      content: baSurvey.content,
      createdAt: new Date(baSurvey.created_at).toLocaleString('id-ID'),
      createdBy: baSurvey.created_by ? this.extractId(baSurvey.created_by) : undefined,
      approvedByUser1: baSurvey.approved_by_user1,
      approvedByUser2: baSurvey.approved_by_user2,
      approvedByUser1Name: baSurvey.approved_by_user1_name,
      approvedByUser1Jabatan: baSurvey.approved_by_user1_jabatan,
      approvedByUser1Id: baSurvey.approved_by_user1_id,
      approvedByUser2Name: baSurvey.approved_by_user2_name,
      approvedByUser2Jabatan: baSurvey.approved_by_user2_jabatan,
      approvedByUser2Id: baSurvey.approved_by_user2_id,
      state: baSurvey.state,
      rejectionReason: baSurvey.rejection_reason,
      documents: baSurvey.documents?.map(doc => ({
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

  /**
   * Update BA Survey Approval
   * PATCH /api/ba-surveys/{id}/approval
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

    console.log('📤 Updating BA Survey approval:', id, data);

    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}/approval`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Approval update failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      
      throw new Error(`Failed to update approval: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Approval updated:', result);
    return result;
  }

  /**
   * Transition BA Survey State
   * PATCH /api/ba-surveys/{id}/state
   */
  async transitionState(
    id: string,
    action: string,
    rejectionReason: string | undefined,
    token: string | null
  ): Promise<BASurveyResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Transitioning BA Survey state:', id, { action, rejectionReason });

    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}/state`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ State transition failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      
      throw new Error(`Failed to transition state: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ State transitioned:', result);
    return result;
  }

  /**
   * Update BA Survey State (legacy wrapper)
   */
  async updateState(
    id: string,
    state: string,
    rejectionReason: string | undefined,
    token: string | null
  ): Promise<BASurveyResponse> {
    return this.transitionState(id, state, rejectionReason, token);
  }

  /**
   * Get Approved BA Surveys (both user1 and user2 approved)
   * GET /api/ba-surveys/approved?project_id={project_id}
   * GET /api/ba-surveys/approved?link_id={link_id}
   */
  async getApprovedBASurveys(projectId?: string, linkId?: string): Promise<BASurveyResponse[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (linkId) params.append('link_id', linkId);

    const url = `${this.baseUrl}/ba-surveys/approved${params.toString() ? '?' + params.toString() : ''}`;

    console.log('📥 Fetching approved BA Surveys:', url);

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approved BA Surveys: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Approved BA Surveys fetched:', result);
    return result;
  }

  /**
   * ✅ NEW: Upload BA Survey Signature
   * POST /api/ba-surveys/{id}/upload-signature
   * 
   * @param id - BA Survey ID
   * @param signatureBlob - Signature image as Blob
   * @param documentType - "signature_mitra" or "signature_waspang"
   * @param token - Auth token
   */
  async uploadSignature(
    id: string,
    signatureBlob: Blob,
    documentType: 'signature_mitra' | 'signature_waspang',
    token: string | null
  ): Promise<{
    success: boolean;
    message: string;
    evidence_id: string;
    file_path: string;
    file_name: string;
    document_type: string;
  }> {
    const formData = new FormData();
    
    // Add signature file
    const fileName = `signature_${documentType}_${Date.now()}.png`;
    formData.append('file', signatureBlob, fileName);
    
    // Add document_type and signature_type for compatibility
    formData.append('document_type', documentType);
    formData.append('signature_type', documentType);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Uploading signature:', { id, documentType, fileName });

    const response = await fetch(`${this.baseUrl}/ba-surveys/${id}/upload-signature-validated`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Signature upload failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('BA Survey not found');
      }
      
      if (response.status === 400) {
        throw new Error('Invalid signature or document type');
      }
      
      throw new Error(`Failed to upload signature: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Signature uploaded:', result);
    return result;
  }

  /**
   * Scan or fetch survey evidence photos (field evidence) for a project/survey.
   * Calls the new endpoint: GET /api/evidence/projects/{project_id}/field-evidence
   * 
   * @param id - BA Survey ID
   * @param projectId - Project ID (with or without 'project:' prefix)
   * @param token - Auth token
   */
  async getBASurveyEvidences(id: string, projectId: string, token: string | null): Promise<EvidenceFile[]> {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanProjectId = projectId.replace('project:', '');

    // 1. Try the new project-level field evidence endpoint first (as documented)
    try {
      const url = `${this.baseUrl}/evidence/projects/${cleanProjectId}/field-evidence`;
      console.log(`📥 Fetching project field evidence from: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Project field evidence fetched successfully:', result);
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
      }
    } catch (err) {
      console.warn('⚠️ Project field evidence endpoint error, trying fallback to custom endpoint:', err);
    }

    // 2. Fallback A: Try upcoming backend custom evidences endpoint first
    try {
      console.log(`📥 Fetching BA Survey evidence from custom API: /api/ba-surveys/${id}/evidences`);
      const response = await fetch(`${this.baseUrl}/ba-surveys/${id}/evidences`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ BA Survey evidences fetched from custom API:', data);
        return Array.isArray(data) ? data : (data.data || []);
      }
    } catch (err) {
      console.warn('⚠️ Custom evidences endpoint not available, trying fallback to link documents:', err);
    }

    // 3. Fallback B: Fetch general field_evidence for this link and project (via link documents API)
    try {
      const baSurvey = await this.getBASurveyById(id);
      const linkId = baSurvey.link_id ? this.extractId(baSurvey.link_id) : undefined;

      if (cleanProjectId && linkId) {
        const fallbackUrl = `${this.baseUrl}/evidence/projects/${cleanProjectId}/links/${linkId}/documents?file_category=field_evidence`;
        console.log(`📥 Fallback fetching field_evidence from: ${fallbackUrl}`);
        const response = await fetch(fallbackUrl, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Fallback field_evidence fetched successfully:', data.length, 'files');
          return data;
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch fallback field_evidence:', err);
    }

    return [];
  }
}

export const baSurveyService = new BASurveyService();
