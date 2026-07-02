import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FileText, RefreshCw, PenTool, X, Check, Calendar, Loader2, AlertTriangle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { generatePOWPDF, StaticPowItem } from '@/utils/powPdfGenerator';
import { powDrmService, PowDrmItem, UpdatePowDrmRequest } from '@/services/powDrmService';
import { API_CONFIG } from '@/config/api';
import { ConfirmModal } from './shared/ConfirmModal';

interface TabPOWProps {
  contractId: string;
  linkId: string;
  linkName?: string;
}

// ── Date helpers ───────────────────────────────────────────────────────────────
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISOLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDate(iso: string) {
  const d = parseLocalDate(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${dayName} ${day}/${month}/${year}`;
}

// ── Timeline config ────────────────────────────────────────────────────────────
const TIMELINE_START = new Date(2025, 9, 1);   // Oct 1, 2025
const TIMELINE_END   = new Date(2028, 11, 31); // Dec 31, 2028
const DAY_PX = 3;

const TOTAL_DAYS  = daysBetween(TIMELINE_START, TIMELINE_END);
const TOTAL_WIDTH = TOTAL_DAYS * DAY_PX;

interface MonthInfo { label: string; startPx: number; widthPx: number; }

function buildMonths(): MonthInfo[] {
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
}
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

// ── Bar styling ────────────────────────────────────────────────────────────────
function getGanttStyle(taskType: string) {
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
}

// ── Category name mapping (matches backend /api/pow-drm/fe/categories) ─────────
const CATEGORY_MAP: Record<string, { name: string; order: number; prefix: string }> = {
  preparing:    { name: 'PREPARING',             order: 1, prefix: '1.' },
  material:     { name: 'MATERIAL DELIVERY',     order: 2, prefix: '2.' },
  installation: { name: 'INSTALASI & UJI TERIMA', order: 3, prefix: '3.' },
  closing:      { name: 'CLOSING',               order: 4, prefix: '4.' },
};

const SUB_CATEGORY_MAP: Record<string, string> = {
  kom:               'Kick Off Meeting',
  survey:            'Survey',
  drm:               'DRM',
  fabrication:       'Fabrikasi Material',
  delivery_hdpe:     'Delivery material HDPE',
  delivery_kabel:    'Delivery material Kabel',
  pengurusan_ijin:   'Pengurusan Ijin Kerja',
  penggalian_tanah:  'Penggalian Tanah Penanaman HDPE',
  pembuatan_mh:      'Pembuatan MH dan Jembatan',
  penarikan_kabel:   'Penarikan Kabel',
  joint_terminasi:   'Joint & Terminasi',
  test_commissioning:'Test & Commissioning',
  pelaksanaan_uji:   'Pelaksanaan Uji Terima',
};

/** Convert ISO datetime string from backend to local YYYY-MM-DD */
function isoToLocalDate(iso: string): string {
  if (!iso) return toISOLocal(new Date());
  // Handle both "2024-12-01T09:00:00Z" and "2024-12-01" formats
  if (iso.length === 10) return iso;
  const d = new Date(iso);
  return toISOLocal(d);
}

/** Convert local YYYY-MM-DD to ISO datetime string for backend */
function localDateToISO(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toISOString();
}

// ── Extended StaticPowItem with backend metadata ───────────────────────────────
interface ExtendedPowItem extends StaticPowItem {
  /** Backend record ID (only for real items, not synthetic summary rows) */
  backendId?: string;
  /** work_category key from backend */
  workCategory?: string;
  /** sub_category key from backend */
  subCategory?: string | null;
  /** Whether this row is auto-generated (summary/rollup) */
  isSynthetic?: boolean;
}

/**
 * Transform flat backend PowDrmItem[] into hierarchical ExtendedPowItem[]
 * Groups by work_category, generates summary rollup rows, and orders items.
 */
function transformBackendToFrontend(items: PowDrmItem[], rootLabel: string): ExtendedPowItem[] {
  if (!items || items.length === 0) return [];

  // Group items by work_category
  const grouped = new Map<string, PowDrmItem[]>();
  for (const item of items) {
    const cat = item.work_category || 'uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  // Sort categories by predefined order
  const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
    const orderA = CATEGORY_MAP[a]?.order ?? 99;
    const orderB = CATEGORY_MAP[b]?.order ?? 99;
    return orderA - orderB;
  });

  const result: ExtendedPowItem[] = [];
  let idCounter = 1;

  // Build category groups with sub-items
  for (const catKey of sortedCategories) {
    const catItems = grouped.get(catKey)!;
    const catInfo = CATEGORY_MAP[catKey] || { name: catKey.toUpperCase(), order: 99, prefix: '' };

    // Sort sub-items by start_date
    catItems.sort((a, b) => a.start_date.localeCompare(b.start_date));

    // Create category summary row (level 1) — synthetic
    const catSummaryId = `cat_${catKey}_${idCounter++}`;
    result.push({
      id: catSummaryId,
      pekerjaan: `${catInfo.prefix} ${catInfo.name}`,
      duration: 0,  // will be recalculated
      start_date: isoToLocalDate(catItems[0].start_date),
      finish_date: isoToLocalDate(catItems[catItems.length - 1].finish_date),
      task_type: 'rolled_up_progress',
      level: 1,
      isSynthetic: true,
      workCategory: catKey,
    });

    // Add sub-items (level 2)
    let subIdx = 1;
    for (const item of catItems) {
      const subName = item.sub_category
        ? SUB_CATEGORY_MAP[item.sub_category] || item.sub_category
        : item.description || 'Task';

      result.push({
        id: `row_${idCounter++}`,
        backendId: item.id,
        pekerjaan: `${catInfo.prefix}${subIdx} ${subName}`,
        duration: item.duration,
        start_date: isoToLocalDate(item.start_date),
        finish_date: isoToLocalDate(item.finish_date),
        task_type: item.task_type || 'task',
        level: 2,
        isSynthetic: false,
        workCategory: item.work_category,
        subCategory: item.sub_category,
      });
      subIdx++;
    }
  }

  // Create root summary row (level 0) — synthetic
  if (result.length > 0) {
    const rootRow: ExtendedPowItem = {
      id: `root_${idCounter++}`,
      pekerjaan: rootLabel || 'OSP FO BACKBONE DAN RMJ',
      duration: 0, // will be recalculated
      start_date: result[0].start_date,
      finish_date: result[result.length - 1].finish_date,
      task_type: 'rolled_up_progress',
      level: 0,
      isSynthetic: true,
    };
    result.unshift(rootRow);
  }

  return result;
}

// ── Default data (fallback when API is unavailable) ────────────────────────────
const DEFAULT_ROWS: ExtendedPowItem[] = [
  { id: '1',  pekerjaan: 'OSP FO BACKBONE DAN RMJ',            duration: 365, start_date: '2025-10-17', finish_date: '2026-10-16', task_type: 'rolled_up_progress', level: 0, isSynthetic: true },
  { id: '2',  pekerjaan: '1. PREPARING',                       duration: 365, start_date: '2025-10-17', finish_date: '2026-10-16', task_type: 'rolled_up_progress', level: 1, isSynthetic: true, workCategory: 'preparing' },
  { id: '3',  pekerjaan: '1.1 Kick Off Meeting',               duration: 2,   start_date: '2025-10-22', finish_date: '2025-10-23', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'preparing', subCategory: 'kom' },
  { id: '4',  pekerjaan: '1.2 Survey',                         duration: 16,  start_date: '2025-10-27', finish_date: '2025-11-11', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'preparing', subCategory: 'survey' },
  { id: '5',  pekerjaan: '1.3 DRM',                            duration: 3,   start_date: '2025-12-03', finish_date: '2025-12-05', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'preparing', subCategory: 'drm' },
  { id: '6',  pekerjaan: '2. MATERIAL DELIVERY',               duration: 30,  start_date: '2025-12-06', finish_date: '2026-01-04', task_type: 'rolled_up_progress', level: 1, isSynthetic: true, workCategory: 'material' },
  { id: '7',  pekerjaan: '2.1 Fabrikasi Material',             duration: 30,  start_date: '2025-12-06', finish_date: '2026-01-04', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'material', subCategory: 'fabrication' },
  { id: '8',  pekerjaan: '2.2 Delivery material HDPE',         duration: 15,  start_date: '2026-01-06', finish_date: '2026-01-20', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'material', subCategory: 'delivery_hdpe' },
  { id: '9',  pekerjaan: '2.3 Delivery material Kabel',        duration: 15,  start_date: '2026-01-21', finish_date: '2026-02-04', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'material', subCategory: 'delivery_kabel' },
  { id: '10', pekerjaan: '3. INSTALASI & UJI TERIMA',          duration: 315, start_date: '2025-12-06', finish_date: '2026-10-16', task_type: 'rolled_up_progress', level: 1, isSynthetic: true, workCategory: 'installation' },
  { id: '11', pekerjaan: '3.1 Pengurusan Ijin Kerja',          duration: 120, start_date: '2025-12-06', finish_date: '2026-04-04', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'pengurusan_ijin' },
  { id: '12', pekerjaan: '3.2 Penggalian Tanah Penanaman HDPE',duration: 140, start_date: '2026-04-05', finish_date: '2026-08-22', task_type: 'rolled_up_task',    level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'penggalian_tanah' },
  { id: '13', pekerjaan: '3.3 Pembuatan MH dan Jembatan',      duration: 10,  start_date: '2026-08-23', finish_date: '2026-09-01', task_type: 'progress',          level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'pembuatan_mh' },
  { id: '14', pekerjaan: '3.4 Penarikan Kabel',                duration: 23,  start_date: '2026-09-02', finish_date: '2026-09-24', task_type: 'progress',          level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'penarikan_kabel' },
  { id: '15', pekerjaan: '3.5 Joint & Terminasi',              duration: 8,   start_date: '2026-09-25', finish_date: '2026-10-02', task_type: 'progress',          level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'joint_terminasi' },
  { id: '16', pekerjaan: '3.6 Test & Commissioning',           duration: 7,   start_date: '2026-10-03', finish_date: '2026-10-09', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'installation', subCategory: 'test_commissioning' },
  { id: '17', pekerjaan: '4. CLOSING',                         duration: 7,   start_date: '2026-10-10', finish_date: '2026-10-16', task_type: 'rolled_up_progress', level: 1, isSynthetic: true, workCategory: 'closing' },
  { id: '18', pekerjaan: '4.1 Pelaksanaan Uji Terima',         duration: 7,   start_date: '2026-10-10', finish_date: '2026-10-16', task_type: 'task',              level: 2, isSynthetic: false, workCategory: 'closing', subCategory: 'pelaksanaan_uji' },
];

// ── Inline Date Input Cell ─────────────────────────────────────────────────────
interface DateCellProps {
  value: string;           // ISO string 'YYYY-MM-DD'
  rowId: string;
  field: 'start_date' | 'finish_date';
  onChange: (id: string, field: 'start_date' | 'finish_date', value: string) => void;
  disabled?: boolean;
}

function DateCell({ value, rowId, field, onChange, disabled }: DateCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    if (draft && draft !== value) onChange(rowId, field, draft);
    setEditing(false);
  };

  if (disabled) {
    return (
      <div
        style={{
          fontSize: 11,
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          height: '100%',
          padding: '0 4px',
          fontWeight: 700,
        }}
      >
        <Calendar style={{ width: 11, height: 11, opacity: 0.45, flexShrink: 0 }} />
        {fmtDate(value)}
      </div>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          border: '1.5px solid #3b82f6',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: 11,
          color: '#1e293b',
          background: '#eff6ff',
          outline: 'none',
          width: '100%',
          cursor: 'text',
        }}
      />
    );
  }

  return (
    <div
      title="Klik untuk edit tanggal"
      onClick={() => setEditing(true)}
      style={{
        fontSize: 11,
        color: '#475569',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        height: '100%',
        padding: '0 4px',
        borderRadius: 4,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Calendar style={{ width: 11, height: 11, opacity: 0.45, flexShrink: 0 }} />
      {fmtDate(value)}
    </div>
  );
}

// ── Inline Duration Input Cell ─────────────────────────────────────────────────
interface DurationCellProps {
  value: number;
  rowId: string;
  onChange: (id: string, duration: number) => void;
  disabled?: boolean;
}

function DurationCell({ value, rowId, onChange, disabled }: DurationCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 0 && n !== value) onChange(rowId, n);
    setEditing(false);
  };

  if (disabled) {
    return (
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          width: '100%',
          height: '100%',
        }}
      >
        {value} <span style={{ fontSize: 10, opacity: 0.55 }}>d</span>
      </div>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          border: '1.5px solid #8b5cf6',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: 12,
          color: '#1e293b',
          background: '#f5f3ff',
          outline: 'none',
          width: '100%',
          textAlign: 'center',
        }}
      />
    );
  }

  return (
    <div
      title="Klik untuk edit durasi"
      onClick={() => setEditing(true)}
      style={{
        fontWeight: 600,
        fontSize: 12,
        color: '#475569',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        width: '100%',
        height: '100%',
        borderRadius: 4,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#faf5ff')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {value} <span style={{ fontSize: 10, opacity: 0.55 }}>d</span>
    </div>
  );
}

// ── Animated Gantt Bar ─────────────────────────────────────────────────────────
function GanttBar({ row }: { row: StaticPowItem }) {
  const start  = parseLocalDate(row.start_date);
  const finish = parseLocalDate(row.finish_date);
  const left   = daysBetween(TIMELINE_START, start) * DAY_PX;
  const width  = Math.max((daysBetween(start, finish) + 1) * DAY_PX, 6);
  const style  = getGanttStyle(row.task_type);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          position:     'absolute',
          left,
          width,
          height:       12,
          background:   style.bg,
          borderRadius: 12,
          boxShadow:    style.shadow,
          /* smooth glide on every change */
          transition:   'left 0.45s cubic-bezier(0.34,1.56,0.64,1), width 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          cursor:       'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scaleY(1.35) scaleX(1.02)';
          e.currentTarget.style.filter    = 'brightness(1.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.filter    = '';
        }}
      />
    </div>
  );
}

// ── Timeline Header (Quarter + Month) ─────────────────────────────────────────
function GanttTimelineHeader() {
  return (
    <div style={{ width: TOTAL_WIDTH, position: 'relative', height: 60, background: '#f8fafc' }}>
      {QUARTER_DEFS.map(q => (
        <div
          key={q.label}
          style={{
            position: 'absolute', left: q.startPx, top: 0,
            width: q.widthPx, height: 30,
            borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 0.5,
            background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)',
          }}
        >
          {q.label}
        </div>
      ))}
      {MONTHS.map(m => (
        <div
          key={m.label + m.startPx}
          style={{
            position: 'absolute', left: m.startPx, top: 30,
            width: m.widthPx, height: 30,
            borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: '#64748b', background: '#ffffff',
          }}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────
interface RowProps {
  row: StaticPowItem;
  index: number;
  onDateChange: (id: string, field: 'start_date' | 'finish_date', value: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

const PINNED_WIDTH = 50 + 320 + 90 + 110 + 110; // No + Pekerjaan + Dur + Start + Finish

function POWRow({ row, index, onDateChange, onDurationChange }: RowProps) {
  const isSummary = row.task_type === 'rolled_up_progress';
  const bg = isSummary
    ? '#e8f0fb'
    : index % 2 === 0 ? '#f8fafd' : '#ffffff';

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
    <div style={{ display: 'flex', background: bg, borderBottom: isSummary ? '1px solid #b8cce8' : undefined }}>
      {/* No */}
      <div style={{ ...cellBase, width: 50, justifyContent: 'center', fontWeight: isSummary ? 700 : 500, fontSize: 12, color: '#64748b' }}>
        {index + 1}
      </div>

      {/* Pekerjaan */}
      <div style={{
        ...cellBase, width: 320,
        fontWeight: isSummary ? 700 : 500, fontSize: 12,
        color: isSummary ? '#0f172a' : '#334155',
        paddingLeft: row.level === 0 ? 16 : row.level === 1 ? 32 : 48,
        background: isSummary ? '#e8f0fb' : 'transparent',
      }}>
        {row.pekerjaan}
      </div>

      {/* Duration — inline editable */}
      <div style={{ ...cellBase, width: 90 }}>
        <DurationCell
          value={row.duration}
          rowId={row.id}
          onChange={onDurationChange}
          disabled={isSummary}
        />
      </div>

      {/* Start — inline editable */}
      <div style={{ ...cellBase, width: 110 }}>
        <DateCell
          value={row.start_date}
          rowId={row.id}
          field="start_date"
          onChange={onDateChange}
          disabled={isSummary}
        />
      </div>

      {/* Finish — inline editable */}
      <div style={{ ...cellBase, width: 110 }}>
        <DateCell
          value={row.finish_date}
          rowId={row.id}
          field="finish_date"
          onChange={onDateChange}
          disabled={isSummary}
        />
      </div>

      {/* Gantt */}
      <div style={{ ...cellBase, width: TOTAL_WIDTH, borderRight: 'none' }}>
        <GanttBar row={row} />
      </div>
    </div>
  );
}

const base64ToFile = (base64String: string, filename: string): File => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// Helper to recalculate roll-up values (start, finish, duration) bottom-up
function recalculateRollups(items: ExtendedPowItem[]): ExtendedPowItem[] {
  const newItems = items.map(item => ({ ...item }));

  // Recalculate level 1 summary rows based on their level 2 subtasks
  for (let i = 0; i < newItems.length; i++) {
    const parent = newItems[i];
    if (parent.level === 1 && parent.task_type === 'rolled_up_progress') {
      const children: ExtendedPowItem[] = [];
      for (let j = i + 1; j < newItems.length; j++) {
        const child = newItems[j];
        if (child.level > parent.level) {
          if (child.level === 2) {
            children.push(child);
          }
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

  // Recalculate level 0 summary rows based on all level 1 summary rows
  for (let i = 0; i < newItems.length; i++) {
    const root = newItems[i];
    if (root.level === 0 && root.task_type === 'rolled_up_progress') {
      const children: ExtendedPowItem[] = [];
      for (let j = i + 1; j < newItems.length; j++) {
        const child = newItems[j];
        if (child.level === 1 && child.task_type === 'rolled_up_progress') {
          children.push(child);
        }
      }

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
}

interface GanttTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function GanttTooltip({ active, payload, label }: GanttTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  let planDuration = 0;
  for (const p of payload) {
    if (p.dataKey === 'planDuration') planDuration = p.value ?? 0;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[200px]">
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-6 text-xs">
        <span className="text-gray-500">Planned Duration:</span>
        <span className="font-bold text-blue-600">{planDuration} days</span>
      </div>
    </div>
  );
}

export function TabPOW({ contractId, linkId, linkName }: TabPOWProps) {
  const [rows, setRows]           = useState<ExtendedPowItem[]>(() => recalculateRollups(DEFAULT_ROWS));
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const isInitializingRef         = useRef(false);
  const [dataSource, setDataSource] = useState<'api' | 'default'>('default');

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerRole, setManagerRole] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [signedItemId, setSignedItemId] = useState<string | null>(null);
  const [showConfirmDeleteSig, setShowConfirmDeleteSig] = useState(false);

  const powName = linkName || linkId || 'Gantt Chart';

  const ganttData = useMemo(() => {
    const taskItems = rows.filter(r => !r.isSynthetic);
    if (taskItems.length === 0) return [];

    const allDates = taskItems.map(item => parseLocalDate(item.start_date));
    const taskFinishes = taskItems.map(item => parseLocalDate(item.finish_date));
    allDates.push(...taskFinishes);

    if (allDates.length === 0) return [];
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    minDate.setDate(minDate.getDate() - 2);

    const offset = (d: string) => {
      if (!d) return 0;
      const dateVal = parseLocalDate(d);
      return Math.max(daysBetween(minDate, dateVal), 0);
    };

    const dur = (s: string, e: string) => {
      if (!s || !e) return 0;
      const start = parseLocalDate(s);
      const end = parseLocalDate(e);
      return Math.max(daysBetween(start, end) + 1, 1);
    };

    return taskItems.map(item => {
      const name = item.pekerjaan;
      return {
        name: name.length > 25 ? name.substring(0, 23) + '…' : name,
        planOffset: offset(item.start_date),
        planDuration: dur(item.start_date, item.finish_date),
      };
    });
  }, [rows]);


  // ── Fetch POW data from backend ──────────────────────────────────────────────
  const fetchPowData = useCallback(async (showToast = false) => {
    if (!linkName) return;
    setIsLoading(true);
    try {
      console.log('📡 Fetching POW DRM data for:', linkName);
      const backendItems = await powDrmService.getByLinkName(linkName);
      console.log('✅ POW DRM data fetched:', backendItems.length, 'items');

      let foundName = '';
      let foundRole = '';
      let foundSig = '';
      let foundSigItemId = '';

      if (backendItems.length > 0) {
        const transformed = transformBackendToFrontend(backendItems, powName);
        setRows(recalculateRollups(transformed));
        setDataSource('api');

        // Look for any item that has signature_path
        const signedItem = backendItems.find(item => item.signature_path);
        if (signedItem) {
          foundName = signedItem.signature_name || '';
          foundRole = signedItem.signature_jabatan || '';
          if (signedItem.signature_path) {
            foundSig = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${signedItem.signature_path.replace('uploads/', '')}`;
          }
          foundSigItemId = signedItem.id;
        }

        if (showToast) toast.success(`Data POW dimuat dari server (${backendItems.length} item)`);
      } else {
        // No data from backend — auto initialize default rows to backend
        if (!isInitializingRef.current) {
          isInitializingRef.current = true;
          setIsInitializing(true);
          console.log('ℹ️ No POW DRM data found, auto-initializing default rows to backend...');
          try {
            const nonSyntheticRows = DEFAULT_ROWS.filter(row => !row.isSynthetic);
            const createdItems: PowDrmItem[] = [];
            for (const row of nonSyntheticRows) {
              const payload = {
                pow_name: linkName,
                ss_link: linkId,
                work_category: row.workCategory || 'preparing',
                sub_category: row.subCategory || null,
                start_date: localDateToISO(row.start_date),
                finish_date: localDateToISO(row.finish_date),
                task_type: row.task_type || 'task',
                description: row.pekerjaan,
              };
              const newItem = await powDrmService.create(payload);
              createdItems.push(newItem);
            }
            console.log('✅ Auto-initialization completed:', createdItems.length, 'items');
            if (showToast) toast.success('Berhasil menginisialisasi data POW baru ke database!');
            
            const transformed = transformBackendToFrontend(createdItems, powName);
            setRows(recalculateRollups(transformed));
            setDataSource('api');
          } catch (initErr: any) {
            console.error('❌ Failed to auto-initialize:', initErr);
            setRows(recalculateRollups(DEFAULT_ROWS));
            setDataSource('default');
            if (showToast) toast.error('Gagal inisialisasi data otomatis: ' + (initErr.message || 'Unknown error'));
          } finally {
            setIsInitializing(false);
            isInitializingRef.current = false;
          }
        }
      }

      setManagerName(foundName || localStorage.getItem(`pow_sig_name_${linkId}`) || '');
      setManagerRole(foundRole || localStorage.getItem(`pow_sig_role_${linkId}`) || '');
      setSignatureData(foundSig || localStorage.getItem(`pow_sig_${linkId}`) || '');
      setSignedItemId(foundSigItemId || null);
    } catch (err: any) {
      console.error('❌ Failed to fetch POW DRM data:', err);
      // Fallback to default rows
      setRows(recalculateRollups(DEFAULT_ROWS));
      setDataSource('default');
      setManagerName(localStorage.getItem(`pow_sig_name_${linkId}`) || '');
      setManagerRole(localStorage.getItem(`pow_sig_role_${linkId}`) || '');
      setSignatureData(localStorage.getItem(`pow_sig_${linkId}`) || '');
      setSignedItemId(null);
      if (showToast) toast.error('Gagal memuat data dari server: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [linkName, powName, linkId]);

  // Fetch on mount or when linkName changes
  useEffect(() => {
    fetchPowData();
  }, [fetchPowData]);

  // ── Database Initialization ──────────────────────────────────────────────────
  const handleInitializeBackend = async () => {
    if (!linkName || !linkId) {
      toast.error('Gagal inisialisasi: link tidak valid');
      return;
    }
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setIsInitializing(true);
    try {
      const nonSyntheticRows = DEFAULT_ROWS.filter(row => !row.isSynthetic);
      let count = 0;
      for (const row of nonSyntheticRows) {
        const payload = {
          pow_name: linkName,
          ss_link: linkId,
          work_category: row.workCategory || 'preparing',
          sub_category: row.subCategory || null,
          start_date: localDateToISO(row.start_date),
          finish_date: localDateToISO(row.finish_date),
          task_type: row.task_type || 'task',
          description: row.pekerjaan,
        };
        await powDrmService.create(payload);
        count++;
      }
      toast.success(`Inisialisasi berhasil! ${count} item disimpan ke server.`);
      fetchPowData(true);
    } catch (err: any) {
      console.error('❌ Failed to initialize POW DRM data:', err);
      toast.error('Gagal menginisialisasi data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsInitializing(false);
      isInitializingRef.current = false;
    }
  };

  const handleReset = () => {
    fetchPowData(true);
  };

  // ── Schedule Editor Modal Handler ─────────────────────────────────────────────
  const handleSaveSchedule = async (row: ExtendedPowItem, startDate: string, finishDate: string, duration: number) => {
    try {
      setIsLoading(true);
      if (row.backendId) {
        // Real database row - direct update
        await powDrmService.update(row.backendId, {
          start_date: localDateToISO(startDate),
          finish_date: localDateToISO(finishDate),
          duration,
        });
        toast.success('Jadwal berhasil diperbarui');
        await fetchPowData(false);
      } else {
        // Default template row (not yet in DB) - initialize first, then update
        console.log('ℹ️ Template row edited. Initializing backend first...');
        const nonSyntheticRows = DEFAULT_ROWS.filter(r => !r.isSynthetic);
        
        for (const defaultRow of nonSyntheticRows) {
          // Determine if this is the row the user edited
          const isTarget = defaultRow.workCategory === row.workCategory && defaultRow.subCategory === row.subCategory;
          
          const payload = {
            pow_name: linkName || 'POW Project',
            ss_link: linkId,
            work_category: defaultRow.workCategory || 'preparing',
            sub_category: defaultRow.subCategory || null,
            start_date: localDateToISO(isTarget ? startDate : defaultRow.start_date),
            finish_date: localDateToISO(isTarget ? finishDate : defaultRow.finish_date),
            task_type: defaultRow.task_type || 'task',
            description: defaultRow.pekerjaan,
          };
          
          await powDrmService.create(payload);
        }
        
        toast.success('Jadwal berhasil diperbarui & disimpan');
        await fetchPowData(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan perubahan: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Inline edit handlers (replaces the schedule modal) ───────────────────────
  const handleInlineDurationChange = (id: string, duration: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const start  = parseLocalDate(row.start_date);
    const finish = addDays(start, duration - 1);
    handleSaveSchedule(row, row.start_date, toISOLocal(finish), duration);
  };

  const handleInlineDateChange = (id: string, field: 'start_date' | 'finish_date', value: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    if (field === 'start_date') {
      // Keep duration constant, shift finish accordingly
      const start  = parseLocalDate(value);
      const finish = addDays(start, row.duration - 1);
      handleSaveSchedule(row, value, toISOLocal(finish), row.duration);
    } else {
      // Recalculate duration from new finish date
      const start  = parseLocalDate(row.start_date);
      const finish = parseLocalDate(value);
      if (finish < start) {
        toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai');
        return;
      }
      const duration = daysBetween(start, finish) + 1;
      handleSaveSchedule(row, row.start_date, value, duration);
    }
  };

  // ── Signature ────────────────────────────────────────────────────────────────
  const handleSaveSignature = async (name: string, role: string, sig: string) => {
    if (dataSource === 'default') {
      toast.error('Silakan inisialisasi data POW ke server terlebih dahulu sebelum menandatangani.');
      return;
    }

    const firstActiveTask = rows.find(r => !r.isSynthetic && r.backendId);
    if (!firstActiveTask || !firstActiveTask.backendId) {
      toast.error('Gagal menandatangani: tidak ada pekerjaan aktif yang tersimpan.');
      return;
    }

    setIsLoading(true);
    try {
      const file = base64ToFile(sig, 'signature.png');
      const targetId = firstActiveTask.backendId;
      console.log('📡 Uploading signature to item ID:', targetId);
      await powDrmService.uploadSignature(targetId, file, name, role);

      // Save to local storage as fallback
      localStorage.setItem(`pow_sig_name_${linkId}`, name);
      localStorage.setItem(`pow_sig_role_${linkId}`, role);
      localStorage.setItem(`pow_sig_${linkId}`, sig);

      toast.success('Tanda tangan berhasil disimpan ke server');
      fetchPowData(false);
    } catch (err: any) {
      console.error('❌ Upload signature failed:', err);
      toast.error('Gagal menyimpan tanda tangan ke server: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    } finally {
      setShowSignatureModal(false);
    }
  };

  const handleDeleteSignature = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening signature modal
    setShowConfirmDeleteSig(true);
  };

  const executeDeleteSignature = async () => {

    if (!signedItemId) {
      // Clear local state and localStorage if not yet stored in DB
      localStorage.removeItem(`pow_sig_name_${linkId}`);
      localStorage.removeItem(`pow_sig_role_${linkId}`);
      localStorage.removeItem(`pow_sig_${linkId}`);
      setManagerName('');
      setManagerRole('');
      setSignatureData('');
      toast.success('Tanda tangan lokal dibersihkan');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📡 Deleting signature from item ID:', signedItemId);
      await powDrmService.deleteSignature(signedItemId);

      localStorage.removeItem(`pow_sig_name_${linkId}`);
      localStorage.removeItem(`pow_sig_role_${linkId}`);
      localStorage.removeItem(`pow_sig_${linkId}`);

      setManagerName('');
      setManagerRole('');
      setSignatureData('');
      setSignedItemId(null);
      toast.success('Tanda tangan berhasil dihapus dari server');
      fetchPowData(false);
    } catch (err: any) {
      console.error('❌ Delete signature failed:', err);
      toast.error('Gagal menghapus tanda tangan dari server: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generatePOWPDF(rows, powName, managerName, managerRole, signatureData);
      toast.success('PDF berhasil diexport');
    } catch (err: any) {
      toast.error('Gagal export PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // ── Column header widths must match POWRow ────────────────────────────────────
  const HEADER_COLS = [
    { label: 'No',       width: 50,  align: 'center' as const },
    { label: 'Pekerjaan',width: 320, align: 'left'   as const },
    { label: 'Duration', width: 90,  align: 'center' as const },
    { label: 'Start',    width: 110, align: 'left'   as const },
    { label: 'Finish',   width: 110, align: 'left'   as const },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">

      {/* ── Loading Overlay ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(2px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Memuat data POW…</span>
          </div>
        </div>
      )}

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">POW — {powName}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
            Program of Work &nbsp;·&nbsp;
            {dataSource === 'api' ? (
              <span className="text-emerald-500">✓ Data dari server</span>
            ) : (
              <span className="text-amber-500">⚠ Template default (belum ada data di server)</span>
            )}
            &nbsp;·&nbsp;
            <span className="text-blue-500">Klik kolom Duration / Start / Finish pada sub-pekerjaan untuk edit langsung (Timeline &amp; Summary otomatis update)</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <FileText className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition flex items-center gap-2 shadow-sm active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Recharts Gantt Chart ── */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-bold text-gray-800">DRM POW Gantt Timeline</h4>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-500">Planned</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading POW data...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={ganttData} barGap={4} margin={{ top: 10, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={180} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                    content={<GanttTooltip />}
                  />
                  <Bar dataKey="planOffset"   stackId="plan"   fill="transparent" />
                  <Bar dataKey="planDuration" stackId="plan"   fill="#3b82f6" radius={[4,4,4,4]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Custom Table ─────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <div style={{ minWidth: PINNED_WIDTH + TOTAL_WIDTH }}>

          {/* Table Header */}
          <div style={{
            display: 'flex',
            background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)',
            borderBottom: '2px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            {HEADER_COLS.map(col => (
              <div
                key={col.label}
                style={{
                  width: col.width,
                  flexShrink: 0,
                  height: 62,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                  paddingLeft: col.align === 'left' ? 10 : 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#334155',
                  letterSpacing: 0.4,
                  borderRight: '1px solid #e2e8f0',
                  textTransform: 'uppercase',
                }}
              >
                {col.label}
                {(col.label === 'Duration' || col.label === 'Start' || col.label === 'Finish') && (
                  <span style={{ marginLeft: 4, fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>✏️</span>
                )}
              </div>
            ))}

            {/* Timeline header */}
            <div style={{ flexShrink: 0 }}>
              <GanttTimelineHeader />
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, index) => (
            <POWRow
              key={row.id}
              row={row}
              index={index}
              onDateChange={handleInlineDateChange}
              onDurationChange={handleInlineDurationChange}
            />
          ))}
        </div>
      </div>

      {/* ── Legend & Signature ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50/60">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Signature */}
          <button
            onClick={() => setShowSignatureModal(true)}
            className={`md:col-span-3 rounded-2xl p-5 flex flex-col items-center justify-between h-36 w-full text-left transition-all duration-300 ${
              signatureData
                ? 'border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                : 'border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 bg-gray-50/30'
            } shadow-sm cursor-pointer relative overflow-hidden group`}
          >
            {signatureData && (
              <button
                type="button"
                onClick={handleDeleteSignature}
                title="Hapus Tanda Tangan"
                className="absolute top-2 right-2 p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {!signatureData && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            {signatureData ? (
              <>
                <div className="text-center font-bold text-gray-500 text-[10px] tracking-widest uppercase w-full">
                  {managerRole || 'JUNIOR PROJECT MANAGER'}
                </div>
                <div className="my-1 relative flex items-center justify-center w-40 h-12">
                  <img src={signatureData} alt="Signature" className="w-full h-full object-contain select-none pointer-events-none" />
                </div>
                <div className="text-center font-bold text-gray-800 text-xs tracking-wide w-full truncate">
                  {managerName || 'DANNY TRIHARTIWANDI'}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full text-gray-400 gap-2">
                <PenTool className="w-6 h-6 text-gray-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-500">Klik untuk Tanda Tangan</span>
              </div>
            )}
          </button>

          {/* Legend */}
          <div className="md:col-span-9 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-center content-start h-36 overflow-y-auto">
            <div className="w-full mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chart Legend</span>
            </div>
            <LegendItem label="Rolled Up Progress" type="rolled_up_progress" />
            <LegendItem label="Task"               type="task"               />
            <LegendItem label="Rolled Up Task"     type="rolled_up_task"     />
            <LegendItem label="Progress"           type="progress"           />
          </div>
        </div>
      </div>

      {/* ── Signature Modal ──────────────────────────────────────────────────── */}
      <POWSignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        initialName={managerName}
        initialRole={managerRole}
      />

      <ConfirmModal
        isOpen={showConfirmDeleteSig}
        onClose={() => setShowConfirmDeleteSig(false)}
        onConfirm={executeDeleteSignature}
        title="Hapus Tanda Tangan"
        message="Apakah Anda yakin ingin menghapus tanda tangan dari server?"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}

// ── Legend Item ────────────────────────────────────────────────────────────────
function LegendItem({ label, type }: { label: string; type: string }) {
  const style = getGanttStyle(type.replace('-', '_'));
  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all duration-300 cursor-default shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div style={{ width: 24, height: 10, background: style.bg, borderRadius: 12, boxShadow: style.shadow }} />
      <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{label}</span>
    </div>
  );
}

// ── Signature Modal ────────────────────────────────────────────────────────────
interface POWSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave:  (name: string, role: string, signature: string) => void;
  initialName: string;
  initialRole: string;
}

function POWSignatureModal({ isOpen, onClose, onSave, initialName, initialRole }: POWSignatureModalProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || 'DANNY TRIHARTIWANDI');
      setRole(initialRole || 'Junior Project Manager');
    }
  }, [isOpen, initialName, initialRole]);

  const handleClear = () => sigCanvasRef.current?.clear();

  const handleSave = () => {
    if (!name.trim())  { toast.warning('Nama Lengkap wajib diisi'); return; }
    if (!role.trim())  { toast.warning('Jabatan wajib diisi'); return; }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast.warning('Silakan buat tanda tangan terlebih dahulu'); return;
    }
    onSave(name.trim(), role.trim(), sigCanvasRef.current.toDataURL());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden m-4">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Tanda Tangan POW</h3>
            <p className="text-xs text-gray-500 mt-0.5">Lengkapi data dan gambar tanda tangan Anda di area di bawah ini</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Lengkap"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Jabatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Jabatan"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Tanda Tangan <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 shadow-inner">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{ className: 'w-full h-48 cursor-crosshair', style: { touchAction: 'none' } }}
                backgroundColor="rgba(0,0,0,0)"
              />
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Gunakan mouse atau touchscreen untuk menggambar tanda tangan
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button onClick={handleClear} className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-red-700 transition">
            Hapus Coretan
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Batal
            </button>
            <button onClick={handleSave} className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm">
              <Check className="w-3.5 h-3.5" />
              Simpan &amp; Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
