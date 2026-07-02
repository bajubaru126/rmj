// API Configuration
// Centralized configuration for all API endpoints

export const API_CONFIG = {
  // Base URL for the API server
  // Use localhost for development, production URL for deployed version
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
  
  // API version
  VERSION: 'v1',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  
  // Issue endpoints
  ISSUES: {
    BASE: '/projects',
    BY_PROJECT: (projectId: string) => `/projects/${projectId}/issues`,
    BY_ID: (issueId: string) => `/projects/issues/${issueId}`,
  },
  
  // Attribute endpoints
  ATTRIBUTES: {
    BASE: '/attributes',
    BY_ID: (id: string) => `/attributes/${id}`,
  },
  
  // BOQ endpoints
  BOQ: {
    BASE: '/boq',
    BY_ID: (id: string) => `/boq/${id}`,
  },
  
  // Ruas/Project endpoints (FE uses "Ruas", BE uses "Project")
  RUAS: {
    BASE: '/projects',
    BY_ID: (id: string) => `/projects/${id}`,
    UPLOAD_DRM: (ruasId: string) => `/projects/${ruasId}/drm`,
    UPLOAD_KML: (cellId: string) => `/projects/cells/${cellId}/kml`,
  },
  
  // Segmentasi endpoints (under projects)
  SEGMENTASI: {
    BY_PROJECT: (projectId: string) => `/projects/${projectId}/segments`,
    BY_ID: (id: string) => `/projects/segments/${id}`,
  },
  
  // Cell endpoints (under projects)
  CELLS: {
    BY_SEGMENT: (segmentId: string) => `/projects/segments/${segmentId}/cells`,
    BY_ID: (id: string) => `/projects/cells/${id}`,
    KML: (cellId: string) => `/projects/cells/${cellId}/kml`,
  },
  
  // AI endpoints
  AI: {
    ANALYZE: '/ai/analyze',
    HEALTH: '/ai/health',
  },
  
  // Dashboard endpoints
  DASHBOARD: {
    OPERATIONAL_PROGRESS: '/dashboard/operational-progress',
    SUMMARY: '/dashboard/summary',
  },
  
  // Actual Date endpoints
  ACTUAL_DATE: {
    BASE: '/actual-dates',
    BY_ID: (id: string) => `/actual-dates/${id}`,
    BY_PROJECT: (projectId: string) => `/actual-dates/project/${projectId}`,
    BY_PROJECT_AND_LINK: (projectId: string, linkId: string) => 
      `/actual-dates/project/${projectId}/link/${linkId}`,
  },
};

// Helper function to build full URL
export const buildUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Default headers for API requests
export const getDefaultHeaders = (token?: string | null): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// API Error class for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with error handling
export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> => {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getDefaultHeaders(token),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    
    throw new ApiError(
      errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }
  
  // Handle empty responses (like DELETE)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return {} as T;
};
