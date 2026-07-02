import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, MapPin, FileText,
  Download, RefreshCw, Loader2, Eye, Info,
  ChevronDown, ChevronRight as ChevronRightIcon, Layers, Package2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { installationOcrService, InstallationOcr } from '../../services/installationService';
import { TabSpanInstallation } from './TabSpan';

interface TabDataInstallationProps {
  projectId: string;
  linkId: string;
  linkName?: string;
  projectName?: string;
}

// ── Label & urutan sub_phase sesuai definisi sistem ────────────────────────
const SUB_PHASE_ORDER_LIST = [
  'pengurusan_ijin',
  'penggalian_tanah',
  'pembuatan_mh',
  'penarikan_kabel',
  'joint_terminasi',
  'test_commissioning',
] as const;

const SUB_PHASE_LABELS: Record<string, string> = {
  pengurusan_ijin:    'Pengurusan Ijin Kerja',
  penggalian_tanah:   'Penggalian Tanah Penanaman HDPE',
  pembuatan_mh:       'Pembuatan MH dan Jembatan',
  penarikan_kabel:    'Penarikan Kabel',
  joint_terminasi:    'Joint & Terminasi',
  test_commissioning: 'Test & Commissioning',
};

const SUB_PHASE_COLORS: Record<string, { bg: string; text: string; badge: string; badgeText: string; border: string }> = {
  pengurusan_ijin:    { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  penggalian_tanah:   { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  pembuatan_mh:       { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  penarikan_kabel:    { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  joint_terminasi:    { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  test_commissioning: { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
  _default:           { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200' },
};

const getSubPhaseColor = (subPhase: string) => SUB_PHASE_COLORS[subPhase] ?? SUB_PHASE_COLORS['_default'];
const getSubPhaseLabel = (subPhase: string) => SUB_PHASE_LABELS[subPhase] ?? subPhase ?? 'Tanpa Sub Phase';

// ── Compact X button ───────────────────────────────────────────────────────
function X({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} onClick={onClick}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── Sub-phase group accordion row ──────────────────────────────────────────
interface SubPhaseGroupProps {
  subPhase: string;
  records: InstallationOcr[];
  linkName?: string;
  formatDate: (d?: string) => string;
  processUrl: (p: string) => string;
  onDetail: (rec: InstallationOcr) => void;
  defaultOpen?: boolean;
  globalIndex: number; // starting row index
}

function SubPhaseGroup({ subPhase, records, linkName, formatDate, processUrl, onDetail, defaultOpen = false, globalIndex }: SubPhaseGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = getSubPhaseColor(subPhase);
  const label  = getSubPhaseLabel(subPhase);

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden mb-3 shadow-sm`}>
      {/* ── Group Header (clickable to toggle) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 ${colors.bg} hover:brightness-95 transition-all duration-150 text-left`}
      >
        <span className={`flex-shrink-0 w-7 h-7 rounded-lg ${colors.badge} ${colors.badgeText} flex items-center justify-center`}>
          <Package2 className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold ${colors.text}`}>{label}</span>
          {subPhase && subPhase !== label && (
            <span className={`ml-2 text-[10px] font-mono opacity-60 ${colors.text}`}>[{subPhase}]</span>
          )}
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${colors.badge} ${colors.badgeText} border ${colors.border}`}>
          {records.length} data
        </span>
        <span className={`flex-shrink-0 ${colors.text} opacity-70`}>
          {open
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRightIcon className="w-4 h-4" />
          }
        </span>
      </button>

      {/* ── Group Table Content ── */}
      {open && (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '900px' }}>
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-center w-10">No</th>
                <th className="px-4 py-2.5 min-w-[150px]">Tanggal</th>
                <th className="px-4 py-2.5 min-w-[130px]">SS Link</th>
                <th className="px-4 py-2.5 min-w-[90px] text-center">Kedalaman</th>
                <th className="px-4 py-2.5 min-w-[130px]">Span / Jarak</th>
                <th className="px-4 py-2.5 min-w-[160px]">Long Lat</th>
                <th className="px-4 py-2.5 min-w-[120px]">Designator</th>
                <th className="px-4 py-2.5 min-w-[160px]">Keterangan</th>
                <th className="px-4 py-2.5 min-w-[80px] text-center">Evidence</th>
                <th className="px-4 py-2.5 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {records.map((rec, idx) => {
                const hasDoc = rec.documents && rec.documents.length > 0;
                const doc = hasDoc ? rec.documents![0] : null;
                return (
                  <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-center font-semibold text-gray-400">{globalIndex + idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {formatDate(rec.datetime || rec.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#15396C]">{linkName || 'SS Link'}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {rec.kedalaman_galian !== undefined ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 text-[11px]">
                          {rec.kedalaman_galian} cm
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-gray-700">{rec.span_hh_jt || '—'}</span>
                        {rec.jarak_dari_hh_jt !== undefined && (
                          <span className="text-[10px] text-gray-400 font-mono">Jarak: {rec.jarak_dari_hh_jt} m</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {rec.latitude !== undefined && rec.longitude !== undefined ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${rec.latitude},${rec.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors font-mono font-medium"
                          title="Lihat di Google Maps"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {rec.latitude.toFixed(6)}, {rec.longitude.toFixed(6)}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rec.designator ? (
                        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded border border-violet-100 font-bold">
                          {rec.designator}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px]" title={rec.keterangan || rec.address}>
                      {rec.keterangan || rec.address || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {doc ? (
                        <a
                          href={processUrl(doc.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-1.5 bg-gray-50 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg border border-gray-100 transition-colors shadow-sm"
                          title={doc.file_name}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDetail(rec)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-violet-600 hover:bg-violet-50 rounded-lg font-bold transition-colors text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function TabDataInstallation({ projectId, linkId, linkName, projectName }: TabDataInstallationProps) {
  const { token } = useAuth();
  const [subTab, setSubTab] = useState<'data-installation' | 'span'>('data-installation');
  const [records, setRecords] = useState<InstallationOcr[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InstallationOcr | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubPhase, setSelectedSubPhase] = useState<string>('all');

  const fetchRecords = async () => {
    if (!projectId || !linkId) return;
    try {
      setLoading(true);
      const res = await installationOcrService.getAll({
        project_id: projectId,
        link_id: linkId
      }, token);
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to fetch Installation OCR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [projectId, linkId, token]);

  const processUrl = (path: string) => {
    if (!path) return '#';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    return path.startsWith('http') ? path : `${baseUrl.replace('/api', '')}/${path}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const cleaned = dateStr.replace(/^d'(.*)'$/, '$1');
      const date = new Date(cleaned);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // ── Group by sub_phase ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, InstallationOcr[]>();
    records.forEach(rec => {
      const key = rec.sub_phase || '_no_phase';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rec);
    });

    // Sort entries: known sub_phases first (in defined order), then others, then _no_phase last
    const entries = [...map.entries()];
    entries.sort(([a], [b]) => {
      const ai = SUB_PHASE_ORDER_LIST.indexOf(a as any);
      const bi = SUB_PHASE_ORDER_LIST.indexOf(b as any);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return entries;
  }, [records]);

  // Compute cumulative index for per-group row numbering
  const groupStartIndex = useMemo(() => {
    const startMap = new Map<string, number>();
    let acc = 0;
    grouped.forEach(([key, recs]) => {
      startMap.set(key, acc);
      acc += recs.length;
    });
    return startMap;
  }, [grouped]);

  const filteredRecords = useMemo(() => {
    if (selectedSubPhase === 'all') return records;
    if (selectedSubPhase === 'no_phase') return records.filter(rec => !rec.sub_phase);
    return records.filter(rec => rec.sub_phase === selectedSubPhase);
  }, [records, selectedSubPhase]);

  return (
    <div className="flex flex-col h-full bg-gray-50/40">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Field Data</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Data fisik hasil instalasi untuk {linkName || 'Link'} (Hasil AI/OCR &amp; Input Lapangan)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {subTab === 'data-installation' && (
            <select
              value={selectedSubPhase}
              onChange={(e) => setSelectedSubPhase(e.target.value)}
              className="text-xs font-semibold border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Semua Sub Phase</option>
              {SUB_PHASE_ORDER_LIST.map((sp) => (
                <option key={sp} value={sp}>
                  {SUB_PHASE_LABELS[sp]}
                </option>
              ))}
              <option value="no_phase">Tanpa Sub Phase</option>
            </select>
          )}
          {subTab === 'data-installation' && records.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Layers className="w-3.5 h-3.5" />
              <span>{filteredRecords.length} / {records.length} total data</span>
            </div>
          )}
          <button
            onClick={fetchRecords}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition flex items-center gap-1 text-xs font-semibold"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Sub Tabs Switcher */}
      <div className="px-6 bg-white border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setSubTab('data-installation')}
          className={`py-2.5 px-1 text-xs font-semibold border-b-2 transition-all ${
            subTab === 'data-installation'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Data Installation
        </button>
        <button
          onClick={() => setSubTab('span')}
          className={`py-2.5 px-1 text-xs font-semibold border-b-2 transition-all ${
            subTab === 'span'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Span
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-500">Memuat data instalasi...</p>
          </div>
        ) : subTab === 'span' ? (
          <TabSpanInstallation projectId={projectId} linkId={linkId} projectName={projectName} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Belum ada data instalasi terdaftar</p>
            <p className="text-xs text-gray-400 mt-1">Gunakan fitur OCR/Upload di halaman penarikan untuk menambahkan data</p>
          </div>
        ) : (
          <div>
            {/* Flat Table of All Designators */}
            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '950px' }}>
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-center w-10">No</th>
                    <th className="px-4 py-2.5 min-w-[150px]">Tanggal</th>
                    <th className="px-4 py-2.5 min-w-[130px]">SS Link</th>
                    <th className="px-4 py-2.5 min-w-[140px]">Sub Phase</th>
                    <th className="px-4 py-2.5 min-w-[90px] text-center">Kedalaman</th>
                    <th className="px-4 py-2.5 min-w-[130px]">Span / Jarak</th>
                    <th className="px-4 py-2.5 min-w-[160px]">Long Lat</th>
                    <th className="px-4 py-2.5 min-w-[120px]">Designator</th>
                    <th className="px-4 py-2.5 min-w-[160px]">Keterangan</th>
                    <th className="px-4 py-2.5 min-w-[80px] text-center">Evidence</th>
                    <th className="px-4 py-2.5 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {filteredRecords.map((rec, idx) => {
                    const hasDoc = rec.documents && rec.documents.length > 0;
                    const doc = hasDoc ? rec.documents![0] : null;
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-center font-semibold text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {formatDate(rec.datetime || rec.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#15396C]">{linkName || 'SS Link'}</td>
                        <td className="px-4 py-3 font-medium">
                          {rec.sub_phase ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getSubPhaseColor(rec.sub_phase).badge} ${getSubPhaseColor(rec.sub_phase).badgeText} ${getSubPhaseColor(rec.sub_phase).border}`}>
                              {getSubPhaseLabel(rec.sub_phase)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {rec.kedalaman_galian !== undefined ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 text-[11px]">
                              {rec.kedalaman_galian} cm
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-700">{rec.span_hh_jt || '—'}</span>
                            {rec.jarak_dari_hh_jt !== undefined && (
                              <span className="text-[10px] text-gray-400 font-mono">Jarak: {rec.jarak_dari_hh_jt} m</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rec.latitude !== undefined && rec.longitude !== undefined ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${rec.latitude},${rec.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors font-mono font-medium"
                              title="Lihat di Google Maps"
                            >
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              {rec.latitude.toFixed(6)}, {rec.longitude.toFixed(6)}
                            </a>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rec.designator ? (
                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded border border-violet-100 font-bold">
                              {rec.designator}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]" title={rec.keterangan || rec.address}>
                          {rec.keterangan || rec.address || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc ? (
                            <a
                              href={processUrl(doc.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 bg-gray-50 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg border border-gray-100 transition-colors shadow-sm"
                              title={doc.file_name}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setSelectedRecord(rec); setShowDetailModal(true); }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-violet-600 hover:bg-violet-50 rounded-lg font-bold transition-colors text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Hidden old coding: Grouped by sub phase */}
            {false && (
              <div>
                {grouped.map(([subPhase, recs]) => (
                  <SubPhaseGroup
                    key={subPhase}
                    subPhase={subPhase === '_no_phase' ? '' : subPhase}
                    records={recs}
                    linkName={linkName}
                    formatDate={formatDate}
                    processUrl={processUrl}
                    onDetail={(rec) => { setSelectedRecord(rec); setShowDetailModal(true); }}
                    defaultOpen={grouped.length === 1}
                    globalIndex={groupStartIndex.get(subPhase) ?? 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-violet-900 to-violet-700 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Info className="w-4 h-4" /> Detail Data Hasil Penarikan
                {selectedRecord.sub_phase && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                    {getSubPhaseLabel(selectedRecord.sub_phase)}
                  </span>
                )}
              </h3>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedRecord(null); }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Left: Image Evidence */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center border border-gray-100 rounded-xl bg-gray-50 overflow-hidden min-h-[250px] p-2">
                {selectedRecord.documents && selectedRecord.documents.length > 0 ? (
                  <img
                    src={processUrl(selectedRecord.documents[0].file_path)}
                    alt="Evidence Penarikan"
                    className="max-h-[350px] max-w-full rounded-lg object-contain shadow-sm"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">Tidak ada foto evidence</p>
                  </div>
                )}
              </div>

              {/* Right: Data Info */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SS Link</h4>
                  <p className="text-sm font-bold text-gray-800">{linkName || 'SS Link'}</p>
                </div>

                {selectedRecord.sub_phase && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sub Phase</h4>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold border ${getSubPhaseColor(selectedRecord.sub_phase).badge} ${getSubPhaseColor(selectedRecord.sub_phase).badgeText} ${getSubPhaseColor(selectedRecord.sub_phase).border}`}>
                      {getSubPhaseLabel(selectedRecord.sub_phase)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal &amp; Waktu</h4>
                    <p className="text-xs font-semibold text-gray-700">{formatDate(selectedRecord.datetime || selectedRecord.created_at)}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Designator</h4>
                    <p className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-0.5 inline-block">{selectedRecord.designator || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kedalaman Galian</h4>
                    <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5 inline-block">{selectedRecord.kedalaman_galian !== undefined ? `${selectedRecord.kedalaman_galian} cm` : '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jarak dari HH/JT</h4>
                    <p className="text-xs font-semibold text-gray-700">{selectedRecord.jarak_dari_hh_jt !== undefined ? `${selectedRecord.jarak_dari_hh_jt} meter` : '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Span HH/JT</h4>
                  <p className="text-xs font-semibold text-gray-700">{selectedRecord.span_hh_jt || '-'}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Koordinat</h4>
                  {selectedRecord.latitude !== undefined && selectedRecord.longitude !== undefined ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.latitude},${selectedRecord.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedRecord.latitude}, {selectedRecord.longitude}
                    </a>
                  ) : (
                    <p className="text-xs text-gray-500">-</p>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alamat / Lokasi</h4>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100">{selectedRecord.address || '-'}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Keterangan</h4>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100">{selectedRecord.keterangan || '-'}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedRecord(null); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
