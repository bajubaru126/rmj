// Semua Ruas - All Routes overview page
import { useState, useMemo, useEffect } from 'react';
import {
   Search, ChevronRight, X, ChevronDown,
   Route, SlidersHorizontal, ArrowUpDown,
   LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { getAllProjects, ProjectResponse, extractId } from '../services/contractService';
import { baSurveyService, BASurveyResponse } from '../services/baSurveyService';
import { getAllRegionals, getAllWitels, extractId as extractRegionalId, type Regional, type Witel } from '../services/regionalService';
import { actualDateService, type ActualDateAll } from '../services/actualDateService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// Flattened link interface
interface FlattenedLink {
   linkId: string;
   linkName: string;
   projectId: string;
   projectName: string;
   regional?: any;
   witel?: any;
   status: string;
   ss_status?: string;
   ss_contract_value?: number;
   survey_actual_meters?: number;
   survey_planned_meters?: number;
   plan_date?: string;
   actual_date?: string;
   project: ProjectResponse;
}

type StageStatus = 'under_survey' | 'under_drm' | 'under_instalasi' | 'done';

const STAGE_LABEL: Record<StageStatus, string> = {
   under_survey: 'SURVEY',
   under_drm: 'DRM',
   under_instalasi: 'INSTALASI',
   done: 'SELESAI',
};

const STAGE_COLOR: Record<StageStatus, string> = {
   under_survey: '#2563eb',
   under_drm: '#7c5cfc',
   under_instalasi: '#f59e0b',
   done: '#10b981',
};

const STAGE_STYLES: Record<StageStatus, { bg: string; border: string; text: string; progressBg: string }> = {
   under_survey: {
      bg: 'bg-blue-50/40',
      border: 'border-blue-200/50',
      text: 'text-blue-600',
      progressBg: 'bg-blue-500'
   },
   under_drm: {
      bg: 'bg-indigo-50/30',
      border: 'border-indigo-200/40',
      text: 'text-indigo-600',
      progressBg: 'bg-indigo-500'
   },
   under_instalasi: {
      bg: 'bg-amber-50/35',
      border: 'border-amber-200/45',
      text: 'text-amber-700',
      progressBg: 'bg-amber-500'
   },
   done: {
      bg: 'bg-emerald-50/35',
      border: 'border-emerald-200/45',
      text: 'text-emerald-700',
      progressBg: 'bg-emerald-500'
   }
};

// Determine overall stage from project status + ss_status
function getOverallStage(link: FlattenedLink): StageStatus {
   const projectStatus = (link.project as any)?.status;
   if (projectStatus === 'completed' || projectStatus === 'maintenance') return 'done';
   if (projectStatus === 'installation' || projectStatus === 'construction') return 'under_instalasi';
   if (projectStatus === 'drm') return 'under_drm';
   return 'under_survey';
}

interface SemuaRuasProps {
   onTabChange?: (tab: string) => void;
}

export function SemuaRuas({ onTabChange }: SemuaRuasProps) {
   const { token } = useAuth();

   // Data state
   const [projects, setProjects] = useState<ProjectResponse[]>([]);
   const [allBASurveys, setAllBASurveys] = useState<BASurveyResponse[]>([]);
   const [loading, setLoading] = useState(true);

   // UI state
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState<StageStatus | 'all'>('all');
   const [showFilterDropdown, setShowFilterDropdown] = useState(false);
   const [sortBy, setSortBy] = useState<'status' | 'name' | 'progress'>('status');
   const [view, setView] = useState<'list' | 'grid'>('list');

   // Resolution maps
   const [regionalsRecord, setRegionalsRecord] = useState<Record<string, string>>({});
   const [witelsRecord, setWitelsRecord] = useState<Record<string, string>>({});
   const [actualDatesMap, setActualDatesMap] = useState<Map<string, ActualDateAll[]>>(new Map());

   // Fetch projects
   useEffect(() => {
      const fetchProjects = async () => {
         if (!token) { setLoading(false); return; }
         try {
            setLoading(true);
            const data = await getAllProjects(token);
            const sortedData = data.sort((a, b) => {
               const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
               const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
               return dateB - dateA;
            });
            setProjects(sortedData);
         } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to load projects');
         } finally {
            setLoading(false);
         }
      };
      fetchProjects();
   }, [token]);

   // Fetch all BA Surveys
   useEffect(() => {
      const fetchAllBASurveys = async () => {
         try {
            const data = await baSurveyService.getAllBASurveys();
            setAllBASurveys(data);
         } catch (error) {
            console.error('Error fetching BA Surveys:', error);
            setAllBASurveys([]);
         }
      };
      fetchAllBASurveys();
   }, []);

   // Fetch regionals & witels
   useEffect(() => {
      const fetchRegionalsAndWitels = async () => {
         try {
            const [regionalsData, witelsData] = await Promise.all([getAllRegionals(), getAllWitels()]);
            const rRecord: Record<string, string> = {};
            regionalsData.forEach((r: Regional) => { rRecord[r.id] = r.region; });
            setRegionalsRecord(rRecord);
            const wRecord: Record<string, string> = {};
            witelsData.forEach((w: Witel) => { wRecord[w.id] = w.witel; });
            setWitelsRecord(wRecord);
         } catch (error) {
            console.error('Error fetching regionals/witels:', error);
         }
      };
      fetchRegionalsAndWitels();
   }, []);

   // Fetch actual dates
   useEffect(() => {
      const fetchActualDates = async () => {
         try {
            const data = await actualDateService.getAllActualDates();
            const map = new Map<string, ActualDateAll[]>();
            data.forEach((ad: ActualDateAll) => {
               const projectId = typeof ad.project_id === 'string' ? ad.project_id : extractId(ad.project_id);
               if (!map.has(projectId)) map.set(projectId, []);
               map.get(projectId)!.push(ad);
            });
            setActualDatesMap(map);
         } catch (error) {
            console.error('Error fetching actual dates:', error);
         }
      };
      fetchActualDates();
   }, []);

   // Flatten projects into links
   const flattenedLinks = useMemo(() => {
      const links: FlattenedLink[] = [];
      projects.forEach(project => {
         const projectId = String(extractId(project.id));
         if (project.links && Array.isArray(project.links) && project.links.length > 0) {
            project.links.forEach(link => {
               const linkId = String(extractId(link.id));
               const linkBASurveys = allBASurveys.filter(ba => {
                  const baProjectId = typeof ba.project_id === 'string' ? ba.project_id : extractId(ba.project_id);
                  if (baProjectId !== projectId) return false;
                  if (ba.link_id) {
                     const baLinkId = typeof ba.link_id === 'string' ? ba.link_id : extractId(ba.link_id);
                     return baLinkId === linkId;
                  }
                  return false;
               });
               links.push({
                  linkId, linkName: link.link_name || 'Unnamed Link',
                  projectId, projectName: project.name,
                  regional: link.regional, witel: link.witel,
                  status: project.status,
                  ss_status: linkBASurveys.length > 0 ? 'survey completed' : 'under survey',
                  ss_contract_value: (link as any).ss_contract_value || (project as any).contract_value,
                  survey_actual_meters: (link as any).survey_actual_meters,
                  survey_planned_meters: (link as any).survey_planned_meters,
                  plan_date: (project as any).start_date_plan,
                  actual_date: (link as any).actual_date || (project as any).actual_date,
                  project,
               });
            });
         } else {
            const projectBASurveys = allBASurveys.filter(ba => {
               const baProjectId = typeof ba.project_id === 'string' ? ba.project_id : extractId(ba.project_id);
               return baProjectId === projectId;
            });
            links.push({
               linkId: 'no-link', linkName: '-',
               projectId, projectName: project.name,
               regional: '-', witel: '-', status: project.status,
               ss_status: projectBASurveys.length > 0 ? 'survey completed' : 'under survey',
               ss_contract_value: (project as any).contract_value,
               plan_date: (project as any).start_date_plan,
               actual_date: (project as any).actual_date,
               project,
            });
         }
      });
      return links;
   }, [projects, allBASurveys]);

   // Stage distribution
   const stageDistribution = useMemo(() => {
      const dist: Record<StageStatus, number> = { under_survey: 0, under_drm: 0, under_instalasi: 0, done: 0 };
      flattenedLinks.forEach(l => { dist[getOverallStage(l)]++; });
      return dist;
   }, [flattenedLinks]);

   // Filtered & sorted links
   const filteredLinks = useMemo(() => {
      let list = flattenedLinks.filter(link => {
         const matchesSearch = link.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.linkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (link.regional || '').toLowerCase().includes(searchQuery.toLowerCase());
         const matchesStatus = statusFilter === 'all' || getOverallStage(link) === statusFilter;
         return matchesSearch && matchesStatus;
      });
      list = [...list].sort((a, b) => {
         if (sortBy === 'name') return a.linkName.localeCompare(b.linkName);
         if (sortBy === 'progress') {
            const pA = Math.min(((a.survey_actual_meters || 0) / (a.survey_planned_meters || 1000)) * 100, 100);
            const pB = Math.min(((b.survey_actual_meters || 0) / (b.survey_planned_meters || 1000)) * 100, 100);
            return pB - pA;
         }
         // Default: sort by stage order
         const order: StageStatus[] = ['under_survey', 'under_drm', 'under_instalasi', 'done'];
         return order.indexOf(getOverallStage(a)) - order.indexOf(getOverallStage(b));
      });
      return list;
   }, [flattenedLinks, searchQuery, statusFilter, sortBy]);

   // Navigate to survey detail
   const handleNavigateToSurvey = (link: FlattenedLink) => {
      // Store selected link info so Survey tab can pick it up
      localStorage.setItem('semuaRuas_selectedLink', JSON.stringify({
         linkId: link.linkId, projectId: link.projectId,
      }));
      onTabChange?.('survey');
   };

   const activeFiltersCount = statusFilter !== 'all' ? 1 : 0;

   return (
      <div className="space-y-5">
         {/* Header */}
         <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <Route className="h-5 w-5 text-[#EF4444]" />
               </div>
               <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Network · Semua Ruas</p>
                  <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">Semua Ruas</h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                     {loading ? '...' : `${flattenedLinks.length} ruas aktif · ${projects.length} project terdaftar`}
                  </p>
               </div>
            </div>
         </div>

         {/* Stage Distribution Cards */}
         <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['under_survey', 'under_drm', 'under_instalasi', 'done'] as StageStatus[]).map(s => {
               const count = stageDistribution[s];
               const total = flattenedLinks.length;
               const pct = total > 0 ? Math.round((count / total) * 100) : 0;
               const style = STAGE_STYLES[s];
               return (
                  <div key={s} className={`relative flex flex-col overflow-hidden rounded-xl border p-4 shadow-sm transition-all ${style.bg} ${style.border}`}>
                     <p className={`font-mono text-[10px] font-bold uppercase tracking-widest ${style.text}`}>{STAGE_LABEL[s]}</p>
                     <p className={`mt-2 font-mono text-3xl font-black tabular-nums ${style.text}`}>{count}</p>
                     <p className={`mt-0.5 font-mono text-[10.5px] ${style.text} opacity-80`}>{pct}% dari total ruas</p>
                     
                     {/* Bottom Accent Progress Line */}
                     <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-transparent">
                        <div className={`h-full transition-all duration-700 ${style.progressBg}`} style={{ width: `${pct}%` }} />
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Toolbar */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
               <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama ruas, project…"
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#EF4444]/40 focus:ring-2 focus:ring-[#EF4444]/15"
               />
            </div>
            <div className="flex items-center gap-2">
               {/* Sort */}
               <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 h-9 shadow-sm">
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  <select
                     value={sortBy}
                     onChange={e => setSortBy(e.target.value as typeof sortBy)}
                     className="bg-transparent text-sm outline-none text-gray-600 cursor-pointer"
                  >
                     <option value="status">Urutkan: Tahap</option>
                     <option value="name">Urutkan: Nama</option>
                     <option value="progress">Urutkan: Progress</option>
                  </select>
               </div>

               {/* Filter */}
               <div className="relative">
                  <button
                     onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                     className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-colors shadow-sm ${
                        activeFiltersCount > 0 ? 'border-[#EF4444]/40 text-[#EF4444] bg-red-50/50' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                     }`}
                  >
                     <SlidersHorizontal className="w-4 h-4" />
                     <span>Filter</span>
                     {activeFiltersCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
                           {activeFiltersCount}
                        </span>
                     )}
                     <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showFilterDropdown && (
                     <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowFilterDropdown(false)} />
                        <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                           <button onClick={() => { setStatusFilter('all'); setShowFilterDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${statusFilter === 'all' ? 'text-[#EF4444] font-bold bg-red-50/50' : 'text-gray-700'}`}>
                              Semua Tahap
                           </button>
                           {(['under_survey', 'under_drm', 'under_instalasi', 'done'] as StageStatus[]).map(s => (
                              <button key={s} onClick={() => { setStatusFilter(s); setShowFilterDropdown(false); }}
                                 className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${statusFilter === s ? 'text-[#EF4444] font-bold bg-red-50/50' : 'text-gray-700'}`}>
                                 <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STAGE_COLOR[s] }} />
                                 {STAGE_LABEL[s]}
                              </button>
                           ))}
                        </div>
                     </>
                  )}
               </div>

               {/* View toggle */}
               <div className="flex overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                  <button onClick={() => setView('list')}
                     className={`flex h-9 w-9 items-center justify-center ${view === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                     <ListIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => setView('grid')}
                     className={`flex h-9 w-9 items-center justify-center ${view === 'grid' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                     <LayoutGrid className="h-4 w-4" />
                  </button>
               </div>
            </div>
         </div>

         {/* Active filter chips */}
         {statusFilter !== 'all' && (
            <div className="flex flex-wrap gap-2 items-center">
               <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLOR[statusFilter] }} />
                  {STAGE_LABEL[statusFilter]}
                  <button onClick={() => setStatusFilter('all')} className="text-gray-400 hover:text-gray-600">
                     <X className="h-3 w-3" />
                  </button>
               </span>
               <button onClick={() => setStatusFilter('all')} className="text-[11px] font-medium text-gray-400 hover:text-gray-600 hover:underline">
                  Hapus semua
               </button>
            </div>
         )}

         {/* Count */}
         <p className="text-[12px] text-gray-400">
            Menampilkan <strong className="text-gray-600">{filteredLinks.length}</strong> dari {flattenedLinks.length} ruas
         </p>

         {/* Content */}
         {view === 'list' ? (
            <GlassCard className="p-0 overflow-hidden min-w-0">
                  {loading ? (
                     <div className="flex items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF4444]" />
                     </div>
                  ) : (
                     <div className="relative border border-gray-200 rounded-lg overflow-hidden min-w-0">
                        <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                           <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'auto', minWidth: '2250px', width: '2250px' }}>
                              <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                                 <tr>
                                    <th className="p-4 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px] whitespace-nowrap">Link / Ruas</th>
                                    <th className="p-4 sticky left-[200px] bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 min-w-[200px] whitespace-nowrap">Project Name</th>
                                    <th className="p-4 min-w-[120px] whitespace-nowrap">Region</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Location</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Customer</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Pelaksana</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Sub Pelaksana</th>
                                    <th className="p-4 min-w-[120px] whitespace-nowrap">Last Updated</th>
                                    <th className="p-4 min-w-[140px] whitespace-nowrap">Start Plan Date</th>
                                    <th className="p-4 min-w-[140px] whitespace-nowrap">End Plan Date</th>
                                    <th className="p-4 min-w-[160px] whitespace-nowrap">Actual Start Date</th>
                                    <th className="p-4 min-w-[160px] whitespace-nowrap">Actual End Date</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">SS Contract Value</th>
                                    <th className="p-4 min-w-[140px] whitespace-nowrap">SS Status</th>
                                    <th className="p-4 min-w-[100px] whitespace-nowrap">Status</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Progress</th>
                                    <th className="p-4 min-w-[150px] whitespace-nowrap">Status Survey</th>
                                    <th className="p-4 min-w-[80px] text-center sticky right-0 bg-gray-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                 {filteredLinks.map((link, index) => {
                                    const project = link.project;
                                    return (
                                       <tr key={`${link.projectId}-${link.linkId}-${index}`}
                                          className="group transition border-b border-gray-100 last:border-b-0">
                                          <td className="p-4 sticky left-0 bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                             {link.linkName !== '-' ? (
                                                <span className="font-bold text-gray-900 group-hover:text-[#EF4444]">{link.linkName}</span>
                                             ) : (
                                                <span className="text-gray-400 italic text-xs">No Links</span>
                                             )}
                                          </td>
                                          <td className="p-4 font-bold text-gray-900 sticky left-[200px] bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">{link.projectName}</td>
                                          <td className="p-4 text-gray-600">
                                             {(() => {
                                                const rId = link.regional ? extractRegionalId(link.regional) : null;
                                                return rId && regionalsRecord[rId] ? regionalsRecord[rId] : '-';
                                             })()}
                                          </td>
                                          <td className="p-4 text-gray-600 capitalize">
                                             {(() => {
                                                const wId = link.witel ? extractRegionalId(link.witel) : null;
                                                return wId && witelsRecord[wId] ? witelsRecord[wId] : '-';
                                             })()}
                                          </td>
                                          <td className="p-4 text-gray-600">{(project as any).customer || 'Telkom Indonesia'}</td>
                                          <td className="p-4 text-gray-600 text-[10px] font-bold uppercase">{(project as any).pelaksana || '-'}</td>
                                          <td className="p-4 text-gray-600 text-[10px] font-bold uppercase">{(project as any).main_vendor || '-'}</td>
                                          <td className="p-4 text-gray-500 text-xs italic">Just now</td>
                                          <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                             {(project as any).start_date_plan
                                                ? new Date((project as any).start_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '-'}
                                          </td>
                                          <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                             {(project as any).end_date_plan
                                                ? new Date((project as any).end_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '-'}
                                          </td>
                                          <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                             {(() => {
                                                const actualDates = actualDatesMap.get(link.projectId);
                                                const linkActualDate = actualDates?.find(ad => {
                                                   const adLinkId = ad.link_id ? extractRegionalId(ad.link_id) : null;
                                                   return adLinkId === link.linkId;
                                                }) || actualDates?.[0];
                                                return linkActualDate && linkActualDate.actual_start_date_survey
                                                   ? new Date(linkActualDate.actual_start_date_survey).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                   : '-';
                                             })()}
                                          </td>
                                          <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                             {(() => {
                                                const actualDates = actualDatesMap.get(link.projectId);
                                                const linkActualDate = actualDates?.find(ad => {
                                                   const adLinkId = ad.link_id ? extractRegionalId(ad.link_id) : null;
                                                   return adLinkId === link.linkId;
                                                }) || actualDates?.[0];
                                                return linkActualDate && linkActualDate.actual_end_date_survey
                                                   ? new Date(linkActualDate.actual_end_date_survey).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                   : '-';
                                             })()}
                                          </td>
                                          <td className="p-4 font-mono text-gray-600">
                                             {link.ss_contract_value
                                                ? `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(link.ss_contract_value)}`
                                                : '---'}
                                          </td>
                                          <td className="p-4 text-center">
                                             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                                                link.ss_status === 'survey completed'
                                                   ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                   : 'bg-amber-100 text-amber-700 border-amber-200'
                                             }`}>
                                                {link.ss_status || 'under survey'}
                                             </span>
                                          </td>
                                          <td className="p-4 text-center">
                                             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                                                link.status === 'survey' ? 'bg-red-100 text-[#DC2626] border-red-200' : 'bg-gray-100 text-gray-600'
                                             }`}>
                                                {link.status}
                                             </span>
                                          </td>
                                          <td className="p-4">
                                             <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                                   {(() => {
                                                      const planned = link.survey_planned_meters || 1000;
                                                      const actual = link.survey_actual_meters || 0;
                                                      const percentage = Math.min((actual / planned) * 100, 100);
                                                      return <div className="h-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] transition-all duration-500" style={{ width: `${percentage}%` }} />;
                                                   })()}
                                                </div>
                                                <span className="text-xs font-mono text-gray-500">
                                                   {(() => {
                                                      const planned = link.survey_planned_meters || 1000;
                                                      const actual = link.survey_actual_meters || 0;
                                                      return `${Math.min((actual / planned) * 100, 100).toFixed(1)}%`;
                                                   })()}
                                                </span>
                                             </div>
                                          </td>
                                          <td className="p-4">
                                             <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                                   {(() => {
                                                      const isCompleted = link.ss_status === 'survey completed';
                                                      return <div className="h-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] transition-all duration-500" style={{ width: isCompleted ? '100%' : '0%' }} />;
                                                   })()}
                                                </div>
                                                <span className="text-xs font-mono text-gray-500">
                                                   {link.ss_status === 'survey completed' ? '100.0%' : '0.0%'}
                                                </span>
                                             </div>
                                          </td>
                                          <td className="p-4 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                             <button onClick={() => handleNavigateToSurvey(link)}
                                                className="p-1.5 hover:bg-white rounded-full text-[#EF4444] hover:text-[#DC2626] shadow-sm transition cursor-pointer">
                                                <ChevronRight className="w-4 h-4" />
                                             </button>
                                          </td>
                                       </tr>
                                    );
                                 })}
                                 {filteredLinks.length === 0 && !loading && (
                                    <tr>
                                       <td colSpan={18} className="p-8 text-center text-gray-400 italic">No ruas found</td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}
            </GlassCard>
         ) : (
            /* Grid View */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
               {filteredLinks.map((link, index) => {
                  const stage = getOverallStage(link);
                  const color = STAGE_COLOR[stage];
                  const planned = link.survey_planned_meters || 1000;
                  const actual = link.survey_actual_meters || 0;
                  const progress = Math.min((actual / planned) * 100, 100);
                  return (
                     <div key={`${link.projectId}-${link.linkId}-${index}`}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                        style={{ borderTopWidth: 3, borderTopColor: color }}
                        onClick={() => handleNavigateToSurvey(link)}
                     >
                        <div className="mb-3 flex items-start justify-between gap-2">
                           <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border"
                              style={{ background: color + '18', color, borderColor: color + '40' }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                              {STAGE_LABEL[stage]}
                           </span>
                           <span className="font-mono text-[10.5px] font-bold tabular-nums" style={{ color }}>
                              {progress.toFixed(0)}%
                           </span>
                        </div>
                        <p className="font-mono text-[13px] font-bold leading-snug tracking-tight text-gray-900 group-hover:text-[#EF4444] transition-colors">
                           {link.linkName}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-gray-500">{link.projectName}</p>
                        <div className="my-3 space-y-1.5 text-[11px] text-gray-400">
                           <div className="flex items-center gap-1.5">
                              <span className="truncate">{(() => {
                                 const wId = link.witel ? extractRegionalId(link.witel) : null;
                                 return wId && witelsRecord[wId] ? witelsRecord[wId] : '-';
                              })()}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <span className="truncate">{(link.project as any).main_vendor || '—'}</span>
                           </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                           <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
                        </div>
                     </div>
                  );
               })}
               {filteredLinks.length === 0 && !loading && (
                  <div className="col-span-full py-16 text-center">
                     <Route className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                     <p className="font-medium text-gray-400">Tidak ada ruas ditemukan</p>
                  </div>
               )}
            </div>
         )}
      </div>
   );
}
