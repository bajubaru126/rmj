import { useState } from 'react';
import { Issue, CreateIssueRequest, UpdateIssueRequest } from '@/types';
import { issueService } from '@/services/issueService';

export function useIssues(projectId: string) {
  const [data, setData] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await issueService.getProjectIssues(projectId);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load issues';
      setError(errorMessage);
      console.error('Error loading issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const createIssue = async (issueData: CreateIssueRequest) => {
    try {
      setError(null);
      const newIssue = await issueService.createIssue(projectId, issueData);
      setData(prev => [newIssue, ...prev]); // Add to beginning
      return newIssue;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errorMessage);
      throw err;
    }
  };

  const updateIssue = async (issueId: string, issueData: UpdateIssueRequest) => {
    try {
      setError(null);
      const updated = await issueService.updateIssue(issueId, issueData);
      setData(prev => prev.map(item => item.id === issueId ? updated : item));
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update issue';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteIssue = async (issueId: string) => {
    try {
      setError(null);
      await issueService.deleteIssue(issueId);
      setData(prev => prev.filter(item => item.id !== issueId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete issue';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    issues: data,
    loading,
    error,
    loadIssues: loadData,
    createIssue,
    updateIssue,
    deleteIssue,
  };
}
