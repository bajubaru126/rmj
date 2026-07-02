// Shared Types for RMJ Application

// ============= Authentication Types =============
export interface User {
  id: string;
  email: string;
  username: string;
  role: string; // "admin", "surveyor", "pm", etc.
  vendor_id?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============= Common Types =============
export type Status = 'OK' | 'Delay' | 'Issue' | 'Progress';
export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';
export type Priority = 'Low' | 'Medium' | 'High';
export type BOQStatus = 'Approved' | 'Draft' | 'Rejected';
export type AccessLevel = 'View Only' | 'Modify' | 'Admin';
export type AttributeType = 'text' | 'number' | 'date' | 'select' | 'dropdown' | 'multiselect' | 'boolean';
export type AttributeCategory = 'main' | 'secondary' | 'custom';
export type NodeType = 'kontrak' | 'treg' | 'paket' | 'lokasi' | 'ruas';

// ============= Cell & Segmentasi =============
export interface CellData {
  id: string;
  cellName: string;
  length: string;
  material: string;
  owner: string;
  status: Status;
  evidenceCount: number;
  hasKML: boolean;
  evidencePhotos?: string[];
}

export interface SegmentasiData {
  id: string;
  segName: string;
  length: string;
  status: string;
  cells: CellData[];
}

// ============= Ruas (maps to BE "Project") =============
export interface RuasData {
  id: string;
  tahunProject: string;
  program: string;
  projectSitelist: string;
  siteName: string;
  regional: string;
  projectCode: string;  // BE: project_code (renamed from "project")
  mitra: string;
  planRFS: string;
  spCurr: string;        // BE: sp_curr (separated from spCurrMilestone)
  milestone: string;     // BE: milestone (separated from spCurrMilestone)
  m0sInstallationCompleted?: string;  // BE: m0s_installation_completed (Date, not boolean)
  planEndDate: string;
  actualEndDate?: string;
  owner: string;
  createdAt?: string;
  segmentasi?: SegmentasiData[];
}

export interface RuasFormData {
  tahunProject: string;       // Required in BE
  program: string;            // Required in BE
  projectSitelist: string;    // Required in BE
  siteName: string;           // Required in BE
  regional: string;           // Required in BE
  projectCode: string;        // Required in BE (was "project")
  mitra: string;              // Required in BE
  planRFS: string;            // Required in BE (date string YYYY-MM-DD)
  spCurr: string;             // Required in BE
  milestone: string;          // Required in BE
  m0sInstallationCompleted?: string;  // Optional (date string)
  planEndDate: string;        // Required in BE (date string YYYY-MM-DD)
  actualEndDate?: string;     // Optional (date string)
  owner: string;              // Required in BE
}

// Backend Project Response (snake_case from API)
export interface ProjectResponse {
  id: string;
  tahun_project: string;
  program: string;
  project_sitelist: string;
  site_name: string;
  regional: string;
  project_code: string;
  mitra: string;
  plan_rfs: string;
  sp_curr: string;
  milestone: string;
  m0s_installation_completed?: string | null;
  plan_end_date: string;
  actual_end_date?: string | null;
  owner: string;
  created_at?: string | null;
}

// ============= BOQ =============
export interface BOQItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
}

export interface BOQData {
  id: string;
  ruas: string;
  kategori: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
  status: BOQStatus;
  items?: BOQItem[];
  tahunProject?: string;
  program?: string;
  mitra?: string;
  regional?: string;
}

// ============= Issue =============
export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

// Backend Issue type (from API)
export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: string; // Low, Medium, High, Critical
  status: string; // Open, In Progress, Resolved, Closed
  reported_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

// Create Issue Request
export interface CreateIssueRequest {
  title: string;
  description: string;
  priority: string;
  assigned_to?: string;
}

// Update Issue Request
export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
}

// Legacy types for backward compatibility
export interface IssueFormData {
  title: string;
  description: string;
  priority: Priority;
  status: IssueStatus;
  assigned_to?: string;
}

// ============= Attribute =============
export interface AttributeFormData {
  name: string;
  label: string;
  type: AttributeType;
  category: AttributeCategory;
  level: number;
  required: boolean;
  defaultValue: string;
  options: string[];
}

export interface Attribute extends AttributeFormData {
  id: string;
  attachedTo?: string;
  accessLevel?: AccessLevel;
  createdDate?: string;
  createdBy?: string;
}

// ============= Kontrak & Tree =============
export interface TreeNode {
  id: string;
  label: string;
  type: NodeType;
  children?: TreeNode[];
}

export interface KontrakDetail {
  id: string;
  nilai: string;
  ruas: number;
  statusGlobal: string;
  evidencePercent: number;
  startDate: string;
  endDate: string;
  mitra: string;
  pic: string;
  treg: string[];
  paket: string[];
  progressDetail: {
    survey: number;
    drm: number;
    installation: number;
    comtest: number;
    rfs: number;
  };
}

// ============= Table & Grid =============
export interface RMJTableRow {
  id: string;
  level: number;
  kontrak: string;
  treg: string;
  paketArea: string;
  lokasi?: string;
  ruasKontrak?: string;
  segmentasi?: string;
  cell?: string;
  currentMilestone?: string;
  planRFS?: string;
  actualEnd?: string;
  owner?: string;
  evidenceCount?: number;
  issueCount?: number;
  hasChildren?: boolean;
  children?: RMJTableRow[];
}

// ============= AG Grid Types =============
export interface GridApi {
  setQuickFilter: (value: string) => void;
  onFilterChanged: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  getSelectedNodes: () => GridNode[];
}

export interface GridNode {
  data?: any;
  id?: string;
  expanded?: boolean;
}

// ============= Upload Types =============
export interface UploadFileData {
  file: File;
  ruasId?: string;
  cellId?: string;
  description?: string;
}

// ============= Filter Types =============
export interface FilterState {
  kontrak: string;
  treg: string;
  paketArea: string;
  lokasi: string;
  ruasKontrak: string;
  milestone: string;
  mitra: string;
  searchText: string;
}

// ============= Survey & Project Types =============
export interface Project {
  id: string;
  projectName: string;
  noContract: string;
  contractSigned: string;
  contractValue: string;
  contractDuration: string;
  startDatePlan: string;
  endDatePlan: string;
  ssLink: string;
  location: { lat: number; lng: number; name: string; region?: string };
  region: string;
  contractor: string;
  status: 'created' | 'survey' | 'drm' | 'installation' | 'completed';
  progress: number;
  createdBy: string;
  hasKML: boolean;
  kmlFiles?: { id: string; name: string; url: string; uploadDate: string; size: string }[];
  surveyProgress?: { completed: number; total: number };
  drmProgress?: { completed: number; total: number };
  installationProgress?: { completed: number; total: number };
}

export interface KMLVersion {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
}

export interface Ruas {
  id: string;
  projectId: string;
  name: string;
  sto: string;
  ruasCode: string;
  route: string;
  totalDesignators: number;
  completedDesignators: number;
  spans: Span[];
}

export interface Span {
  id: string;
  ruasId: string;
  name: string;
  subSpans?: { id: string; name: string }[];
  designators: SpanDesignator[];
}

export interface SpanDesignator {
  id: string;
  no: number;
  offset: string;
  offsetFrom: string;
  offsetTo: string;
  length: string;
  depth: string;
  location: string;
  designator: string;
  soilType: string;
  latitude?: string;
  longitude?: string;
  hasCoordinates: boolean;
  status: 'pending' | 'verified' | 'rejected';
}

export interface SurveyData {
  id: string;
  projectId: string;
  ruasName: string;
  location: string;
  sto: string;
  latitude: string;
  longitude: string;
  soilType: string;
  depth: string;
  date: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface RiskItem {
  id: string;
  milestone: 'survey' | 'drm' | 'installation';
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedRuas: number;
}
