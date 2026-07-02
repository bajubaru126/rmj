import axios from 'axios';
import { API_CONFIG } from '@/config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface EvidenceDocument {
  id: string;
  process_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  keterangan?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface LinkDocuments {
  link_id: string;
  document_count: number;
  documents: EvidenceDocument[];
}

export interface GroupedDocumentsResponse {
  project_id: string;
  total_links: number;
  links: LinkDocuments[];
}

export interface DocumentsResponse {
  data: EvidenceDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface DocumentStats {
  file_category: string;
  total: number;
  total_size: number;
  statuses: string[];
}

export interface StatsResponse {
  stats: DocumentStats[];
}

// Service functions
export const evidenceService = {
  /**
   * Get all documents with filters and pagination
   */
  getAllDocuments: async (
    token: string | null,
    params?: {
      project_id?: string;
      file_category?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<DocumentsResponse> => {
    // Remove 'project:' prefix if exists in project_id
    const cleanParams = params ? {
      ...params,
      project_id: params.project_id ? params.project_id.replace('project:', '') : undefined
    } : undefined;
    
    console.log('Fetching all documents with params:', cleanParams);
    
    const response = await axios.get(`${API_BASE_URL}/evidence/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: cleanParams,
    });
    console.log('All documents API response:', response.data);
    return response.data;
  },

  /**
   * Get documents grouped by links for a project
   * This is the main endpoint for Repository page
   */
  getDocumentsGroupedByLinks: async (
    projectId: string,
    token: string | null,
    params?: {
      file_category?: string;
      status?: string;
    }
  ): Promise<GroupedDocumentsResponse> => {
    // Remove 'project:' prefix if exists
    const cleanProjectId = projectId.replace('project:', '');
    console.log('Fetching grouped docs for project:', cleanProjectId);
    
    const response = await axios.get(
      `${API_BASE_URL}/evidence/projects/${cleanProjectId}/grouped-by-links`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      }
    );
    console.log('Grouped docs API response:', response.data);
    return response.data;
  },

  /**
   * Get documents for a specific link
   */
  getDocumentsByLink: async (
    projectId: string,
    linkId: string,
    token: string | null,
    params?: {
      file_category?: string;
      status?: string;
    }
  ): Promise<EvidenceDocument[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/evidence/projects/${projectId}/links/${linkId}/documents`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      }
    );
    return response.data;
  },

  /**
   * Get document statistics
   */
  getDocumentStats: async (
    token: string | null,
    projectId?: string
  ): Promise<StatsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/evidence/documents/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: projectId ? { project_id: projectId } : undefined,
    });
    return response.data;
  },

  /**
   * Get file type icon and color based on file_type or file_category
   */
  getFileTypeInfo: (fileType: string, fileCategory: string) => {
    // Check by file_type first
    if (fileType.includes('pdf')) {
      return { type: 'pdf', color: 'red' };
    }
    if (fileType.includes('word') || fileType.includes('document')) {
      return { type: 'docx', color: 'blue' };
    }
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return { type: 'xlsx', color: 'green' };
    }
    if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('png')) {
      return { type: 'jpg', color: 'pink' };
    }
    if (fileType.includes('kml') || fileCategory.includes('kml')) {
      return { type: 'kml', color: 'orange' };
    }
    if (fileType.includes('dwg') || fileType.includes('autocad')) {
      return { type: 'dwg', color: 'purple' };
    }
    
    // Default
    return { type: 'other', color: 'gray' };
  },

  /**
   * Format file size to human readable
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Format date to readable format
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  },

  /**
   * Get category display name
   */
  getCategoryDisplayName: (category: string): string => {
    const categoryMap: Record<string, string> = {
      kml: 'KML',
      kml_actual: 'KML Actual',
      field_evidence: 'Field Evidence',
      survey_kml_tracking: 'Survey Tracking',
      kom_document: 'KOM Document',
      contract_document: 'Contract',
      other_document_project: 'Other',
      other_document_kom: 'KOM Other',
      boq: 'BOQ',
    };
    return categoryMap[category] || category;
  },

  /**
   * Download document
   */
  downloadDocument: (filePath: string) => {
    const downloadUrl = `${API_BASE_URL.replace('/api', '')}/${filePath}`;
    window.open(downloadUrl, '_blank');
  },
};
