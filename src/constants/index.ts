// Application Constants

// ============= Tab Constants =============
export const TABS = {
  DASHBOARD: 'dashboard',
  KONTRAK: 'kontrak',
  RUAS: 'ruas',
  BOQ: 'boq',
  SEGMENTASI: 'segmentasi',
  ISSUE: 'issue',
  ATTRIBUTE: 'attribute',
  IMPORT: 'import',
} as const;

// ============= Status Constants =============
export const STATUS = {
  OK: 'OK',
  DELAY: 'Delay',
  ISSUE: 'Issue',
  PROGRESS: 'Progress',
} as const;

export const ISSUE_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
} as const;

export const BOQ_STATUS = {
  APPROVED: 'Approved',
  DRAFT: 'Draft',
  REJECTED: 'Rejected',
} as const;

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

// ============= Form Field Constants =============
export const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown (Single)' },
  { value: 'multiselect', label: 'Dropdown (Multi)' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
] as const;

export const ACCESS_LEVELS = [
  { value: 'View Only', label: 'View Only' },
  { value: 'Modify', label: 'Modify' },
  { value: 'Admin', label: 'Admin' },
] as const;

export const ATTACHMENT_POINTS = [
  { value: 'Kontrak', label: 'Kontrak' },
  { value: 'Ruas', label: 'Ruas' },
  { value: 'Segmentasi', label: 'Segmentasi' },
  { value: 'Cell', label: 'Cell' },
  { value: 'BOQ', label: 'BOQ' },
] as const;

// ============= TREG Options =============
export const TREG_OPTIONS = [
  'TREG-1',
  'TREG-2',
  'TREG-3',
  'TREG-4',
  'TREG-5',
  'TREG-6',
  'TREG-7',
] as const;

// ============= Issue Types =============
export const ISSUE_TYPES = [
  'Route Change',
  'Material Delay',
  'Quality Issue',
  'Permit Issue',
  'Resource Issue',
  'Technical Issue',
  'Other',
] as const;

// ============= Milestone Options =============
export const MILESTONE_OPTIONS = [
  'Planning',
  'Design',
  'Survey',
  'DRM',
  'Perizinan',
  'Implementation',
  'Installation',
  'Comtest',
  'RFS',
] as const;

// ============= Export Formats =============
export const EXPORT_FORMATS = {
  XLSX: 'xlsx',
  CSV: 'csv',
  PDF: 'pdf',
} as const;

// ============= Pagination =============
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

// ============= File Upload =============
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ACCEPTED_FILE_TYPES = {
  EXCEL: ['.xlsx', '.xls'],
  CSV: ['.csv'],
  KML: ['.kml'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif'],
} as const;

// ============= Colors =============
export const COLORS = {
  PRIMARY: '#005EB8',
  SECONDARY: '#003A70',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
} as const;
