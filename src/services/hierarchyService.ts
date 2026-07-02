import { API_CONFIG } from '@/config/api';

export interface HierarchyId {
  tb: string;
  id: string | { String: string };
}

export interface HierarchyResponse {
  id: HierarchyId;
  // Basic Information
  actual_site_id?: string;
  actual_site_name?: string;
  current_position?: string;
  customer?: string;
  hse_tools?: string;
  installation_tools?: string;
  io?: string;
  lop?: string;
  mitra?: string;
  pic_egm?: string;
  pic_pm_hq?: string;
  pic_pm_regional?: string;
  pic_spm_hq?: string;
  po_customer?: string;
  po_description?: string;
  po_number?: string;
  po_site_id?: string;
  po_site_name?: string;
  po_year?: number;
  portfolio?: string;
  product?: string;
  project_id?: string;
  project_name?: string;
  regional_cust?: string;
  regional_ti?: string;
  segment?: string;
  sid?: string;
  status_project?: string;
  target_unit?: string;
  wpid?: string;
  
  // Financial
  bast_total_idr?: number;
  final_rekon_amount_idr?: number;
  final_rekon_reason?: string;
  invoice_idr?: number;
  po_value_idr?: number;
  remaining_final?: number;
  remaining_po?: number;
  target_qty?: number;
  
  // PO Dates
  po_end_date?: string;
  po_release_date?: string;
  
  // BAST Phase
  bast_actual_end_date?: string;
  bast_actual_progress?: number;
  bast_actual_start_date?: string;
  bast_actual_value?: number;
  bast_plan_end_date?: string;
  bast_plan_progress?: number;
  bast_plan_qty?: number;
  bast_plan_start_date?: string;
  bast_unit?: string;
  
  // BAUT1 Phase
  baut1_actual_end_date?: string;
  baut1_actual_progress?: number;
  baut1_actual_start_date?: string;
  baut1_actual_value?: number;
  baut1_plan_end_date?: string;
  baut1_plan_progress?: number;
  baut1_plan_qty?: number;
  baut1_plan_start_date?: string;
  baut1_unit?: string;
  
  // BAUT Phase
  baut_actual_end_date?: string;
  baut_actual_progress?: number;
  baut_actual_start_date?: string;
  baut_actual_value?: number;
  baut_plan_end_date?: string;
  baut_plan_progress?: number;
  baut_plan_qty?: number;
  baut_plan_start_date?: string;
  baut_unit?: string;
  
  // DRM Phase
  drm_actual_end_date?: string;
  drm_actual_progress?: number;
  drm_actual_start_date?: string;
  drm_actual_value?: number;
  drm_plan_end_date?: string;
  drm_plan_progress?: number;
  drm_plan_qty?: number;
  drm_plan_start_date?: string;
  drm_unit?: string;
  
  // IJ Phase
  ij_actual_end_date?: string;
  ij_actual_progress?: number;
  ij_actual_start_date?: string;
  ij_actual_value?: number;
  ij_plan_end_date?: string;
  ij_plan_progress?: number;
  ij_plan_qty?: number;
  ij_plan_start_date?: string;
  ij_unit?: string;
  
  // JT Phase
  jt_actual_end_date?: string;
  jt_actual_progress?: number;
  jt_actual_start_date?: string;
  jt_actual_value?: number;
  jt_plan_end_date?: string;
  jt_plan_progress?: number;
  jt_plan_qty?: number;
  jt_plan_start_date?: string;
  jt_unit?: string;
  
  // KOM Phase
  kom_actual_end_date?: string;
  kom_actual_progress?: number;
  kom_actual_start_date?: string;
  kom_actual_value?: number;
  kom_plan_end_date?: string;
  kom_plan_progress?: number;
  kom_plan_qty?: number;
  kom_plan_start_date?: string;
  kom_unit?: string;
  
  // MD Phase
  md_actual_end_date?: string;
  md_actual_progress?: number;
  md_actual_start_date?: string;
  md_actual_value?: number;
  md_plan_end_date?: string;
  md_plan_progress?: number;
  md_plan_qty?: number;
  md_plan_start_date?: string;
  md_unit?: string;
  
  // MDTS Phase
  mdts_actual_end_date?: string;
  mdts_actual_progress?: number;
  mdts_actual_start_date?: string;
  mdts_actual_value?: number;
  mdts_plan_end_date?: string;
  mdts_plan_progress?: number;
  mdts_plan_qty?: number;
  mdts_plan_start_date?: string;
  mdts_unit?: string;
  
  // MO Phase
  mo_actual_end_date?: string;
  mo_actual_progress?: number;
  mo_actual_start_date?: string;
  mo_actual_value?: number;
  mo_plan_end_date?: string;
  mo_plan_progress?: number;
  mo_plan_qty?: number;
  mo_plan_start_date?: string;
  mo_unit?: string;
  
  // MOS Phase
  mos_actual_end_date?: string;
  mos_actual_progress?: number;
  mos_actual_start_date?: string;
  mos_actual_value?: number;
  mos_plan_end_date?: string;
  mos_plan_progress?: number;
  mos_plan_qty?: number;
  mos_plan_start_date?: string;
  mos_unit?: string;
  
  // MS Phase
  ms_actual_end_date?: string;
  ms_actual_progress?: number;
  ms_actual_start_date?: string;
  ms_actual_value?: number;
  ms_plan_end_date?: string;
  ms_plan_progress?: number;
  ms_plan_qty?: number;
  ms_plan_start_date?: string;
  ms_unit?: string;
  
  // MWH Phase
  mwh_actual_end_date?: string;
  mwh_actual_progress?: number;
  mwh_actual_start_date?: string;
  mwh_actual_value?: number;
  mwh_plan_end_date?: string;
  mwh_plan_progress?: number;
  mwh_plan_qty?: number;
  mwh_plan_start_date?: string;
  mwh_unit?: string;
  
  // PIK Phase
  pik_actual_end_date?: string;
  pik_actual_progress?: number;
  pik_actual_start_date?: string;
  pik_actual_value?: number;
  pik_plan_end_date?: string;
  pik_plan_progress?: number;
  pik_plan_qty?: number;
  pik_plan_start_date?: string;
  pik_unit?: string;
  
  // PK Phase
  pk_actual_end_date?: string;
  pk_actual_progress?: number;
  pk_actual_start_date?: string;
  pk_actual_value?: number;
  pk_plan_end_date?: string;
  pk_plan_progress?: number;
  pk_plan_qty?: number;
  pk_plan_start_date?: string;
  pk_unit?: string;
  
  // PTH Phase
  pth_actual_end_date?: string;
  pth_actual_progress?: number;
  pth_actual_start_date?: string;
  pth_actual_value?: number;
  pth_plan_end_date?: string;
  pth_plan_progress?: number;
  pth_plan_qty?: number;
  pth_plan_start_date?: string;
  pth_unit?: string;
  
  // Survey Phase
  survey_actual_end_date?: string;
  survey_actual_progress?: number;
  survey_actual_start_date?: string;
  survey_actual_value?: number;
  survey_plan_end_date?: string;
  survey_plan_progress?: number;
  survey_plan_qty?: number;
  survey_plan_start_date?: string;
  survey_unit?: string;
  
  // TC Phase
  tc_actual_end_date?: string;
  tc_actual_progress?: number;
  tc_actual_start_date?: string;
  tc_actual_value?: number;
  tc_plan_end_date?: string;
  tc_plan_progress?: number;
  tc_plan_qty?: number;
  tc_plan_start_date?: string;
  tc_unit?: string;
  
  created_at?: string;
  updated_at?: string;
}

class HierarchyService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all hierarchies
   */
  async getAllHierarchies(projectId?: string): Promise<HierarchyResponse[]> {
    const url = projectId 
      ? `${this.baseUrl}/hierarchies?project_id=${projectId}`
      : `${this.baseUrl}/hierarchies`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hierarchies: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get hierarchy by ID
   */
  async getHierarchyById(id: string): Promise<HierarchyResponse> {
    const response = await fetch(`${this.baseUrl}/hierarchies/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hierarchy: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Create hierarchy
   */
  async createHierarchy(data: Partial<HierarchyResponse>): Promise<HierarchyResponse> {
    const token = localStorage.getItem('auth_token');
    console.log('Creating hierarchy with token:', token ? 'Token exists' : 'No token found');
    console.log('Request body:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${this.baseUrl}/hierarchies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    console.log('Create hierarchy response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create hierarchy error response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { error: errorText || 'Unknown error' };
      }
      
      console.error('Create hierarchy parsed error:', error);
      throw new Error(error.error || error.message || `Failed to create hierarchy: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update hierarchy
   */
  async updateHierarchy(id: string, data: Partial<HierarchyResponse>): Promise<HierarchyResponse> {
    const response = await fetch(`${this.baseUrl}/hierarchies/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update hierarchy: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Delete hierarchy
   */
  async deleteHierarchy(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/hierarchies/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete hierarchy: ${response.status}`);
    }
  }

  /**
   * Upload Excel file for hierarchy
   * Backend will read only "KKP OSP" sheet from the Excel file
   */
  async uploadExcel(file: File): Promise<{ message: string; count: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheet_name', 'KKP OSP'); // Specify which sheet to read

    const response = await fetch(`${this.baseUrl}/hierarchies/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`,
        // Note: Don't set Content-Type for FormData, browser will set it automatically with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to upload Excel: ${response.status}`);
    }

    return await response.json();
  }
}

export const hierarchyService = new HierarchyService();
