import { API_CONFIG } from '@/config/api';

export interface KOM {
  id: string;
  project_id: any;
  project_name: string;
  kom_start_date: string;
  kom_end_date: string;
  kom_venue?: string | null; // Tempat KOM dilaksanakan
  kom_mom_file: string | null;
  other_docs_files: string[];
  remarks: string;
  status: 'completed' | 'pending' | 'in-progress';
  progress?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKOMRequest {
  project_id: string;
  project_name: string;
  kom_start_date: string;
  kom_end_date: string;
  kom_venue?: string | null; // Tempat KOM dilaksanakan
  kom_mom_file: string | null;
  other_docs_files: string[];
  remarks: string;
  status: string;
}

export interface UpdateKOMRequest {
  project_name: string;
  kom_start_date: string;
  kom_end_date: string;
  kom_venue?: string | null; // Tempat KOM dilaksanakan
  kom_mom_file: string | null;
  other_docs_files: string[];
  remarks: string;
  status: string;
}

export interface FileUploadResponse {
  file_path: string;
  message: string;
}

export interface MultiFileUploadResponse {
  file_paths: string[];
  message: string;
}

class KOMService {
  private baseUrl = `${API_CONFIG.BASE_URL}/kom`;

  /**
   * Get all KOMs
   */
  async getAllKOMs(token: string): Promise<KOM[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch KOMs');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching KOMs:', error);
      throw new Error(error.message || 'Failed to fetch KOMs');
    }
  }

  /**
   * Get KOM by ID
   */
  async getKOMById(id: string, token: string): Promise<KOM> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch KOM');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching KOM:', error);
      throw new Error(error.message || 'Failed to fetch KOM');
    }
  }

  /**
   * Get KOMs by project ID
   */
  async getKOMsByProject(projectId: string, token: string): Promise<KOM[]> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch KOMs');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching KOMs by project:', error);
      throw new Error(error.message || 'Failed to fetch KOMs');
    }
  }

  /**
   * Get KOMs by status
   */
  async getKOMsByStatus(status: string, token: string): Promise<KOM[]> {
    try {
      const response = await fetch(`${this.baseUrl}/status?status=${status}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch KOMs');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching KOMs by status:', error);
      throw new Error(error.message || 'Failed to fetch KOMs');
    }
  }

  /**
   * Create new KOM
   */
  async createKOM(data: CreateKOMRequest, token: string): Promise<KOM> {
    try {
      console.log('Sending KOM data to backend:', JSON.stringify(data, null, 2));
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Failed to create KOM (${response.status})`;
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('Backend error (non-JSON):', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error creating KOM:', error);
      throw new Error(error.message || 'Failed to create KOM');
    }
  }

  /**
   * Update KOM
   */
  async updateKOM(id: string, data: UpdateKOMRequest, token: string): Promise<KOM> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update KOM');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error updating KOM:', error);
      throw new Error(error.message || 'Failed to update KOM');
    }
  }

  /**
   * Delete KOM
   */
  async deleteKOM(id: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete KOM');
      }
    } catch (error: any) {
      console.error('Error deleting KOM:', error);
      throw new Error(error.message || 'Failed to delete KOM');
    }
  }

  /**
   * Upload KOM MoM file
   */
  async uploadKOMMoM(file: File, token: string): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload/mom`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error uploading KOM MoM:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  /**
   * Upload KOM documents (multiple files)
   */
  async uploadKOMDocs(files: File[], token: string): Promise<MultiFileUploadResponse> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${this.baseUrl}/upload/docs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload files');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error uploading KOM docs:', error);
      throw new Error(error.message || 'Failed to upload files');
    }
  }

  /**
   * Delete KOM file
   */
  async deleteKOMFile(filePath: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/file`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: filePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Error deleting KOM file:', error);
      throw new Error(error.message || 'Failed to delete file');
    }
  }

  /**
   * Get file URL for display/download
   */
  getFileUrl(filePath: string, inline: boolean = false): string {
    if (!filePath) return '';
    // Remove leading slash if present
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const baseUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/${cleanPath}`;
    // Add inline parameter to request inline display instead of download
    return inline ? `${baseUrl}?inline=true` : baseUrl;
  }
}

export const komService = new KOMService();
