// Types untuk Dashboard Map
export interface ProjectLocation {
  id: string;
  name: string;
  type: 'tower' | 'fiber' | 'infrastructure' | 'maintenance';
  status: 'planning' | 'survey' | 'installation' | 'completed';
  location: {
    lat: number;
    lng: number;
    address: string;
    province: string;
    city: string;
  };
  details: {
    contractor: string;
    startDate: string;
    endDate: string;
    progress: number;
    budget: number;
    spent: number;
    team: number;
    description: string;
  };
  stats: {
    towers?: number;
    fiberLength?: number;
    equipment?: number;
    issues?: number;
  };
  routes?: ProjectRoute[];
}

export interface ProjectRoute {
  id: string;
  name: string;
  stoFrom: string;
  stoTo: string;
  designator: string; // Cable type designator (BC-TR-C-1, BC-TR-C-3, etc)
  color: string;
  coordinates: [number, number][];
  length: number; // in meters
  description?: string;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapFilters {
  types: string[];
  statuses: string[];
  provinces: string[];
  searchQuery: string;
}
