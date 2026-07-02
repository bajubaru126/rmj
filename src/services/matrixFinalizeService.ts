import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

export interface MatrixItem {
  item_id?: string;
  offset: number;
  offset_from: number;
  offset_to: number;
  length?: number;
  depth: number;
  location: string;
  designator: string;
  slack_berbayar?: number;
  fo_total?: number;
  slack_tidak_berbayar?: number;
  tol_2_persen: number;
  pengadaan: number;
  bm?: number;
  s3?: number;
  ds?: number;
  bss?: number;
  bts?: number;
  da?: number;
  hps1?: number;
  hps2?: number;
  designator_mapping: { [key: string]: number };
}

export interface MatrixSpan {
  span_id: string;
  span_name: string;
  span_items: MatrixItem[];
}

export interface FinalizeMatrixRequest {
  project_id: string;
  spans: MatrixSpan[];
}

export interface FinalizeMatrixResponse {
  success: boolean;
  message: string;
  project_id: string;
  spans_finalized: number;
  items_finalized: number;
  finalized_at: string;
}

export interface FinalizedMatrixItem extends MatrixItem {
  id: string;
  project_id: string;
  span_id: string;
  span_name: string;
  created_at: string;
  updated_at: string;
  finalized_at: string;
  finalized_by: any;
  [key: string]: any; // Add index signature to allow dynamic field access
}

class MatrixFinalizeService {
  /**
   * Get matrix data by project ID (working data from matrix calculation)
   */
  async getMatrixByProject(projectId: string): Promise<any[]> {
    console.log('🔄 Fetching matrix for project:', projectId);
    
    try {
      // Use the existing matrixService to get matrix data
      const { matrixService } = await import('./matrixService');
      const matrixResponse = await matrixService.getMatrixByProjectId(projectId);
      
      console.log('✅ Matrix response received:', matrixResponse);
      
      // Extract spans from the response
      const spans = matrixResponse.spans || [];
      console.log('✅ Matrix spans extracted:', spans.length, 'spans');
      
      return spans;
    } catch (error) {
      console.error('❌ Get matrix error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch matrix');
    }
  }

  /**
   * Finalize matrix data - Save to matrix_drm table
   */
  async finalizeMatrix(request: FinalizeMatrixRequest): Promise<FinalizeMatrixResponse> {
    const token = authService.getToken();
    
    console.log('🔄 Finalizing matrix for project:', request.project_id);
    console.log('📊 Spans to finalize:', request.spans.length);
    console.log('📋 Full request payload:', JSON.stringify(request, null, 2));
    
    const response = await fetch(buildUrl('/matrix/finalize'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(request),
    });

    console.log('📡 Finalize Matrix API response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Failed to finalize matrix';
      try {
        const error = await response.json();
        console.error('❌ Finalize matrix error response:', error);
        errorMessage = error.error || error.message || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Matrix finalized successfully:', data);
    return data;
  }

  /**
   * Get finalized matrix data for a project
   */
  async getFinalizedMatrix(projectId: string): Promise<FinalizedMatrixItem[]> {
    console.log('🔄 Fetching finalized matrix for project:', projectId);
    
    const response = await fetch(buildUrl(`/matrix/finalized/${projectId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Get finalized matrix API response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No finalized matrix found for project:', projectId);
        return [];
      }
      
      let errorMessage = 'Failed to get finalized matrix';
      try {
        const error = await response.json();
        console.error('❌ Get finalized matrix error response:', error);
        errorMessage = error.error || error.message || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Finalized matrix fetched:', data.length, 'items');
    return data;
  }

  /**
   * Get finalized matrix data for a span
   */
  async getFinalizedMatrixBySpan(spanId: string): Promise<FinalizedMatrixItem[]> {
    console.log('🔄 Fetching finalized matrix for span:', spanId);
    
    const response = await fetch(buildUrl(`/matrix/finalized/span/${spanId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Get finalized matrix by span API response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No finalized matrix found for span:', spanId);
        return [];
      }
      
      let errorMessage = 'Failed to get finalized matrix';
      try {
        const error = await response.json();
        console.error('❌ Get finalized matrix error response:', error);
        errorMessage = error.error || error.message || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Finalized matrix by span fetched:', data.length, 'items');
    return data;
  }

  /**
   * Update a finalized matrix item
   */
  async updateFinalizedMatrixItem(
    itemId: string, 
    updates: Partial<FinalizedMatrixItem>
  ): Promise<FinalizedMatrixItem> {
    const token = authService.getToken();
    
    console.log('🔄 Updating finalized matrix item:', itemId, updates);
    
    const response = await fetch(buildUrl(`/matrix/finalized-item/${itemId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update finalized matrix' }));
      console.error('❌ Update finalized matrix error:', error);
      throw new Error(error.error || 'Failed to update finalized matrix');
    }

    const data = await response.json();
    console.log('✅ Finalized matrix item updated:', data);
    return data;
  }

  /**
   * Delete a finalized matrix item
   */
  async deleteFinalizedMatrixItem(itemId: string): Promise<void> {
    const token = authService.getToken();
    
    console.log('🔄 Deleting finalized matrix item:', itemId);
    
    const response = await fetch(buildUrl(`/matrix/finalized-item/${itemId}`), {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete finalized matrix' }));
      console.error('❌ Delete finalized matrix error:', error);
      throw new Error(error.error || 'Failed to delete finalized matrix');
    }

    console.log('✅ Finalized matrix item deleted');
  }
}

export const matrixFinalizeService = new MatrixFinalizeService();