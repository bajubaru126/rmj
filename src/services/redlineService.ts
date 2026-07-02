import { buildUrl, getDefaultHeaders, ApiError } from '@/config/api';
import { authService } from './authService';

// Types based on backend response from /projects/{id}/redline endpoint
export interface SpanId {
  tb: string;
  id: {
    String: string;
  };
}

// Span Item from Redline API (SpanItemWithLength from backend)
export interface SpanItem {
  id: SpanId;
  span_id: SpanId;
  item_name: string | null;     // Name of the item (e.g., "TC48", "Joint Closure")
  length: number | null;        // Length from table 'length' (based on item_to)
  redline: number;              // Cumulative redline calculation (sorted by created_at ASC)
  is_multiple: boolean | null;  // Flag for surveys created with multiple item names
  batch_id: string | null;      // Batch identifier for surveys created together
  source_type: string | null;   // "survey" | "manual" | "auto_*"
  source_id: SpanId | null;     // Reference to span_items if survey
}

export interface Span {
  id: SpanId;
  project_id: SpanId;
  span_name: string;
  link_from?: string;          // Parsed from span_name (e.g., "SUMENEP")
  link_to?: string;            // Parsed from span_name (e.g., "JT01")
  span_items: SpanItem[];      // Sorted by created_at ASC (earliest to latest)
}

// Helper function to extract ID string from SpanId
export const extractSpanId = (id: SpanId | string | any): string => {
  // Handle object format from backend
  if (typeof id === 'object' && id !== null) {
    // Format: {String: 'abc123'}
    if ('String' in id) {
      return id.String;
    }
    // Format: {tb: 'span', id: 'abc123'} or {tb: 'span', id: {String: 'abc123'}}
    if ('id' in id) {
      const innerId = id.id;
      if (typeof innerId === 'string') {
        return innerId.includes(':') ? innerId.split(':')[1] : innerId;
      }
      if (typeof innerId === 'object' && 'String' in innerId) {
        return innerId.String;
      }
    }
  }
  
  // Handle string format
  if (typeof id === 'string') {
    // Handle "span:abc123" format
    return id.includes(':') ? id.split(':')[1] : id;
  }
  
  return String(id);
};

// Helper to format project ID for API calls (remove prefix if exists)
const formatProjectIdForApi = (id: string): string => {
  if (id.includes(':')) {
    return id.split(':')[1];
  }
  return id;
};

// Response types for new manual redline API
export interface ManualRedlineResponse {
  redline_item: {
    id: SpanId;
    source_type: string;
    source_id: SpanId | null;
    designator: string;
    length: number;
    offset_from: number;
    offset_to: number;
    redline: number;
    sequence: number;
    is_editable: boolean;
  };
  span_summary: {
    total_length_before: number;
    total_length_after: number;
    delta: number;
    warning?: string;
  };
}

export interface SpanSummary {
  span_id: string;
  span_name: string;
  total_length: number;
  item_count: number;
  breakdown: {
    survey_items: number;
    survey_length: number;
    manual_items: number;
    manual_length: number;
    auto_items: number;
    auto_length: number;
  };
}

export interface UpdateRedlineRequest {
  designator?: string;
  length?: number;
}

export interface CreateManualRedlineRequest {
  span_id: string;
  designator: string;
  length: number;
  insert_after_sequence: number;
}

class RedlineService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return getDefaultHeaders(token);
  }

  /**
   * Get all redline data (spans with nested span items) for a project
   * Uses the new /redline endpoint that includes length and redline calculations
   * @param projectId - Project ID (without "project:" prefix)
   */
  async getRedlineByProject(projectId: string): Promise<Span[]> {
    try {
      const formattedId = formatProjectIdForApi(projectId);
      console.log('🔄 Fetching redline data for project:', formattedId);
      
      // Use the new /redline endpoint that includes length and redline calculations
      const response = await fetch(buildUrl(`/projects/${formattedId}/redline`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch redline data' }));
        throw new ApiError(error.message || 'Failed to fetch redline data', response.status, error);
      }

      const spans: Span[] = await response.json();
      
      console.log('✅ Redline Data Summary:');
      console.log(`  📊 Total spans: ${spans.length}`);
      
      spans.forEach((span, idx) => {
        const itemCount = span.span_items?.length || 0;
        console.log(`  ${idx + 1}. ${span.span_name}: ${itemCount} items`);
        
        if (itemCount > 0) {
          const firstItem = span.span_items[0];
          const lastItem = span.span_items[itemCount - 1];
          console.log(`     First: ${firstItem.item_name} (length: ${firstItem.length}m, redline: ${firstItem.redline}m)`);
          console.log(`     Last: ${lastItem.item_name} (length: ${lastItem.length}m, redline: ${lastItem.redline}m)`);
          console.log(`     ℹ️  Items sorted by created_at ASC (earliest to latest)`);
        }
      });

      return spans;
    } catch (error) {
      console.error('❌ Error fetching redline data:', error);
      throw error;
    }
  }

  /**
   * Create manual redline item
   * @param data - Manual redline creation data
   */
  async createManualRedline(data: CreateManualRedlineRequest): Promise<ManualRedlineResponse> {
    try {
      console.log('🔄 Creating manual redline:', data);
      
      const response = await fetch(buildUrl('/redline/manual'), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create manual redline' }));
        throw new ApiError(error.message || 'Failed to create manual redline', response.status, error);
      }

      const result = await response.json();
      console.log('✅ Manual redline created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating manual redline:', error);
      throw error;
    }
  }

  /**
   * Update redline item
   * @param redlineId - Redline item ID
   * @param data - Update data
   */
  async updateRedlineItem(redlineId: string, data: UpdateRedlineRequest): Promise<any> {
    try {
      console.log('🔄 Updating redline item:', redlineId, data);
      
      const response = await fetch(buildUrl(`/redline/${redlineId}`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update redline item' }));
        throw new ApiError(error.message || 'Failed to update redline item', response.status, error);
      }

      const result = await response.json();
      console.log('✅ Redline item updated successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating redline item:', error);
      throw error;
    }
  }

  /**
   * Delete redline item
   * @param redlineId - Redline item ID
   */
  async deleteRedlineItem(redlineId: string): Promise<boolean> {
    try {
      console.log('🔄 Deleting redline item:', redlineId);
      
      const response = await fetch(buildUrl(`/redline/${redlineId}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json().catch(() => ({ message: 'Failed to delete redline item' }));
        throw new ApiError(error.message || 'Failed to delete redline item', response.status, error);
      }

      console.log('✅ Redline item deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting redline item:', error);
      throw error;
    }
  }

  /**
   * Get span summary
   * @param spanId - Span ID
   */
  async getSpanSummary(spanId: string): Promise<SpanSummary> {
    try {
      console.log('🔄 Getting span summary for:', spanId);
      
      const response = await fetch(buildUrl(`/spans/${spanId}/summary`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get span summary' }));
        throw new ApiError(error.message || 'Failed to get span summary', response.status, error);
      }

      const result = await response.json();
      console.log('✅ Span summary retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting span summary:', error);
      throw error;
    }
  }

  /**
   * Regenerate redline for project
   * @param projectId - Project ID
   */
  async regenerateRedline(projectId: string): Promise<any> {
    try {
      const formattedId = formatProjectIdForApi(projectId);
      console.log('🔄 Regenerating redline for project:', formattedId);
      
      const response = await fetch(buildUrl(`/redline/regenerate/${formattedId}`), {
        method: 'POST',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to regenerate redline' }));
        throw new ApiError(error.message || 'Failed to regenerate redline', response.status, error);
      }

      const result = await response.json();
      console.log('✅ Redline regenerated successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error regenerating redline:', error);
      throw error;
    }
  }
}

export const redlineService = new RedlineService();
