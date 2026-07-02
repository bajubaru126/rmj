import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

export interface MatrixSpanItem {
  id?: { tb: string; id: { String: string } };
  offset: number;
  offset_from: number;
  offset_to: number;
  length: number | null;
  depth: number;
  location: string;
  designator: string;
  // Calculated fields
  slack_berbayar?: number;
  fo_total?: number;
  slack_tidak_berbayar?: number;
  tol_2_persen?: number;
  pengadaan?: number;
  // Position counts
  bm?: number | null;
  s3?: number | null;
  ds?: number | null;
  bss?: number | null;
  bts?: number | null;
  da?: number | null;
  hps1?: number | null;
  hps2?: number | null;
  // Dynamic designator child fields (e.g., "TC-SM-48", "DD-BM-100-1", etc.)
  [key: string]: any;
}

export interface MatrixSpan {
  id?: { tb: string; id: { String: string } };
  span_name: string;
  span_items: MatrixSpanItem[];
  // Total fields
  total_length?: number;
  total_slack_berbayar?: number;
  total_fo_total?: number;
  total_slack_tidak_berbayar?: number;
  total_tol_2_persen?: number;
  total_pengadaan?: number;
  // Total position counts
  total_bm?: number;
  total_s3?: number;
  total_ds?: number;
  total_bss?: number;
  total_bts?: number;
  total_da?: number;
  total_hps1?: number;
  total_hps2?: number;
  // Dynamic total fields per designator (e.g., "total_TC-SM-48")
  [key: string]: any;
}

export interface MatrixResponse {
  spans: MatrixSpan[];
  // Grand totals
  grand_total_length?: number;
  grand_total_slack_berbayar?: number;
  grand_total_fo_total?: number;
  grand_total_slack_tidak_berbayar?: number;
  grand_total_tol_2_persen?: number;
  grand_total_pengadaan?: number;
  grand_total_bm?: number;
  grand_total_s3?: number;
  grand_total_ds?: number;
  grand_total_bss?: number;
  grand_total_bts?: number;
  grand_total_da?: number;
  grand_total_hps1?: number;
  grand_total_hps2?: number;
  // Dynamic grand_total fields for designators
  [key: string]: any;
}

class MatrixService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get matrix data for a project
   * @param projectId - The project ID
   * @returns Matrix data with spans and span items including totals
   */
  async getMatrixByProjectId(projectId: string): Promise<MatrixResponse> {
    const token = authService.getToken();
    
    console.log('🔄 Fetching matrix for project:', projectId);
    
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/matrix`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Matrix fetch error:', errorText);
      throw new Error(`Failed to fetch matrix: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Matrix data received:', {
      spans: data.spans?.length || 0,
      totalItems: data.spans?.reduce((sum: number, span: MatrixSpan) => sum + (span.span_items?.length || 0), 0) || 0
    });
    
    return data;
  }
}

export const matrixService = new MatrixService();
