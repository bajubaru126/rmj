import { Check, ChevronRight, Clock, Minus, AlertTriangle, BarChart2, FileText, MapPin } from 'lucide-react';

/* ─── Types ────────────────────────────────────────────── */
type StageId = 'survey' | 'drm' | 'instalasi';
type DocStatus = 'ok' | 'bad' | 'wait' | 'none';
type DocEntry = { label: string; tab: string; status: DocStatus; detail: string };

interface TabOverviewProps {
   activeStage: StageId;
   linkId: string;
   linkName: string;
   projectName: string;
   onTabChange?: (tab: string) => void;
}

/* ─── Stage progress state (same as RuasDetails header) ─── */
const STAGE_STATE: Record<StageId, 'done' | 'active' | 'todo'> = {
   survey: 'done',
   drm: 'done',
   instalasi: 'active',
};

/* ─── Sub-step data (Instalasi only) ─── */
type Substep = {
   n: number; name: string; progress: number;
   status: 'done' | 'active' | 'todo'; color: string;
};
const SUBSTEPS: Substep[] = [
   { n: 1, name: 'Penggalian Jalur FO', progress: 100, status: 'done', color: '#16a34a' },
   { n: 2, name: 'Penanaman HDPE', progress: 100, status: 'done', color: '#16a34a' },
   { n: 3, name: 'Penggelaran Kabel FO', progress: 55, status: 'active', color: '#f59e0b' },
   { n: 4, name: 'Inst. Jembatan & Handhole', progress: 0, status: 'todo', color: '#c5cbd2' },
   { n: 5, name: 'Jointing & Terminasi', progress: 0, status: 'todo', color: '#c5cbd2' },
   { n: 6, name: 'Commissioning & Test', progress: 0, status: 'todo', color: '#c5cbd2' },
];

/* ─── Doc status icon mapping ─── */
const DOC_STATUS_COLORS: Record<DocStatus, { bg: string; text: string; icon: string }> = {
   ok:   { bg: 'rgba(22,163,74,0.10)', text: '#15803d', icon: '✓' },
   bad:  { bg: 'rgba(228,0,43,0.10)',  text: '#c00023', icon: '✗' },
   wait: { bg: 'rgba(245,158,11,0.12)', text: '#b45309', icon: '⏱' },
   none: { bg: '#f1f5f9',              text: '#94a3b8', icon: '—' },
};

/* ═══════════════════════════════════════════════════════════
   PhaseContextStrip — 3-column progress bars (shared)
═══════════════════════════════════════════════════════════ */
function PhaseContextStrip({ currentStage }: { currentStage: StageId }) {
   const phases: { id: StageId; label: string; hex: string; progress: number }[] = [
      { id: 'survey', label: 'Survey', hex: '#2563eb', progress: 100 },
      { id: 'drm', label: 'DRM', hex: '#7c5cfc', progress: 100 },
      { id: 'instalasi', label: 'Instalasi', hex: '#f59e0b', progress: 42 },
   ];

   return (
      <div className="flex items-stretch rounded-xl border border-gray-200 bg-white overflow-hidden">
         {phases.map((p, i) => {
            const state = STAGE_STATE[p.id];
            const isDone = state === 'done';
            const isActive = state === 'active';
            const isCurrent = p.id === currentStage;
            return (
               <div
                  key={p.id}
                  className={`flex-1 relative px-4 py-3 ${i > 0 ? 'border-l border-gray-200' : ''} ${isCurrent ? 'bg-gray-50/50' : ''}`}
               >
                  {/* Top accent line for current stage */}
                  {isCurrent && <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: p.hex }} />}

                  <div className="flex items-center justify-between mb-1.5">
                     <div className="flex items-center gap-1.5">
                        <span
                           className="text-[10.5px] font-bold uppercase tracking-wider"
                           style={{ color: isCurrent ? p.hex : '#6b7280' }}
                        >
                           {p.label}
                        </span>
                        {isDone && <Check className="h-3 w-3 text-[#16a34a]" />}
                        {isActive && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: p.hex }} />}
                     </div>
                     <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{ color: isDone ? '#16a34a' : isActive ? p.hex : '#6b7280' }}
                     >
                        {isDone ? 'Selesai' : isActive ? `${p.progress}%` : '—'}
                     </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#e5e7eb' }}>
                     <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                           width: `${isDone ? 100 : p.progress}%`,
                           background: isDone ? '#16a34a' : p.hex,
                        }}
                     />
                  </div>
               </div>
            );
         })}
      </div>
   );
}

/* ═══════════════════════════════════════════════════════════
   DocStatusPanel — document status list (shared)
═══════════════════════════════════════════════════════════ */
function DocStatusPanel({ docs, onTab }: { docs: DocEntry[]; onTab: (t: string) => void }) {
   return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
         <div className="border-b border-gray-100 bg-gray-50/40 px-4 py-2.5">
            <span className="text-[12.5px] font-semibold text-gray-900">Status Dokumen</span>
         </div>
         <div className="divide-y divide-gray-100">
            {docs.map(d => {
               const c = DOC_STATUS_COLORS[d.status];
               return (
                  <button
                     key={d.label}
                     onClick={() => onTab(d.tab)}
                     className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                     {/* Status icon square */}
                     <span
                        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black"
                        style={{ background: c.bg, color: c.text }}
                     >
                        {c.icon}
                     </span>
                     <div className="flex-1 min-w-0">
                        <span className="text-[12.5px] font-medium text-gray-800">{d.label}</span>
                     </div>
                     <span className="shrink-0 text-[11px] font-semibold" style={{ color: c.text }}>
                        {d.detail}
                     </span>
                     <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  </button>
               );
            })}
         </div>
      </div>
   );
}

/* ═══════════════════════════════════════════════════════════
   SURVEY OVERVIEW
   Layout: KML Map Hero (3/5) + DocStatus (2/5) + Stats strip
═══════════════════════════════════════════════════════════ */
function SurveyOverview({ onTab }: { onTab: (t: string) => void }) {
   const surveyDocs: DocEntry[] = [
      { label: 'KML Survey', tab: 'kml', status: 'ok', detail: 'v3 · 5 Mar 2026' },
      { label: 'BOQ Survey', tab: 'boq', status: 'ok', detail: 'v3 · 6 item' },
      { label: 'Redline', tab: 'redline', status: 'ok', detail: 'v3 · 45 baris' },
      { label: 'Matrix', tab: 'matrix', status: 'ok', detail: 'v3 · 45 item' },
      { label: 'As Plan Drawing', tab: 'drawing', status: 'none', detail: 'Belum diupload' },
      { label: 'BA Survey', tab: 'ba-survey', status: 'ok', detail: 'Signed · 19 Feb' },
   ];

   return (
      <div className="space-y-4">
         <PhaseContextStrip currentStage="survey" />

         {/* KML map hero (3/5) + DocStatus (2/5) */}
         <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* KML Map placeholder */}
            <div className="lg:col-span-3">
               <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm h-full flex flex-col">
                  <div className="flex-1 min-h-[260px] bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 flex items-center justify-center">
                     <div className="text-center">
                        <MapPin className="h-10 w-10 mx-auto text-blue-300 mb-2" />
                        <p className="text-sm font-semibold text-blue-400">KML Survey Map</p>
                        <p className="text-[11px] text-blue-300 mt-0.5">120 / 141 titik ter-tagging</p>
                     </div>
                  </div>
                  <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                     <div>
                        <p className="text-[13px] font-semibold text-gray-900">KML Survey</p>
                        <p className="text-[11px] text-gray-500">120 / 141 titik ter-tagging · SPAN JT01</p>
                     </div>
                     <button
                        onClick={() => onTab('kml')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                        style={{ background: '#2563eb' }}
                     >
                        <MapPin className="h-3.5 w-3.5" />Buka KML
                     </button>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-2">
               <DocStatusPanel docs={surveyDocs} onTab={onTab} />
            </div>
         </div>

         {/* Stats strip — inline divide-x card */}
         <div className="flex flex-wrap items-center overflow-hidden rounded-xl border border-gray-200 bg-white divide-x divide-gray-200">
            {[
               { label: 'Titik Disurvei', value: '45', sub: 'dari 45 estimasi', accent: '#16a34a' },
               { label: 'Panjang Ruas', value: '2.4 km', sub: 'SPAN JT01', accent: '#2563eb' },
               { label: 'Foto Geo-tag', value: '238', sub: '2 foto/titik', accent: '#2563eb' },
               { label: 'Update Terakhir', value: '5 Mar', sub: 'Auto-generate v3', accent: '#69727c' },
            ].map(s => (
               <div key={s.label} className="flex-1 min-w-[120px] px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</p>
                  <p className="mt-1 text-[18px] font-black tabular-nums" style={{ color: s.accent }}>{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.sub}</p>
               </div>
            ))}
            <div className="px-4 py-3">
               <button
                  onClick={() => onTab('field')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
               >
                  Field Data →
               </button>
            </div>
         </div>
      </div>
   );
}

/* ═══════════════════════════════════════════════════════════
   DRM OVERVIEW
   Layout: Action banner + DocStatus (2/5 left) + BOQ conflict + POW/MoM (3/5 right)
═══════════════════════════════════════════════════════════ */
function DRMOverview({ onTab }: { onTab: (t: string) => void }) {
   const drmDocs: DocEntry[] = [
      { label: 'KML DRM', tab: 'kml', status: 'none', detail: 'Belum diupload' },
      { label: 'BOQ Rekonsiliasi', tab: 'boq', status: 'wait', detail: 'v2 · 2 konflik' },
      { label: 'Redline DRM', tab: 'redline', status: 'bad', detail: 'v1 · Ditolak TI' },
      { label: 'Matrix DRM', tab: 'matrix', status: 'ok', detail: 'v1 · OK' },
      { label: 'As Plan Drawing', tab: 'drawing', status: 'none', detail: 'Belum diupload' },
      { label: 'POW / Gantt', tab: 'pow', status: 'ok', detail: 'Approved · 247 hari' },
      { label: 'Dokumen MoM', tab: 'mom', status: 'ok', detail: '1 file' },
   ];

   const conflicts = [
      { item: 'Kabel FO SM 24 Core', survey: '2.450 m', vendor: '2.500 m' },
      { item: 'Handhole Type-1', survey: '12 unit', vendor: '14 unit' },
   ];

   return (
      <div className="space-y-4">
         <PhaseContextStrip currentStage="drm" />

         {/* Action required banner */}
         <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-gray-200 shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: '#e4002b' }}>
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1 min-w-0">
               <p className="text-[13px] font-semibold text-gray-900">2 item perlu tindakan segera</p>
               <p className="mt-0.5 text-[12px] text-gray-500">Redline DRM ditolak TI · BOQ Vendor belum disetujui</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
               <button onClick={() => onTab('redline')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                  Upload Revisi
               </button>
               <button onClick={() => onTab('boq')}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
                  style={{ background: '#7c5cfc' }}>
                  Review BOQ →
               </button>
            </div>
         </div>

         {/* DocStatus (2/5 left) + detail panels (3/5 right) */}
         <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
               <DocStatusPanel docs={drmDocs} onTab={onTab} />
            </div>

            <div className="lg:col-span-3 flex flex-col gap-4">
               {/* BOQ conflict mini-view */}
               <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/40 px-4 py-2.5">
                     <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-gray-900">BOQ Rekonsiliasi</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200">● 2 konflik</span>
                        <button onClick={() => onTab('boq')} className="text-[11px] font-semibold text-blue-600 hover:underline">Lihat semua →</button>
                     </div>
                  </div>
                  <table className="w-full">
                     <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/30 text-[10px] uppercase tracking-wider text-gray-500">
                           <th className="px-4 py-2 text-left font-bold">Item Pekerjaan</th>
                           <th className="px-4 py-2 text-right font-bold">Survey</th>
                           <th className="px-4 py-2 text-right font-bold">Vendor</th>
                           <th className="px-3 py-2 text-center font-bold">Δ</th>
                        </tr>
                     </thead>
                     <tbody>
                        {conflicts.map(c => (
                           <tr key={c.item} className="border-b border-gray-100 last:border-0 bg-red-50/40">
                              <td className="px-4 py-2.5 text-[12.5px] font-medium text-gray-800">{c.item}</td>
                              <td className="px-4 py-2.5 text-[11.5px] tabular-nums text-right text-gray-500">{c.survey}</td>
                              <td className="px-4 py-2.5 text-[11.5px] tabular-nums text-right font-semibold text-red-700">{c.vendor}</td>
                              <td className="px-3 py-2.5 text-center">
                                 <span className="inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200">Konflik</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {/* POW + MoM summary row */}
               <div className="grid grid-cols-2 gap-4">
                  {/* POW Card */}
                  <button
                     onClick={() => onTab('pow')}
                     className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left flex flex-col justify-between hover:border-purple-300 transition-colors"
                  >
                     <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                           <BarChart2 className="h-3 w-3" />POW / Gantt
                        </div>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-green-50 text-green-700 border border-green-200">Approved</span>
                     </div>
                     <div>
                        <p className="text-[22px] font-black tabular-nums text-[#7c5cfc]">247 hari</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">Disetujui · 19 Feb 2026</p>
                     </div>
                     <div className="mt-3 pt-3 border-t border-gray-100">
                        {[
                           { label: 'Preparing', pct: 16 },
                           { label: 'Material', pct: 15 },
                           { label: 'Instalasi', pct: 69 },
                        ].map(ph => (
                           <div key={ph.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
                              <span className="text-[9.5px] w-16 text-gray-500">{ph.label}</span>
                              <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                                 <div className="h-full rounded-full bg-[#7c5cfc]" style={{ width: `${ph.pct}%` }} />
                              </div>
                              <span className="text-[9.5px] w-6 text-right text-gray-500">{ph.pct}%</span>
                           </div>
                        ))}
                     </div>
                     <p className="mt-2 text-[11px] font-semibold text-[#7c5cfc]">Lihat Gantt →</p>
                  </button>

                  {/* MoM Card */}
                  <button
                     onClick={() => onTab('mom')}
                     className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left flex flex-col hover:shadow-md transition-shadow"
                  >
                     <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                        <FileText className="h-3 w-3" />Dokumen MoM
                     </div>
                     <p className="text-[28px] font-black tabular-nums text-gray-900">1</p>
                     <p className="text-[11px] text-gray-500 mb-3">file tersedia</p>
                     <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-[#7c5cfc]" />
                        <div className="min-w-0">
                           <p className="text-[11.5px] font-medium text-gray-800 truncate">MoM_DRM_19Feb.pdf</p>
                           <p className="text-[10px] text-gray-500">Telkom Infra · 1.2 MB</p>
                        </div>
                     </div>
                     <p className="mt-auto pt-3 text-[11px] font-semibold text-[#7c5cfc]">Lihat semua →</p>
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

/* ═══════════════════════════════════════════════════════════
   INSTALASI OVERVIEW
   Layout: PhaseStrip + Progress hero + sub-step grid (3/5) + DocStatus (2/5) + Stats strip
═══════════════════════════════════════════════════════════ */
function InstalasiOverview({ onTab }: { onTab: (t: string) => void }) {
   const instalDocs: DocEntry[] = [
      { label: 'KML Instalasi', tab: 'kml', status: 'ok', detail: '60/141 titik · aktif' },
      { label: 'BOQ Instalasi', tab: 'boq', status: 'wait', detail: 'v1 · Review' },
      { label: 'Redline', tab: 'redline', status: 'none', detail: 'Belum diupload' },
      { label: 'Matrix', tab: 'matrix', status: 'none', detail: 'Belum diupload' },
      { label: 'POW Aktual', tab: 'pow', status: 'wait', detail: '2 hari delay' },
      { label: 'BA CT', tab: 'ba-inst', status: 'none', detail: 'Instalasi belum selesai' },
   ];

   return (
      <div className="space-y-4">
         <PhaseContextStrip currentStage="instalasi" />

         <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Left: progress + sub-step grid (3/5) */}
            <div className="lg:col-span-3 flex flex-col gap-4">

               {/* Overall progress card */}
               <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                     <div>
                        <p className="text-[13px] font-semibold text-gray-900">Progress Instalasi Keseluruhan</p>
                        <p className="text-[11.5px] text-gray-500">Sub-tahap 3 dari 6 sedang berjalan</p>
                     </div>
                     <div className="text-right">
                        <span className="text-[28px] font-black tabular-nums text-[#b45309]">42%</span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200">● Delay 2 hari</span>
                        </div>
                     </div>
                  </div>

                  {/* Main progress bar */}
                  <div className="h-2.5 w-full rounded-full overflow-hidden mb-4" style={{ background: '#e5e7eb' }}>
                     <div className="h-full rounded-full transition-all duration-700" style={{ width: '42%', background: '#f59e0b' }} />
                  </div>

                  {/* 6-step mini grid — with top colored border */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                     {SUBSTEPS.map(s => (
                        <button
                           key={s.n}
                           onClick={() => onTab('subtahap')}
                           className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-2.5 text-center transition-colors hover:bg-gray-50/40"
                           style={{ borderTopWidth: 3, borderTopColor: s.color }}
                        >
                           <span
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white"
                              style={{ background: s.color }}
                           >
                              {s.status === 'done' ? <Check className="h-3 w-3 stroke-[3]" /> : s.n}
                           </span>
                           <span className="text-[9px] font-bold uppercase tracking-wide leading-tight text-gray-500 line-clamp-2">
                              {s.name.split(' ').slice(0, 2).join(' ')}
                           </span>
                           <span className="text-[11px] font-black tabular-nums" style={{ color: s.color }}>
                              {s.progress}%
                           </span>
                        </button>
                     ))}
                  </div>

                  <button
                     onClick={() => onTab('subtahap')}
                     className="mt-3 w-full text-center text-[11.5px] font-semibold text-[#f59e0b] hover:underline"
                  >
                     Lihat detail sub-tahap →
                  </button>
               </div>

               {/* Stats strip — inline divide-x */}
               <div className="flex divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {[
                     { label: 'Titik Instalasi', value: '60', sub: 'dari 141 total', color: '#f59e0b' },
                     { label: 'Foto Bukti', value: '120', sub: '60 titik × 2 foto', color: '#f59e0b' },
                     { label: 'Sub-tahap Aktif', value: '3', sub: 'Penggelaran Kabel FO', color: '#f59e0b' },
                  ].map(s => (
                     <div key={s.label} className="flex-1 px-4 py-3">
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500">{s.label}</p>
                        <p className="mt-1 text-[20px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-gray-500">{s.sub}</p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Right: doc status list (2/5) */}
            <div className="lg:col-span-2">
               <DocStatusPanel docs={instalDocs} onTab={onTab} />
            </div>
         </div>
      </div>
   );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT — TabOverview dispatcher
═══════════════════════════════════════════════════════════ */
export function TabOverview({ activeStage, linkId, linkName, projectName, onTabChange }: TabOverviewProps) {
   const handleTab = (tab: string) => onTabChange?.(tab);

   return (
      <div className="p-5 bg-[#F8FAFC]">
         {activeStage === 'survey' && <SurveyOverview onTab={handleTab} />}
         {activeStage === 'drm' && <DRMOverview onTab={handleTab} />}
         {activeStage === 'instalasi' && <InstalasiOverview onTab={handleTab} />}
      </div>
   );
}
