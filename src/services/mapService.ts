import axios from 'axios';
import { ProjectLocation, ProjectRoute } from '../types/map';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Interface untuk response dari API
interface ApiProject {
  id: { id: string; tb: string };
  name: string;
  region: string;
  status: string;
  no_kontrak: string;
  created_at?: string;
  pelaksana?: string;
  contract_signed?: string;
  contract_duration?: string;
  start_date_plan?: string;
  end_date_plan?: string;
  location?: string;
  employeer?: string;
  main_vendor?: string;
  links?: ApiLink[];
}

interface ApiLink {
  id: { id: string; tb: string };
  link_name: string;
  ss_status?: string;
  ss_contract_value?: string;
  sub_pelaksana?: { id: string; tb: string };
}

interface ApiSpan {
  id: { id: string; tb: string };
  project_id?: { id: string; tb: string };
  link_id?: { id: string; tb: string };
  span_name: string;
  sto_from?: string;
  sto_to?: string;
  designator?: string;
  geometry?: {
    type: string;
    coordinates: number[][];
  };
  length?: number;
  description?: string;
}

// Mapping status dari API ke format UI
const mapStatus = (apiStatus: string): 'planning' | 'survey' | 'installation' | 'completed' => {
  const statusMap: Record<string, 'planning' | 'survey' | 'installation' | 'completed'> = {
    'on_going': 'installation',
    'completed': 'completed',
    'planning': 'planning',
    'survey': 'survey',
    'active': 'installation'
  };
  return statusMap[apiStatus.toLowerCase()] || 'planning';
};

// Mapping designator ke warna
const getDesignatorColor = (designator: string): string => {
  const colorMap: Record<string, string> = {
    'BC-TR-C-1': '#8B4513',
    'BC-TR-C-3': '#F4A460',
    'BCTR-KH-3': '#D2691E',
    'BC-TR-S-3': '#654321',
    'BC-TR-S-4': '#F5F5DC',
    'BM1': '#2F4F4F',
    'BSS': '#CD5C5C',
    'DA': '#DAA520',
    'DD-BM-HDPE-40-1': '#696969',
    'HBPS1': '#BC8F8F',
    'HH2': '#A0522D',
    'PP-IN': '#DEB887',
    'PS7': '#D2B48C',
    'PS9': '#F4A460',
    'PUAS': '#CD853F',
    'S3': '#8B7355',
    'SC48': '#A0826D',
    'SLACK-T': '#C19A6B',
    'TC48': '#B8860B'
  };
  return colorMap[designator] || '#808080';
};

// Parse lokasi dari string "lat,lng" atau ambil dari region
const parseLocation = (location?: string, region?: string): { lat: number; lng: number; city: string; province: string } => {
  // Default locations untuk beberapa region
  const regionDefaults: Record<string, { lat: number; lng: number; city: string; province: string }> = {
    'Jakarta': { lat: -6.2088, lng: 106.8456, city: 'Jakarta', province: 'DKI Jakarta' },
    'Surabaya': { lat: -7.2575, lng: 112.7521, city: 'Surabaya', province: 'Jawa Timur' },
    'Bandung': { lat: -6.9175, lng: 107.6191, city: 'Bandung', province: 'Jawa Barat' },
    'Medan': { lat: 3.5952, lng: 98.6722, city: 'Medan', province: 'Sumatera Utara' },
    'Semarang': { lat: -6.9667, lng: 110.4167, city: 'Semarang', province: 'Jawa Tengah' },
    'Makassar': { lat: -5.1477, lng: 119.4327, city: 'Makassar', province: 'Sulawesi Selatan' },
    'Palembang': { lat: -2.9761, lng: 104.7754, city: 'Palembang', province: 'Sumatera Selatan' },
    'Tangerang': { lat: -6.1783, lng: 106.6319, city: 'Tangerang', province: 'Banten' },
    'Yogyakarta': { lat: -7.7956, lng: 110.3695, city: 'Yogyakarta', province: 'DI Yogyakarta' },
    'Malang': { lat: -7.9666, lng: 112.6326, city: 'Malang', province: 'Jawa Timur' }
  };

  // Coba parse dari location string
  if (location && location.includes(',')) {
    const [lat, lng] = location.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        lat,
        lng,
        city: region || 'Unknown',
        province: region || 'Unknown'
      };
    }
  }

  // Gunakan default berdasarkan region
  if (region) {
    for (const [key, value] of Object.entries(regionDefaults)) {
      if (region.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
  }

  // Default ke Jakarta jika tidak ada
  return { lat: -6.2088, lng: 106.8456, city: 'Jakarta', province: 'DKI Jakarta' };
};

// Extract designator dari span_name (contoh: "DD-BM-HDPE 40-1 (100M)" -> "DD-BM-HDPE-40-1")
const extractDesignator = (spanName: string): string => {
  // Coba extract dari format "DESIGNATOR (LENGTH)"
  const match = spanName.match(/^([A-Z0-9-]+(?:\s+[A-Z0-9-]+)*)/i);
  if (match) {
    return match[1].replace(/\s+/g, '-').toUpperCase();
  }
  return 'UNKNOWN';
};

// Fetch spans untuk project
export const fetchSpansByProject = async (projectId: string): Promise<ApiSpan[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/spans`, {
      headers: getAuthHeaders()
    });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching spans for project ${projectId}:`, error);
    return [];
  }
};

// Transform API response ke ProjectLocation
const transformApiProjectToLocation = async (apiProject: ApiProject): Promise<ProjectLocation> => {
  const location = parseLocation(apiProject.location, apiProject.region);
  
  // Extract project ID safely - handle SurrealDB Thing type with nested structure
  // API returns: { tb: "project", id: { String: "actual_id" } }
  let projectId: string;
  
  if (typeof apiProject.id === 'string') {
    projectId = apiProject.id;
  } else if (apiProject.id && typeof apiProject.id === 'object') {
    const idObj = apiProject.id as any;
    
    // Check for nested structure: id.id.String
    if (idObj.id && typeof idObj.id === 'object' && 'String' in idObj.id) {
      projectId = idObj.id.String;
    }
    // Check for direct structure: id.String
    else if ('String' in idObj) {
      projectId = idObj.String;
    }
    // Check for simple nested: id.id
    else if (idObj.id && typeof idObj.id === 'string') {
      projectId = idObj.id;
    }
    // Fallback to string conversion
    else {
      projectId = String(apiProject.id);
    }
  } else {
    projectId = String(apiProject.id);
  }
  
  console.log('✅ Extracted project ID:', projectId, 'from', JSON.stringify(apiProject.id));
  
  // Fetch spans untuk project ini
  const spans = await fetchSpansByProject(projectId);
  
  // Transform spans ke routes
  const routes: ProjectRoute[] = spans.map(span => {
    const designator = span.designator || extractDesignator(span.span_name);
    
    // Extract span ID safely - handle nested SurrealDB Thing type
    let spanId: string;
    if (typeof span.id === 'string') {
      spanId = span.id;
    } else if (span.id && typeof span.id === 'object') {
      const idObj = span.id as any;
      if (idObj.id && typeof idObj.id === 'object' && 'String' in idObj.id) {
        spanId = idObj.id.String;
      } else if ('String' in idObj) {
        spanId = idObj.String;
      } else if (idObj.id && typeof idObj.id === 'string') {
        spanId = idObj.id;
      } else {
        spanId = String(span.id);
      }
    } else {
      spanId = String(span.id);
    }
    
    return {
      id: spanId,
      name: span.span_name,
      stoFrom: span.sto_from || 'Unknown',
      stoTo: span.sto_to || 'Unknown',
      designator: designator,
      color: getDesignatorColor(designator),
      coordinates: span.geometry?.coordinates?.map(coord => [coord[0], coord[1]] as [number, number]) || [],
      length: span.length || 0,
      description: span.description
    };
  });

  // Hitung total fiber length dari routes
  const totalFiberLength = routes.reduce((sum, route) => sum + route.length, 0);

  // Parse budget dari links
  const totalBudget = apiProject.links?.reduce((sum, link) => {
    const value = parseFloat(link.ss_contract_value || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0) || 0;

  // Hitung progress berdasarkan status links
  const completedLinks = apiProject.links?.filter(link => link.ss_status === 'survey_completed').length || 0;
  const totalLinks = apiProject.links?.length || 1;
  const progress = Math.round((completedLinks / totalLinks) * 100);

  // Parse dates
  const startDate = apiProject.start_date_plan || apiProject.contract_signed || new Date().toISOString();
  const endDate = apiProject.end_date_plan || new Date(new Date(startDate).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const transformedProject = {
    id: projectId, // Use extracted ID
    name: apiProject.name,
    type: 'fiber' as const, // Default type
    status: mapStatus(apiProject.status),
    location: {
      lat: location.lat,
      lng: location.lng,
      address: apiProject.location || location.city,
      province: location.province,
      city: location.city
    },
    details: {
      contractor: apiProject.pelaksana || apiProject.main_vendor || 'Unknown',
      startDate: startDate,
      endDate: endDate,
      progress: progress,
      budget: totalBudget,
      spent: Math.round(totalBudget * (progress / 100)),
      team: (apiProject.links?.length || 0) * 10, // Estimasi team size
      description: `${apiProject.name} - ${apiProject.region}`
    },
    stats: {
      fiberLength: totalFiberLength,
      equipment: routes.length * 5, // Estimasi equipment
      issues: 0
    },
    routes: routes
  };

  return transformedProject;
};

// Fetch all projects dari API
export const fetchProjects = async (): Promise<ProjectLocation[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    console.log('Fetching projects from:', `${API_BASE_URL}/projects`);
    const response = await axios.get(`${API_BASE_URL}/projects`, {
      timeout: 10000, // 10 second timeout
      headers: getAuthHeaders()
    });
    
    const apiProjects: ApiProject[] = response.data || [];
    console.log(`✅ Fetched ${apiProjects.length} projects from API`);
    
    if (apiProjects.length === 0) {
      console.warn('⚠️ No projects returned from API');
      return [];
    }
    
    // Transform semua projects secara parallel
    const transformedProjects = await Promise.all(
      apiProjects.map(project => transformApiProjectToLocation(project))
    );
    
    console.log(`✅ Transformed ${transformedProjects.length} projects`);
    if (transformedProjects.length > 0) {
      console.log('✅ Sample project ID:', transformedProjects[0].id, '(type:', typeof transformedProjects[0].id, ')');
    }
    
    return transformedProjects;
  } catch (error: any) {
    console.error('❌ Error fetching projects:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Request error - no response received:', error.request);
      console.error('Possible causes: Backend not running, CORS issue, or network error');
    } else {
      console.error('Error message:', error.message);
    }
    
    throw error;
  }
};

// Fetch single project by ID
export const fetchProjectById = async (projectId: string): Promise<ProjectLocation | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
      headers: getAuthHeaders()
    });
    const apiProject: ApiProject = response.data;
    return await transformApiProjectToLocation(apiProject);
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    return null;
  }
};
