import { BOQData, BOQItem } from '@/types';
import { API_ENDPOINTS, buildUrl, getDefaultHeaders, ApiError } from '@/config/api';
import { authService } from './authService';

// Mock data for fallback/development
export const mockBOQData: BOQData[] = [
  {
    id: 'BOQ-001',
    ruas: 'SS-JKT-001',
    kategori: 'A. Kabel',
    uraian: 'Kabel Fiber Optik 48 Core',
    volume: 1500,
    satuan: 'meter',
    hargaSatuan: 125000,
    total: 187500000,
    status: 'Approved',
    tahunProject: '2024',
    program: 'RMJ Ring Jawbel',
    mitra: 'PT Meindo',
    regional: 'R01 Sumbasel',
    items: [
      { id: 'item1', kategori: 'Material', uraian: 'Kabel FO 48C', volume: 1500, satuan: 'meter', hargaSatuan: 85000, total: 127500000 },
      { id: 'item2', kategori: 'Labor', uraian: 'Instalasi Kabel', volume: 1500, satuan: 'meter', hargaSatuan: 30000, total: 45000000 },
      { id: 'item3', kategori: 'Equipment', uraian: 'Tools & Equipment', volume: 1, satuan: 'ls', hargaSatuan: 15000000, total: 15000000 },
    ],
  },
  {
    id: 'BOQ-002',
    ruas: 'SS-JKT-001',
    kategori: 'B. Manhole',
    uraian: 'Manhole Beton 120x80 cm',
    volume: 25,
    satuan: 'unit',
    hargaSatuan: 3500000,
    total: 87500000,
    status: 'Draft',
    tahunProject: '2024',
    program: 'RMJ Ring Jawbel',
    mitra: 'PT Meindo',
    regional: 'R01 Sumbasel',
    items: [
      { id: 'item4', kategori: 'Material', uraian: 'Beton K-300', volume: 25, satuan: 'unit', hargaSatuan: 2000000, total: 50000000 },
      { id: 'item5', kategori: 'Labor', uraian: 'Pembuatan Manhole', volume: 25, satuan: 'unit', hargaSatuan: 1200000, total: 30000000 },
      { id: 'item6', kategori: 'Equipment', uraian: 'Cover Manhole', volume: 25, satuan: 'unit', hargaSatuan: 300000, total: 7500000 },
    ],
  },
  {
    id: 'BOQ-003',
    ruas: 'SS-BDG-002',
    kategori: 'A. Kabel',
    uraian: 'Kabel Fiber Optik 96 Core',
    volume: 2200,
    satuan: 'meter',
    hargaSatuan: 185000,
    total: 407000000,
    status: 'Approved',
    tahunProject: '2024',
    program: 'RMJ Metro',
    mitra: 'PT Sumatera',
    regional: 'R02 Jawa Barat',
    items: [
      { id: 'item7', kategori: 'Material', uraian: 'Kabel FO 96C', volume: 2200, satuan: 'meter', hargaSatuan: 125000, total: 275000000 },
      { id: 'item8', kategori: 'Labor', uraian: 'Instalasi Kabel', volume: 2200, satuan: 'meter', hargaSatuan: 45000, total: 99000000 },
      { id: 'item9', kategori: 'Equipment', uraian: 'Tools & Equipment', volume: 1, satuan: 'ls', hargaSatuan: 33000000, total: 33000000 },
    ],
  },
];

class BOQService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return getDefaultHeaders(token);
  }

  // Get all BOQ data
  async getAllBOQ(): Promise<BOQData[]> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BASE), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch BOQ data' }));
        throw new ApiError(error.message || 'Failed to fetch BOQ data', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
      // Fallback to mock data if API fails
      console.warn('Falling back to mock data');
      return mockBOQData;
    }
  }

  // Get BOQ by ID
  async getBOQById(id: string): Promise<BOQData | undefined> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BY_ID(id)), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to fetch BOQ' }));
        throw new ApiError(error.message || 'Failed to fetch BOQ', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching BOQ:', error);
      // Fallback to mock data
      return mockBOQData.find(b => b.id === id);
    }
  }

  // Create new BOQ
  async createBOQ(data: Partial<BOQData>): Promise<BOQData> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BASE), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create BOQ' }));
        throw new ApiError(error.message || 'Failed to create BOQ', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating BOQ:', error);
      throw error;
    }
  }

  // Update BOQ
  async updateBOQ(id: string, data: Partial<BOQData>): Promise<BOQData | null> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BY_ID(id)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update BOQ' }));
        throw new ApiError(error.message || 'Failed to update BOQ', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating BOQ:', error);
      throw error;
    }
  }

  // Delete BOQ
  async deleteBOQ(id: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BY_ID(id)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete BOQ' }));
        throw new ApiError(error.message || 'Failed to delete BOQ', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting BOQ:', error);
      throw error;
    }
  }

  // Add BOQ item
  async addBOQItem(boqId: string, item: Omit<BOQItem, 'id'>): Promise<BOQItem> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.BOQ.BY_ID(boqId)}/items`), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to add BOQ item' }));
        throw new ApiError(error.message || 'Failed to add BOQ item', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding BOQ item:', error);
      throw error;
    }
  }

  // Update BOQ item
  async updateBOQItem(boqId: string, itemId: string, data: Partial<BOQItem>): Promise<BOQItem | null> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.BOQ.BY_ID(boqId)}/items/${itemId}`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update BOQ item' }));
        throw new ApiError(error.message || 'Failed to update BOQ item', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating BOQ item:', error);
      throw error;
    }
  }

  // Delete BOQ item
  async deleteBOQItem(boqId: string, itemId: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(`${API_ENDPOINTS.BOQ.BY_ID(boqId)}/items/${itemId}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete BOQ item' }));
        throw new ApiError(error.message || 'Failed to delete BOQ item', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting BOQ item:', error);
      throw error;
    }
  }

  // Create BOQ Planned Item
  async createBOQPlannedItem(data: {
    project_id: string;
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
  }): Promise<any> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BASE), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create BOQ planned item' }));
        throw new ApiError(error.message || 'Failed to create BOQ planned item', response.status, error);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating BOQ planned item:', error);
      throw error;
    }
  }

  // Update BOQ Planned Item
  async updateBOQPlannedItem(id: string, data: Partial<{
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
  }>): Promise<any> {
    try {
      console.log('🔄 Updating BOQ planned item:', id);
      console.log('  Data:', data);
      
      // Using PUT instead of PATCH as workaround for CORS
      // Backend CORS config doesn't include PATCH method yet
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BY_ID(id)), {
        method: 'PATCH', // Changed from PATCH to PUT for CORS compatibility
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update BOQ planned item' }));
        console.error('❌ Update failed:', error);
        throw new ApiError(error.message || 'Failed to update BOQ planned item', response.status, error);
      }

      const result = await response.json();
      console.log('✅ Update successful');
      return result;
    } catch (error) {
      console.error('❌ Error updating BOQ planned item:', error);
      throw error;
    }
  }

  // Delete BOQ Planned Item
  async deleteBOQPlannedItem(id: string): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.BOQ.BY_ID(id)), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete BOQ planned item' }));
        throw new ApiError(error.message || 'Failed to delete BOQ planned item', response.status, error);
      }

      return true;
    } catch (error) {
      console.error('Error deleting BOQ planned item:', error);
      throw error;
    }
  }

  // Get BOQ Matrix by Link ID (per link basis)
  async getBOQMatrixByProjectId(projectId: string, linkId?: string): Promise<{
    items: Array<{
      no: number;
      designator: string;
      uraian_pekerjaan: string;
      satuan: string;
      material: number;
      jasa: number;
      drm: number;
      aktual: number;
      tambah: number;
      kurang: number;
    }>;
    summary: {
      total_material: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
      total_jasa: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
      grand_total: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
    };
  }> {
    try {
      // Use link-based endpoint (backend only supports link-based now)
      const endpoint = linkId ? `/links/${linkId}/boq-matrix` : `/projects/${projectId}/boq-matrix`;
      console.log('🔄 Fetching BOQ Matrix:', { projectId, linkId, endpoint });
      
      const response = await fetch(buildUrl(endpoint), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch BOQ matrix' }));
        console.error('❌ BOQ Matrix fetch error:', error);
        throw new ApiError(error.message || 'Failed to fetch BOQ matrix', response.status, error);
      }

      const data = await response.json();
      console.log('✅ BOQ Matrix data received:', {
        items: data.items?.length || 0,
        hasSummary: !!data.summary
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching BOQ matrix:', error);
      throw error;
    }
  }

  // Initialize BOQ for a specific link (creates 712 entries)
  async initializeBOQForLink(linkId: string): Promise<{ message: string; count: number }> {
    try {
      console.log('🔄 Initializing BOQ for link:', linkId);
      
      const response = await fetch(buildUrl(`/links/${linkId}/boq-detail/initialize`), {
        method: 'POST',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to initialize BOQ' }));
        console.error('❌ BOQ initialization error:', error);
        throw new ApiError(error.message || 'Failed to initialize BOQ', response.status, error);
      }

      const data = await response.json();
      console.log('✅ BOQ initialized:', data);
      return data;
    } catch (error) {
      console.error('❌ Error initializing BOQ:', error);
      throw error;
    }
  }

  // Get BOQ details for a specific link
  async getBOQDetailsByLinkId(linkId: string): Promise<Array<{
    id: any;
    link_id: any;
    designator_boq_id: any;
    material: number;
    jasa: number;
    drm: number;
    tambah: number;
    kurang: number;
    created_at: string;
    updated_at: string;
    created_by: any;
  }>> {
    try {
      console.log('🔄 Fetching BOQ details for link:', linkId);
      
      const response = await fetch(buildUrl(`/links/${linkId}/boq-detail`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch BOQ details' }));
        console.error('❌ BOQ details fetch error:', error);
        throw new ApiError(error.message || 'Failed to fetch BOQ details', response.status, error);
      }

      const data = await response.json();
      console.log('✅ BOQ details received:', data.length, 'items');
      return data;
    } catch (error) {
      console.error('❌ Error fetching BOQ details:', error);
      throw error;
    }
  }

  // Get BOQ details for all links in a project
  async getBOQDetailsByProjectId(projectId: string): Promise<Array<{
    id: any;
    link_id: any;
    designator_boq_id: any;
    material: number;
    jasa: number;
    drm: number;
    tambah: number;
    kurang: number;
    created_at: string;
    updated_at: string;
    created_by: any;
  }>> {
    try {
      console.log('🔄 Fetching BOQ details for project:', projectId);
      
      const response = await fetch(buildUrl(`/projects/${projectId}/boq-detail`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch BOQ details' }));
        console.error('❌ BOQ details fetch error:', error);
        throw new ApiError(error.message || 'Failed to fetch BOQ details', response.status, error);
      }

      const data = await response.json();
      console.log('✅ BOQ details received:', data.length, 'items');
      return data;
    } catch (error) {
      console.error('❌ Error fetching BOQ details:', error);
      throw error;
    }
  }

  // Update single BOQ detail entry for a link
  async updateBOQDetail(linkId: string, designatorBoqId: string, data: {
    material?: number;
    jasa?: number;
    drm?: number;
    tambah?: number;
    kurang?: number;
  }): Promise<any> {
    try {
      console.log('🔄 Updating BOQ detail:', { linkId, designatorBoqId, data });
      
      const response = await fetch(buildUrl(`/links/${linkId}/boq-detail/${designatorBoqId}`), {
        method: 'PATCH',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update BOQ detail' }));
        console.error('❌ BOQ detail update error:', error);
        throw new ApiError(error.message || 'Failed to update BOQ detail', response.status, error);
      }

      const result = await response.json();
      console.log('✅ BOQ detail updated');
      return result;
    } catch (error) {
      console.error('❌ Error updating BOQ detail:', error);
      throw error;
    }
  }

  // Delete single BOQ detail entry for a link
  async deleteBOQDetail(linkId: string, designator: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting BOQ detail:', { linkId, designator });
      const response = await fetch(buildUrl(`/links/${linkId}/boq-detail/${designator}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete BOQ detail' }));
        console.error('❌ BOQ detail delete error:', error);
        throw new ApiError(error.message || 'Failed to delete BOQ detail', response.status, error);
      }

      console.log('✅ BOQ detail deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting BOQ detail:', error);
      throw error;
    }
  }

  async bulkUpdateBOQDetails(linkId: string, updates: Array<{
    designator?: string;
    designator_boq_id?: string;
    material?: number;
    jasa?: number;
    drm?: number;
    tambah?: number;
    kurang?: number;
  }>): Promise<{
    items: Array<{
      no: number;
      designator: string;
      uraian_pekerjaan: string;
      satuan: string;
      material: number;
      jasa: number;
      drm: number;
      aktual: number;
      tambah: number;
      kurang: number;
    }>;
    summary: {
      total_material: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
      total_jasa: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
      grand_total: {
        total_drm: number;
        total_actual: number;
        total_tambah: number;
        total_kurang: number;
      };
    };
  }> {
    try {
      console.log('🔄 Bulk updating BOQ details:', { linkId, updates: updates.length });
      
      const mappedUpdates = updates.map(u => ({
        designator: u.designator || u.designator_boq_id || '',
        material: u.material,
        jasa: u.jasa
      }));

      const response = await fetch(buildUrl(`/links/${linkId}/boq-detail/bulk`), {
        method: 'PATCH',
        headers: this.getAuthHeader(),
        body: JSON.stringify({ updates: mappedUpdates }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to bulk update BOQ details' }));
        console.error('❌ Bulk update error:', error);
        throw new ApiError(error.message || 'Failed to bulk update BOQ details', response.status, error);
      }

      const data = await response.json();
      console.log('✅ Bulk update successful, matrix returned');
      return data;
    } catch (error) {
      console.error('❌ Error bulk updating BOQ details:', error);
      throw error;
    }
  }
}

export const boqService = new BOQService();
