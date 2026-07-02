// Survey Done Service
// Service untuk mengelola status "done" pada survey links

import api from './api';

export interface MarkSurveyDoneRequest {
  link_id: string;
  project_id: string;
  marked_by?: string; // Will be set from auth context
  notes?: string;
}

export interface SurveyDoneStatusResponse {
  success: boolean;
  data: {
    link_id: string;
    is_done: boolean;
    marked_at?: string;
    marked_by?: string;
    marked_by_name?: string;
  };
}

export interface DoneSurvey {
  link_id: string;
  link_name: string;
  project_id: string;
  project_name: string;
  marked_at: string;
  marked_by: string;
  marked_by_name: string;
}

export interface DoneSurveysResponse {
  success: boolean;
  data: {
    surveys: DoneSurvey[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}

/**
 * Mark a survey link as done
 * This will make the survey appear in DRM menu
 * 
 * @param linkId - The link ID to mark as done
 * @param projectId - The project ID
 * @param notes - Optional notes
 * @returns Promise with the response
 * 
 * TODO: Implement when backend endpoint is ready
 * Endpoint: POST /api/survey/mark-done
 */
export const markSurveyAsDone = async (
  linkId: string,
  projectId: string,
  notes?: string
): Promise<any> => {
  // TODO: Uncomment when backend is ready
  /*
  const response = await api.post('/api/survey/mark-done', {
    link_id: linkId,
    project_id: projectId,
    notes,
  });
  return response.data;
  */

  // TEMPORARY: Mock implementation for development
  console.log('🚧 [MOCK] markSurveyAsDone called with:', { linkId, projectId, notes });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Survey marked as done successfully (MOCK)',
        data: {
          link_id: linkId,
          project_id: projectId,
          status: 'done',
          marked_at: new Date().toISOString(),
          marked_by: 'current_user_id',
        },
      });
    }, 500); // Simulate network delay
  });
};

/**
 * Get survey done status for a specific link
 * 
 * @param linkId - The link ID to check
 * @returns Promise with the status
 * 
 * TODO: Implement when backend endpoint is ready
 * Endpoint: GET /api/survey/done-status/:link_id
 */
export const getSurveyDoneStatus = async (
  linkId: string
): Promise<SurveyDoneStatusResponse> => {
  // TODO: Uncomment when backend is ready
  /*
  const response = await api.get(`/api/survey/done-status/${linkId}`);
  return response.data;
  */

  // TEMPORARY: Mock implementation for development
  console.log('🚧 [MOCK] getSurveyDoneStatus called with:', { linkId });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          link_id: linkId,
          is_done: false, // Default to false for now
          marked_at: undefined,
          marked_by: undefined,
          marked_by_name: undefined,
        },
      });
    }, 300);
  });
};

/**
 * Get all surveys that are marked as done (for DRM menu)
 * 
 * @param projectId - Optional project ID filter
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Promise with the list of done surveys
 * 
 * TODO: Implement when backend endpoint is ready
 * Endpoint: GET /api/drm/surveys
 */
export const getDoneSurveys = async (
  projectId?: string,
  page: number = 1,
  limit: number = 10
): Promise<DoneSurveysResponse> => {
  // TODO: Uncomment when backend is ready
  /*
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await api.get(`/api/drm/surveys?${params.toString()}`);
  return response.data;
  */

  // TEMPORARY: Mock implementation for development
  console.log('🚧 [MOCK] getDoneSurveys called with:', { projectId, page, limit });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          surveys: [
            // Mock data - will be replaced with real data from backend
            {
              link_id: 'mock_link_1',
              link_name: 'SS#01-AVN',
              project_id: 'mock_project_1',
              project_name: 'PROJECT - MRAUVIN - PERUM HARMONI - LEDUG',
              marked_at: new Date().toISOString(),
              marked_by: 'user_123',
              marked_by_name: 'John Doe',
            },
          ],
          pagination: {
            current_page: page,
            total_pages: 1,
            total_items: 1,
            items_per_page: limit,
          },
        },
      });
    }, 500);
  });
};

/**
 * Undo survey done status (optional feature)
 * 
 * @param linkId - The link ID to undo
 * @returns Promise with the response
 * 
 * TODO: Implement when backend endpoint is ready
 * Endpoint: DELETE /api/survey/mark-done/:link_id
 */
export const undoSurveyDone = async (linkId: string): Promise<any> => {
  // TODO: Uncomment when backend is ready
  /*
  const response = await api.delete(`/api/survey/mark-done/${linkId}`);
  return response.data;
  */

  // TEMPORARY: Mock implementation for development
  console.log('🚧 [MOCK] undoSurveyDone called with:', { linkId });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Survey done status removed successfully (MOCK)',
      });
    }, 500);
  });
};

export default {
  markSurveyAsDone,
  getSurveyDoneStatus,
  getDoneSurveys,
  undoSurveyDone,
};
