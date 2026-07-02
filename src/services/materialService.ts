import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface MaterialDocument {
  id?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  keterangan?: string;
  status?: string;
  created_at?: string;
}

export interface MaterialDetail {
  id: string;
  project_id: string;
  link_id: string;
  created_at: string;
  plan_start_date: string | null;
  plan_end_date: string | null;
  plan_quantity: number | null;
  unit: string | null;
  plan_progress: string | null;
  item_name?: string;
  keterangan?: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  actual_value: number | null;
  actual_progress: number | null;
  material_step: string;
  document_id: string[];
  documents: MaterialDocument[];
}

export interface MaterialSummaryItem {
  item_name: string;
  total_quantity: number;
  unit: string;
}

export interface MaterialSummary {
  project_id: string;
  link_id: string;
  total_materials: number;
  items: MaterialSummaryItem[];
}

export interface MaterialData {
  id: string;
  project_id: string;
  project_name: string;
  no_kontrak: string;
  link_id: string;
  link_name: string;
  region: string;
  location: string;
  total_material: number;
  material_order?: number;
  material_shipment?: number;
  material_on_wh?: number;
  material_delivery?: number;
  material_delivery_to_site?: number;
  material_on_site?: number;
}

export interface CreateMaterialStepRequest {
  project_id: string;
  link_id: string;
  item_name: string;
  plan_start_date: string;
  plan_end_date: string;
  plan_quantity: number;
  unit: string;
  plan_progress: string;
  material_step: string;
  keterangan?: string;
  documents?: MaterialDocument[];
}

export interface CreateMaterialRequest {
  project_id: string;
  link_id: string;
  material_order: number;
  material_shipment: number;
  material_on_wh: number;
  material_delivery: number;
  material_delivery_to_site: number;
  material_on_site: number;
}

export interface UpdateMaterialRequest {
  material_order?: number;
  material_shipment?: number;
  material_on_wh?: number;
  material_delivery?: number;
  material_delivery_to_site?: number;
  material_on_site?: number;
}

export const MATERIAL_STEPS = [
  'Material Order',
  'Material Shipment',
  'Material On WH',
  'Material Delivery',
  'Material Delivery to Site',
  'Material On Site'
] as const;

export type MaterialStep = typeof MATERIAL_STEPS[number];

export const materialService = {
  // Get all materials
  getAllMaterials: async (token: string | null): Promise<MaterialDetail[]> => {
    const response = await axios.get(`${API_URL}/materials`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get material summary by project
  getMaterialSummaryByProject: async (projectId: string, token: string | null): Promise<MaterialSummary[]> => {
    const response = await axios.get(`${API_URL}/materials/summary?project_id=${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get material summary by link
  getMaterialSummaryByLink: async (linkId: string, token: string | null): Promise<MaterialSummary> => {
    const response = await axios.get(`${API_URL}/materials/summary?link_id=${linkId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get materials by project ID
  getMaterialsByProjectId: async (projectId: string, token: string | null): Promise<MaterialDetail[]> => {
    const response = await axios.get(`${API_URL}/materials?project_id=${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get materials by link ID
  getMaterialsByLinkId: async (linkId: string, token: string | null): Promise<MaterialDetail[]> => {
    const response = await axios.get(`${API_URL}/materials?link_id=${linkId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get materials by project and link
  getMaterialsByProjectAndLink: async (projectId: string, linkId: string, token: string | null): Promise<MaterialDetail[]> => {
    const response = await axios.get(`${API_URL}/materials?project_id=${projectId}&link_id=${linkId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get material by ID
  getMaterialById: async (id: string, token: string | null): Promise<MaterialDetail> => {
    const response = await axios.get(`${API_URL}/materials/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Create material step
  createMaterialStep: async (data: CreateMaterialStepRequest, token: string | null): Promise<MaterialDetail> => {
    const response = await axios.post(`${API_URL}/materials`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Create all material steps at once
  createAllMaterialSteps: async (
    projectId: string,
    linkId: string,
    itemName: string,
    unit: string,
    planStartDate: string,
    planEndDate: string,
    planQuantity: number,
    keterangan: string,
    token: string | null
  ): Promise<MaterialDetail[]> => {
    const results: MaterialDetail[] = [];
    
    // Convert date strings to ISO 8601 format
    const startDate = `${planStartDate}T00:00:00Z`;
    const endDate = `${planEndDate}T00:00:00Z`;
    
    // Create all 6 material steps with the same quantity and dates
    for (const step of MATERIAL_STEPS) {
      const data: CreateMaterialStepRequest = {
        project_id: projectId,
        link_id: linkId,
        item_name: itemName,
        plan_start_date: startDate,
        plan_end_date: endDate,
        plan_quantity: planQuantity,
        unit: unit,
        plan_progress: 'Pending',
        material_step: step
      };
      
      // Add keterangan if provided
      if (keterangan && keterangan.trim()) {
        data.keterangan = keterangan;
      }
      
      console.log(`📤 Creating material step: ${step}`, data);
      const result = await materialService.createMaterialStep(data, token);
      results.push(result);
    }
    
    return results;
  },

  // Update material
  updateMaterial: async (id: string, data: Partial<CreateMaterialStepRequest>, token: string | null): Promise<MaterialDetail> => {
    const response = await axios.patch(`${API_URL}/materials/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update material actual fields
  updateMaterialActual: async (
    id: string,
    data: {
      actual_start_date?: string;
      actual_end_date?: string;
      actual_value?: number;
      actual_progress?: number;
      documents?: MaterialDocument[];
    },
    token: string | null
  ): Promise<MaterialDetail> => {
    const response = await axios.patch(`${API_URL}/materials/${id}/actual`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Add document to material
  addDocument: async (id: string, document: MaterialDocument, token: string | null): Promise<MaterialDocument> => {
    const response = await axios.post(`${API_URL}/materials/${id}/documents`, document, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Delete material
  deleteMaterial: async (id: string, token: string | null): Promise<void> => {
    await axios.delete(`${API_URL}/materials/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  // Upload file
  uploadFile: async (file: File, fileCategory: string, token: string | null): Promise<{
    success: boolean;
    message: string;
    file_path: string;
    file_name: string;
    file_size: number;
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
