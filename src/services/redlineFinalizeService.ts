import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const buildUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;

export interface RedlineItem {
  id?: string;
  span_id: string;
  link_id: string;
  source_type: 'survey' | 'manual' | 'auto_span_start' | 'auto_span_end' | 'auto_slack_wrapper';
  source_id?: string | null;
  designator: string;
  length: number;
  offset_from: number;
  offset_to: number;
  redline: number;
  sequence: number;
  is_editable: boolean;
  is_edited: boolean;
  original_designator?: string | null;
  original_length?: number | null;
  metadata?: string | null;
}

export interface FinalizedRedlineItem extends RedlineItem {
  created_at: string;
  updated_at: string;
  finalized_at: string;
  finalized_by?: any;
}

export interface FinalizeRedlineRequest {
  span_id: string;
  redline_items: RedlineItem[];
}

export interface FinalizeRedlineResponse {
  success: boolean;
  message: string;
  span_id: string;
  items_finalized: number;
  finalized_at: string;
}

class RedlineFinalizeService {
  /**
   * Get redline data by project ID (working data from redline table)
   */
  async getRedlineByProject(projectId: string): Promise<any[]> {
    console.log('🔄 Fetching redline for project:', projectId);
    
    const response = await fetch(buildUrl(`/projects/${projectId}/redline`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch redline' }));
      console.error('❌ Get redline error:', error);
      throw new Error(error.error || 'Failed to fetch redline');
    }

    const data = await response.json();
    console.log('✅ Redline fetched:', data.length, 'spans');
    return data;
  }

  /**
   * Finalize redline data - Save to redline_drm table
   */
  async finalizeRedline(request: FinalizeRedlineRequest): Promise<FinalizeRedlineResponse> {
    const token = authService.getToken();
    
    console.log('🔄 Finalizing redline for span:', request.span_id);
    console.log('📊 Items to finalize:', request.redline_items.length);
    
    const response = await fetch(buildUrl('/redline/finalize'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to finalize redline' }));
      console.error('❌ Finalize redline error:', error);
      throw new Error(error.error || 'Failed to finalize redline');
    }

    const data = await response.json();
    console.log('✅ Redline finalized:', data);
    return data;
  }

  /**
   * Get finalized redline data for a span
   */
  async getFinalizedRedline(spanId: string): Promise<FinalizedRedlineItem[]> {
    console.log('🔄 Fetching finalized redline for span:', spanId);
    
    const response = await fetch(buildUrl(`/redline/finalized/${spanId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No finalized redline found for span:', spanId);
        return [];
      }
      const error = await response.json().catch(() => ({ error: 'Failed to get finalized redline' }));
      console.error('❌ Get finalized redline error:', error);
      throw new Error(error.error || 'Failed to get finalized redline');
    }

    const data = await response.json();
    console.log('✅ Finalized redline fetched:', data.length, 'items');
    return data;
  }

  /**
   * Update a finalized redline item
   */
  async updateFinalizedRedlineItem(
    itemId: string, 
    updates: { designator?: string; length?: number }
  ): Promise<FinalizedRedlineItem> {
    const token = authService.getToken();
    
    console.log('🔄 Updating finalized redline item:', itemId, updates);
    
    const response = await fetch(buildUrl(`/redline/finalized-item/${itemId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update finalized redline' }));
      console.error('❌ Update finalized redline error:', error);
      throw new Error(error.error || 'Failed to update finalized redline');
    }

    const data = await response.json();
    console.log('✅ Finalized redline item updated:', data);
    return data;
  }

  /**
   * Delete a finalized redline item
   * Note: Survey items cannot be deleted
   */
  async deleteFinalizedRedlineItem(itemId: string): Promise<void> {
    const token = authService.getToken();
    
    console.log('🔄 Deleting finalized redline item:', itemId);
    
    const response = await fetch(buildUrl(`/redline/finalized-item/${itemId}`), {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete finalized redline' }));
      console.error('❌ Delete finalized redline error:', error);
      throw new Error(error.error || 'Failed to delete finalized redline');
    }

    console.log('✅ Finalized redline item deleted');
  }
}

export const redlineFinalizeService = new RedlineFinalizeService();
