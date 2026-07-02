import { API_ENDPOINTS, apiFetch } from '@/config/api';

// Types matching backend API
export interface ProjectId {
  tb: string;
  id: string;
}

// BOQ Planned Item from backend (GET /projects/{id} response)
export interface BOQPlannedItem {
  id: string | ProjectId;
  project_id: string | ProjectId;
  no: number;
  designator: string;
  uraian_pekerjaan: string;
  satuan: string;
  harga_satuan_material: number;
  harga_satuan_jasa: number;
  drm: number;
  planned: number;
  tambah: number;
  kurang: number;
}

// BOQ Item format for backend (POST request)
export interface BOQDataItem {
  no: number;
  designator: string;
  uraian_pekerjaan: string;
  satuan: string;
  harga_satuan_material: number;
  harga_satuan_jasa: number;
  drm: number;
  planned: number;
  tambah: number;
  kurang: number;
}

export interface KMLDocument {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan?: string;
  status?: string;
}

export interface LinkInput {
  link_name: string;
  regional: string; // REQUIRED: Regional ID
  witel: string; // REQUIRED: Witel name
  sub_pelaksana?: string;
  ss_status?: string; // ✅ NEW: 'under_survey' or 'survey_completed'
  ss_contract_value?: string; // ✅ NEW: Contract value per link
  kml_document?: KMLDocument;
}

export interface CreateProjectRequest {
  name: string;
  regional?: string; // ✅ NEW: Regional ID (optional, will be converted to Thing in backend)
  witel?: string; // ✅ NEW: Witel name (optional)
  status: string; // 'on_going' or 'completed'
  no_kontrak: string;
  // Removed: region field (moved to link table as regional)
  pelaksana?: string;
  contract_signed?: string;
  contract_duration?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  location?: string;
  links?: LinkInput[]; // Each link has ss_contract_value
  employeer?: string;
  main_vendor?: string;
  kml_path?: string;
  boq_id?: string;
  boq_data?: BOQDataItem[];
  contract_document?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    keterangan?: string;
    status?: string;
  };
  other_documents?: Array<{
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    title?: string;
    keterangan?: string;
    status?: string;
  }>;
}

export interface ProjectResponse {
  id: ProjectId | string;
  name: string;
  regional?: ProjectId | string; // ✅ NEW: Regional reference (format: "regional:id" or just "id")
  witel?: string; // ✅ NEW: Witel name
  region: string; // Legacy field (kept for backward compatibility)
  status: string; // 'on_going' or 'completed'
  no_kontrak: string;
  pelaksana?: string;
  employeer?: string;
  main_vendor?: string;
  contract_signed?: string;
  contract_value?: string; // ✅ ADD: Contract value
  contract_duration?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  location?: string;
  links?: Array<{
    id: ProjectId | string;
    project_id: ProjectId | string;
    link_name: string;
    regional?: ProjectId | string; // Regional reference at link level
    witel?: string; // Witel name at link level
    sub_pelaksana?: string;
    ss_status?: string; // ✅ NEW: 'under_survey' or 'survey_completed'
    ss_contract_value?: string; // ✅ NEW: Contract value per link
    survey_actual_meters?: number;
    survey_planned_meters?: number;
    created_at?: string;
  }>;
  created_at: string;
  created_by: ProjectId | string;
  kml_path?: string;
  boq_id?: string;
  boq_planned?: BOQPlannedItem[];
  boq_documents?: any[];
  kml_documents?: any[];
  spans?: Array<{
    id: ProjectId | string;
    span_name: string;
    span_items?: Array<{
      id: ProjectId | string;
      item_name: string;
      distance_from: number;
      distance_to: number;
    }>;
  }>;
}

// Helper to extract ID string from ProjectId object or string
const extractId = (id: ProjectId | string | any): string => {
  // Handle object format from backend
  if (typeof id === 'object' && id !== null) {
    // Format: {String: 'abc123'}
    if ('String' in id) {
      return id.String;
    }
    // Format: {tb: 'project', id: 'abc123'} or {tb: 'project', id: {String: 'abc123'}}
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
  
  // Handle string format
  if (typeof id === 'string') {
    // Handle "project:abc123" format
    return id.includes(':') ? id.split(':')[1] : id;
  }
  
  return String(id);
};

// Helper to format ID for API calls
const formatIdForApi = (id: string | ProjectId): string => {
  // Handle object format from backend: {String: 'abc123'} or {tb: 'project', id: 'abc123'}
  if (typeof id === 'object') {
    if ('String' in id) {
      return (id as any).String;
    }
    if ('id' in id) {
      return typeof id.id === 'string' ? id.id : (id.id as any).String;
    }
  }
  
  // Handle string format
  if (typeof id === 'string') {
    // Backend expects ID without prefix (e.g., "abc123" not "project:abc123")
    // Remove prefix if exists
    if (id.includes(':')) {
      return id.split(':')[1];
    }
    return id;
  }
  
  return String(id);
};

/**
 * Create a new project (contract)
 */
export const createProject = async (
  data: CreateProjectRequest,
  token?: string | null
): Promise<ProjectResponse> => {
  return apiFetch<ProjectResponse>(
    API_ENDPOINTS.RUAS.BASE,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
};

/**
 * Get all projects (contracts)
 */
export const getAllProjects = async (token?: string | null): Promise<ProjectResponse[]> => {
  return apiFetch<ProjectResponse[]>(
    API_ENDPOINTS.RUAS.BASE,
    {
      method: 'GET',
    },
    token
  );
};

/**
 * Get project by ID
 */
export const getProjectById = async (id: string, token?: string | null): Promise<ProjectResponse> => {
  const formattedId = formatIdForApi(id);
  return apiFetch<ProjectResponse>(
    API_ENDPOINTS.RUAS.BY_ID(formattedId),
    {
      method: 'GET',
    },
    token
  );
};

/**
 * Update project
 */
export const updateProject = async (
  id: string,
  data: Partial<CreateProjectRequest>,
  token?: string | null
): Promise<ProjectResponse> => {
  const formattedId = formatIdForApi(id);
  return apiFetch<ProjectResponse>(
    API_ENDPOINTS.RUAS.BY_ID(formattedId),
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
};

/**
 * Delete project
 */
export const deleteProject = async (
  id: string,
  token?: string | null
): Promise<void> => {
  const formattedId = formatIdForApi(id);
  return apiFetch<void>(
    API_ENDPOINTS.RUAS.BY_ID(formattedId),
    {
      method: 'DELETE',
    },
    token
  );
};

/**
 * Upload file response
 */
export interface UploadFileResponse {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
}

/**
 * Upload file to backend
 * @param file - File to upload
 * @param category - File category: 'boq_planned', 'kml_planned', 'field_evidence', etc.
 * @param token - Auth token
 */
export const uploadFile = async (
  file: File,
  category: string,
  token?: string | null
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_category', category); // Backend evidence_repo requires this

  // VITE_API_URL already includes /api, so we just append /upload
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const url = `${apiUrl}/upload`;

  console.log('Uploading file:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    category,
    url,
    hasToken: !!token
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Set timeout to 60 seconds
    xhr.timeout = 60000;

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        console.log(`📊 Upload progress: ${percentComplete.toFixed(2)}%`);
      }
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      console.error('❌ Upload timeout');
      reject(new Error('Upload timeout - please try again'));
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      console.log('📥 Upload response status:', xhr.status);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          console.log('✅ Upload success:', result);
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        console.error('❌ Upload error:', xhr.responseText);
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('❌ Upload network error');
      reject(new Error('Network error during upload - please check your connection'));
    });

    xhr.addEventListener('abort', () => {
      console.error('❌ Upload aborted');
      reject(new Error('Upload was aborted'));
    });

    // Open connection
    xhr.open('POST', url);

    // Set headers
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    // Send request
    console.log('🚀 Sending upload request...');
    xhr.send(formData);
  });
};

// Export helper functions
export { extractId, formatIdForApi };

/**
 * Map frontend BOQItem to backend BOQDataItem format
 * Frontend: { designator, uraianPekerjaan, satuan, material, jasa, drm, actual, tambah, kurang }
 * Backend: { no, designator, uraian_pekerjaan, satuan, harga_satuan_material, harga_satuan_jasa, drm, planned, tambah, kurang }
 */
export const mapBOQItemToBackend = (items: any[]): BOQDataItem[] => {
  return items.map((item, index) => ({
    no: index + 1,
    designator: item.designator || '',
    uraian_pekerjaan: item.uraianPekerjaan || '',
    satuan: item.satuan || '',
    harga_satuan_material: parseFloat(item.material || '0'),
    harga_satuan_jasa: parseFloat(item.jasa || '0'),
    drm: parseFloat(item.drm || '0'),
    planned: parseFloat(item.actual || '0'), // Frontend uses 'actual' for planned quantity
    tambah: parseFloat(item.tambah || '0'),
    kurang: parseFloat(item.kurang || '0'),
  }));
};

/**
 * Span response from backend
 */
export interface SpanResponse {
  id: ProjectId | { String: string };
  project_id: ProjectId | { String: string };
  span_name: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

/**
 * Span item response from backend
 */
export interface SpanItemResponse {
  id: ProjectId | { String: string };
  span_id: ProjectId | { String: string };
  item_name: string;
  distance_from: number;
  distance_to: number;
  latitude_from?: number;
  longitude_from?: number;
  latitude_to?: number;
  longitude_to?: number;
  soil_type?: string;
  evidence_photos?: string[];
  created_at?: string;
}

/**
 * Redline response (Span with nested span items)
 */
export interface RedlineResponse {
  id: ProjectId | { String: string };
  project_id: ProjectId | { String: string };
  span_name: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  span_items: SpanItemResponse[];
}

/**
 * Get all spans for a project
 */
export const getProjectSpans = async (projectId: string, token?: string | null): Promise<SpanResponse[]> => {
  const formattedId = formatIdForApi(projectId);
  return apiFetch<SpanResponse[]>(
    `/projects/${formattedId}/spans`,
    {
      method: 'GET',
    },
    token
  );
};

/**
 * Get redline data (spans with nested span items) for a project
 * This is the recommended endpoint that returns all spans with their items in one request
 */
export const getProjectRedline = async (projectId: string, token?: string | null): Promise<RedlineResponse[]> => {
  const formattedId = formatIdForApi(projectId);
  return apiFetch<RedlineResponse[]>(
    `/projects/${formattedId}/redline`,
    {
      method: 'GET',
    },
    token
  );
};

/**
 * KML Data Types
 */
export interface KMLFile {
  id: {
    tb: string;
    id: {
      String: string;
    };
  };
  process_id: string;
  project_id: {
    tb: string;
    id: {
      String: string;
    };
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

export interface KMLProjectGroup {
  project_name: string;
  files: KMLFile[];
}

export interface KMLSurveyGroup {
  item_name: string;
  files: KMLFile[];
}

export interface KMLSpanGroup {
  span_name: string;
  files: KMLFile[];
}

export interface KMLSpanGroup {
  span_name: string;
  files: KMLFile[];
}

export interface KMLLinkGroup {
  link_name: string;
  files: KMLFile[];
}

export interface KMLDataResponse {
  kml_project: KMLProjectGroup[];
  kml_survey: KMLSurveyGroup[];
  kml_span: KMLSpanGroup[];
  kml_link?: KMLLinkGroup[]; // New: KML files grouped by link
  kml_installation?: KMLFile[]; // New: KML files from installation
}

/**
 * Get all KML files for a project grouped by category
 * @param projectId - Project ID (without prefix)
 * @returns KML data grouped by plan, survey, span, and link
 */
export const getProjectKMLFiles = async (projectId: string, token?: string | null): Promise<KMLDataResponse> => {
  const formattedId = formatIdForApi(projectId);
  return apiFetch<KMLDataResponse>(
    `${API_ENDPOINTS.RUAS.BASE}/${formattedId}/kml`,
    {
      method: 'GET',
    },
    token
  );
};

// Document interfaces
export interface DocumentItem {
  id: ProjectId | string;
  process_id: string;
  project_id: ProjectId | string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  keterangan: string;
  status: string;
  created_at: string;
}

export interface ProjectDocumentsResponse {
  project_id: string;
  project_name: string;
  documents: {
    kml: DocumentItem[];
    kml_actual: DocumentItem[];
    field_evidence: DocumentItem[];
    kom_document: DocumentItem[];
    contract_document: DocumentItem[];
    other_document_project: DocumentItem[];
    other_document_kom: DocumentItem[];
  };
}

// Type alias for compatibility
export type Evidence = DocumentItem;

/**
 * Get all documents for a project
 * @param projectId - Project ID
 * @returns All documents grouped by category
 */
export const getProjectDocuments = async (projectId: string, token?: string | null): Promise<ProjectDocumentsResponse> => {
  const formattedId = formatIdForApi(projectId);
  return apiFetch<ProjectDocumentsResponse>(
    `${API_ENDPOINTS.RUAS.BASE}/${formattedId}/documents`,
    {
      method: 'GET',
    },
    token
  );
};

/**
 * Delete project document (file + DB record)
 */
export const deleteProjectDocument = async (
  projectId: string,
  evidenceId: string,
  token: string
): Promise<void> => {
  const formattedProjectId = formatIdForApi(projectId);
  const formattedEvidenceId = formatIdForApi(evidenceId);
  return apiFetch<void>(
    `/projects/${formattedProjectId}/documents/${formattedEvidenceId}`,
    { method: 'DELETE' },
    token
  );
};

/**
 * Update link (name, sub_pelaksana, ss_status, ss_contract_value)
 */
export const updateLink = async (
  linkId: string,
  data: { 
    link_name?: string; 
    sub_pelaksana?: string;
    ss_status?: string; // ✅ NEW
    ss_contract_value?: string; // ✅ NEW
  },
  token: string
): Promise<Link> => {
  const formattedId = formatIdForApi(linkId);
  return apiFetch<Link>(
    `/links/${formattedId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
};

export interface Link {
  id: ProjectId | string;
  project_id: ProjectId | string;
  link_name: string;
  regional?: ProjectId | string; // ✅ UPDATED: Regional reference (can be at link level too)
  witel?: string; // ✅ UPDATED: Witel name (can be at link level too)
  sub_pelaksana?: string;
  ss_status?: string; // 'under_survey' or 'survey_completed'
  ss_contract_value?: string; // Contract value per link
  created_at?: string;
}
