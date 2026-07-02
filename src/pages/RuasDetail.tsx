// Unified Ruas Detail View — combines Survey, DRM, and Installation detail tabs
import { useState, useEffect, useMemo, useRef } from 'react';
import {
   ArrowLeft, MapPin, Network, CheckCircle2, FileText, Layers,
   Map as MapIcon, ScanLine, Activity, Plus, Upload, Download,
   Edit, Trash2, PenTool, X, ChevronRight, Check, Ruler,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { extractId } from '../services/contractService';
import { API_CONFIG } from '../config/api';

// Survey tab components
import { TabSurvey } from '../components/kontrak/TabSurvey';
import { TabSpan } from '../components/kontrak/TabSpan';
import { TabKML } from '../components/kontrak/TabKML';
import { TabBOQ } from '../components/kontrak/TabBOQ';
import { TabMatrix } from '../components/kontrak/TabMatrix';
import { TabRedLine } from '../components/kontrak/TabRedLine';
import { TabAsBuiltDrawing } from '../components/kontrak/TabAsBuiltDrawing';
import { TabWithMarkDone } from '../components/shared/TabWithMarkDone';
import { baSurveyService, BASurveyResponse } from '../services/baSurveyService';

// DRM tab components
import { TabKML as TabKML_DRM } from '../components/DRM/TabKML';
import { TabBOQ as TabBOQ_DRM } from '../components/DRM/TabBOQ';
import { TabMatrix as TabMatrix_DRM } from '../components/DRM/TabMatrix';
import { TabRedLine as TabRedLine_DRM } from '../components/DRM/TabRedLine';
import { TabAsPlanDrawingDRM } from '../components/DRM/TabAsPlanDrawingDRM';
import { TabPOW } from '../components/DRM/TabPOW';
import { TabBASurvey as TabBADRM } from '../components/DRM/TabBADRM';

// Installation tab components
import { TabKML as TabKML_Inst } from '../components/DRM/TabKML';
import { TabBOQ as TabBOQ_Inst } from '../components/DRM/TabBOQ';
import { TabMatrix as TabMatrix_Inst } from '../components/DRM/TabMatrix';
import { TabRedLine as TabRedLine_Inst } from '../components/DRM/TabRedLine';
import { TabSubPhaseProgress } from '../components/installation/TabSubPhaseProgress';
import { TabDataInstallation } from '../components/installation/TabDataInstallation';
import { TabSpanInstallation } from '../components/installation/TabSpan';
import { TabBAInstallation } from '../components/installation/TabBAInstallation';
import { TabOverview } from '../components/shared/TabOverview';
import { installationProjectService } from '../services/installationService';

type StageId = 'survey' | 'drm' | 'instalasi';

interface RuasDetailProps {
   linkId: string;
   projectId: string;
   projectName: string;
   linkName: string;
   initialStage?: StageId;
   onBack: () => void;
}

const STAGE_CONFIG: { id: StageId; label: string; color: string }[] = [
   { id: 'survey', label: 'Survey', color: '#2563eb' },
   { id: 'drm', label: 'Drm', color: '#7c5cfc' },
   { id: 'instalasi', label: 'Instalasi', color: '#ED7D31' },
];

// Status tiap stage (dummy mengikuti mockup — nanti disambung ke data asli)
const STAGE_STATE: Record<StageId, 'done' | 'active' | 'todo'> = {
   survey: 'done',
   drm: 'done',
   instalasi: 'active',
};

// Tab definitions per stage
const SURVEY_TABS = [
   { id: 'overview', label: 'Overview', icon: Activity },
   { id: 'points', label: 'Data Survey', icon: MapPin },
   { id: 'span', label: 'Span', icon: Network },
   { id: 'kml', label: 'KML', icon: MapIcon },
   { id: 'redline', label: 'Redline', icon: Activity },
   { id: 'matrix', label: 'Matrix', icon: Network },
   { id: 'boq', label: 'BOQ', icon: FileText },
   { id: 'drawing', label: 'Drawing', icon: Layers },
   { id: 'ba-survey', label: 'BA Survey', icon: FileText },
   { id: 'as-built', label: 'As Plan Drawing', icon: Layers },
   { id: 'dokumen', label: '📁 Dokumen', icon: FileText },
];

const DRM_TABS = [
   { id: 'overview', label: 'Overview', icon: Activity },
   { id: 'kml', label: 'KML', icon: MapIcon },
   { id: 'redline', label: 'Redline', icon: ScanLine },
   { id: 'matrix', label: 'Matrix', icon: Layers },
   { id: 'boq', label: 'BOQ', icon: FileText },
   { id: 'as-plan', label: 'As Plan Drawing DRM', icon: Layers },
   { id: 'pow', label: 'POW', icon: Network },
   { id: 'ba-drm', label: 'BA DRM', icon: FileText },
   { id: 'dokumen', label: '📁 Dokumen', icon: FileText },
];

const INSTALASI_TABS = [
   { id: 'overview', label: 'Overview', icon: Activity },
   { id: 'data-inst', label: 'Field Data', icon: FileText },
   { id: 'subphase', label: 'Sub-tahap', icon: FileText },
   { id: 'kml', label: 'KML', icon: MapIcon },
   { id: 'boq', label: 'BOQ Instalasi', icon: FileText },
   { id: 'redline', label: 'Redline', icon: ScanLine },
   { id: 'matrix', label: 'Matrix', icon: Layers },
   { id: 'pow', label: 'POW Aktual', icon: Network },
   { id: 'ba-inst', label: 'BA CT', icon: FileText },
   { id: 'dokumen', label: '📁 Dokumen', icon: FileText },
];

export function RuasDetail({ linkId, projectId, projectName, linkName, initialStage = 'survey', onBack }: RuasDetailProps) {
   const { token, user } = useAuth();
   const [activeStage, setActiveStage] = useState<StageId>(initialStage);
   const [activeTab, setActiveTab] = useState<string>(SURVEY_TABS[0].id);
   const contentAreaRef = useRef<HTMLDivElement>(null);

   // Survey data
   const [kmlData, setKmlData] = useState<any>(null);
   const [boqData, setBoqData] = useState<any>(null);
   const [isLoadingBOQ, setIsLoadingBOQ] = useState(false);
   const [baSurveyList, setBaSurveyList] = useState<BASurveyResponse[]>([]);

   // DRM data
   const [drmKmlData, setDrmKmlData] = useState<any>(null);
   const [drmBoqData, setDrmBoqData] = useState<any>(null);
   const [isLoadingDrmBOQ, setIsLoadingDrmBOQ] = useState(false);

   // Documents state for Drawing tab
   const [documents, setDocuments] = useState<Record<string, any[]>>({ drawing: [] });
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [activeUploadCategory, setActiveUploadCategory] = useState<string | null>(null);

   // Reset tab when stage changes
   useEffect(() => {
      if (activeStage === 'survey') setActiveTab(SURVEY_TABS[0].id);
      else if (activeStage === 'drm') setActiveTab(DRM_TABS[0].id);
      else setActiveTab(INSTALASI_TABS[0].id);
   }, [activeStage]);

   // Scroll to content on tab change
   useEffect(() => {
      if (contentAreaRef.current) {
         setTimeout(() => contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
   }, [activeTab]);

   // Fetch Survey BOQ data
   useEffect(() => {
      if (activeStage !== 'survey') return;
      const fetchBOQ = async () => {
         setIsLoadingBOQ(true);
         try {
            const { boqService } = await import('@/services/boqService');
            const data = await boqService.getBOQMatrixByProjectId(projectId, linkId);
            setBoqData(data);
         } catch (e) { console.error('Error fetching BOQ:', e); setBoqData(null); }
         finally { setIsLoadingBOQ(false); }
      };
      fetchBOQ();
   }, [activeStage, projectId, linkId]);

   // Fetch Survey BA Survey list
   useEffect(() => {
      if (activeStage !== 'survey') return;
      const fetch = async () => {
         try {
            const all = await baSurveyService.getAllBASurveys();
            const filtered = all.filter(ba => {
               const baProjectId = typeof ba.project_id === 'string' ? ba.project_id : extractId(ba.project_id);
               if (baProjectId !== projectId) return false;
               if (ba.link_id) {
                  const baLinkId = typeof ba.link_id === 'string' ? ba.link_id : extractId(ba.link_id);
                  return baLinkId === linkId;
               }
               return false;
            });
            setBaSurveyList(filtered);
         } catch (e) { console.error('Error fetching BA Survey:', e); setBaSurveyList([]); }
      };
      fetch();
   }, [activeStage, projectId, linkId]);

   // Fetch DRM BOQ data
   useEffect(() => {
      if (activeStage !== 'drm') return;
      const fetch = async () => {
         if (!token) return;
         setIsLoadingDrmBOQ(true);
         try {
            const res = await window.fetch(`${API_CONFIG.BASE_URL}/boq-drm/link/${linkId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const rec = await res.json(); setDrmBoqData(rec?.doc ? { items: rec.doc, summary: null } : null); }
            else setDrmBoqData(null);
         } catch (e) { console.error('Error fetching DRM BOQ:', e); setDrmBoqData(null); }
         finally { setIsLoadingDrmBOQ(false); }
      };
      fetch();
   }, [activeStage, linkId, token]);

   const handleRefetchData = () => {
      // Trigger re-fetch of survey data
      if (activeStage === 'survey') {
         const fetchBOQ = async () => {
            setIsLoadingBOQ(true);
            try {
               const { boqService } = await import('@/services/boqService');
               const data = await boqService.getBOQMatrixByProjectId(projectId, linkId);
               setBoqData(data);
            } catch (e) { console.error(e); }
            finally { setIsLoadingBOQ(false); }
         };
         fetchBOQ();
      }
   };

   const handleUploadClick = (category: string) => {
      setActiveUploadCategory(category);
      if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUploadCategory) {
         const newDoc = { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + ' MB', date: 'Just now' };
         setDocuments(prev => ({ ...prev, [activeUploadCategory]: [...(prev[activeUploadCategory] || []), newDoc] }));
         toast.success(`Uploaded ${file.name}`);
      }
      setActiveUploadCategory(null);
   };

   const currentTabs = activeStage === 'survey' ? SURVEY_TABS : activeStage === 'drm' ? DRM_TABS : INSTALASI_TABS;
   const stageColor = (STAGE_CONFIG.find(s => s.id === activeStage) ?? STAGE_CONFIG[0]).color;

   // Placeholder components untuk tab Overview & Dokumen (konten akan dilengkapi di iterasi berikutnya)
   const OverviewPlaceholder = () => (
      <div className="flex min-h-[400px] items-center justify-center bg-gray-50">
         <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-500">Tab Overview</p>
            <p className="text-xs text-gray-400">Konten akan dilengkapi nanti</p>
         </div>
      </div>
   );

   const DokumenPlaceholder = () => (
      <div className="flex min-h-[400px] items-center justify-center bg-gray-50">
         <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-500">📁 Hub Dokumen</p>
            <p className="text-xs text-gray-400">Konten akan dilengkapi nanti</p>
         </div>
      </div>
   );

   // Determine installation project ID for installation tabs
   const [installationProjectId, setInstallationProjectId] = useState<string>('');
   useEffect(() => {
      if (activeStage !== 'instalasi') return;
      const fetch = async () => {
         try {
            const projects = await installationProjectService.getAll(token);
            const match = projects.find((p: any) => {
               const pLinkId = typeof p.link_id === 'string' ? p.link_id : extractId(p.link_id);
               return pLinkId === linkId;
            });
            if (match) setInstallationProjectId(typeof match.id === 'string' ? match.id : extractId(match.id));
         } catch (e) { console.error('Error fetching installation project:', e); }
      };
      fetch();
   }, [activeStage, linkId]);

   return (
      <div className="space-y-2">
         <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

         {/* ── Row 1: Identitas Ruas (style mockup) ── */}
         <div className="px-1 py-1">
            <button onClick={onBack} className="mb-1 inline-flex items-center gap-1 font-mono text-[10.5px] font-bold uppercase tracking-wider hover:underline" style={{ color: '#2563eb' }}>
               ← PROJECT {projectName.toUpperCase()}
            </button>
            <div className="flex items-center justify-between gap-3">
               <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-gray-900">{linkName}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 font-medium">
                     <span className="flex items-center gap-1"><Ruler className="h-3 w-3 text-gray-400" />2.4 km</span>
                     <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-400" />141 titik</span>
                     <span className="flex items-center gap-1">
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7.5px] font-black text-white" style={{ background: '#ED7D31' }}>M</span>
                        PT Mitra Nusa
                     </span>
                     <span className="text-gray-300">·</span>
                     <span>K.TEL/102846238HH</span>
                     <span className="text-gray-300">·</span>
                     <span>19 Feb – 19 Okt 2026</span>
                  </div>
               </div>
               <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => toast('Membuka GIS Map Viewer…')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                     <MapIcon className="h-3.5 w-3.5" />GIS
                  </button>
                  <button onClick={() => toast.success('✓ ZIP berhasil didownload')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                     <Download className="h-3.5 w-3.5" />ZIP
                  </button>
               </div>
            </div>
         </div>

         {/* ── Row 2: Stage Stepper dengan status done ✓ (style mockup) ── */}
         <div className="px-1 py-1">
            <div className="flex items-center gap-1.5">
               {STAGE_CONFIG.map((stage, i) => {
                  const isActive = activeStage === stage.id;
                  const state = STAGE_STATE[stage.id];
                  const isDone = state === 'done';

                  let pillClass = "";
                  let iconEl = null;
                  let textClass = "";

                  if (isActive) {
                     pillClass = "text-white shadow-sm";
                     textClass = "text-white";
                     if (isDone) {
                        iconEl = <Check className="h-3.5 w-3.5 text-white" />;
                     } else {
                        iconEl = (
                           <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black" style={{ color: stage.color }}>
                              {i + 1}
                           </span>
                        );
                     }
                  } else if (isDone) {
                     pillClass = "bg-[#E2F0D9] hover:bg-[#E2F0D9]/80";
                     textClass = "text-[#385723]";
                     iconEl = <Check className="h-3.5 w-3.5 text-[#385723]" />;
                  } else {
                     pillClass = "bg-[#F2F2F2] hover:bg-[#F2F2F2]/80";
                     textClass = "text-gray-400 font-normal";
                     iconEl = (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500">
                           {i + 1}
                        </span>
                     );
                  }

                  return (
                     <div key={stage.id} className="flex items-center gap-1.5">
                        <button
                           onClick={() => setActiveStage(stage.id)}
                           className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${pillClass}`}
                           style={isActive ? { background: stage.color } : undefined}
                        >
                           {iconEl}
                           <span className={textClass}>{stage.label}</span>
                        </button>
                        {i < STAGE_CONFIG.length - 1 && (
                           <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                        )}
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Tab Bar — underline mengikuti warna stage aktif (style mockup) */}
         <div className="border-b border-gray-200 bg-transparent mt-2">
            <div className="flex overflow-x-auto px-1">
               {currentTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 flex items-center gap-2 border-b-2 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                           isActive ? '' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                        style={isActive ? { color: stageColor, borderColor: stageColor } : undefined}
                     >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                     </button>
                  );
               })}
            </div>
         </div>

         {/* Tab Content */}
         <div ref={contentAreaRef} className="mt-3">
            <GlassCard className="p-0 overflow-hidden min-w-0 bg-transparent border-transparent shadow-none">

               {/* Render Overview Tab if active */}
               {activeTab === 'overview' && (
                  <TabOverview
                     activeStage={activeStage}
                     linkId={linkId}
                     linkName={linkName}
                     projectName={projectName}
                     onTabChange={setActiveTab}
                  />
               )}

               {/* Render Dokumen Tab if active */}
               {activeTab === 'dokumen' && (
                  <DokumenPlaceholder />
               )}

               {/* ═══════════ SURVEY STAGE ═══════════ */}
               {activeStage === 'survey' && activeTab !== 'overview' && activeTab !== 'dokumen' && (
                  <TabWithMarkDone tabName="boq" linkId={linkId} projectId={projectId} boqData={boqData} kmlData={kmlData} linkName={linkName} projectData={null as any}>
                     {({ markAsDoneButton }) => (
                        <>
                           {activeTab === 'points' && (
                              <TabSurvey contractId={projectId} contractName={projectName} linkId={linkId} onDataChanged={handleRefetchData} />
                           )}
                           {activeTab === 'span' && (
                              <TabSpan projectId={projectId} projectName={projectName} linkId={linkId} onDataChanged={handleRefetchData} />
                           )}
                           {activeTab === 'kml' && (
                              <TabKML kmlFileName="" kmlFileContent="" kmlData={kmlData} projectId={projectId} linkId={linkId} onPreview={() => {}} onRefetchData={handleRefetchData} />
                           )}
                           {activeTab === 'redline' && (
                              <TabRedLine contractId={projectId} linkId={linkId} />
                           )}
                           {activeTab === 'matrix' && (
                              <TabMatrix contractId={projectId} contractName={projectName} linkId={linkId} />
                           )}
                           {activeTab === 'boq' && (
                              <TabBOQ
                                 boqItems={boqData?.items || []} boqFileName="" lokasi={linkName}
                                 projectId={projectId} linkId={linkId} summary={boqData?.summary}
                                 isLoading={isLoadingBOQ} markAsDoneButton={markAsDoneButton}
                                 onDataChange={handleRefetchData}
                              />
                           )}
                           {activeTab === 'drawing' && (
                              <div className="flex flex-col h-full">
                                 <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <div>
                                       <h3 className="text-gray-800 font-bold text-sm">Technical Drawings</h3>
                                       <p className="text-[10px] text-gray-500">As-Built / Layouts</p>
                                    </div>
                                    <button onClick={() => handleUploadClick('drawing')} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded shadow hover:bg-gray-200 transition flex items-center gap-1">
                                       <Upload className="w-3.5 h-3.5" /> Upload Drawing
                                    </button>
                                 </div>
                                 <div className="p-4 grid grid-cols-2 gap-4 overflow-auto flex-1">
                                    {documents.drawing.length > 0 ? documents.drawing.map((doc, idx) => (
                                       <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                                          <div className="flex justify-between items-start mb-2">
                                             <Layers className="w-6 h-6 text-gray-500" />
                                             <button><Download className="w-4 h-4 text-gray-400 hover:text-[#EF4444]" /></button>
                                          </div>
                                          <p className="font-bold text-xs text-gray-700 truncate">{doc.name}</p>
                                          <p className="text-[10px] text-gray-400 mt-1">{doc.size}</p>
                                       </div>
                                    )) : (
                                       <div className="col-span-2 text-center py-10 text-gray-400 italic text-sm">No drawings uploaded.</div>
                                    )}
                                 </div>
                              </div>
                           )}
                           {activeTab === 'ba-survey' && (
                              <div className="flex flex-col h-full">
                                 <div className="p-4 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
                                    <div>
                                       <h3 className="text-[#DC2626] font-bold text-sm">BA Survey for this link</h3>
                                       <p className="text-[10px] text-gray-500">Berita Acara Survey documents</p>
                                    </div>
                                 </div>
                                 {baSurveyList.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center p-8">
                                       <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white w-full">
                                          <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                          <div className="text-gray-400 text-lg mb-2">No BA Survey available</div>
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="flex-1 overflow-auto">
                                       <div className="px-4 py-4">
                                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                             <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                                   <tr>
                                                      <th className="px-6 py-4 text-xs uppercase font-semibold">Location</th>
                                                      <th className="px-6 py-4 text-xs uppercase font-semibold">Survey Date</th>
                                                      <th className="px-6 py-4 text-xs uppercase font-semibold">Status</th>
                                                      <th className="px-6 py-4 text-xs uppercase font-semibold">Created At</th>
                                                   </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                   {baSurveyList.map(ba => (
                                                      <tr key={typeof ba.id === 'string' ? ba.id : extractId(ba.id)} className="hover:bg-red-50/50 transition">
                                                         <td className="px-6 py-4 text-gray-900">
                                                            <div className="flex items-start gap-2">
                                                               <MapPin className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                                                               <span>{ba.lokasi}</span>
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-4 text-gray-900">
                                                            {new Date(ba.tanggal_ba || ba.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                         </td>
                                                         <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                               ba.state === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                               ba.state === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                               'bg-gray-50 text-gray-700 border-gray-200'
                                                            }`}>
                                                               {ba.state || 'draft'}
                                                            </span>
                                                         </td>
                                                         <td className="px-6 py-4 text-gray-600 text-xs">
                                                            {new Date(ba.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                         </td>
                                                      </tr>
                                                   ))}
                                                </tbody>
                                             </table>
                                          </div>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}
                           {activeTab === 'as-built' && (
                              <TabAsBuiltDrawing contractId={projectId} linkId={linkId} />
                           )}
                        </>
                     )}
                  </TabWithMarkDone>
               )}

               {/* ═══════════ DRM STAGE ═══════════ */}
               {activeStage === 'drm' && activeTab !== 'overview' && activeTab !== 'dokumen' && (
                  <>
                     {activeTab === 'kml' && (
                        <TabKML_DRM kmlFileName="" kmlFileContent="" projectId={projectId} linkId={linkId} kmlData={drmKmlData} onPreview={() => {}} />
                     )}
                     {activeTab === 'redline' && (
                        <TabRedLine_DRM contractId={projectId} linkId={linkId} />
                     )}
                     {activeTab === 'matrix' && (
                        <TabMatrix_DRM contractId={projectId} contractName={projectName} linkId={linkId} />
                     )}
                     {activeTab === 'boq' && (
                        <TabBOQ_DRM projectId={projectId} linkId={linkId} boqItems={drmBoqData?.items || []} summary={drmBoqData?.summary} isLoading={isLoadingDrmBOQ}
                           onDataChange={async () => {
                              if (!token) return;
                              setIsLoadingDrmBOQ(true);
                              try {
                                 const res = await window.fetch(`${API_CONFIG.BASE_URL}/boq-drm/link/${linkId}`, { headers: { Authorization: `Bearer ${token}` } });
                                 if (res.ok) { const rec = await res.json(); setDrmBoqData(rec?.doc ? { items: rec.doc, summary: null } : null); }
                              } catch (e) { console.error(e); }
                              finally { setIsLoadingDrmBOQ(false); }
                           }}
                        />
                     )}
                     {activeTab === 'as-plan' && (
                        <TabAsPlanDrawingDRM projectId={projectId} />
                     )}
                     {activeTab === 'pow' && (
                        <TabPOW contractId={projectId} linkId={linkId} linkName={linkName} />
                     )}
                     {activeTab === 'ba-drm' && (
                        <TabBADRM contractId={projectId} linkId={linkId} linkName={linkName} />
                     )}
                  </>
               )}

               {/* ═══════════ INSTALASI STAGE ═══════════ */}
               {activeStage === 'instalasi' && activeTab !== 'overview' && activeTab !== 'dokumen' && (
                  <>
                     {activeTab === 'subphase' && (
                        <TabSubPhaseProgress projectId={projectId} linkId={linkId} installationProjectId={installationProjectId} linkName={linkName} isImported={false} setIsImported={() => {}} />
                     )}
                     {activeTab === 'data-inst' && (
                        <TabDataInstallation projectId={projectId} linkId={linkId} linkName={linkName} projectName={projectName} />
                     )}
                     {activeTab === 'span' && (
                        <TabSpanInstallation projectId={projectId} linkId={linkId} projectName={projectName} />
                     )}
                     {activeTab === 'kml' && (
                        <TabKML_Inst kmlFileName="" kmlFileContent="" projectId={projectId} linkId={linkId} kmlData={undefined} defaultCategory="installation" onPreview={() => {}} />
                     )}
                     {activeTab === 'redline' && (
                        <TabRedLine_Inst contractId={projectId} linkId={linkId} dataSource="installasi" />
                     )}
                     {activeTab === 'matrix' && (
                        <TabMatrix_Inst contractId={projectId} contractName={projectName} linkId={linkId} dataSource="installasi" />
                     )}
                     {activeTab === 'boq' && (
                        <TabBOQ_Inst projectId={projectId} linkId={linkId} lokasi={linkName} isLoading={false} dataSource="installasi" />
                     )}
                     {activeTab === 'ba-inst' && (
                        <TabBAInstallation projectId={projectId} linkId={linkId} linkName={linkName} />
                     )}
                     {activeTab === 'pow' && (
                        <TabPOW contractId={projectId} linkId={linkId} linkName={linkName} />
                     )}
                  </>
               )}

            </GlassCard>
         </div>
      </div>
   );
}
