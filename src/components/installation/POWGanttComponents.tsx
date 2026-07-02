// POW Gantt Chart Components - Inline editable cells
import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
// ── Inline Date Input Cell ─────────────────────────────────────────────────────
interface DateCellProps {
  value: string;           // ISO string 'YYYY-MM-DD'
  rowId: string;
  field: 'start_date' | 'finish_date';
  onChange: (id: string, field: 'start_date' | 'finish_date', value: string) => void;
  disabled?: boolean;
}

export function DateCell({ value, rowId, field, onChange, disabled }: DateCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    if (draft && draft !== value) onChange(rowId, field, draft);
    setEditing(false);
  };

  const fmtDate = (iso: string) => {
    if (!iso || iso.startsWith('1900-01-01')) return '-';
    const [year, month, day] = iso.split('T')[0].split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = String(d.getFullYear()).slice(-2);
    return `${dayName} ${dayStr}/${monthStr}/${yearStr}`;
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
        value={draft.split('T')[0]}
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

export function DurationCell({ value, rowId, onChange, disabled }: DurationCellProps) {
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
interface GanttBarProps {
  start_date: string;
  finish_date: string;
  task_type: string;
  TIMELINE_START: Date;
  DAY_PX: number;
  // Actual date bar (optional)
  actual_start?: string | null;
  actual_end?: string | null;
}

export function GanttBar({ start_date, finish_date, task_type, TIMELINE_START, DAY_PX, actual_start, actual_end }: GanttBarProps) {
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    // Strip SurrealDB wrapper d'...'
    const cleaned = dateStr.replace(/^d'|'$/g, '');
    const [year, month, day] = cleaned.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const daysBetween = (a: Date, b: Date): number => {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  };

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

  const start  = parseLocalDate(start_date);
  const finish = parseLocalDate(finish_date);
  const left   = daysBetween(TIMELINE_START, start) * DAY_PX;
  const width  = Math.max((daysBetween(start, finish) + 1) * DAY_PX, 6);
  const style  = getGanttStyle(task_type);

  // Actual bar
  const hasActual = !!(actual_start && actual_end);
  let actualLeft = 0, actualWidth = 0;
  if (hasActual) {
    const aStart  = parseLocalDate(actual_start!);
    const aFinish = parseLocalDate(actual_end!);
    actualLeft  = daysBetween(TIMELINE_START, aStart) * DAY_PX;
    actualWidth = Math.max((daysBetween(aStart, aFinish) + 1) * DAY_PX, 6);
  }

  // If has actual, plan bar is thinner and actual bar shows below
  const planBarHeight  = hasActual ? 7  : 12;
  const planBarTop     = hasActual ? -4 : 0;   // shift up slightly when paired
  const actualBarTop   = 4;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      {/* Plan bar */}
      <div
        style={{
          position:     'absolute',
          left,
          width,
          height:       planBarHeight,
          top:          `calc(50% + ${planBarTop}px)`,
          transform:    'translateY(-50%)',
          background:   style.bg,
          borderRadius: 12,
          boxShadow:    style.shadow,
          transition:   'left 0.45s cubic-bezier(0.34,1.56,0.64,1), width 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          cursor:       'default',
          opacity:      hasActual ? 0.55 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-50%) scaleY(1.35)'; e.currentTarget.style.filter = 'brightness(1.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(-50%)'; e.currentTarget.style.filter = ''; }}
      />

      {/* Actual bar (green, below plan bar) */}
      {hasActual && (
        <div
          title={`Actual: ${actual_start?.replace(/^d'|'$/g, '').split('T')[0]} → ${actual_end?.replace(/^d'|'$/g, '').split('T')[0]}`}
          style={{
            position:     'absolute',
            left:         actualLeft,
            width:        actualWidth,
            height:       5,
            top:          `calc(50% + ${actualBarTop}px)`,
            transform:    'translateY(-50%)',
            background:   'linear-gradient(135deg, #059669 0%, #34d399 100%)',
            borderRadius: 12,
            boxShadow:    '0 2px 6px rgba(5,150,105,0.40)',
            transition:   'left 0.45s cubic-bezier(0.34,1.56,0.64,1), width 0.45s cubic-bezier(0.34,1.56,0.64,1)',
            cursor:       'default',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-50%) scaleY(1.6)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(-50%)'; e.currentTarget.style.filter = ''; }}
        />
      )}
    </div>
  );
}

// ── Timeline Header (Quarter + Month) ─────────────────────────────────────────
interface TimelineHeaderProps {
  TOTAL_WIDTH: number;
  QUARTER_DEFS: Array<{ label: string; startPx: number; widthPx: number }>;
  MONTHS: Array<{ label: string; startPx: number; widthPx: number }>;
}

export function GanttTimelineHeader({ TOTAL_WIDTH, QUARTER_DEFS, MONTHS }: TimelineHeaderProps) {
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

// ── Read-only Actual Date Cell (same style as DateCell disabled, but green) ────
interface ActualDateCellProps {
  value?: string | null; // ISO datetime or YYYY-MM-DD
}

export function ActualDateCell({ value }: ActualDateCellProps) {
  const fmtDate = (iso: string): string => {
    if (!iso || iso.startsWith('1900-01-01')) return '-';
    try {
      // Strip SurrealDB datetime wrapper: d'2026-06-20T08:10:00Z' → 2026-06-20T08:10:00Z
      const cleaned = iso.replace(/^d'|'$/g, '');
      // Parse only the date portion to avoid timezone shift
      const datePart = cleaned.split('T')[0]; // "2026-06-20"
      const parts = datePart.split('-');
      if (parts.length !== 3) return '-';
      const year  = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day   = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return '-';
      // Build date using local constructor (no timezone shift)
      const d = new Date(year, month - 1, day);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[d.getDay()];
      const dayStr   = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr  = String(d.getFullYear()).slice(-2);
      return `${dayName} ${dayStr}/${monthStr}/${yearStr}`;
    } catch {
      return '-';
    }
  };

  const hasValue = !!(value && value.trim() !== '' && !value.replace(/^d'|'$/g, '').startsWith('1900-01-01'));

  return (
    <div
      style={{
        fontSize: 11,
        color: hasValue ? '#047857' : '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        height: '100%',
        padding: '0 4px',
        fontWeight: hasValue ? 600 : 400,
      }}
    >
      <Calendar style={{ width: 11, height: 11, opacity: hasValue ? 0.6 : 0.3, flexShrink: 0, color: hasValue ? '#047857' : '#94a3b8' }} />
      {hasValue ? fmtDate(value!) : '-'}
    </div>
  );
}
