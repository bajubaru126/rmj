import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, CheckCircle, Clock, AlertCircle, ArrowRight,
  Database, RefreshCw, BarChart3, ChevronRight, ChevronLeft,
  Layers, Hammer, Scissors, Activity, Info, Zap, Wrench, Plus, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  installationPhaseService,
  powInstalasiService,
  installationProjectService,
  installationOcrService,
  type InstallationPhase,
  type PowInstalasiItem,
  type CreateInstallationPhaseRequest,
  type InstallationOcrSummary,
} from '@/services/installationService';
import { drmService, DRMListItem } from '@/services/drmService';
import { komService } from '@/services/komService';
import { surveyService } from '@/services/surveyService';
import { actualDateService } from '@/services/actualDateService';
import { DateCell, DurationCell, GanttBar, GanttTimelineHeader, ActualDateCell } from './POWGanttComponents';

// ─── Konstanta ───────────────────────────────────────────────────────────────

/** @legacy — dipakai saat dataMode === 'phase' */
const SUB_PHASES_LEGACY = [
  'Penggalian Jalur FO',
  'Penanaman HDPE',
  'Penggelaran Kabel FO',
  'Inst. Jembatan & Handhole',
  'Jointing & Terminasi',
  'Commissioning & Test',
] as const;

/** Pemetaan sub_category POW → label tampilan */
const SUB_CATEGORY_LABEL: Record<string, string> = {
  kom:               'Kick Off Meeting',
  survey:            'Survey',
  drm:               'DRM',
  fabrication:       'Fabrikasi Material',
  delivery_hdpe:     'Delivery HDPE',
  delivery_kabel:    'Delivery Kabel',
  pengurusan_ijin:   'Pengurusan Ijin Kerja',
  penggalian_tanah:  'Penggalian Tanah & HDPE',
  pembuatan_mh:      'Pembuatan MH & Jembatan',
  penarikan_kabel:   'Penarikan Kabel',
  joint_terminasi:   'Joint & Terminasi',
  test_commissioning:'Test & Commissioning',
  pelaksanaan_uji:   'Pelaksanaan Uji Terima',
};

/** Urutan work_category */
const CATEGORY_ORDER: Record<string, number> = {
  preparing: 1, material: 2, installation: 3, closing: 4,
};

/** Pemetaan sub_category POW → sub_phase OCR (untuk match progress/actual date) */
const SUB_CATEGORY_TO_SUBPHASE: Record<string, string> = {
  pengurusan_ijin:    'ijin_kerja',
  penggalian_tanah:   'penggalian_hdpe',
  pembuatan_mh:       'mh_jembatan',
  penarikan_kabel:    'penarikan_kabel',
  joint_terminasi:    'joint_terminasi',
  test_commissioning: 'test_commissioning',
};

const CATEGORY_LABEL: Record<string, string> = {
  preparing:    'Preparing',
  material:     'Material Delivery',
  installation: 'Instalasi & Uji Terima',
  closing:      'Closing',
};

/** Icon untuk sub_category */
const SUB_CATEGORY_ICON: Record<string, any> = {
  pengurusan_ijin:   Info,
  penggalian_tanah:  Hammer,
  pembuatan_mh:      Wrench,
  penarikan_kabel:   Activity,
  joint_terminasi:   Scissors,
  test_commissioning: CheckCircle,
  delivery_hdpe:     Layers,
  delivery_kabel:    Layers,
};

/** Icon untuk legacy phases */
const PHASE_ICONS_LEGACY: Record<string, any> = {
  'Penggalian Jalur FO':       Hammer,
  'Penanaman HDPE':            Layers,
  'Penggelaran Kabel FO':      Activity,
  'Inst. Jembatan & Handhole': Wrench,
  'Jointing & Terminasi':      Scissors,
  'Commissioning & Test':      CheckCircle,
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabSubPhaseProgressProps {
  projectId: string;
  linkId: string;
  installationProjectId: string;
  linkName?: string;
  isImported?: boolean;
  setIsImported?: (val: boolean) => void;
  setImportedBoqData?: (data: any) => void;
}

/** Form untuk Add Phase — berbasis POW selection */
interface AddPhaseForm {
  pow_installation_id: string;
  sub_phase: string;
  phase_type: string;
  start_plan_phase_date: string;
  end_plan_phase_date: string;
  start_actual_phase_date: string;
  end_actual_phase_date: string;
  status_phase: string;
  progress_phase: number;
}

const INITIAL_FORM: AddPhaseForm = {
  pow_installation_id: '',
  sub_phase: '',
  phase_type: '',
  start_plan_phase_date: '',
  end_plan_phase_date: '',
  start_actual_phase_date: '',
  end_actual_phase_date: '',
  status_phase: 'not_started',
  progress_phase: 0,
};

// ─── Custom Gantt Tooltip ─────────────────────────────────────────────────────

interface GanttTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function GanttTooltip({ active, payload, label }: GanttTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // planDuration and actDuration from payload
  let planDuration = 0;
  let actDuration = 0;
  for (const p of payload) {
    if (p.dataKey === 'planDuration') planDuration = p.value ?? 0;
    if (p.dataKey === 'actDuration')  actDuration  = p.value ?? 0;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[200px]">
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-6 text-xs">
        <span className="text-gray-500">Planned Duration:</span>
        <span className="font-bold text-blue-600">{planDuration} days</span>
      </div>
      {actDuration > 0 && (
        <div className="flex items-center justify-between gap-6 text-xs mt-1">
          <span className="text-gray-500">Actual Duration:</span>
          <span className="font-bold text-emerald-600">{actDuration} days</span>
        </div>
      )}
    </div>
  );
}


function extractId(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const inner = field.id;
  if (!inner) return '';
  if (typeof inner === 'string') return inner;
  return inner.String ?? inner.id ?? '';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.startsWith('1900-01-01')) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '-'; }
}

function cleanDate(d?: string | null): string {
  if (!d || d.startsWith('1900-01-01')) return '';
  return d.substring(0, 10);
}

/** Derive status dari task_type POW */
function powTaskStatus(taskType: string): 'not_started' | 'in_progress' | 'completed' {
  if (taskType === 'progress') return 'in_progress';
  if (taskType === 'rolled_up_progress') return 'in_progress';
  return 'not_started';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TabSubPhaseProgress({
  projectId,
  linkId,
  installationProjectId,
  linkName,
  isImported: _isImported,
  setIsImported: _setIsImported,
  setImportedBoqData: _setImportedBoqData,
}: TabSubPhaseProgressProps) {
  const { token } = useAuth();

  // ── POW Installasi state (untuk Gantt Chart) ───────────────────────────
  const [powItems, setPowItems]           = useState<PowInstalasiItem[]>([]);
  const [loadingPow, setLoadingPow]       = useState(false);

  // ── OCR Summary state (actual dates + progress per sub_phase) ──────────
  const [ocrSummary, setOcrSummary]       = useState<InstallationOcrSummary[]>([]);

  // ── installation_phase state (untuk Cards) ─────────────────────────────
  const [phases, setPhases]               = useState<InstallationPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  // ── KOM & Survey Progress state ────────────────────────────────────────
  const [komDataState, setKomDataState] = useState<{ progress: number; start?: string; end?: string } | null>(null);
  const [surveyDataState, setSurveyDataState] = useState<{ progress: number; start?: string; end?: string } | null>(null);
  const [drmDataState, setDrmDataState] = useState<{ progress: number; start?: string; end?: string } | null>(null);

  // ── POW Installation Tasks for dropdown (only installation category) ───
  const [powInstallationTasks, setPowInstallationTasks] = useState<PowInstalasiItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ── Add Phase modal (legacy only) ──────────────────────────────────────
  const [showAddModal, setShowAddModal]   = useState(false);
  const [form, setForm]                   = useState<AddPhaseForm>(INITIAL_FORM);
  const [saving, setSaving]               = useState(false);

  // ── DRM dropdown ───────────────────────────────────────────────────────
  const [drms, setDrms]                   = useState<DRMListItem[]>([]);
  const [selectedDrmId, setSelectedDrmId] = useState('');
  const [importing, setImporting]         = useState(false);

  // ── Sidebar ────────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar]     = useState(true);

  // ── Fetch on mount / linkId change ─────────────────────────────────────
  useEffect(() => {
    if (!linkId) return;
    fetchPowItems();             // Untuk Gantt Chart (semua task POW)
    fetchPhases();               // Untuk Cards (phase yang sudah dibuat)
    fetchPowInstallationTasks(); // Untuk dropdown create phase
    fetchOcrSummary();           // Untuk actual date + progress per sub_phase
    fetchKomAndSurveyProgress(); // Untuk progress KOM dan Survey dari API
  }, [linkId, projectId, token]);

  // DRM list for dropdown
  useEffect(() => {
    if (!projectId) return;
    drmService.listAllDRMs().then(data => {
      const filtered = data.filter(d => {
        const pid = typeof d.project_id === 'string'
          ? d.project_id
          : (d.project_id as any)?.id?.String || (d.project_id as any)?.id || '';
        return pid.includes(projectId) || projectId.includes(pid);
      });
      setDrms(filtered);
      if (filtered.length > 0) setSelectedDrmId(extractId(filtered[0].id));
    }).catch(() => {});
  }, [projectId]);

  const fetchPhases = async () => {
    setLoadingPhases(true);
    try {
      const data = await installationPhaseService.getByLinkId(linkId, token);
      setPhases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch installation phases:', err);
      setPhases([]);
    } finally {
      setLoadingPhases(false);
    }
  };

  const fetchPowItems = async () => {
    setLoadingPow(true);
    try {
      const data = await powInstalasiService.getByLinkId(linkId, token);
      setPowItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pow installasi:', err);
      setPowItems([]);
    } finally {
      setLoadingPow(false);
    }
  };

  const fetchPowInstallationTasks = async () => {
    setLoadingTasks(true);
    try {
      const data = await powInstalasiService.getInstallationTasks(linkId, token);
      setPowInstallationTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pow installation tasks:', err);
      setPowInstallationTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchOcrSummary = async () => {
    try {
      const data = await installationOcrService.getSummaryByLink(linkId, token);
      setOcrSummary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch OCR summary:', err);
      setOcrSummary([]);
    }
  };

  const fetchKomAndSurveyProgress = async () => {
    if (!projectId || !token) return;
    try {
      // Fetch KOM
      const koms = await komService.getKOMsByProject(projectId, token);
      if (koms && koms.length > 0) {
        const kom = koms[0];
        const progress = (kom as any).progress ?? 0;
        setKomDataState({
          progress,
          start: kom.kom_start_date,
          end: kom.kom_end_date,
        });
      } else {
        setKomDataState(null);
      }
    } catch (err) {
      console.error('Failed to fetch KOM progress:', err);
      setKomDataState(null);
    }

    try {
      // Fetch Survey
      const surveys = await surveyService.getSurveysByProjectId(projectId);
      const linkSurveys = surveys.filter(s => {
        const sLinkId = typeof s.ss_link === 'string'
          ? s.ss_link
          : (s.ss_link as any)?.id?.String || (s.ss_link as any)?.id || '';
        return sLinkId.includes(linkId) || linkId.includes(sLinkId);
      });

      if (linkSurveys.length > 0) {
        const survey = linkSurveys[0];
        const progress = (survey as any).survey_progress ?? (survey as any).progress ?? 0;
        const startDates = linkSurveys.map(s => s.date).filter(Boolean);
        const start = startDates.length ? startDates.reduce((a, b) => (a < b ? a : b)) : undefined;
        setSurveyDataState({
          progress,
          start,
          end: survey.created_at,
        });
      } else {
        setSurveyDataState(null);
      }
    } catch (err) {
      console.error('Failed to fetch Survey progress:', err);
      setSurveyDataState(null);
    }

    try {
      // Fetch DRM progress and start date (from drm table)
      const allDrms = await drmService.listAllDRMs();
      const drmMatch = allDrms.find(d => {
        const pid = typeof d.project_id === 'string'
          ? d.project_id
          : (d.project_id as any)?.id?.String || (d.project_id as any)?.id || '';
        const lid = typeof d.link_id === 'string'
          ? d.link_id
          : (d.link_id as any)?.id?.String || (d.link_id as any)?.id || '';
        return (pid.includes(projectId) || projectId.includes(pid)) &&
               (lid.includes(linkId) || linkId.includes(lid));
      });
      
      // Fetch DRM end date (from installation_project table)
      const instProjects = await installationProjectService.getByLinkId(linkId, token);
      const instProject = instProjects.find(p => {
        const pid = typeof p.project_id === 'string'
          ? p.project_id
          : (p.project_id as any)?.id?.String || (p.project_id as any)?.id || '';
        return pid.includes(projectId) || projectId.includes(pid);
      }) || instProjects[0];

      if (drmMatch || instProject) {
        setDrmDataState({
          progress: drmMatch?.progress_drm ?? drmMatch?.progress ?? 0,
          start: drmMatch?.created_at || undefined,
          end: instProject?.created_at || undefined,
        });
      } else {
        setDrmDataState(null);
      }
    } catch (err) {
      console.error('Failed to fetch DRM progress/dates directly:', err);
      setDrmDataState(null);
    }
  };

  // ── Helper functions ─────────────────────────────────────────────────────
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const daysBetween = (a: Date, b: Date): number => {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  };

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const toISOLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fmtDate = (iso: string) => {
    if (!iso || iso.startsWith('1900-01-01')) return '-';
    const d = parseLocalDate(iso);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${dayName} ${day}/${month}/${year}`;
  };

  // ── Gantt styling based on task_type ────────────────────────────────────
  const getGanttStyle = (taskType: string) => {
    switch (taskType) {
      case 'rolled_up_progress':
        return { bg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', shadow: '0 2px 8px rgba(30,41,59,0.30)' };
      case 'rolled_up_task':
        return { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', shadow: '0 2px 8px rgba(139,92,246,0.30)' };
      case 'progress':
        return { bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', shadow: '0 2px 8px rgba(16,185,129,0.30)' };
      case 'task':
      default:
        return { bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', shadow: '0 2px 8px rgba(59,130,246,0.30)' };
    }
  };

  // ── Timeline constants ──────────────────────────────────────────────────
  const TIMELINE_START = new Date(2025, 9, 1);   // Oct 1, 2025
  const TIMELINE_END   = new Date(2028, 11, 31); // Dec 31, 2028
  const DAY_PX = 2.5;
  const TOTAL_DAYS  = daysBetween(TIMELINE_START, TIMELINE_END);
  const TOTAL_WIDTH = TOTAL_DAYS * DAY_PX;

  // ── Month/Quarter helpers ────────────────────────────────────────────────
  interface MonthInfo { label: string; startPx: number; widthPx: number; }
  
  const buildMonths = (): MonthInfo[] => {
    const months: MonthInfo[] = [];
    const cur = new Date(TIMELINE_START);
    while (cur <= TIMELINE_END) {
      const year  = cur.getFullYear();
      const month = cur.getMonth();
      const label = cur.toLocaleString('en-US', { month: 'short' });
      const startDay    = daysBetween(TIMELINE_START, cur);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const clampedDays = Math.min(daysInMonth, daysBetween(cur, TIMELINE_END) + 1);
      months.push({ label, startPx: startDay * DAY_PX, widthPx: clampedDays * DAY_PX });
      cur.setMonth(cur.getMonth() + 1);
      cur.setDate(1);
    }
    return months;
  };
  const MONTHS = buildMonths();

  const QUARTER_DEFS = [
    { label: 'Qtr 4, 2025', startDate: new Date(2025, 9, 1),  endDate: new Date(2026, 0, 1) },
    { label: 'Qtr 1, 2026', startDate: new Date(2026, 0, 1),  endDate: new Date(2026, 3, 1) },
    { label: 'Qtr 2, 2026', startDate: new Date(2026, 3, 1),  endDate: new Date(2026, 6, 1) },
    { label: 'Qtr 3, 2026', startDate: new Date(2026, 6, 1),  endDate: new Date(2026, 9, 1) },
    { label: 'Qtr 4, 2026', startDate: new Date(2026, 9, 1),  endDate: new Date(2027, 0, 1) },
    { label: 'Qtr 1, 2027', startDate: new Date(2027, 0, 1),  endDate: new Date(2027, 3, 1) },
    { label: 'Qtr 2, 2027', startDate: new Date(2027, 3, 1),  endDate: new Date(2027, 6, 1) },
    { label: 'Qtr 3, 2027', startDate: new Date(2027, 6, 1),  endDate: new Date(2027, 9, 1) },
    { label: 'Qtr 4, 2027', startDate: new Date(2027, 9, 1),  endDate: new Date(2028, 0, 1) },
    { label: 'Qtr 1, 2028', startDate: new Date(2028, 0, 1),  endDate: new Date(2028, 3, 1) },
    { label: 'Qtr 2, 2028', startDate: new Date(2028, 3, 1),  endDate: new Date(2028, 6, 1) },
    { label: 'Qtr 3, 2028', startDate: new Date(2028, 6, 1),  endDate: new Date(2028, 9, 1) },
    { label: 'Qtr 4, 2028', startDate: new Date(2028, 9, 1),  endDate: new Date(2029, 0, 1) },
  ].map(q => ({
    label:   q.label,
    startPx: daysBetween(TIMELINE_START, q.startDate) * DAY_PX,
    widthPx: daysBetween(q.startDate, q.endDate) * DAY_PX,
  }));

  // ── Transform POW data into hierarchical structure like TabPOW ──────────
  interface HierarchicalRow {
    id: string;
    pekerjaan: string;
    duration: number;
    start_date: string;
    finish_date: string;
    task_type: string;
    level: number; // 0=root, 1=category, 2=task
    isSynthetic: boolean;
    workCategory?: string;
    subCategory?: string | null;
    backendId?: string;
    // Actual tracking dari OCR summary
    actualStart?: string | null;
    actualEnd?: string | null;
    progress?: number; // route_progress (max) 0-100
  }

  // ── Recalculate rollups (untuk update summary rows setelah edit) ─────────
  const recalculateRollups = useCallback((items: HierarchicalRow[]): HierarchicalRow[] => {
    const newItems = items.map(item => ({ ...item }));

    // Recalculate level 1 summary rows based on their level 2 subtasks
    for (let i = 0; i < newItems.length; i++) {
      const parent = newItems[i];
      if (parent.level === 1 && parent.task_type === 'rolled_up_progress') {
        const children: HierarchicalRow[] = [];
        for (let j = i + 1; j < newItems.length; j++) {
          const child = newItems[j];
          if (child.level > parent.level) {
            if (child.level === 2) children.push(child);
          } else {
            break;
          }
        }

        if (children.length > 0) {
          let minStart = children[0].start_date;
          let maxFinish = children[0].finish_date;
          for (const child of children) {
            if (child.start_date < minStart) minStart = child.start_date;
            if (child.finish_date > maxFinish) maxFinish = child.finish_date;
          }
          parent.start_date = minStart;
          parent.finish_date = maxFinish;
          const s = parseLocalDate(minStart);
          const f = parseLocalDate(maxFinish);
          parent.duration = Math.max(daysBetween(s, f) + 1, 1);
        }
      }
    }

    // Recalculate level 0 summary row
    for (let i = 0; i < newItems.length; i++) {
      const root = newItems[i];
      if (root.level === 0 && root.task_type === 'rolled_up_progress') {
        const children = newItems.filter(item => item.level === 1 && item.task_type === 'rolled_up_progress');
        if (children.length > 0) {
          let minStart = children[0].start_date;
          let maxFinish = children[0].finish_date;
          for (const child of children) {
            if (child.start_date < minStart) minStart = child.start_date;
            if (child.finish_date > maxFinish) maxFinish = child.finish_date;
          }
          root.start_date = minStart;
          root.finish_date = maxFinish;
          const s = parseLocalDate(minStart);
          const f = parseLocalDate(maxFinish);
          root.duration = Math.max(daysBetween(s, f) + 1, 1);
        }
      }
    }

    return newItems;
  }, []);

  const hierarchicalData = useMemo<HierarchicalRow[]>(() => {
    if (powItems.length === 0) return [];

    // Group by work_category
    const grouped = new Map<string, typeof powItems>();
    for (const item of powItems) {
      const cat = item.work_category || 'uncategorized';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    // Sort categories by order
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      const orderA = CATEGORY_ORDER[a] ?? 99;
      const orderB = CATEGORY_ORDER[b] ?? 99;
      return orderA - orderB;
    });

    const result: HierarchicalRow[] = [];
    let idCounter = 1;

    // Build category groups
    for (const catKey of sortedCategories) {
      const catItems = grouped.get(catKey)!;
      const catLabel = CATEGORY_LABEL[catKey] || catKey.toUpperCase();
      const catPrefix = `${CATEGORY_ORDER[catKey] || '?'}.`;

      // Sort items by start_date
      catItems.sort((a, b) => a.start_date.localeCompare(b.start_date));

      // Create category summary row (level 1)
      result.push({
        id: `cat_${catKey}_${idCounter++}`,
        pekerjaan: `${catPrefix} ${catLabel}`,
        duration: catItems.reduce((sum, item) => sum + (item.duration || 0), 0),
        start_date: catItems[0].start_date,
        finish_date: catItems[catItems.length - 1].finish_date,
        task_type: 'rolled_up_progress',
        level: 1,
        isSynthetic: true,
        workCategory: catKey,
      });

      // Add sub-items (level 2)
      let subIdx = 1;
      for (const item of catItems) {
        const subName = item.sub_category
          ? (SUB_CATEGORY_LABEL[item.sub_category] || item.sub_category)
          : (item.description || item.pow_name || 'Task');

        // Lookup OCR summary by sub_phase (mapped from sub_category)
        const subPhaseKey = item.sub_category
          ? (SUB_CATEGORY_TO_SUBPHASE[item.sub_category] || item.sub_category)
          : '';
        const summary = subPhaseKey
          ? ocrSummary.find(s => s.sub_phase === subPhaseKey || s.sub_phase === item.sub_category)
          : undefined;

        let progress = summary?.max_progress ?? 0;
        let actualStart = summary?.first_datetime ?? null;
        let actualEnd = summary?.last_datetime ?? null;

        if (item.sub_category === 'kom' && komDataState) {
          progress = komDataState.progress;
          actualStart = komDataState.start ?? null;
          actualEnd = komDataState.end ?? null;
        } else if (item.sub_category === 'survey' && surveyDataState) {
          progress = surveyDataState.progress;
          actualStart = surveyDataState.start ?? null;
          actualEnd = surveyDataState.end ?? null;
        } else if (item.sub_category === 'drm' && drmDataState) {
          progress = drmDataState.progress;
          actualStart = drmDataState.start ?? null;
          actualEnd = drmDataState.end ?? null;
        }

        result.push({
          id: `row_${idCounter++}`,
          backendId: extractId(item.id),
          pekerjaan: `${catPrefix}${subIdx} ${subName}`,
          duration: item.duration || 0,
          start_date: item.start_date,
          finish_date: item.finish_date,
          task_type: item.task_type || 'task',
          level: 2,
          isSynthetic: false,
          workCategory: item.work_category,
          subCategory: item.sub_category,
          actualStart,
          actualEnd,
          progress,
        });
        subIdx++;
      }
    }

    // Create root summary row (level 0)
    if (result.length > 0) {
      const rootRow: HierarchicalRow = {
        id: `root_${idCounter++}`,
        pekerjaan: `SS#${linkName || linkId || 'Installation'} — Instalasi OSP FO`,
        duration: result.reduce((sum, r) => (r.level === 1 ? sum + r.duration : sum), 0),
        start_date: result[0].start_date,
        finish_date: result[result.length - 1].finish_date,
        task_type: 'rolled_up_progress',
        level: 0,
        isSynthetic: true,
      };
      result.unshift(rootRow);
    }

    // ── Aggregate actual dates + progress for summary rows ──────────────
    // Level 1 categories: aggregate from their level-2 children
    for (let i = 0; i < result.length; i++) {
      const parent = result[i];
      if (parent.level !== 1) continue;
      const children: HierarchicalRow[] = [];
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].level <= parent.level) break;
        if (result[j].level === 2) children.push(result[j]);
      }
      const starts = children.map(c => c.actualStart).filter(Boolean) as string[];
      const ends = children.map(c => c.actualEnd).filter(Boolean) as string[];
      const progresses = children.map(c => c.progress ?? 0);
      parent.actualStart = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
      parent.actualEnd = ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : null;
      parent.progress = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
    }

    // Level 0 root: aggregate from level-1 categories
    const root = result.find(r => r.level === 0);
    if (root) {
      const cats = result.filter(r => r.level === 1);
      const starts = cats.map(c => c.actualStart).filter(Boolean) as string[];
      const ends = cats.map(c => c.actualEnd).filter(Boolean) as string[];
      const progresses = cats.map(c => c.progress ?? 0);
      root.actualStart = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
      root.actualEnd = ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : null;
      root.progress = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
    }

    return result;
  }, [powItems, linkId, linkName, ocrSummary, komDataState, surveyDataState, drmDataState]);

  // ── Editable state management ────────────────────────────────────────────
  const [editableRows, setEditableRows] = useState<HierarchicalRow[]>([]);

  useEffect(() => {
    setEditableRows(hierarchicalData);
  }, [hierarchicalData]);

  const handleDateChange = useCallback(async (rowId: string, field: 'start_date' | 'finish_date', value: string) => {
    const row = editableRows.find(r => r.id === rowId);
    if (!row) return;

    // Only save if row has backendId (not a synthetic summary row)
    if (!row.backendId) {
      toast.error('Tidak dapat mengedit summary row secara langsung');
      return;
    }

    // Calculate new dates based on field edited
    let newStartDate = row.start_date;
    let newFinishDate = row.finish_date;

    if (field === 'start_date') {
      newStartDate = value;
      // Keep duration constant, recalculate finish_date
      const start = parseLocalDate(value);
      const finish = addDays(start, row.duration - 1);
      newFinishDate = toISOLocal(finish);
    } else {
      // finish_date changed
      newFinishDate = value;
      const start = parseLocalDate(row.start_date);
      const finish = parseLocalDate(value);
      if (finish < start) {
        toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai');
        return;
      }
    }

    // Optimistic update
    const tempDuration = Math.max(daysBetween(parseLocalDate(newStartDate), parseLocalDate(newFinishDate)) + 1, 1);
    setEditableRows(prev => {
      const newRows = prev.map(r => {
        if (r.id === rowId) {
          return { ...r, start_date: newStartDate, finish_date: newFinishDate, duration: tempDuration };
        }
        return r;
      });
      return recalculateRollups(newRows);
    });

    // Save to backend
    try {
      // Convert local date (YYYY-MM-DD) to ISO format for API
      // Backend expects: "2024-01-05T00:00:00Z"
      const localDateToISO = (localDate: string): string => {
        // Extract only the date part (YYYY-MM-DD)
        const dateOnly = localDate.split('T')[0];
        return `${dateOnly}T00:00:00Z`;
      };

      const payload = {
        start_date: localDateToISO(newStartDate),
        finish_date: localDateToISO(newFinishDate),
      };

      console.log('Sending PATCH request:', {
        id: row.backendId,
        payload,
      });

      // API will auto-calculate duration
      await powInstalasiService.updateDates(
        row.backendId,
        payload,
        token
      );

      toast.success('Jadwal berhasil diperbarui');
      // Refresh data from backend to get the correct auto-calculated duration
      await fetchPowItems();
    } catch (err: any) {
      console.error('Failed to save date change:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
      toast.error('Gagal menyimpan perubahan: ' + errorMsg);
      // Revert optimistic update
      await fetchPowItems();
    }
  }, [editableRows, recalculateRollups, token, fetchPowItems]);

  const handleDurationChange = useCallback(async (rowId: string, duration: number) => {
    const row = editableRows.find(r => r.id === rowId);
    if (!row) return;

    // Only save if row has backendId (not a synthetic summary row)
    if (!row.backendId) {
      toast.error('Tidak dapat mengedit summary row secara langsung');
      return;
    }

    // Recalculate finish_date from start_date + new duration
    const start = parseLocalDate(row.start_date);
    const finish = addDays(start, duration - 1);
    const newFinishDate = toISOLocal(finish);

    // Optimistic update
    setEditableRows(prev => {
      const newRows = prev.map(r => {
        if (r.id === rowId) {
          return { ...r, duration, finish_date: newFinishDate };
        }
        return r;
      });
      return recalculateRollups(newRows);
    });

    // Save to backend
    try {
      // Convert local date (YYYY-MM-DD) to ISO format for API
      // Backend expects: "2024-01-05T00:00:00Z"
      const localDateToISO = (localDate: string): string => {
        // Extract only the date part (YYYY-MM-DD)
        const dateOnly = localDate.split('T')[0];
        return `${dateOnly}T00:00:00Z`;
      };

      const payload = {
        start_date: localDateToISO(row.start_date),
        finish_date: localDateToISO(newFinishDate),
      };

      console.log('Sending PATCH request (duration change):', {
        id: row.backendId,
        payload,
      });

      // Send only dates, backend will auto-calculate duration
      await powInstalasiService.updateDates(
        row.backendId,
        payload,
        token
      );

      toast.success('Durasi berhasil diperbarui');
      // Refresh data from backend to get the correct auto-calculated duration
      await fetchPowItems();
    } catch (err: any) {
      console.error('Failed to save duration change:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
      toast.error('Gagal menyimpan perubahan: ' + errorMsg);
      // Revert optimistic update
      await fetchPowItems();
    }
  }, [editableRows, recalculateRollups, token, fetchPowItems]);

  // ── Phase Cards: data dari installation_phase ──────────────────────────
  // Cards menampilkan hanya phase yang SUDAH DIBUAT user
  const phaseCards = useMemo(() => {
    return phases.map((phase, idx) => {
      // Gunakan mapping SUB_CATEGORY_LABEL untuk display name
      let displayName = phase.sub_phase || `Phase ${idx + 1}`;
      
      // Jika sub_phase ada di mapping, gunakan label yang benar
      if (phase.sub_phase) {
        // Coba cari di mapping dengan exact match (lowercase dengan underscore)
        const normalizedKey = phase.sub_phase.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '');
        for (const [key, label] of Object.entries(SUB_CATEGORY_LABEL)) {
          if (key === normalizedKey || label === phase.sub_phase) {
            displayName = label;
            break;
          }
        }
      }
      
      // Cari icon berdasarkan nama sub_phase
      let icon = Zap;
      for (const [key, val] of Object.entries(PHASE_ICONS_LEGACY)) {
        if (displayName.toLowerCase().includes(key.toLowerCase())) {
          icon = val;
          break;
        }
      }
      // Fallback: cek juga di SUB_CATEGORY_ICON
      if (icon === Zap) {
        for (const [key, val] of Object.entries(SUB_CATEGORY_ICON)) {
          if (displayName.toLowerCase().includes(key.replace(/_/g, ' '))) {
            icon = val;
            break;
          }
        }
      }

      return {
        id: extractId(phase.id) || `phase-${idx}`,
        name: displayName,
        idx: idx + 1,
        icon,
        planStart: cleanDate(phase.start_plan_phase_date),
        planEnd: cleanDate(phase.end_plan_phase_date),
        actualStart: cleanDate(phase.start_actual_phase_date),
        actualEnd: cleanDate(phase.end_actual_phase_date),
        progress: phase.progress_phase ?? 0,
        status: (phase.status_phase ?? 'not_started') as 'not_started' | 'in_progress' | 'completed',
        phaseType: phase.phase_type,
        rawRow: phase,
      };
    });
  }, [phases]);

  // ── Legacy: save new phase ──────────────────────────────────────────────
  const handlePowSelect = (powId: string) => {
    const selectedPow = powInstallationTasks.find(p => extractId(p.id) === powId);
    if (!selectedPow) {
      setForm(prev => ({
        ...prev,
        pow_installation_id: powId,
        sub_phase: '',
        start_plan_phase_date: '',
        end_plan_phase_date: '',
      }));
      return;
    }

    // Auto-fill dari POW yang dipilih
    const subPhaseLabel = selectedPow.sub_category
      ? SUB_CATEGORY_LABEL[selectedPow.sub_category] || selectedPow.sub_category
      : (selectedPow.description || 'Unnamed Phase');

    setForm(prev => ({
      ...prev,
      pow_installation_id: powId,
      sub_phase: subPhaseLabel,
      start_plan_phase_date: cleanDate(selectedPow.start_date),
      end_plan_phase_date: cleanDate(selectedPow.finish_date),
    }));
  };

  const handleSavePhase = async () => {
    if (!installationProjectId) {
      toast.error('Installation project ID tidak tersedia');
      return;
    }
    if (!form.pow_installation_id) {
      toast.error('Pilih POW Installation terlebih dahulu');
      return;
    }
    
    setSaving(true);
    try {
      // Calculate duration_actual jika kedua tanggal actual tersedia
      let durationActual: number | undefined;
      if (form.start_actual_phase_date && form.end_actual_phase_date) {
        const startDate = new Date(form.start_actual_phase_date);
        const endDate = new Date(form.end_actual_phase_date);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        durationActual = diffDays + 1; // +1 untuk inclusive
      }

      const payload: CreateInstallationPhaseRequest = {
        project_id: projectId,
        link_id: linkId,
        installation_project_id: installationProjectId,
        pow_installation_id: form.pow_installation_id,
        phase_type: form.phase_type || undefined,
        start_actual_phase_date: form.start_actual_phase_date
          ? new Date(form.start_actual_phase_date).toISOString() : undefined,
        end_actual_phase_date: form.end_actual_phase_date
          ? new Date(form.end_actual_phase_date).toISOString() : undefined,
        duration_actual: durationActual,
        status_phase: form.status_phase,
        progress_phase: form.progress_phase,
      };
      
      await installationPhaseService.create(payload, token);
      toast.success(`Phase "${form.sub_phase}" berhasil ditambahkan`);
      setShowAddModal(false);
      setForm(INITIAL_FORM);
      fetchPhases();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan phase');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!linkId) { toast.error('Link ID tidak tersedia'); return; }
    setImporting(true);
    toast.loading('Menyinkronkan data DRM ke installasi...', { id: 'drm-import' });
    try {
      const result = await installationProjectService.finalizeDRMToInstallasi(linkId, token);
      const copied = [
        result.boq_copied    && 'BOQ',
        result.matrix_copied && 'Matrix',
        result.redline_copied && 'Redline',
        result.pow_copied    && 'POW',
      ].filter(Boolean).join(', ');

      toast.success(
        `DRM data berhasil di-import ke installasi!${copied ? ` (${copied})` : ''}`,
        { id: 'drm-import', duration: 4000 }
      );

      if (_setIsImported) _setIsImported(true);

      // Refresh data setelah finalize
      fetchPowItems();
      fetchPhases();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal import DRM data';
      toast.error(msg, { id: 'drm-import' });
    } finally {
      setImporting(false);
    }
  };

  // ── UI helpers ──────────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200 rounded-full"><AlertCircle className="w-3.5 h-3.5" /> Not Started</span>;
    }
  };

  const progressColor = (status: string) => {
    if (status === 'completed')   return 'bg-emerald-500';
    if (status === 'in_progress') return 'bg-amber-500';
    return 'bg-gray-300';
  };

  return (
    <div className="flex h-full bg-gray-50/40 relative overflow-hidden">
      {/* ── MAIN AREA ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">

        {/* DRM Import bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" /> Import DRM Configuration
            </h3>
            <p className="text-xs text-gray-400">Auto-import BOQ, Matrix, KML, and Redline from the approved Design Review Meeting</p>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedDrmId}
              onChange={e => setSelectedDrmId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-48 bg-white"
            >
              {drms.length === 0
                ? <option value="">DRM - {linkName || 'Project'}</option>
                : drms.map(d => (
                    <option key={extractId(d.id)} value={extractId(d.id)}>
                      DRM - {new Date(d.created_at).toLocaleDateString('id-ID')}
                    </option>
                  ))
              }
            </select>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Importing...' : 'Import DRM Data'}
            </button>
          </div>
        </div>

        {/* Gantt Timeline - Style persis seperti POW DRM dengan inline edit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden" style={{ boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
            padding: '16px 24px',
            borderBottom: '1px solid #1e293b'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-white" />
                <div>
                  <h4 className="text-sm font-bold text-white">POW — SS#{linkName || linkId}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Plan of Work Installation Progress (Editable)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* TEMPORARILY HIDDEN - Add Phase button */}
                {false && (
                  <button
                    onClick={() => { setForm(INITIAL_FORM); setShowAddModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded-lg transition backdrop-blur-sm border border-white/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Phase
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chart Content */}
          <div className="overflow-x-auto bg-slate-50" style={{ flex: 1 }}>
            {loadingPow ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading POW data...</span>
              </div>
            ) : editableRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-semibold">Belum ada data POW Instalasi</p>
                <p className="text-xs text-gray-400 mt-1">Import DRM data untuk menampilkan POW timeline</p>
              </div>
            ) : (
              <div style={{ minWidth: 990 + TOTAL_WIDTH }}>
                {/* Table Header */}
                <div style={{
                  display: 'flex',
                  background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)',
                  borderBottom: '2px solid #e2e8f0',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}>
                  {/* NO */}
                  <div style={{
                    width: 50,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    NO
                  </div>

                  {/* PEKERJAAN */}
                  <div style={{
                    width: 320,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    PEKERJAAN
                  </div>

                  {/* DURATION */}
                  <div style={{
                    width: 90,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    DURATION
                    <span style={{ marginLeft: 4, fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>✏️</span>
                  </div>

                  {/* START */}
                  <div style={{
                    width: 110,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    START
                    <span style={{ marginLeft: 4, fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>✏️</span>
                  </div>

                  {/* FINISH */}
                  <div style={{
                    width: 110,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    FINISH
                    <span style={{ marginLeft: 4, fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>✏️</span>
                  </div>

                  {/* ACTUAL START */}
                  <div style={{
                    width: 110,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    <span>ACT. START</span>
                  </div>

                  {/* ACTUAL FINISH */}
                  <div style={{
                    width: 110,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    <span>ACT. FINISH</span>
                  </div>

                  {/* PROGRESS */}
                  <div style={{
                    width: 90,
                    flexShrink: 0,
                    height: 62,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#047857',
                    letterSpacing: 0.4,
                    borderRight: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                  }}>
                    PROGRESS
                  </div>

                  {/* Timeline header */}
                  <div style={{ flexShrink: 0 }}>
                    <GanttTimelineHeader
                      TOTAL_WIDTH={TOTAL_WIDTH}
                      QUARTER_DEFS={QUARTER_DEFS}
                      MONTHS={MONTHS}
                    />
                  </div>
                </div>

                {/* Data Rows */}
                {editableRows.map((row, idx) => {
                  const isSummary = row.task_type === 'rolled_up_progress';
                  const bg = isSummary ? '#e8f0fb' : idx % 2 === 0 ? '#f8fafd' : '#ffffff';
                  
                  const cellBase: React.CSSProperties = {
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    borderRight: '1px solid #e2e8f0',
                    flexShrink: 0,
                    overflow: 'hidden',
                  };

                  return (
                    <div key={row.id} style={{ 
                      display: 'flex', 
                      background: bg, 
                      borderBottom: isSummary ? '1px solid #b8cce8' : undefined 
                    }}>
                      {/* NO */}
                      <div style={{ 
                        ...cellBase, 
                        width: 50, 
                        justifyContent: 'center', 
                        fontWeight: isSummary ? 700 : 500, 
                        fontSize: 12, 
                        color: '#64748b' 
                      }}>
                        {idx + 1}
                      </div>

                      {/* PEKERJAAN */}
                      <div style={{
                        ...cellBase,
                        width: 320,
                        fontSize: 12,
                        fontWeight: isSummary ? 700 : 500,
                        color: isSummary ? '#0f172a' : '#334155',
                        paddingLeft: row.level === 0 ? 10 : row.level === 1 ? 24 : 40,
                        justifyContent: 'flex-start',
                      }}>
                        {row.pekerjaan}
                      </div>

                      {/* DURATION - inline editable */}
                      <div style={{ ...cellBase, width: 90, justifyContent: 'center', padding: 0 }}>
                        <DurationCell
                          value={row.duration}
                          rowId={row.id}
                          onChange={handleDurationChange}
                          disabled={isSummary}
                        />
                      </div>

                      {/* START - inline editable */}
                      <div style={{ ...cellBase, width: 110, padding: 0 }}>
                        <DateCell
                          value={row.start_date}
                          rowId={row.id}
                          field="start_date"
                          onChange={handleDateChange}
                          disabled={isSummary}
                        />
                      </div>

                      {/* FINISH - inline editable */}
                      <div style={{ ...cellBase, width: 110, padding: 0 }}>
                        <DateCell
                          value={row.finish_date}
                          rowId={row.id}
                          field="finish_date"
                          onChange={handleDateChange}
                          disabled={isSummary}
                        />
                      </div>

                      {/* ACTUAL START */}
                      <div style={{ ...cellBase, width: 110, padding: 0 }}>
                        <ActualDateCell value={row.actualStart} />
                      </div>

                      {/* ACTUAL FINISH */}
                      <div style={{ ...cellBase, width: 110, padding: 0 }}>
                        <ActualDateCell value={row.actualEnd} />
                      </div>

                      {/* PROGRESS */}
                      <div style={{ ...cellBase, width: 90, flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '0 8px' }}>
                        {(() => {
                          const pct = Math.round(row.progress ?? 0);
                          const barColor = pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#cbd5e1';
                          return (
                            <>
                              <span style={{ fontSize: 11, fontWeight: 700, color: pct > 0 ? '#047857' : '#94a3b8' }}>{pct}%</span>
                              <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Gantt Bar */}
                      <div style={{ ...cellBase, width: TOTAL_WIDTH, borderRight: 'none' }}>
                        <GanttBar
                          start_date={row.start_date}
                          finish_date={row.finish_date}
                          task_type={row.task_type}
                          TIMELINE_START={TIMELINE_START}
                          DAY_PX={DAY_PX}
                          actual_start={row.actualStart}
                          actual_end={row.actualEnd}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart Legend Footer */}
          {!loadingPow && editableRows.length > 0 && (
            <div style={{
              padding: '12px 24px',
              background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10
            }}>
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }} />
                  <span className="font-semibold uppercase tracking-wide">Rolled Up Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' }} />
                  <span className="font-semibold uppercase tracking-wide">Task</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' }} />
                  <span className="font-semibold uppercase tracking-wide">Rolled Up Task</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }} />
                  <span className="font-semibold uppercase tracking-wide">Progress</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <div style={{ width: 20, height: 5, borderRadius: 4, background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' }} />
                  <span className="font-semibold uppercase tracking-wide">Actual</span>
                </div>
              </div>
              <div className="text-gray-500 font-mono text-[11px]">
                Total Tasks: <span className="font-bold text-gray-700">{editableRows.filter(r => r.level === 2).length}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── PHASE CARDS: TEMPORARILY HIDDEN ── */}
        {false && (
          <>
            {loadingPhases ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading sub-phase data...</span>
              </div>
            ) : phaseCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <Database className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">Belum ada Installation Phase</p>
                <p className="text-xs text-gray-400 mt-1">Klik "Add Phase" untuk menambahkan sub-phase instalasi</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {phaseCards.map(phase => {
                  const Icon = phase.icon;
                  return (
                    <div key={phase.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-all group duration-200">
                      <div className="flex items-start justify-between border-b border-gray-50 pb-3.5 mb-4 shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Step {phase.idx}</span>
                            <h5 className="text-xs font-bold text-gray-800 line-clamp-1">{phase.name}</h5>
                            {phase.phaseType && (
                              <span className="text-[9px] text-gray-400 italic">{phase.phaseType}</span>
                            )}
                          </div>
                        </div>
                        {statusBadge(phase.status)}
                      </div>
                      <div className="flex-1 space-y-3.5 text-xs font-medium">
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-500" /> Planned Dates
                          </p>
                          <div className="flex justify-between text-gray-600 font-mono">
                            <span>Start: {formatDate(phase.planStart)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 self-center" />
                            <span>End: {formatDate(phase.planEnd)}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-500" /> Actual Dates
                          </p>
                          <div className="flex justify-between text-gray-600 font-mono">
                            <span>Start: {formatDate(phase.actualStart)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 self-center" />
                            <span>End: {formatDate(phase.actualEnd)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 pt-3.5 border-t border-gray-50 shrink-0">
                        <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-mono text-gray-700">{phase.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(phase.status)}`}
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 p-1.5 rounded-l-xl shadow-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition ${showSidebar ? 'mr-96' : 'mr-0'}`}
        style={{ transitionProperty: 'margin-right', transitionDuration: '300ms' }}
      >
        {showSidebar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <div className={`border-l border-gray-200 bg-white flex flex-col h-full shrink-0 shadow-xl overflow-hidden transition-all duration-300 ${showSidebar ? 'w-96' : 'w-0 border-l-0'}`}>
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white flex items-center justify-between shrink-0">
          <h4 className="font-bold text-sm flex items-center gap-1.5"><Info className="w-4 h-4" /> DRM Reference Panel</h4>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-full">Read Only</span>
        </div>
        <div className="flex-grow overflow-y-auto p-5">
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Database className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-xs font-semibold text-gray-500">No DRM Data Imported</p>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Please select a DRM and click 'Import DRM Data' in the main panel</p>
          </div>
        </div>
      </div>

      {/* ── ADD PHASE MODAL (berlaku untuk kedua mode) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tambah Sub-Phase
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Sub Phase <span className="text-red-500">*</span>
                </label>
                {loadingTasks ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Loading tasks...
                  </div>
                ) : powInstallationTasks.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                    Tidak ada POW installation task. Import DRM data terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={form.pow_installation_id}
                    onChange={e => handlePowSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="">Pilih Phase dari POW</option>
                    {powInstallationTasks.map(task => {
                      const taskId = extractId(task.id);
                      const label = task.sub_category
                        ? SUB_CATEGORY_LABEL[task.sub_category] || task.sub_category
                        : (task.description || task.pow_name || 'Unnamed Task');
                      return (
                        <option key={taskId} value={taskId}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Phase Type (optional) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Phase Type <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tanah Keras..."
                  value={form.phase_type}
                  onChange={e => setForm(f => ({ ...f, phase_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Plan Dates (readonly - auto-filled from POW) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    Start Plan Date
                  </label>
                  <input
                    type="date"
                    value={form.start_plan_phase_date}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    End Plan Date
                  </label>
                  <input
                    type="date"
                    value={form.end_plan_phase_date}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Actual Dates (editable) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    Start Actual Date
                  </label>
                  <input
                    type="date"
                    value={form.start_actual_phase_date}
                    onChange={e => setForm(f => ({ ...f, start_actual_phase_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    End Actual Date
                  </label>
                  <input
                    type="date"
                    value={form.end_actual_phase_date}
                    onChange={e => setForm(f => ({ ...f, end_actual_phase_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Status & Progress */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={form.status_phase}
                    onChange={e => setForm(f => ({ ...f, status_phase: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Progress (0–100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress_phase}
                    onChange={e => setForm(f => ({ ...f, progress_phase: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSavePhase}
                disabled={saving || !form.pow_installation_id}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {saving ? 'Menyimpan...' : 'Simpan Phase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
