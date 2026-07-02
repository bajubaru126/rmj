import { RuasData, RuasFormData, SegmentasiData, CellData, ProjectResponse } from '@/types';
import { API_ENDPOINTS, buildUrl, getDefaultHeaders, ApiError } from '@/config/api';
import { authService } from './authService';

// ============= Field Transformers =============

// Transform FE format (camelCase) to BE format (snake_case)
const toBackendFormat = (data: Partial<RuasFormData>): Record<string, unknown> => ({
  tahun_project: data.tahunProject,
  program: data.program,
  project_sitelist: data.projectSitelist,
  site_name: data.siteName,
  regional: data.regional,
  project_code: data.projectCode,
  mitra: data.mitra,
  plan_rfs: data.planRFS,
  sp_curr: data.spCurr,
  milestone: data.milestone,
  m0s_installation_completed: data.m0sInstallationCompleted || null,
  plan_end_date: data.planEndDate,
  actual_end_date: data.actualEndDate || null,
  owner: data.owner,
});

// Transform BE format (snake_case) to FE format (camelCase)
const toFrontendFormat = (data: ProjectResponse): RuasData => ({
  id: data.id,
  tahunProject: data.tahun_project,
  program: data.program,
  projectSitelist: data.project_sitelist,
  siteName: data.site_name,
  regional: data.regional,
  projectCode: data.project_code,
  mitra: data.mitra,
  planRFS: data.plan_rfs,
  spCurr: data.sp_curr,
  milestone: data.milestone,
  m0sInstallationCompleted: data.m0s_installation_completed || undefined,
  planEndDate: data.plan_end_date,
  actualEndDate: data.actual_end_date || undefined,
  owner: data.owner,
  createdAt: data.created_at || undefined,
});

// Transform array of BE responses to FE format
const toFrontendFormatArray = (data: ProjectResponse[]): RuasData[] => 
  data.map(toFrontendFormat);

// ============= Mock Data (updated field names) =============

export const mockRuasData: RuasData[] = [
  {
    id: 'r1',
    tahunProject: '2024',
    program: 'RMJ Ring Jawbel',
    projectSitelist: 'UNX-JKT-001',
    siteName: 'K BARUSUJIAN',
    regional: 'R01 Sumbasel',
    projectCode: 'PRJ-001',
    mitra: 'PT Meindo',
    planRFS: '2024-06-30',
    spCurr: 'Implementation',
    milestone: 'Implementation',
    m0sInstallationCompleted: '2024-05-01',
    planEndDate: '2024-06-15',
    actualEndDate: '2024-06-10',
    owner: 'Faisal Ahmad',
    segmentasi: [
      {
        id: 'seg1',
        segName: 'SEG-A',
        length: '2.5 km',
        status: 'Progress',
        cells: [
          {
            id: 'cell1',
            cellName: 'CELL-01',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team A',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
            evidencePhotos: ['photo1', 'photo2'],
          },
          {
            id: 'cell2',
            cellName: 'CELL-02',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team A',
            status: 'OK',
            evidenceCount: 4,
            hasKML: true,
          },
          {
            id: 'cell3',
            cellName: 'CELL-03',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team B',
            status: 'Delay',
            evidenceCount: 2,
            hasKML: true,
          },
        ],
      },
    ],
  },
  {
    id: 'r2',
    tahunProject: '2024',
    program: 'RMJ Metro',
    projectSitelist: 'UNX-BDG-001',
    siteName: 'BANDUNG CENTRAL',
    regional: 'R02 Jawa Barat',
    projectCode: 'PRJ-002',
    mitra: 'PT Sumatera',
    planRFS: '2024-08-15',
    spCurr: 'Survey',
    milestone: 'Survey',
    planEndDate: '2024-07-30',
    owner: 'Hendra Pratama',
    segmentasi: [],
  },
];

class RuasService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return getDefaultHeaders(token);
  }

  // Get all ruas data
  async getAllRuas(): Promise<RuasData[]> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.BASE), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch ruas data' }));
        throw new ApiError(error.message || 'Failed to fetch ruas data', response.status, error);
      }

      const data: ProjectResponse[] = await response.json();
      return toFrontendFormatArray(data);
    } catch (error) {
      console.error('Error fetching ruas data:', error);
      // Return empty array if API fails
      return [];
    }
  }

  // Get ruas by ID
  async getRuasById(id: string): Promise<RuasData | undefined> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.BY_ID(id)), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to fetch ruas' }));
        throw new ApiError(error.message || 'Failed to fetch ruas', response.status, error);
      }

      const data: ProjectResponse = await response.json();
      return toFrontendFormat(data);
    } catch (error) {
      console.error('Error fetching ruas:', error);
      // Fallback to mock data
      return mockRuasData.find(r => r.id === id);
    }
  }

  // Create new ruas
  async createRuas(data: RuasFormData): Promise<RuasData> {
    try {
      const backendData = toBackendFormat(data);
      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.BASE), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(backendData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create ruas' }));
        throw new ApiError(error.message || 'Failed to create ruas', response.status, error);
      }

      const responseData: ProjectResponse = await response.json();
      return toFrontendFormat(responseData);
    } catch (error) {
      console.error('Error creating ruas:', error);
      throw error;
    }
  }

  // Update ruas
  async updateRuas(id: string, data: Partial<RuasFormData>): Promise<RuasData | null> {
    try {
      const backendData = toBackendFormat(data);
      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.BY_ID(id)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(backendData),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update ruas' }));
        throw new ApiError(error.message || 'Failed to update ruas', response.status, error);
      }

      const responseData: ProjectResponse = await response.json();
      return toFrontendFormat(responseData);
    } catch (error) {
      console.error('Error updating ruas:', error);
      throw error;
    }
  }

  // Delete ruas
  async deleteRuas(id: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.BY_ID(id)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      // Backend returns 204 No Content on success
      if (response.status === 204) {
        return true;
      }

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete ruas' }));
        throw new ApiError(error.message || 'Failed to delete ruas', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting ruas:', error);
      throw error;
    }
  }

  // Upload DRM file
  async uploadDRM(ruasId: string, file: File): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = authService.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.UPLOAD_DRM(ruasId)), {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload DRM' }));
        throw new ApiError(error.message || 'Failed to upload DRM', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error uploading DRM:', error);
      throw error;
    }
  }

  // Upload KML file
  async uploadKML(cellId: string, file: File, description?: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const token = authService.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildUrl(API_ENDPOINTS.RUAS.UPLOAD_KML(cellId)), {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload KML' }));
        throw new ApiError(error.message || 'Failed to upload KML', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error uploading KML:', error);
      throw error;
    }
  }

  // === Segmentasi Operations ===
  
  // Get segmentasi by ruas
  async getSegmentasiByRuas(ruasId: string): Promise<SegmentasiData[]> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.RUAS.BY_ID(ruasId)}/segmentasi`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch segmentasi' }));
        throw new ApiError(error.message || 'Failed to fetch segmentasi', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching segmentasi:', error);
      // Fallback to mock data
      const ruas = mockRuasData.find(r => r.id === ruasId);
      return ruas?.segmentasi || [];
    }
  }

  // Create segmentasi
  async createSegmentasi(ruasId: string, data: Partial<SegmentasiData>): Promise<SegmentasiData> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.RUAS.BY_ID(ruasId)}/segmentasi`), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create segmentasi' }));
        throw new ApiError(error.message || 'Failed to create segmentasi', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating segmentasi:', error);
      throw error;
    }
  }

  // Update segmentasi
  async updateSegmentasi(segId: string, data: Partial<SegmentasiData>): Promise<SegmentasiData | null> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.SEGMENTASI.BY_ID(segId)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update segmentasi' }));
        throw new ApiError(error.message || 'Failed to update segmentasi', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating segmentasi:', error);
      throw error;
    }
  }

  // Delete segmentasi
  async deleteSegmentasi(segId: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.SEGMENTASI.BY_ID(segId)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete segmentasi' }));
        throw new ApiError(error.message || 'Failed to delete segmentasi', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting segmentasi:', error);
      throw error;
    }
  }

  // === Cell Operations ===
  
  // Get cells by segmentasi
  async getCellsBySegmentasi(segId: string): Promise<CellData[]> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.SEGMENTASI.BY_ID(segId)}/cells`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch cells' }));
        throw new ApiError(error.message || 'Failed to fetch cells', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cells:', error);
      return [];
    }
  }

  // Create cell
  async createCell(segId: string, data: Partial<CellData>): Promise<CellData> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.SEGMENTASI.BY_ID(segId)}/cells`), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create cell' }));
        throw new ApiError(error.message || 'Failed to create cell', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating cell:', error);
      throw error;
    }
  }

  // Update cell
  async updateCell(cellId: string, data: Partial<CellData>): Promise<CellData | null> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.CELLS.BY_ID(cellId)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update cell' }));
        throw new ApiError(error.message || 'Failed to update cell', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating cell:', error);
      throw error;
    }
  }

  // Delete cell
  async deleteCell(cellId: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.CELLS.BY_ID(cellId)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete cell' }));
        throw new ApiError(error.message || 'Failed to delete cell', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting cell:', error);
      throw error;
    }
  }
}

export const ruasService = new RuasService();
