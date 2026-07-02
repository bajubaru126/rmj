// Span Service for API calls
import { API_CONFIG } from '@/config/api';

export interface GeoJSONGeometry {
  type: 'LineString';
  coordinates: number[][];
}

export interface CreateSpanRequest {
  project_id: string;
  span_name: string;
  link_id?: string; // New: SS/Link ID
  geometry?: GeoJSONGeometry;
  auto_assign_surveys?: boolean;
  distance_threshold?: number;
}

export interface BulkCreateSpanRequest {
  spans: CreateSpanRequest[];
}

export interface BulkSpanItem {
  project_id: string;
  span_name: string;
  link_id?: string;
  start_point: [number, number]; // [longitude, latitude]
  end_point: [number, number]; // [longitude, latitude]
  snap_to_route?: boolean;
  auto_assign_surveys?: boolean;
  distance_threshold?: number;
}

export interface BulkCreateSpanResponse {
  success_count: number;
  failed_count: number;
  spans: SpanResponse[];
  errors: string[];
}

export interface SpanResponse {
  id: { tb: string; id: string };
  project_id: { tb: string; id: string };
  span_name: string;
  geometry?: GeoJSONGeometry;
  created_at?: string; // Add created_at field
  updated_at?: string; // Add updated_at field
}

export interface CreateSpanItemRequest {
  span_id: string;
  item_name: string;
  offset: number;
  depth: number;
  date: string;
  location: string;
  ss_link: string;
  latitude: number;
  longitude: number;
  soil_type: string;
}

export interface SpanItemResponse {
  id: { tb: string; id: string | { String: string } };
  span_id: { tb: string; id: string | { String: string } };
  project_id?: { tb: string; id: string | { String: string } };
  item_name: string | null;
  offset: number | null;
  depth: number | null;
  date: string;
  location: string;
  ss_link: string | { tb: string; id: string | { String: string } }; // Can be string or object
  latitude: number;
  longitude: number;
  soil_type?: string;
  submit_via?: string;
  created_at: string;
  created_by?: { tb: string; id: string | { String: string } };
  updated_at: string | null;
}

export interface SpanItemsResponse {
  span_items: SpanItemResponse[];
  kml_documents: any[]; // You can define KML document type later
}

class SpanService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get all spans for a project
   */
  async getSpansByProjectId(projectId: string): Promise<SpanResponse[]> {
    try {
      console.log('📡 Fetching spans for project ID:', projectId);
      console.log('📡 Full URL:', `${this.baseUrl}/projects/${projectId}/spans`);
      
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/spans`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      // If 404, return empty array (project has no spans yet)
      if (response.status === 404) {
        console.log('ℹ️ No spans found for this project (404)');
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch spans:', errorText);
        throw new Error(`Failed to fetch spans: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Spans data received:', data);
      
      // Ensure we return an array
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        // If the response is wrapped in an object, try to extract the array
        return data.spans || data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('💥 Exception in getSpansByProjectId:', error);
      // If it's a network error, return empty array instead of throwing
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error - backend might be down');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get all spans for a project filtered by link_id
   */
  async getSpansByProjectIdAndLinkId(projectId: string, linkId: string): Promise<SpanResponse[]> {
    try {
      console.log('📡 Fetching spans for project ID:', projectId, 'and link ID:', linkId);
      const url = `${this.baseUrl}/projects/${projectId}/spans?link_id=${linkId}`;
      console.log('📡 Full URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      // If 404, return empty array (no spans for this link yet)
      if (response.status === 404) {
        console.log('ℹ️ No spans found for this link (404)');
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch spans:', errorText);
        throw new Error(`Failed to fetch spans: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Spans data received:', data);
      
      // Ensure we return an array
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        // If the response is wrapped in an object, try to extract the array
        return data.spans || data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('💥 Exception in getSpansByProjectIdAndLinkId:', error);
      // If it's a network error, return empty array instead of throwing
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error - backend might be down');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get the latest span for a project (most recently created)
   * This function fetches all spans and returns the one with the most recent created_at timestamp
   */
  async getLatestSpanByProjectId(projectId: string): Promise<SpanResponse | null> {
    try {
      console.log('📡 Fetching latest span for project ID:', projectId);
      
      // Get all spans first
      const spans = await this.getSpansByProjectId(projectId);
      
      if (!spans || spans.length === 0) {
        console.log('ℹ️ No spans found for this project');
        return null;
      }

      // Sort spans by created_at if available, otherwise use the last one in the array
      let latestSpan = spans[spans.length - 1]; // Default to last span
      
      // If spans have created_at field, sort by it
      const spansWithCreatedAt = spans.filter(span => span.created_at);
      if (spansWithCreatedAt.length > 0) {
        latestSpan = spansWithCreatedAt.sort((a, b) => {
          const dateA = new Date(a.created_at!).getTime();
          const dateB = new Date(b.created_at!).getTime();
          return dateB - dateA; // Descending order (newest first)
        })[0];
      }
      
      console.log('✅ Latest span found:', latestSpan);
      return latestSpan;
    } catch (error) {
      console.error('💥 Exception in getLatestSpanByProjectId:', error);
      return null;
    }
  }

  /**
   * Create a new span (main span)
   */
  async createSpan(
    data: CreateSpanRequest,
    token: string | null
  ): Promise<SpanResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Creating span:', data);

    // Always add snap_to_route: true to the request
    const requestData = {
      ...data,
      snap_to_route: true
    };

    const response = await fetch(`${this.baseUrl}/spans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Span creation failed:', errorText);
      throw new Error(`Failed to create span: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Span created:', result);
    return result;
  }

  /**
   * Create multiple spans at once (bulk operation)
   * This is an all-or-nothing operation - if one fails, all fail
   */
  async createSpansBulk(
    spans: BulkSpanItem[],
    token: string | null
  ): Promise<SpanResponse[]> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Creating spans in bulk:', spans.length, 'spans');

    const requestData = {
      spans: spans
    };

    const response = await fetch(`${this.baseUrl}/spans/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Bulk span creation failed:', errorText);
      throw new Error(`Failed to create spans: ${response.status} - ${errorText}`);
    }

    const result: BulkCreateSpanResponse = await response.json();
    console.log('✅ Spans created in bulk:', result);
    
    // Return the spans array from the response
    return result.spans || [];
  }

  /**
   * Get span by ID
   */
  async getSpanById(spanId: string): Promise<SpanResponse> {
    const response = await fetch(`${this.baseUrl}/spans/${spanId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch span: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update span
   */
  async updateSpan(
    spanId: string,
    data: Partial<CreateSpanRequest>,
    token: string | null
  ): Promise<SpanResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/spans/${spanId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update span: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete span by ID
   */
  async deleteSpan(spanId: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Deleting span:', spanId);

    const response = await fetch(`${this.baseUrl}/spans/${spanId}`, {
      method: 'DELETE',
      headers,
    });

    // 204 No Content is success
    if (response.status === 204) {
      console.log('✅ Span deleted successfully');
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Span deletion failed:', errorText);
      
      if (response.status === 404) {
        throw new Error('Span not found');
      }
      
      throw new Error(`Failed to delete span: ${response.status}`);
    }
  }

  /**
   * Create a new span item
   */
  async createSpanItem(
    data: CreateSpanItemRequest,
    token: string | null
  ): Promise<SpanItemResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Creating span item:', data);

    const response = await fetch(`${this.baseUrl}/span-items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Span item creation failed:', errorText);
      throw new Error(`Failed to create span item: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Span item created:', result);
    return result;
  }

  /**
   * Get all span items for a span
   * Only returns actual span items (where item_name IS NOT NULL)
   */
  async getSpanItems(spanId: string): Promise<SpanItemResponse[]> {
    const response = await fetch(`${this.baseUrl}/spans/${spanId}/items`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch span items: ${response.status}`);
    }

    const data = await response.json();
    
    // Backend returns { span_items: [...], kml_documents: [...] }
    // Extract just the span_items array
    if (data && typeof data === 'object' && 'span_items' in data) {
      return data.span_items || [];
    }
    
    // Fallback: if response is already an array
    if (Array.isArray(data)) {
      return data;
    }
    
    console.warn('⚠️ Unexpected response format from getSpanItems:', data);
    return [];
  }

  /**
   * Get ALL records for a specific span (including surveys with item_name = null)
   * This endpoint does NOT filter by item_name
   */
  async getAllSpanItemsBySpanId(spanId: string): Promise<SpanItemResponse[]> {
    const response = await fetch(`${this.baseUrl}/span-items/by-span/${spanId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch all span items: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get span item by ID
   */
  async getSpanItemById(id: string): Promise<SpanItemResponse> {
    const response = await fetch(`${this.baseUrl}/span-items/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch span item: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update span item
   */
  async updateSpanItem(
    id: string,
    data: Partial<CreateSpanItemRequest>,
    token: string | null
  ): Promise<SpanItemResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/span-items/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update span item: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete span item
   */
  async deleteSpanItem(id: string, token: string | null): Promise<void> {
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/span-items/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete span item: ${response.status}`);
    }
  }

  /**
   * Complete a survey to span item
   * Converts a survey (span item with null item_name) into a full span item
   */
  async completeSurveyToSpanItem(
    data: {
      survey_id: string;
      item_name: string;
      offset: number;
      depth: number;
    },
    token: string | null
  ): Promise<SpanItemResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Completing survey to span item:', data);

    const response = await fetch(`${this.baseUrl}/surveys/complete-to-span-item`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Complete survey failed:', errorText);
      throw new Error(`Failed to complete survey: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Survey completed to span item:', result);
    return result;
  }
}

export const spanService = new SpanService();
