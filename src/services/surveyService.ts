import { API_CONFIG } from '@/config/api';

export interface CreateSurveyRequest {
  date: string;
  location: string;
  ss_link: string; // REQUIRED in v2.1
  project_id: string;
  latitude?: number;
  longitude?: number;
  item_name?: string[]; // Changed to array for multiple item names
  span_id?: string; // Optional span_id
  submit_via?: 'web' | 'mobile';
  evidence?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
  video_evidence?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
  record_document?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
}

export interface UpdateSurveyRequest {
  date?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  item_name?: string; // Single string (can be comma-separated for multiple designators)
  submit_via?: 'web' | 'mobile';
  ss_link?: string;
  span_id?: string; // Optional span_id to assign survey to span
  offset?: number; // Optional offset
  depth?: number; // Optional depth
  evidence?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
  video_evidence?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
  record_document?: {
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_category: string;
  };
}

export interface SurveyResponse {
  id: {
    tb: string;
    id: string | { String: string };
  };
  span_id: {
    tb: string;
    id: string | { String: string };
  } | null;
  item_name: string | null;
  offset: number | null;
  depth: number | null;
  date: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  submit_via: string | null;
  ss_link: string;
  length?: number | null; // Length in meters from survey
  is_multiple?: boolean; // NEW: Flag for multiple surveys created together
  batch_id?: string | null; // NEW: Batch ID for grouping multiple surveys at same location
  survey_progress?: number; // Backend automatically sets to 100 on finalize
  progress?: number;
  created_at: string;
  created_by: {
    tb: string;
    id: string | { String: string };
  };
  created_by_username: string; // Username of the user who created the survey
  updated_at: string | null;
  evidences?: Array<{
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
  }>; // Evidence files terkait survey (photos)
  video_evidences?: Array<{
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
  }>; // Video evidence files
  record_document?: {
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
  }; // GeoJSON record document
}

class SurveyService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all surveys
   */
  async getAllSurveys(): Promise<SurveyResponse[]> {
    const response = await fetch(`${this.baseUrl}/surveys`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch surveys: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Raw survey data from backend:', data);
    console.log('First item:', data[0]);
    
    // Check if backend sends { survey: {...}, ... } or flat structure
    const flattened = data.map((item: any) => {
      // If item has 'survey' field, flatten it
      if (item.survey) {
        return {
          ...item.survey,
          created_by_username: item.created_by_username,
          evidences: item.evidences
        };
      }
      // Otherwise, item is already the survey data
      return item;
    });
    
    console.log('Flattened survey data:', flattened);
    console.log('First flattened item:', flattened[0]);
    
    return flattened;
  }

  /**
   * Get surveys by project ID
   * New endpoint: GET /projects/{project_id}/surveys
   */
  async getSurveysByProjectId(projectId: string): Promise<SurveyResponse[]> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/surveys`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Project not found');
      }
      throw new Error(`Failed to fetch surveys: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Surveys by project:', data);
    
    return data;
  }

  /**
   * Create survey (supports multiple item_name)
   * Returns array of surveys if multiple item_names provided
   */
  async createSurvey(
    data: CreateSurveyRequest,
    token: string | null
  ): Promise<SurveyResponse[]> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Creating survey(s):', data);
    console.log('Item names:', data.item_name);
    console.log('Is multiple:', data.item_name && data.item_name.length > 1);

    const response = await fetch(`${this.baseUrl}/surveys`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Survey creation failed:', errorText);
      throw new Error(`Failed to create survey: ${response.status}`);
    }

    const result = await response.json();
    console.log('Survey(s) created:', result);
    console.log('Number of surveys created:', Array.isArray(result) ? result.length : 1);
    
    // Backend returns array of surveys for multiple item_names
    if (Array.isArray(result)) {
      return result.map((item: any) => {
        // If item has 'survey' field, flatten it
        if (item.survey) {
          return {
            ...item.survey,
            created_by_username: item.created_by_username,
            evidences: item.evidences
          };
        }
        return item;
      });
    }
    
    // Single survey response (backward compatibility)
    if (result.survey) {
      return [{
        ...result.survey,
        created_by_username: result.created_by_username,
        evidences: result.evidences
      }];
    }
    
    return [result];
  }

  /**
   * Update survey (supports multiple item_name)
   */
  async updateSurvey(
    id: string,
    data: UpdateSurveyRequest,
    token: string | null
  ): Promise<SurveyResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Updating survey:', id, data);
    console.log('Item names:', data.item_name);

    const response = await fetch(`${this.baseUrl}/surveys/${id}`, {
      method: 'PATCH', // Backend uses PATCH method
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Survey update failed:', errorText);
      throw new Error(`Failed to update survey: ${response.status}`);
    }

    const result = await response.json();
    console.log('Survey updated:', result);
    return result;
  }

  /**
   * Delete survey
   */
  async deleteSurvey(id: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Deleting survey:', id);

    const response = await fetch(`${this.baseUrl}/surveys/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Survey deletion failed:', errorText);
      throw new Error(`Failed to delete survey: ${response.status}`);
    }

    console.log('Survey deleted');
  }

  /**
   * Upload evidence file
   */
  async uploadEvidence(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'field_evidence'); // Backend evidence_repo requires this

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use /upload endpoint
    const uploadUrl = `${this.baseUrl}/upload`;
    
    console.log('===== UPLOAD DEBUG INFO =====');
    console.log('Upload URL:', uploadUrl);
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    console.log('Form data: file + file_category=field_evidence');
    console.log('Token present:', !!token);
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
      console.log('Token length:', token.length);
    }
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('===========================');

    try {
      console.log('Sending fetch request...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('Response received!');
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Error response body:', errorText);
        } catch (e) {
          console.error('Could not read error response body');
        }
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Authentication failed. Your session may have expired. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. You do not have permission to upload files.');
        } else if (response.status === 0 || response.status === 404) {
          throw new Error(`Cannot reach backend server at ${this.baseUrl}. Please check if backend is running.`);
        } else {
          throw new Error(`Upload failed (${response.status}): ${errorText || response.statusText}`);
        }
      }

      const result = await response.json();
      console.log('Evidence uploaded successfully:', result);
      
      // Response already has all needed fields from backend
      return result;
    } catch (error) {
      console.error('Upload exception:', error);
      console.error('Error type:', error instanceof TypeError ? 'TypeError' : error instanceof Error ? 'Error' : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`Network error: Cannot connect to backend server at ${this.baseUrl}. Please check:\n1. Backend is running\n2. CORS is configured\n3. No firewall blocking the connection`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Upload video evidence file
   */
  async uploadVideoEvidence(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'survey_video');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadUrl = `${this.baseUrl}/upload`;
    
    console.log('===== VIDEO UPLOAD DEBUG INFO =====');
    console.log('Upload URL:', uploadUrl);
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes', `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('File type:', file.type);
    console.log('Form data: file + file_category=survey_video');
    console.log('Token present:', !!token);
    console.log('===================================');

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('Video upload response status:', response.status);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Error response body:', errorText);
        } catch (e) {
          console.error('Could not read error response body');
        }
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Your session may have expired. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. You do not have permission to upload videos.');
        } else if (response.status === 413) {
          throw new Error('Video file is too large. Maximum size is 100 MB.');
        } else {
          throw new Error(`Video upload failed (${response.status}): ${errorText || response.statusText}`);
        }
      }

      const result = await response.json();
      console.log('Video evidence uploaded successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Video upload exception:', error);
      throw error;
    }
  }

  /**
   * Upload record document (GeoJSON)
   */
  async uploadRecordDocument(file: File, token: string | null): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', 'survey_record');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadUrl = `${this.baseUrl}/upload`;
    
    console.log('===== RECORD DOCUMENT UPLOAD DEBUG INFO =====');
    console.log('Upload URL:', uploadUrl);
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    console.log('Form data: file + file_category=survey_record');
    console.log('============================================');

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log('Record document upload response status:', response.status);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Error response body:', errorText);
        } catch (e) {
          console.error('Could not read error response body');
        }
        
        throw new Error(`Record document upload failed (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();
      console.log('Record document uploaded successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Record document upload exception:', error);
      throw error;
    }
  }

  /**
   * Assign span to multiple surveys
   */
  async assignSpanToSurveys(
    spanId: string,
    surveyIds: string[],
    token: string | null
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
      span_id: spanId,
      survey_ids: surveyIds,
    };

    console.log('Assigning span to surveys:', payload);

    const response = await fetch(`${this.baseUrl}/surveys/assign-span`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Assign span failed:', errorText);
      throw new Error(`Failed to assign span: ${response.status}`);
    }

    const result = await response.json();
    console.log('Span assigned to surveys:', result);
    return result;
  }
}

export const surveyService = new SurveyService();
