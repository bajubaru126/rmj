// Notification Service
// Handles in-app notifications for surveyor assignments

import { API_ENDPOINTS, buildUrl, getDefaultHeaders } from '@/config/api';

export interface Notification {
  id: string;
  user_id: string;
  type: string; // 'assignment_expiring_soon', 'assignment_expired', etc.
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: {
    assignment_id?: string;
    link_id?: string;
    link_name?: string;
    expires_at?: string;
  };
}

class NotificationService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return getDefaultHeaders(token);
  }

  /**
   * Get all notifications for current user
   */
  async getMyNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(buildUrl('/notifications/me'), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(buildUrl('/notifications/me/unread-count'), {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get unread count');
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(buildUrl(`/notifications/${notificationId}/read`), {
        method: 'PUT',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(buildUrl('/notifications/me/read-all'), {
        method: 'PUT',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark all as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch(buildUrl(`/notifications/${notificationId}`), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<void> {
    try {
      const response = await fetch(buildUrl('/notifications/me'), {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete all notifications');
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
