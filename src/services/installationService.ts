import axios from 'axios';
import { API_CONFIG } from '@/config/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface InstallationDocument {
  id?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan?: string;
  status?: string;
  created_at?: string;
}

export interface Installation {
  id: string;
  project_id: string;
  link_id: string;
  material_id: string[];
  created_at: string;
  progress: string;
  installation_step: string;
  keterangan?: string;
  document_id: string[];
  documents: InstallationDocument[];
}

export interface CreateInstallationRequest {
  project_id: string;
  link_id: string;
  material_id: string[];
  progress: string;
  installation_step: string;
  keterangan?: string;
  documents?: InstallationDocument[];
}

export const INSTALLATION_STEPS = [
  'Pengurusan Izin Kerja',
  'Penggalian Tanah dan Penanaman HDPE',
  'Instalasi Jembatan',
  'Penarikan Kabel',
  'Joint dan Terminasi',
  'Test Commisioning'
] as const;

export type InstallationStep = typeof INSTALLATION_STEPS[number];

export const installationService = {
  // Get all installations
  getAllInstallations: async (token: string | null): Promise<Installation[]> => {
    const response = await axios.get(`${API_URL}/installations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get installations by project ID
  getInstallationsByProjectId: async (projectId: string, token: string | null): Promise<Installation[]> => {
    const response = await axios.get(`${API_URL}/installations?project_id=${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get installations by link ID
  getInstallationsByLinkId: async (linkId: string, token: string | null): Promise<Installation[]> => {
    const response = await axios.get(`${API_URL}/installations?link_id=${linkId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get installations by project and link
  getInstallationsByProjectAndLink: async (projectId: string, linkId: string, token: string | null): Promise<Installation[]> => {
    const response = await axios.get(`${API_URL}/installations?project_id=${projectId}&link_id=${linkId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get installation by ID
  getInstallationById: async (id: string, token: string | null): Promise<Installation> => {
    const response = await axios.get(`${API_URL}/installations/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Create installation
  createInstallation: async (data: CreateInstallationRequest, token: string | null): Promise<Installation> => {
    const response = await axios.post(`${API_URL}/installations`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update installation
  updateInstallation: async (id: string, data: Partial<CreateInstallationRequest>, token: string | null): Promise<Installation> => {
    const response = await axios.patch(`${API_URL}/installations/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Add document to installation
  addDocument: async (id: string, document: InstallationDocument, token: string | null): Promise<InstallationDocument> => {
    const response = await axios.post(`${API_URL}/installations/${id}/documents`, document, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Delete installation
  deleteInstallation: async (id: string, token: string | null): Promise<void> => {
    await axios.delete(`${API_URL}/installations/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  // Upload file
  uploadFile: async (file: File, fileCategory: string, token: string | null): Promise<{
    file_path: string;
    file_name: string;
    file_size: number;
    file_type?: string;
    file_category?: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', fileCategory);

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export interface BAInstallation {
  id: string;
  project_id: string;
  link_id: string;
  lokasi: string;
  keterangan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by_username?: string;
  documents?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];
}

export interface CreateBAInstallationRequest {
  project_id: string;
  link_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  lokasi: string;
  keterangan: string;
  status: string;
}

export const baInstallationService = {
  // Get all BA Installations (optional filters)
  getAll: async (params: { project_id?: string; link_id?: string; status?: string }, token: string | null): Promise<BAInstallation[]> => {
    const response = await axios.get(`${API_URL}/ba-installation`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get by project ID
  getByProjectId: async (projectId: string, token: string | null): Promise<BAInstallation[]> => {
    const response = await axios.get(`${API_URL}/ba-installation/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get by link ID
  getByLinkId: async (linkId: string, token: string | null): Promise<BAInstallation[]> => {
    const response = await axios.get(`${API_URL}/ba-installation/link/${linkId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create BA Installation
  create: async (data: Omit<CreateBAInstallationRequest, 'file_path'|'file_name'|'file_type'|'file_size'>, token: string | null): Promise<BAInstallation> => {
    // Pastikan project_id & link_id formatnya benar (dengan tipe datanya sesuai parsing SurrealDB rust)
    const response = await axios.post(`${API_URL}/ba-installation`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    // Kadang response create dibungkus dalam { ba_installation: { ... } } atau hanya objek array [ { ... } ]
    // Perjalanan balik dari rust sering berupa array of 1 jika via SurrealDB
    const resData = response.data;
    if (resData && Array.isArray(resData)) {
      return resData[0];
    }
    return resData;
  },

  // Save Document to BA Installation
  saveDocument: async (id: string, document: { file_path: string; file_name: string; file_type: string; file_size: number; keterangan?: string; status?: string }, token: string | null): Promise<any> => {
    const response = await axios.post(`${API_URL}/ba-installation/${id}/documents`, document, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Update status (Approve/Reject)
  approveOrReject: async (id: string, data: { status: string; rejection_reason?: string }, token: string | null): Promise<BAInstallation> => {
    const response = await axios.post(`${API_URL}/ba-installation/${id}/approve`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Delete BA Installation
  delete: async (id: string, token: string | null): Promise<void> => {
    await axios.delete(`${API_URL}/ba-installation/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export interface BACommissioning {
  id: string;
  project_id: string;
  project_name?: string;
  link_id: string;
  link_name?: string;
  lokasi: string;
  keterangan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by_username?: string;
  approved_by_username?: string;
  rejected_by_username?: string;
  rejection_reason?: string;
  documents?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    keterangan?: string;
  }[];
  // Yellow form fields
  no_ba?: string;
  tanggal_ba?: string;
  nomor_kontrak?: string;
  tanggal_kontrak?: string;
  pelaksana?: string;
  nama_proyek?: string;
}

export interface CreateBACommissioningRequest {
  project_id: string;
  link_id: string;
  lokasi: string;
  keterangan: string;
  status: string;
  no_ba?: string;
  tanggal_ba?: string;
  nomor_kontrak?: string;
  tanggal_kontrak?: string;
  pelaksana?: string;
  nama_proyek?: string;
}

export interface CommissioningEvidence {
  id: string;
  process_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: 'evidence_ct_ut' | 'fault_locater' | 'power_meter' | 'fiber_splicing_loss' | 'otdr';
  keterangan?: string;
  status?: string;
  created_at?: string;
}

export const baCommissioningService = {
  // Get all
  getAll: async (params: { project_id?: string; link_id?: string; status?: string }, token: string | null): Promise<BACommissioning[]> => {
    const response = await axios.get(`${API_URL}/ba-commissioning`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get by ID
  getById: async (id: string, token: string | null): Promise<BACommissioning> => {
    const response = await axios.get(`${API_URL}/ba-commissioning/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get by link ID
  getByLinkId: async (linkId: string, token: string | null): Promise<BACommissioning[]> => {
    const response = await axios.get(`${API_URL}/ba-commissioning/link/${linkId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create BACT
  create: async (data: CreateBACommissioningRequest, token: string | null): Promise<BACommissioning> => {
    const response = await axios.post(`${API_URL}/ba-commissioning`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const resData = response.data;
    if (resData && Array.isArray(resData)) {
      return resData[0];
    }
    return resData;
  },

  // Update BACT
  update: async (id: string, data: Partial<CreateBACommissioningRequest>, token: string | null): Promise<BACommissioning> => {
    const response = await axios.put(`${API_URL}/ba-commissioning/${id}`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Save Document to BACT
  saveDocument: async (id: string, document: { file_path: string; file_name: string; file_type: string; file_size: number; keterangan?: string; status?: string }, token: string | null): Promise<any> => {
    const response = await axios.post(`${API_URL}/ba-commissioning/${id}/documents`, document, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Approve or Reject BACT
  approveOrReject: async (id: string, data: { status: string; rejection_reason?: string }, token: string | null): Promise<BACommissioning> => {
    const response = await axios.post(`${API_URL}/ba-commissioning/${id}/approve`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Delete BACT
  delete: async (id: string, token: string | null): Promise<void> => {
    await axios.delete(`${API_URL}/ba-commissioning/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Check Completeness
  checkCompleteness: async (linkId: string, token: string | null): Promise<{ is_complete: boolean; checklist: Record<string, boolean> }> => {
    const response = await axios.get(`${API_URL}/ba-commissioning/completeness/link/${linkId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get Link Evidences
  getLinkEvidences: async (linkId: string, token: string | null): Promise<CommissioningEvidence[]> => {
    const response = await axios.get(`${API_URL}/ba-commissioning/documents/link/${linkId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Save Link Evidence
  saveLinkEvidence: async (linkId: string, data: { project_id: string; file_path: string; file_name: string; file_type: string; file_size: number; file_category: string; keterangan?: string }, token: string | null): Promise<CommissioningEvidence> => {
    const response = await axios.post(`${API_URL}/ba-commissioning/link/${linkId}/evidence`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // Delete Link Evidence
  deleteLinkEvidence: async (evidenceId: string, token: string | null): Promise<void> => {
    await axios.delete(`${API_URL}/ba-commissioning/evidence/${evidenceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};


export interface InstallationOcr {
  id: string;
  project_id: string;
  link_id: string;
  status: string;
  sub_phase?: string;
  route_progress?: number;
  datetime?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  additional_info?: string[];
  span_hh_jt?: string;
  jarak_dari_hh_jt?: number;
  kedalaman_galian?: number;
  designator?: string;
  keterangan?: string;
  total_length?: number;
  length_between_evidence?: number;
  raw_ocr_text?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  documents?: InstallationDocument[];
}

export interface OcrParsedData {
  datetime?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  additional_info?: string[];
}

export interface OcrImageMetadata {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan?: string;
  status?: string;
}

export interface OcrGeoJsonEvidence {
  file_path: string;
  file_name: string;
  file_size: number;
  file_category: string;
  keterangan?: string;
  status?: string;
}

export interface CreateInstallationOcrRequest {
  ocr_data: OcrParsedData;
  project_id: string;
  link_id: string;
  span_hh_jt?: string;
  jarak_dari_hh_jt?: number;
  kedalaman_galian?: number;
  designator?: string;
  keterangan?: string;
  sub_phase?: string;
  image_metadata?: OcrImageMetadata[];
  geojson_evidence?: OcrGeoJsonEvidence[];
}

export const installationOcrService = {
  /** GET /api/ocr/installations — list dengan filter opsional */
  getAll: async (
    params: { project_id?: string; link_id?: string; status?: string },
    token: string | null
  ): Promise<{ total: number; data: InstallationOcr[] }> => {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/ocr/installations`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = response.data;
    // Normalize: response bisa { total, data } atau array langsung
    if (Array.isArray(raw)) return { total: raw.length, data: raw };
    return { total: raw?.total ?? 0, data: raw?.data ?? [] };
  },

  /** GET /api/ocr/installations/{id} — detail satu record */
  getById: async (id: string, token: string | null): Promise<InstallationOcr> => {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/ocr/installations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /** POST /api/ocr/create-installation — buat record dari OCR data */
  create: async (
    data: CreateInstallationOcrRequest,
    token: string | null
  ): Promise<{ success: boolean; message: string; id: string }> => {
    const response = await axios.post(`${API_CONFIG.BASE_URL}/ocr/create-installation`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /** PUT /api/ocr/installations/{id} — update partial */
  update: async (
    id: string,
    data: Partial<InstallationOcr>,
    token: string | null
  ): Promise<InstallationOcr> => {
    const response = await axios.put(`${API_CONFIG.BASE_URL}/ocr/installations/${id}`, data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /** DELETE /api/ocr/installations/{id} — hapus beserta cascade evidence */
  delete: async (id: string, token: string | null): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_CONFIG.BASE_URL}/ocr/installations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /** POST /api/ocr/extract — upload gambar dan extract text */
  extractFromImage: async (
    imageFile: File,
    token: string | null
  ): Promise<{ success: boolean; message: string; raw_text: string; parsed_data: OcrParsedData | null }> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await axios.post(`${API_CONFIG.BASE_URL}/ocr/extract`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * GET /api/ocr/installations/summary?link_id={link_id}
   * Merangkum progress tracking per sub_phase untuk satu link.
   * Mengembalikan max_progress, first_datetime (actual start), last_datetime (actual end), steps.
   */
  getSummaryByLink: async (
    linkId: string,
    token: string | null
  ): Promise<InstallationOcrSummary[]> => {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/ocr/installations/summary`, {
      params: { link_id: linkId },
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const raw = response.data;
    const items: InstallationOcrSummary[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

    // Strip SurrealDB datetime wrapper d'...' from datetime fields
    const stripDt = (s?: string) => s?.replace(/^d'|'$/g, '') ?? s;
    return items.map(item => ({
      ...item,
      first_datetime: stripDt(item.first_datetime) ?? item.first_datetime,
      last_datetime:  stripDt(item.last_datetime)  ?? item.last_datetime,
      steps: item.steps?.map(step => ({ ...step, datetime: stripDt(step.datetime) ?? step.datetime })),
    }));
  },

  /** GET /api/ocr/installations/sub-phase/{sub_phase}/kml */
  getKmlBySubPhase: async (
    subPhase: string,
    params: { project_id?: string; link_id?: string; status?: string },
    token: string | null
  ): Promise<{ sub_phase: string; total_groups: number; data: any[] }> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/ocr/installations/sub-phase/${subPhase}/kml`,
      {
        params,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
    return response.data;
  },
};

export interface InstallationOcrSummaryStep {
  step: number;
  route_progress: number;
  datetime: string;
}

export interface InstallationOcrSummary {
  sub_phase: string;
  max_progress: number;
  first_datetime: string;
  last_datetime: string;
  total_steps: number;
  steps: InstallationOcrSummaryStep[];
}


// ─── Installation Project (Create Flow) ───────────────────────────────────────

export interface CreateInstallationProjectRequest {
  project_id: string;
  project_name: string;
  link_id: string;
  link_name: string;
  no_kontrak?: string;
  contract_duration?: string;
  contract_signed?: string;
  customer?: string;
  pelaksana?: string;
  sub_pelaksana?: string;
  witel?: string;
  regional?: string;
  start_plan_date?: string;
  end_plan_date?: string;
}

/** Single row dari GET /api/installation-project atau GET /api/installation-project/{id} */
export interface InstallationProject {
  id: { tb: string; id: string } | string;
  project_id: { tb: string; id: string } | string;
  project_name: string;
  link_id: { tb: string; id: string } | string;
  link_name: string;
  no_kontrak?: string;
  contract_duration?: string;
  contract_signed?: string;
  customer?: string;
  pelaksana?: string;
  sub_pelaksana?: { tb: string; id: string } | string;
  witel?: { tb: string; id: string } | string;
  regional?: { tb: string; id: string } | string;
  start_plan_date?: string;
  end_plan_date?: string;
  start_actual_date?: string;
  end_actual_date?: string;
  /** Dikalkulasi otomatis dari phase — tidak diupdate manual */
  status: string;
  /** Rata-rata progress_phase semua phase — dikalkulasi otomatis */
  progress_keseluruhan?: number | null;
  /** @deprecated Gunakan progress_keseluruhan */
  progress_phase?: number;
  created_at: string;
}

/** Single row dari tabel installation_phase */
export interface InstallationPhase {
  id: { tb: string; id: string } | string;
  project_id: { tb: string; id: string } | string;
  link_id: { tb: string; id: string } | string;
  installation_project_id: { tb: string; id: string } | string;
  pow_installation_id?: { tb: string; id: string } | string;
  sub_phase?: string;
  phase_type?: string;
  start_plan_phase_date?: string;
  end_plan_phase_date?: string;
  start_actual_phase_date?: string;
  end_actual_phase_date?: string;
  status_phase: string;
  progress_phase?: number;
  document?: string[];
  created_at: string;
  updated_at?: string | null;
}

export interface CreateInstallationPhaseRequest {
  project_id: string;
  link_id: string;
  installation_project_id: string;
  pow_installation_id?: string;
  sub_phase?: string;
  phase_type?: string;
  start_plan_phase_date?: string;
  end_plan_phase_date?: string;
  start_actual_phase_date?: string;
  end_actual_phase_date?: string;
  duration_actual?: number;
  status_phase?: string;
  progress_phase?: number;
  document?: string[];
}

export interface UpdateInstallationPhaseRequest {
  sub_phase?: string;
  phase_type?: string;
  start_plan_phase_date?: string;
  end_plan_phase_date?: string;
  start_actual_phase_date?: string;
  end_actual_phase_date?: string;
  status_phase?: string;
  progress_phase?: number;
  document?: string[];
}

export interface CreateInstallationProjectResponse {
  success: boolean;
  message: string;
  installation_project_id: string;
  data: {
    id: { tb: string; id: string };
    project_id: { tb: string; id: string };
    project_name: string;
    link_id: { tb: string; id: string };
    link_name: string;
    no_kontrak?: string;
    status: string;
    progress_phase: number;
    document: any[];
    created_at: string;
  };
}

export interface FinalizeDRMToInstalasiResponse {
  success: boolean;
  link_id: string;
  boq_copied: boolean;
  matrix_copied: boolean;
  redline_copied: boolean;
  pow_copied: boolean;
  message: string;
}

export const installationProjectService = {
  /**
   * GET /api/installation-project — Ambil semua installation project
   */
  getAll: async (token: string | null): Promise<InstallationProject[]> => {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/installation-project`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * GET /api/installation-project/{id} — Ambil detail satu installation project
   */
  getById: async (id: string, token: string | null): Promise<InstallationProject> => {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/installation-project/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = response.data;
    return raw?.data ?? raw;
  },

  /**
   * GET /api/installation-project/link/{link_id} — Filter by link
   */
  getByLinkId: async (linkId: string, token: string | null): Promise<InstallationProject[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-project/link/${linkId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * GET /api/installation-project/project/{project_id} — Filter by project
   */
  getByProjectId: async (projectId: string, token: string | null): Promise<InstallationProject[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-project/project/${projectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * Step 1 — Create installation_project row from DRM data
   */
  createInstallationProject: async (
    data: CreateInstallationProjectRequest,
    token: string | null
  ): Promise<CreateInstallationProjectResponse> => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/installation-project/create`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * POST /api/installation/unfinalize
   * Delete all installation data for a given link
   */
  unfinalizeInstallation: async (
    link_id: string,
    token: string | null
  ): Promise<{ success: boolean; link_id: string; message: string }> => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/installation/unfinalize`,
      { link_id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * @deprecated Use finalizePOW + installationUploadHelpers instead.
   * Step 2 — Copy boq_drm / matrix_drm / redline_drm / pow_drm → *_installasi tables
   */
  finalizeDRMToInstallasi: async (
    link_id: string,
    token: string | null
  ): Promise<FinalizeDRMToInstalasiResponse> => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/drm/finalize-to-installasi`,
      { link_id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  /**
   * Step 2 (NEW) — Copy pow_drm → pow_installasi for a given link.
   * POST /api/installation/finalize-pow
   */
  finalizePOW: async (
    link_id: string,
    token: string | null
  ): Promise<{ success: boolean; link_id: string; pow_copied: boolean; message: string }> => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/installation/finalize-pow`,
      { link_id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },
};

// ─── Installation Phase ───────────────────────────────────────────────────────

export const installationPhaseService = {
  /**
   * POST /api/installation-phase/create — Buat satu phase
   */
  create: async (
    data: CreateInstallationPhaseRequest,
    token: string | null
  ): Promise<{ success: boolean; message: string; installation_phase_id: string; data: InstallationPhase }> => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/installation-phase/create`,
      data,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * GET /api/installation-phase/{id} — Ambil satu phase by id
   */
  getById: async (id: string, token: string | null): Promise<InstallationPhase> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-phase/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return raw?.data ?? raw;
  },

  /**
   * GET /api/installation-phase/installation-project/{installation_project_id}
   * — Ambil semua phase untuk satu installation_project
   */
  getByInstallationProjectId: async (
    installationProjectId: string,
    token: string | null
  ): Promise<InstallationPhase[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-phase/installation-project/${installationProjectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * GET /api/installation-phase/link/{link_id} — Filter by link
   */
  getByLinkId: async (linkId: string, token: string | null): Promise<InstallationPhase[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-phase/link/${linkId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * GET /api/installation-phase/project/{project_id} — Filter by project
   */
  getByProjectId: async (projectId: string, token: string | null): Promise<InstallationPhase[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/installation-phase/project/${projectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  },

  /**
   * PUT /api/installation-phase/{id} — Update phase (partial)
   */
  update: async (
    id: string,
    data: UpdateInstallationPhaseRequest,
    token: string | null
  ): Promise<{ success: boolean; message: string; data: InstallationPhase }> => {
    const response = await axios.put(
      `${API_CONFIG.BASE_URL}/installation-phase/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * DELETE /api/installation-phase/{id} — Hapus phase
   */
  delete: async (
    id: string,
    token: string | null
  ): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(
      `${API_CONFIG.BASE_URL}/installation-phase/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};

// ─── POW Installasi ───────────────────────────────────────────────────────────

/** Single task row dari tabel pow_installasi (snapshot dari pow_drm saat finalize) */
export interface PowInstalasiItem {
  id: string;
  pow_name: string;
  ss_link: { tb: string; id: string } | string;
  duration: number;
  start_date: string;
  finish_date: string;
  work_category: string;
  sub_category: string | null;
  task_type: string;
  description: string | null;
  created_at?: string;
}

export interface UpdatePowInstalasiRequest {
  start_date: string;
  finish_date: string;
}

export const powInstalasiService = {
  /**
   * GET /api/pow-installasi/link/{link_id}
   * Mengembalikan semua task POW installasi untuk satu link, diurutkan start_date ASC.
   * Response: { success, data: [...], count } atau array langsung
   */
  getByLinkId: async (linkId: string, token: string | null): Promise<PowInstalasiItem[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/pow-installasi/link/${linkId}`,
      { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
    );
    const raw = response.data;
    // Normalise: { success, data: [...] } atau array langsung
    if (Array.isArray(raw)) return raw;
    return raw?.data ?? [];
  },

  /**
   * GET /api/pow-installasi/project/{project_id}
   * Mengembalikan semua task POW installasi untuk seluruh link dalam project.
   */
  getByProjectId: async (projectId: string, token: string | null): Promise<PowInstalasiItem[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/pow-installasi/project/${projectId}`,
      { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
    );
    const raw = response.data;
    if (Array.isArray(raw)) return raw;
    return raw?.data ?? [];
  },

  /**
   * GET /api/pow-installasi/installation-tasks?link_id={link_id}
   * Khusus untuk dropdown selection saat create installation_phase.
   * Mengembalikan task POW installasi yang ter-filter work_category = 'installation'.
   * Response: { success, data: [...], count } atau array langsung
   */
  getInstallationTasks: async (linkId: string, token: string | null): Promise<PowInstalasiItem[]> => {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/pow-installasi/installation-tasks`,
      {
        params: { link_id: linkId },
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      }
    );
    const raw = response.data;
    // Normalise: { success, data: [...] } atau array langsung
    if (Array.isArray(raw)) return raw;
    return raw?.data ?? [];
  },

  /**
   * PATCH /api/pow-installasi/{pow_id}
   * Update POW installasi dates (start_date, finish_date).
   * Duration will be auto-calculated by backend.
   * ONLY start_date and finish_date can be updated for security.
   */
  updateDates: async (id: string, payload: UpdatePowInstalasiRequest, token: string | null): Promise<PowInstalasiItem> => {
    // Clean ID jika ada prefix 'pow_installasi:'
    const cleanId = id.replace('pow_installasi:', '').replace('pow_instalasi:', '');
    
    console.log('powInstalasiService.updateDates called:', {
      originalId: id,
      cleanId,
      payload,
      payloadString: JSON.stringify(payload),
    });

    try {
      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/pow-installasi/${cleanId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const raw = response.data;
      return raw?.data ?? raw;
    } catch (error: any) {
      console.error('updateDates API error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  },
};
