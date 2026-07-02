import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, ChevronRight, 
  Map as MapIcon, FileText, Layers, RefreshCw, Filter,
  MapPin, Network, CheckCircle2, ScanLine
} from 'lucide-react';
import { getProjectKMLFiles } from '@/services/contractService';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { TabKML } from '@/components/DRM/TabKML';
import { TabBAInstallation } from '@/components/installation/TabBAInstallation';
import { TabDataInstallation } from '@/components/installation/TabDataInstallation';
import { TabSubPhaseProgress } from '@/components/installation/TabSubPhaseProgress';
import { TabSpanInstallation } from '@/components/installation/TabSpan';
import { TabBOQ } from '@/components/DRM/TabBOQ';
import { TabMatrix } from '@/components/DRM/TabMatrix';
import { TabRedLine } from '@/components/DRM/TabRedLine';
import { getAllRegionals, getAllWitels, extractId as extractRegionalId, type Regional, type Witel } from '@/services/regionalService';
import { installationProjectService, type InstallationProject } from '@/services/installationService';
import { vendorService, type Vendor } from '@/services/vendorService';

// Helper: ekstrak plain ID string dari SurrealDB record field
// Handle: string | { tb, id: string } | { tb, id: { String: string } }
function extractPlainId(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    const inner = field.id;
    if (!inner) return '';
    if (typeof inner === 'string') return inner;
    if (typeof inner === 'object') {
      return inner.String ?? inner.id ?? '';
    }
  }
  return '';
}

interface InstallationProps {
  onTabChange?: (tab: string) => void;
}

export function Installation({ onTabChange }: InstallationProps = {}) {
  // Saklar untuk menampilkan detail view embedded LAMA (dipertahankan sbg referensi). Selalu false — detail kini di RuasDetail gabungan.
  const SHOW_LEGACY_DETAIL: boolean = false;
  const { token } = useAuth();

  // ── Data dari API ──────────────────────────────────────────────────────────
  const [installationProjects, setInstallationProjects] = useState<InstallationProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<InstallationProject | null>(null);

  // ── Lookup Regional / Witel / Vendor ──────────────────────────────────────
  const [regionalsRecord, setRegionalsRecord] = useState<Record<string, string>>({});
  const [witelsRecord, setWitelsRecord] = useState<Record<string, string>>({});
  const [vendorsRecord, setVendorsRecord] = useState<Record<string, string>>({});

  // ── UI State ───────────────────────────────────────────────────────────────
  const [viewLevel, setViewLevel] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<string>('subphase-progress');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDrmImported, setIsDrmImported] = useState(false);

  // KML state
  const [kmlData, setKmlData] = useState<any>(null);
  const [isLoadingKML, setIsLoadingKML] = useState(false);

  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on tab change
  useEffect(() => {
    if (contentAreaRef.current) {
      setTimeout(() => {
        contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [activeTab]);

  // Fetch GET /api/installation-project + lookups on mount
  useEffect(() => {
    fetchInstallationProjects();

    const loadLookups = async () => {
      try {
        const [regionals, witels, vendors] = await Promise.all([
          getAllRegionals(),
          getAllWitels(),
          vendorService.getAllVendors(),
        ]);
        const rRecord: Record<string, string> = {};
        regionals.forEach((r: Regional) => { rRecord[r.id] = r.region; });
        setRegionalsRecord(rRecord);

        const wRecord: Record<string, string> = {};
        witels.forEach((w: Witel) => { wRecord[w.id] = w.witel; });
        setWitelsRecord(wRecord);

        const vRecord: Record<string, string> = {};
        vendors.forEach((v: Vendor) => { vRecord[v.id] = v.name; });
        setVendorsRecord(vRecord);
      } catch (e) {
        console.error('Failed to load regional/witel/vendor lookups in Installation:', e);
      }
    };
    loadLookups();
  }, []);

  const fetchInstallationProjects = async () => {
    try {
      setLoading(true);
      const data = await installationProjectService.getAll(token);
      // Pastikan selalu array
      setInstallationProjects(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('❌ Failed to fetch installation projects:', error);
      // Jangan toast error 401 (belum login) atau saat token null
      if (error?.response?.status !== 401) {
        toast.error('Failed to load installation projects');
      }
      setInstallationProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch KML saat selectedProject berubah
  useEffect(() => {
    const fetchKMLData = async () => {
      if (!selectedProject) { setKmlData(null); return; }
      const projectId = extractPlainId(selectedProject.project_id);
      if (!projectId) { setKmlData(null); return; }

      setIsLoadingKML(true);
      try {
        const data = await getProjectKMLFiles(projectId, token);
        setKmlData(data);
      } catch (error) {
        console.error('❌ Error fetching KML data:', error);
        setKmlData({ kml_project: [], kml_survey: [], kml_span: [] });
      } finally {
        setIsLoadingKML(false);
      }
    };
    fetchKMLData();
  }, [selectedProject, token]);

  // Filter list
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return installationProjects.filter(p =>
      p.project_name?.toLowerCase().includes(q) ||
      p.link_name?.toLowerCase().includes(q) ||
      p.customer?.toLowerCase().includes(q) ||
      p.pelaksana?.toLowerCase().includes(q) ||
      p.no_kontrak?.toLowerCase().includes(q)
    );
  }, [installationProjects, searchQuery]);

  // Klik row → GET /api/installation-project/link/{link_id} lalu buka detail
  // Buka Detail View gabungan (RuasDetail) pada stage Instalasi
  const handleRowSelect = (project: InstallationProject) => {
    localStorage.setItem('ruasDetailParams', JSON.stringify({
      linkId: extractPlainId(project.link_id),
      projectId: extractPlainId(project.project_id),
      projectName: project.project_name,
      linkName: project.link_name,
      initialStage: 'instalasi',
      originTab: 'installation',
    }));
    onTabChange?.('ruas-detail');
  };

  const handleBack = () => {
    setViewLevel('list');
    setSelectedProject(null);
    setKmlData(null);
    setIsDrmImported(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '-'; }
  };

  // Resolve regional/witel name dari record id
  const resolveRegional = (field: any): string => {
    const id = extractPlainId(field) || extractRegionalId(field);
    return (id && regionalsRecord[id]) ? regionalsRecord[id] : (typeof field === 'string' ? field : '-');
  };
  const resolveWitel = (field: any): string => {
    const id = extractPlainId(field) || extractRegionalId(field);
    return (id && witelsRecord[id]) ? witelsRecord[id] : (typeof field === 'string' ? field : '-');
  };
  const resolveVendor = (field: any): string => {
    const id = extractPlainId(field);
    return (id && vendorsRecord[id]) ? vendorsRecord[id] : (id || '-');
  };

  // Progress keseluruhan → percentage (sudah dalam 0–100)
  const phaseToPercent = (project: InstallationProject) => {
    const val = project.progress_keseluruhan ?? project.progress_phase ?? 0;
    return Math.min(val, 100);
  };

  // Status badge color
  const statusColor = (status: string) => {
    switch (status) {
      case 'in_progress':    return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'not_started':    return 'bg-gray-100 text-gray-600 border-gray-200';
      default:               return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const TABS = useMemo(() => {
    return [
      { id: 'subphase-progress', label: 'Sub-Phase Progress', icon: FileText  },
      { id: 'data-installation', label: 'Data Installation',  icon: FileText  },
      { id: 'span',              label: 'Span',               icon: Network   },
      { id: 'kml',               label: 'KML',                icon: MapIcon   },
      // Evidence disembunyikan, tidak dihapus
      // { id: 'evidence',       label: 'Evidence',           icon: MapIcon   },
      { id: 'redline',           label: 'Redline',            icon: ScanLine  },
      { id: 'matrix',            label: 'Matrix',             icon: Layers    },
      { id: 'boq',               label: 'BOQ',                icon: FileText  },
      { id: 'ba-installation',   label: 'BA Installation',    icon: FileText  },
    ];
  }, []);

  // Derived IDs dari selectedProject untuk props tab
  const detailProjectId = selectedProject ? extractPlainId(selectedProject.project_id) : '';
  const detailLinkId    = selectedProject ? extractPlainId(selectedProject.link_id) : '';

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Content */}
      <div className="flex-1 overflow-auto py-1 px-0 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]"></div>
            <p className="ml-3 text-gray-600">Loading installation data...</p>
          </div>
        ) : (
          <>
            {/* ── LIST VIEW ── */}
            {viewLevel === 'list' && (
              <>
                {/* Page Header — matching mockup */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Stage Monitor</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Instalasi Monitor</h1>
                    <p className="mt-1 text-sm text-gray-500">Cross-ruas status progress instalasi fiber-optic dan dokumen aktual.</p>
                  </div>
                </div>

                {/* Stat Cards — matching mockup */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#f59e0b]" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Ruas dalam Instalasi</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#b45309]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {filteredProjects.length}
                    </p>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-gray-300" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Avg Progress</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {filteredProjects.length > 0
                        ? Math.round(filteredProjects.reduce((sum, p) => sum + phaseToPercent(p), 0) / filteredProjects.length)
                        : 0}
                      <span className="ml-0.5 text-lg font-normal text-gray-400">%</span>
                    </p>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#16a34a]" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Titik Terinstalasi</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#15803d]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {filteredProjects.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                </div>

                {/* Filter Bar — matching mockup */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari ruas atau proyek…"
                      className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#f59e0b]/40 focus:ring-2 focus:ring-[#f59e0b]/15"
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </button>
                </div>

                {/* Table — matching mockup */}
                <GlassCard className="flex-1 p-0 flex flex-col min-w-0 overflow-hidden">
                  <div className="flex-1 overflow-auto min-w-0">
                    {filteredProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-6 bg-white">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data Installation</h3>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                          Belum ada data installation yang terdaftar. Data akan muncul setelah proses DRM di-finalize.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border border-gray-200 rounded-lg overflow-hidden min-w-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'auto', minWidth: '1800px', width: '1800px' }}>
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                              <tr>
                                <th className="p-4 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px] whitespace-nowrap">Project Name</th>
                                <th className="p-4 sticky left-[200px] bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 min-w-[180px] whitespace-nowrap">Link / Ruas</th>
                                <th className="p-4 min-w-[120px] whitespace-nowrap">Regional</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Witel</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Customer</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Pelaksana</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Sub Pelaksana</th>
                                <th className="p-4 min-w-[130px] whitespace-nowrap">Start Plan Date</th>
                                <th className="p-4 min-w-[130px] whitespace-nowrap">End Plan Date</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Progress</th>
                                <th className="p-4 min-w-[100px] whitespace-nowrap">Status</th>
                                <th className="p-4 min-w-[80px] text-center sticky right-0 bg-gray-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredProjects.map((project, index) => {
                                const regionalName = resolveRegional(project.regional);
                                const witelName    = resolveWitel(project.witel);
                                const subPelaksana = resolveVendor(project.sub_pelaksana);
                                const progressPct  = phaseToPercent(project);
                                return (
                                  <tr
                                    key={`${extractPlainId(project.id)}-${index}`}
                                    onClick={() => handleRowSelect(project)}
                                    className="group transition border-b border-gray-100 last:border-b-0 cursor-pointer"
                                  >
                                    <td className="p-4 font-bold text-gray-900 sticky left-0 bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      {project.project_name}
                                    </td>
                                    <td className="p-4 sticky left-[200px] bg-white z-10 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                                      <div className="flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />
                                        <span className="font-bold text-gray-900 group-hover:text-[#f59e0b]">{project.link_name}</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{regionalName}</td>
                                    <td className="p-4 text-gray-600 capitalize">{witelName}</td>
                                    <td className="p-4 text-gray-600">{project.customer || 'Telkom Indonesia'}</td>
                                    <td className="p-4 text-[10px] font-bold uppercase text-gray-600">{project.pelaksana || '-'}</td>
                                    <td className="p-4 text-[10px] font-bold uppercase text-gray-600">{subPelaksana}</td>
                                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap">{formatDate(project.start_plan_date)}</td>
                                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap">{formatDate(project.end_plan_date)}</td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                          <div className="h-full bg-gradient-to-r from-[#f59e0b] to-[#F97316] transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-gray-500">{progressPct.toFixed(0)}%</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${statusColor(project.status)}`}>
                                        {project.status?.replace(/_/g, ' ') || 'not started'}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      <button className="p-1.5 hover:bg-white rounded-full text-[#f59e0b] hover:text-[#F97316] shadow-sm transition">
                                        <ChevronRight className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredProjects.length === 0 && !loading && (
                                <tr>
                                  <td colSpan={12} className="p-8 text-center text-gray-400 italic">
                                    No installation data found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Custom Scrollbar Styles */}
                <style>{`
                  .overflow-x-auto::-webkit-scrollbar {
                    height: 8px;
                  }
                  .overflow-x-auto::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                  }
                  .overflow-x-auto::-webkit-scrollbar-thumb {
                    background: #94a3b8;
                    border-radius: 10px;
                  }
                  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                  }
                  .overflow-x-auto table {
                    border-collapse: separate;
                    border-spacing: 0;
                  }
                  .overflow-x-auto table th.sticky.right-0,
                  .overflow-x-auto table td.sticky.right-0 {
                    box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05);
                  }
                `}</style>
              </>
            )}

            {/* ── DETAIL VIEW ── */}
            {/* DINONAKTIFKAN: navigasi detail sekarang pakai RuasDetail gabungan. Blok lama dipertahankan sebagai referensi (SHOW_LEGACY_DETAIL = false). */}
            {SHOW_LEGACY_DETAIL && viewLevel === 'detail' && selectedProject && (
              <div className="flex flex-col gap-4">
                {/* Hero Card - SS/Link Info */}
                <div className="p-6 bg-gradient-to-br from-[#15396C] via-[#1e4b8a] to-[#0078D7] rounded-xl text-white shadow-2xl flex justify-between items-center relative overflow-hidden border border-white/10">
                  {/* Animated gradient mesh background */}
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400/60 via-blue-400/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-300/50 via-cyan-300/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '2s' }} />
                  </div>

                  {/* Geometric pattern overlay */}
                  <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: `
                      linear-gradient(30deg, transparent 48%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 52%),
                      linear-gradient(150deg, transparent 48%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 52%)
                    `,
                    backgroundSize: '15px 15px'
                  }} />

                  {/* Decorative circles */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 border-4 border-white/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
                  <div className="absolute -top-5 -right-5 w-32 h-32 border-2 border-cyan-300/30 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 border-4 border-white/20 rounded-full" />
                  <div className="absolute top-1/2 right-20 w-24 h-24 border-2 border-white/10 rounded-full animate-pulse" />
                  <div className="absolute bottom-10 right-40 w-16 h-16 border-2 border-cyan-300/20 rounded-full" />

                  {/* Floating dots */}
                  <div className="absolute top-8 left-20 w-2 h-2 bg-cyan-300/60 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute top-16 left-40 w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                  <div className="absolute bottom-12 left-32 w-2 h-2 bg-blue-300/50 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
                  <div className="absolute top-20 right-60 w-1 h-1 bg-white/50 rounded-full animate-ping" />
                  <div className="absolute bottom-16 right-80 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }} />

                  {/* Diagonal lines */}
                  <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                  <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent" />

                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />

                  {/* Left side - Title + project name */}
                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-2xl font-bold drop-shadow-lg">{selectedProject.link_name}</h2>
                    </div>
                    <p className="text-blue-100 text-sm flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> {selectedProject.project_name}
                    </p>
                  </div>

                  {/* Right side - Icon */}
                  <div className="relative z-10">
                    <div className="relative">
                      <div className="absolute inset-0 w-24 h-24 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                        <Network className="w-10 h-10" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-300 rounded-full animate-ping" />
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-2" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                  {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div ref={contentAreaRef} className="flex-1 overflow-hidden">
                  {activeTab === 'subphase-progress' && (
                    <TabSubPhaseProgress
                      projectId={detailProjectId}
                      linkId={detailLinkId}
                      installationProjectId={extractPlainId(selectedProject.id)}
                      linkName={selectedProject.link_name}
                      isImported={isDrmImported}
                      setIsImported={setIsDrmImported}
                    />
                  )}
                  {activeTab === 'data-installation' && (
                    <TabDataInstallation projectId={detailProjectId} linkId={detailLinkId} linkName={selectedProject.link_name} />
                  )}
                  {activeTab === 'span' && (
                    <TabSpanInstallation 
                      projectId={detailProjectId} 
                      linkId={detailLinkId} 
                      projectName={selectedProject.project_name}
                    />
                  )}
                  {activeTab === 'kml' && (
                    isLoadingKML ? (
                      <div className="h-full flex items-center justify-center gap-2 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading KML data...</span>
                      </div>
                    ) : (
                      <TabKML kmlFileName="" kmlFileContent="" projectId={detailProjectId} linkId={detailLinkId} kmlData={kmlData} defaultCategory="installation" onPreview={() => {}} />
                    )
                  )}
                  {/* Evidence — hidden dari tab bar, kontennya tetap tersedia */}
                  {activeTab === 'evidence' && (
                    isLoadingKML ? (
                      <div className="h-full flex items-center justify-center gap-2 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading KML data...</span>
                      </div>
                    ) : (
                      <TabKML kmlFileName="" kmlFileContent="" projectId={detailProjectId} linkId={detailLinkId} kmlData={kmlData} defaultCategory="survey" onPreview={() => {}} />
                    )
                  )}
                  {activeTab === 'redline' && (
                    <TabRedLine
                      contractId={detailProjectId}
                      linkId={detailLinkId}
                      dataSource="installasi"
                    />
                  )}
                  {activeTab === 'matrix' && (
                    <TabMatrix
                      contractId={detailProjectId}
                      contractName={selectedProject.project_name}
                      linkId={detailLinkId}
                      dataSource="installasi"
                    />
                  )}
                  {activeTab === 'boq' && (
                    <TabBOQ
                      projectId={detailProjectId}
                      linkId={detailLinkId}
                      lokasi={selectedProject.link_name}
                      isLoading={false}
                      dataSource="installasi"
                    />
                  )}
                  {activeTab === 'ba-installation' && (
                    <TabBAInstallation projectId={detailProjectId} linkId={detailLinkId} linkName={selectedProject.link_name} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
