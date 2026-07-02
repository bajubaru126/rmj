// Surveyor Assignment Service
// Handles surveyor assignment to links

import { API_ENDPOINTS, buildUrl, getDefaultHeaders } from '@/config/api';

export interface SurveyorAssignment {
  id: string;
  link_id: string;
  surveyor_id: string;
  assigned_by: string;
  status: string;
  assigned_at?: string;
  expires_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  notes?: string;
}

export interface AssignSurveyorRequest {
  surveyor_id: string;
  expires_at: string; // ISO 8601 datetime
  notes?: string;
}

export interface AssignedLink {
  id: string;
  name: string;
  project_id: string;
  // ... other link fields
}

class SurveyorAssignmentService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return getDefaultHeaders(token);
  }

  /**
   * Assign surveyor to a link (Admin only)
   */
  async assignSurveyorToLink(
    linkId: string, 
    surveyorId: string,
    expiresAt: string,
    notes?: string
  ): Promise<SurveyorAssignment> {
    try {
      const response = await fetch(buildUrl(`/links/${linkId}/assign-surveyor`), {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify({ 
          surveyor_id: surveyorId,
          expires_at: expiresAt,
          notes: notes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign surveyor');
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning surveyor:', error);
      throw error;
    }
  }

  /**
   * Unassign surveyor from a link (Admin only)
   */
  async unassignSurveyorFromLink(linkId: string, surveyorId: string): Promise<void> {
    try {
      const response = await fetch(buildUrl(`/links/${linkId}/surveyors/${surveyorId}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unassign surveyor');
      }
    } catch (error) {
      console.error('Error unassigning surveyor:', error);
      throw error;
    }
  }

  /**
   * Get all surveyors assigned to a link (Admin or PM)
   */
  async getLinkSurveyors(linkId: string): Promise<SurveyorAssignment[]> {
    try {
      const response = await fetch(buildUrl(`/links/${linkId}/surveyors`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get link surveyors');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting link surveyors:', error);
      throw error;
    }
  }

  /**
   * Get all links assigned to current surveyor (Surveyor only)
   * Returns link objects directly, not assignment objects
   */
  async getMyAssignedLinks(): Promise<AssignedLink[]> {
    try {
      const response = await fetch(buildUrl('/surveyors/me/links'), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get assigned links');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting assigned links:', error);
      throw error;
    }
  }

  /**
   * Extend assignment expiry date (Admin only)
   */
  async extendAssignment(assignmentId: string, expiresAt: string): Promise<SurveyorAssignment> {
    try {
      const response = await fetch(buildUrl(`/surveyor-assignments/${assignmentId}/extend`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify({ expires_at: expiresAt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extend assignment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error extending assignment:', error);
      throw error;
    }
  }

  /**
   * Revoke assignment (Admin only)
   */
  async revokeAssignment(assignmentId: string, notes?: string): Promise<SurveyorAssignment> {
    try {
      const response = await fetch(buildUrl(`/surveyor-assignments/${assignmentId}/revoke`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify({ notes: notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke assignment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error revoking assignment:', error);
      throw error;
    }
  }

  /**
   * Get all assignments (Admin only)
   */
  async getAllAssignments(): Promise<SurveyorAssignment[]> {
    try {
      const response = await fetch(buildUrl('/surveyor-assignments'), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get assignments');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments expiring soon (Admin only)
   */
  async getExpiringSoonAssignments(days: number = 7): Promise<SurveyorAssignment[]> {
    try {
      const response = await fetch(buildUrl(`/surveyor-assignments/expiring-soon?days=${days}`), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get expiring assignments');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting expiring assignments:', error);
      throw error;
    }
  }
}

export const surveyorAssignmentService = new SurveyorAssignmentService();
