import { Issue, CreateIssueRequest, UpdateIssueRequest } from '@/types';
import { authService } from './authService';
import { API_ENDPOINTS, buildUrl, getDefaultHeaders } from '@/config/api';

class IssueService {
  private getAuthHeader(): HeadersInit {
    const token = authService.getToken();
    return getDefaultHeaders(token);
  }

  // Get all issues for a project
  async getProjectIssues(projectId: string): Promise<Issue[]> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ISSUES.BY_PROJECT(projectId)), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching issues:', error);
      throw error;
    }
  }

  // Create new issue
  async createIssue(projectId: string, data: CreateIssueRequest): Promise<Issue> {
    try {
      const response = await fetch(buildUrl(API_ENDPOINTS.ISSUES.BY_PROJECT(projectId)), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create issue');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  }

  // Update issue
  async updateIssue(issueId: string, data: UpdateIssueRequest): Promise<Issue> {
    try {
      console.log('Updating issue with ID:', issueId);
      
      // Extract just the ID part if it contains 'issues:' prefix
      const cleanId = issueId.includes(':') ? issueId.split(':')[1] : issueId;
      console.log('Clean ID for update:', cleanId);
      
      const response = await fetch(buildUrl(API_ENDPOINTS.ISSUES.BY_ID(cleanId)), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update issue');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating issue:', error);
      throw error;
    }
  }

  // Delete issue
  async deleteIssue(issueId: string): Promise<void> {
    try {
      console.log('Deleting issue with ID:', issueId);
      
      // Extract just the ID part if it contains 'issues:' prefix
      const cleanId = issueId.includes(':') ? issueId.split(':')[1] : issueId;
      console.log('Clean ID:', cleanId);
      
      const url = buildUrl(API_ENDPOINTS.ISSUES.BY_ID(cleanId));
      console.log('DELETE URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed with response:', errorText);
        throw new Error(`Failed to delete issue: ${response.status} - ${errorText}`);
      }
      
      console.log('Issue deleted successfully');
    } catch (error) {
      console.error('Error deleting issue:', error);
      throw error;
    }
  }
}

export const issueService = new IssueService();
