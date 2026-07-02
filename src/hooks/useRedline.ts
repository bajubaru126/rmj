import { useState, useEffect } from 'react';
import { 
  redlineService, 
  Span, 
  SpanItem, 
  extractSpanId, 
  ManualRedlineResponse, 
  SpanSummary, 
  CreateManualRedlineRequest, 
  UpdateRedlineRequest 
} from '@/services/redlineService';

export const useRedline = (projectId?: string) => {
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch redline data for a project
   */
  const fetchRedline = async (projId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 [useRedline] Fetching redline for project ID:', projId);
      const data = await redlineService.getRedlineByProject(projId);
      console.log('✅ [useRedline] Received spans:', data.length);
      if (data.length > 0) {
        console.log('  First span:', data[0].span_name);
        console.log('  Span items count:', data[0].span_items?.length || 0);
      }
      setSpans(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch redline data';
      setError(errorMsg);
      console.error('❌ [useRedline] Error fetching redline:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create manual redline item
   */
  const createManualRedline = async (data: CreateManualRedlineRequest): Promise<ManualRedlineResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await redlineService.createManualRedline(data);
      
      // Refetch data to get updated state with recalculated offsets
      if (projectId) {
        await fetchRedline(projectId);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create manual redline';
      setError(errorMsg);
      console.error('Error creating manual redline:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update redline item
   */
  const updateRedlineItem = async (redlineId: string, data: UpdateRedlineRequest): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const result = await redlineService.updateRedlineItem(redlineId, data);
      
      // Refetch data to get updated state with recalculated offsets
      if (projectId) {
        await fetchRedline(projectId);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update redline item';
      setError(errorMsg);
      console.error('Error updating redline item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete redline item
   */
  const deleteRedlineItem = async (redlineId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await redlineService.deleteRedlineItem(redlineId);
      
      // Refetch data to get updated state with recalculated offsets
      if (projectId) {
        await fetchRedline(projectId);
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete redline item';
      setError(errorMsg);
      console.error('Error deleting redline item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get span summary
   */
  const getSpanSummary = async (spanId: string): Promise<SpanSummary> => {
    try {
      return await redlineService.getSpanSummary(spanId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get span summary';
      setError(errorMsg);
      console.error('Error getting span summary:', err);
      throw err;
    }
  };

  /**
   * Regenerate redline
   */
  const regenerateRedline = async (): Promise<any> => {
    if (!projectId) {
      throw new Error('No project ID provided');
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await redlineService.regenerateRedline(projectId);
      
      // Refetch data to get updated state
      await fetchRedline(projectId);
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to regenerate redline';
      setError(errorMsg);
      console.error('Error regenerating redline:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when projectId changes
  useEffect(() => {
    if (projectId) {
      console.log('🔄 [useRedline] Project ID changed, fetching redline data:', projectId);
      fetchRedline(projectId);
    } else {
      console.log('⚠️ [useRedline] No project ID provided');
    }
  }, [projectId]);

  return {
    spans,
    loading,
    error,
    fetchRedline,
    refetch: () => projectId ? fetchRedline(projectId) : Promise.resolve([]),
    createManualRedline,
    updateRedlineItem,
    deleteRedlineItem,
    getSpanSummary,
    regenerateRedline,
  };
};
