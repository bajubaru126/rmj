import { API_ENDPOINTS, apiFetch } from '@/config/api';

// ============================================
// ACTUAL DATE TYPES
// ============================================

export interface ActualDateAll {
  id: string;
  created_at: string;
  updated_at?: string | null;
  created_by: string;
  updated_by?: string | null;
  project_id: string;
  link_id?: string | null;
  actual_start_date_survey?: string | null;
  actual_end_date_survey?: string | null;
  asd_drm?: string | null; // Actual Start Date DRM
  aed_drm?: string | null; // Actual End Date DRM
  asd_installation?: string | null;
  aed_installation?: string | null;
  progress_drm?: number | null; // Dynamic progress from DRM table
}

export interface CreateActualDateRequest {
  project_id: string;
  link_id?: string;
  actual_start_date_survey?: string;
  actual_end_date_survey?: string;
  asd_drm?: string;
  aed_drm?: string;
  asd_installation?: string;
  aed_installation?: string;
}

export interface UpdateActualDateRequest {
  link_id?: string;
  actual_start_date_survey?: string;
  actual_end_date_survey?: string;
  asd_drm?: string;
  aed_drm?: string;
  asd_installation?: string;
  aed_installation?: string;
}

export interface ActualDateResponse {
  success: boolean;
  message?: string;
  data: ActualDateAll;
}

export interface ActualDateListResponse {
  success: boolean;
  data: ActualDateAll[];
  count: number;
  project_id?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract ID from backend format
 */
const extractId = (id: string | any): string => {
  if (typeof id === 'string') {
    return id.includes(':') ? id.split(':')[1] : id;
  }
  if (typeof id === 'object' && id !== null) {
    if ('String' in id) return id.String;
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
  return String(id);
};

/**
 * Format date for display (DD/MM/YYYY)
 */
export const formatDateDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Format date for API (ISO 8601)
 */
export const formatDateForAPI = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch (error) {
    return '';
  }
};

/**
 * Calculate duration between two dates
 */
export const calculateDuration = (startDate: string | null | undefined, endDate: string | null | undefined): string => {
  if (!startDate || !endDate) return '-';
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '0 hari';
    if (diffDays === 1) return '1 hari';
    if (diffDays < 30) return `${diffDays} hari`;
    
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    if (days === 0) return `${months} bulan`;
    return `${months} bulan ${days} hari`;
  } catch (error) {
    return '-';
  }
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Create new actual date record
 */
export const createActualDate = async (
  data: CreateActualDateRequest,
  token?: string | null
): Promise<ActualDateAll> => {
  const response = await apiFetch<ActualDateResponse>(
    API_ENDPOINTS.ACTUAL_DATE.BASE,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
  return response.data;
};

/**
 * Get all actual dates with optional filters
 */
export const getAllActualDates = async (
  filters?: { project_id?: string; link_id?: string },
  token?: string | null
): Promise<ActualDateAll[]> => {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.link_id) params.append('link_id', filters.link_id);
  
  const url = params.toString() 
    ? `${API_ENDPOINTS.ACTUAL_DATE.BASE}?${params.toString()}`
    : API_ENDPOINTS.ACTUAL_DATE.BASE;
  
  const response = await apiFetch<ActualDateListResponse>(url, { method: 'GET' }, token);
  return response.data;
};

/**
 * Get actual date by ID
 */
export const getActualDateById = async (
  id: string,
  token?: string | null
): Promise<ActualDateAll> => {
  const cleanId = extractId(id);
  const response = await apiFetch<ActualDateResponse>(
    API_ENDPOINTS.ACTUAL_DATE.BY_ID(cleanId),
    { method: 'GET' },
    token
  );
  return response.data;
};

/**
 * Get actual dates by project ID
 */
export const getActualDatesByProject = async (
  projectId: string,
  token?: string | null
): Promise<ActualDateAll[]> => {
  const cleanId = extractId(projectId);
  const response = await apiFetch<ActualDateListResponse>(
    API_ENDPOINTS.ACTUAL_DATE.BY_PROJECT(cleanId),
    { method: 'GET' },
    token
  );
  return response.data;
};

/**
 * Get actual date by project and link
 */
export const getActualDateByProjectAndLink = async (
  projectId: string,
  linkId: string,
  token?: string | null
): Promise<ActualDateAll | null> => {
  const cleanProjectId = extractId(projectId);
  const cleanLinkId = extractId(linkId);
  
  try {
    const response = await apiFetch<ActualDateResponse>(
      API_ENDPOINTS.ACTUAL_DATE.BY_PROJECT_AND_LINK(cleanProjectId, cleanLinkId),
      { method: 'GET' },
      token
    );
    return response.data;
  } catch (error: any) {
    // Return null if not found (404)
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return null;
    }
    throw error;
  }
};

/**
 * Update actual date
 */
export const updateActualDate = async (
  id: string,
  data: UpdateActualDateRequest,
  token?: string | null
): Promise<ActualDateAll> => {
  const cleanId = extractId(id);
  const response = await apiFetch<ActualDateResponse>(
    API_ENDPOINTS.ACTUAL_DATE.BY_ID(cleanId),
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
  return response.data;
};

/**
 * Delete actual date
 */
export const deleteActualDate = async (
  id: string,
  token?: string | null
): Promise<void> => {
  const cleanId = extractId(id);
  await apiFetch<{ success: boolean; message: string }>(
    API_ENDPOINTS.ACTUAL_DATE.BY_ID(cleanId),
    { method: 'DELETE' },
    token
  );
};

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get actual dates for multiple projects
 */
export const getActualDatesForProjects = async (
  projectIds: string[],
  token?: string | null
): Promise<Map<string, ActualDateAll[]>> => {
  const results = new Map<string, ActualDateAll[]>();
  
  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        const dates = await getActualDatesByProject(projectId, token);
        results.set(extractId(projectId), dates);
      } catch (error) {
        console.error(`Failed to fetch actual dates for project ${projectId}:`, error);
        results.set(extractId(projectId), []);
      }
    })
  );
  
  return results;
};

/**
 * Get actual dates for multiple links
 */
export const getActualDatesForLinks = async (
  projectId: string,
  linkIds: string[],
  token?: string | null
): Promise<Map<string, ActualDateAll | null>> => {
  const results = new Map<string, ActualDateAll | null>();
  
  await Promise.all(
    linkIds.map(async (linkId) => {
      try {
        const date = await getActualDateByProjectAndLink(projectId, linkId, token);
        results.set(extractId(linkId), date);
      } catch (error) {
        console.error(`Failed to fetch actual date for link ${linkId}:`, error);
        results.set(extractId(linkId), null);
      }
    })
  );
  
  return results;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if phase is completed
 */
export const isPhaseCompleted = (
  actualDate: ActualDateAll | null,
  phase: 'survey' | 'drm' | 'installation'
): boolean => {
  if (!actualDate) return false;
  
  switch (phase) {
    case 'survey':
      return !!actualDate.actual_end_date_survey;
    case 'drm':
      return !!actualDate.aed_drm;
    case 'installation':
      return !!actualDate.aed_installation;
    default:
      return false;
  }
};

/**
 * Get phase status
 */
export const getPhaseStatus = (
  actualDate: ActualDateAll | null,
  phase: 'survey' | 'drm' | 'installation'
): 'not_started' | 'in_progress' | 'completed' => {
  if (!actualDate) return 'not_started';
  
  switch (phase) {
    case 'survey':
      if (actualDate.actual_end_date_survey) return 'completed';
      if (actualDate.actual_start_date_survey) return 'in_progress';
      return 'not_started';
      
    case 'drm':
      if (actualDate.aed_drm) return 'completed';
      if (actualDate.asd_drm) return 'in_progress';
      return 'not_started';
      
    case 'installation':
      if (actualDate.aed_installation) return 'completed';
      if (actualDate.asd_installation) return 'in_progress';
      return 'not_started';
      
    default:
      return 'not_started';
  }
};

/**
 * Get phase duration
 */
export const getPhaseDuration = (
  actualDate: ActualDateAll | null,
  phase: 'survey' | 'drm' | 'installation'
): string => {
  if (!actualDate) return '-';
  
  switch (phase) {
    case 'survey':
      return calculateDuration(
        actualDate.actual_start_date_survey,
        actualDate.actual_end_date_survey
      );
      
    case 'drm':
      return calculateDuration(actualDate.asd_drm, actualDate.aed_drm);
      
    case 'installation':
      return calculateDuration(actualDate.asd_installation, actualDate.aed_installation);
      
    default:
      return '-';
  }
};

/**
 * Export for use in other modules
 */
export const actualDateService = {
  createActualDate,
  getAllActualDates,
  getActualDateById,
  getActualDatesByProject,
  getActualDateByProjectAndLink,
  updateActualDate,
  deleteActualDate,
  getActualDatesForProjects,
  getActualDatesForLinks,
  isPhaseCompleted,
  getPhaseStatus,
  getPhaseDuration,
  formatDateDisplay,
  formatDateForAPI,
  calculateDuration,
};
