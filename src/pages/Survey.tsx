//survey
import { useState, useMemo, useEffect, useRef } from 'react';
import {
   Camera, ChevronRight, ArrowLeft, Search, MapPin, Filter,
   Save, X, FileText, Layers, ScanLine, Upload, Download,
   Activity, Network, CheckCircle2, Map as MapIcon, Trash2, Edit, PenTool, CheckCircle, Plus, ChevronDown
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { getAllProjects, ProjectResponse, extractId, getProjectKMLFiles } from '../services/contractService';
import { toast } from 'sonner';
import { TabSurvey } from '../components/kontrak/TabSurvey';
import { TabSpan } from '../components/kontrak/TabSpan';
import { TabKML } from '../components/kontrak/TabKML';
import { TabBOQ } from '../components/kontrak/TabBOQ';
import { TabMatrix } from '../components/kontrak/TabMatrix';
import { TabRedLine } from '../components/kontrak/TabRedLine';
import { baSurveyService, BASurveyResponse } from '../services/baSurveyService';
import { CreateBASurveyModal, BASurveyFormData } from '../components/modals/ba-survey/CreateBASurveyModal';
import { EditBASurveyModal, EditBASurveyFormData } from '../components/modals/ba-survey/EditBASurveyModal';
import { DeleteBASurveyModal } from '../components/modals/ba-survey/DeleteBASurveyModal';
import { BASurveyApprovalModal } from '../components/modals/ba-survey/BASurveyApprovalModal';
import { useAuth } from '../context/AuthContext';
import { generateBASurveyPDFWithQR } from '../utils/baSurveyPdfGenerator';
import { surveyorAssignmentService } from '../services/surveyorAssignmentService';
import { linkService } from '../services/linkService';
import { markSurveyAsDone, getSurveyDoneStatus } from '../services/surveyDoneService';
import { TabWithMarkDone } from '../components/shared/TabWithMarkDone';
import { TabAsBuiltDrawing } from '../components/kontrak/TabAsBuiltDrawing';
import { getAllRegionals, getAllWitels, extractId as extractRegionalId, type Regional, type Witel } from '../services/regionalService';
import { actualDateService, type ActualDateAll } from '../services/actualDateService';

// Flattened link interface for table display
interface FlattenedLink {
   linkId: string;
   linkName: string;
   projectId: string;
   projectName: string;
   regional?: any; // NEW: Regional name (from link.regional)
   witel?: any; // NEW: Witel name (from link.witel)
   status: string;
   ss_status?: string; // NEW: Survey status (under survey / survey completed)
   ss_contract_value?: number; // NEW: SS Contract value
   survey_actual_meters?: number; // NEW
   survey_planned_meters?: number; // NEW
   plan_date?: string; // NEW: Plan date for survey
   actual_date?: string; // NEW: Actual date when survey completed
   project: ProjectResponse; // Keep full project data for detail view
}

// --- Components ---

// 1. Photo Metadata Editor Modal (Enhanced)
function PhotoMetadataEditor({
   isOpen, onClose, onSave, selectedLink
}: {
   isOpen: boolean, onClose: () => void, onSave: (data: any) => void, selectedLink?: FlattenedLink
}) {
   const [step, setStep] = useState<'upload' | 'processing' | 'verify' | 'manual'>('upload');
   const [activeTab, setActiveTab] = useState('metadata');
   const [previewUrl, setPreviewUrl] = useState<string>("https://images.unsplash.com/photo-1621905252507-b35a83013d28?auto=format&fit=crop&q=80&w=600");

   const [formData, setFormData] = useState({
      designator: '',
      latitude: '-7.123456',
      longitude: '110.123456',
      accuracy: '3m',
      timestamp: new Date().toLocaleString(),
      soilType: 'Tanah Liat',
      depth: '100',
      description: '',
      linkName: selectedLink?.linkName || ''
   });

   const [selectedSpanId, setSelectedSpanId] = useState<string>('');

   // Reset state when opening
   useEffect(() => {
      if (isOpen) {
         setStep('upload');
         setFormData(prev => ({ ...prev, linkName: selectedLink?.linkName || '' }));
         setSelectedSpanId('');
      }
   }, [isOpen, selectedLink]);

   if (!isOpen) return null;

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         setPreviewUrl(URL.createObjectURL(file));
         setStep('processing');

         // Simulate AI Processing
         setTimeout(() => {
            setStep('verify');
            // Mock "AI Detected" data
            setFormData(prev => ({
               ...prev,
               designator: 'ODP',
               soilType: 'Tanah Keras',
               description: 'AI detected ODP closure on pole.'
            }));
         }, 1500);
      }
   };

   const handleManualEntry = () => {
      setStep('manual');
      // Reset form for manual entry
      setFormData(prev => ({
         ...prev,
         designator: '',
         soilType: 'Tanah Liat',
         description: '',
         timestamp: new Date().toLocaleString()
      }));
      setPreviewUrl(''); // Clear preview or set to placeholder
   };

   const handleSave = () => {
      onSave({ ...formData, spanId: selectedSpanId });
      onClose();
   };

   // For now, no span selection required (will be added later if needed)
   const canProceed = true;

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white flex justify-between items-center shrink-0">
               <h3 className="font-bold text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5" /> {step === 'manual' ? 'Manual Data Entry' : 'Survey Photo Editor'}
               </h3>
               <button onClick={onClose}><X className="w-5 h-5 opacity-70 hover:opacity-100" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

               {/* Left: Photo Preview */}
               <div className="w-1/3 bg-black flex items-center justify-center relative group overflow-hidden">
                  {(!previewUrl && step !== 'manual') ? (
                     <div className="text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                           <Camera className="w-8 h-8 text-white/50" />
                        </div>
                        <p className="text-xs text-white/50">Photo Preview</p>
                     </div>
                  ) : (
                     <>
                        {previewUrl ? (
                           <img
                              src={previewUrl}
                              className="w-full h-full object-contain"
                           />
                        ) : (
                           // Manual Mode Placeholder
                           <div className="text-center text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50 text-white" />
                              <p className="text-xs text-white/70">Manual Entry Mode</p>
                           </div>
                        )}

                        {previewUrl && (
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                              <p className="text-white text-xs font-mono">{formData.timestamp}</p>
                              <p className="text-white text-xs font-mono">{formData.latitude}, {formData.longitude}</p>
                           </div>
                        )}
                     </>
                  )}
               </div>

               {/* Right: Actions OR Metadata Form */}
               <div className="flex-1 flex flex-col bg-gray-50">
                  {step === 'upload' ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="max-w-md w-full">
                           <h3 className="text-xl font-bold text-[#DC2626] mb-2">Upload Survey Data</h3>
                           <p className="text-gray-500 text-xs mb-8">Upload your photo to begin analysis.</p>

                           <div className="space-y-3">
                              <label className={`block w-full ${!canProceed ? 'opacity-50 pointer-events-none' : ''}`}>
                                 <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                 <div className="w-full py-4 bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:shadow-lg hover:shadow-red-500/30 text-white rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-3">
                                    <Upload className="w-5 h-5" />
                                    <span>Upload Photo</span>
                                 </div>
                              </label>

                              <div className="relative flex py-2 items-center">
                                 <div className="flex-grow border-t border-gray-200"></div>
                                 <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] uppercase font-bold tracking-widest">Or</span>
                                 <div className="flex-grow border-t border-gray-200"></div>
                              </div>

                              <button
                                 onClick={handleManualEntry}
                                 disabled={!canProceed}
                                 className={`w-full py-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow transition ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                 <FileText className="w-5 h-5" />
                                 <span>Manual Entry</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 bg-white shrink-0">
                           {['metadata', 'tags', 'preview'].map(tab => (
                              <button
                                 key={tab}
                                 onClick={() => setActiveTab(tab)}
                                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'border-b-2 border-[#EF4444] text-[#EF4444]' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                 {tab}
                              </button>
                           ))}
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                           {activeTab === 'metadata' && (
                              <div className="space-y-4">
                                 {/* Impact Preview Box */}
                                 <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-2 mb-2">
                                       <CheckCircle2 className="w-3.5 h-3.5" /> High Confidence Match (98%)
                                    </h4>
                                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                                       AI detected a <b>Pole with ODP</b>. Saving this will:
                                    </p>
                                    <ul className="mt-1 space-y-1 text-[10px] text-emerald-600 pl-4 list-disc">
                                       <li>Create 1 New Node in <b>Redline</b></li>
                                       <li>Add "ODP-Solid" to <b>BOQ</b> (+1 Unit)</li>
                                       <li>Update Connectivity Matrix for Link {selectedLink?.linkName}</li>
                                    </ul>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Project Link</label>
                                       <input type="text" value={formData.linkName} readOnly className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-sm font-bold text-gray-700" />
                                    </div>
                                    <div>
                                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Designator Type</label>
                                       <select
                                          className="w-full bg-white border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-[#EF4444]/20 outline-none"
                                          value={formData.designator}
                                          onChange={(e) => setFormData({ ...formData, designator: e.target.value })}
                                       >
                                          <option value="">Select Type...</option>
                                          <option value="Pole">Tiang (Pole)</option>
                                          <option value="ODP">ODP / Splice</option>
                                          <option value="Slack">Slack Point</option>
                                          <option value="Closure">Closure</option>
                                       </select>
                                    </div>
                                 </div>

                                 <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <h4 className="text-xs font-bold text-red-800 mb-3 flex items-center gap-2">
                                       <MapPin className="w-3.5 h-3.5" /> GPS Metadata (Editable)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                       <div>
                                          <label className="block text-[10px] text-red-600 mb-1">Latitude</label>
                                          <input
                                             type="text"
                                             value={formData.latitude}
                                             className="w-full bg-white border border-red-200 rounded p-1.5 text-xs font-mono"
                                             onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                          />
                                       </div>
                                       <div>
                                          <label className="block text-[10px] text-red-600 mb-1">Longitude</label>
                                          <input
                                             type="text"
                                             value={formData.longitude}
                                             className="w-full bg-white border border-red-200 rounded p-1.5 text-xs font-mono"
                                             onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                          />
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Soil Type</label>
                                       <select
                                          className="w-full bg-white border border-gray-200 rounded p-2 text-sm"
                                          value={formData.soilType}
                                          onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                                       >
                                          <option>Tanah Liat (Clay)</option>
                                          <option>Tanah Pasir (Sand)</option>
                                          <option>Tanah Keras</option>
                                          <option>Paving / Beton</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Depth (cm)</label>
                                       <input
                                          type="number"
                                          value={formData.depth}
                                          className="w-full bg-white border border-gray-200 rounded p-2 text-sm"
                                          onChange={e => setFormData({ ...formData, depth: e.target.value })}
                                       />
                                    </div>
                                 </div>
                              </div>
                           )}

                           {activeTab === 'tags' && (
                              <div className="text-center py-10 text-gray-500 text-xs">
                                 <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                 tag preview...
                              </div>
                           )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
                           <button
                              onClick={onClose}
                              className="text-gray-400 text-xs hover:text-gray-600"
                           >
                              Discard
                           </button>
                           <div className="flex gap-2">
                              {/* Re-upload button */}
                              {step === 'processing' || step === 'verify' || step === 'manual' ? (
                                 <button onClick={() => { setStep('upload'); setPreviewUrl(''); }} className="px-3 py-2 border rounded text-xs font-bold text-gray-600 hover:bg-gray-50">
                                    Re-Upload
                                 </button>
                              ) : null}
                              <button
                                 onClick={handleSave}
                                 className="px-6 py-2 bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white rounded text-xs font-bold hover:shadow-lg transition flex items-center gap-2"
                              >
                                 <Save className="w-3.5 h-3.5" /> Confirm & Save
                              </button>
                           </div>
                        </div>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}


interface SurveyProps {
   onTabChange?: (tab: string) => void;
}

export function Survey({ onTabChange }: SurveyProps = {}) {
   // Saklar untuk menampilkan detail view embedded LAMA (dipertahankan sbg referensi). Selalu false — detail kini di RuasDetail gabungan.
   const SHOW_LEGACY_DETAIL: boolean = false;
   const { token, user } = useAuth();
   const [regionalsRecord, setRegionalsRecord] = useState<Record<string, string>>({});
   const [witelsRecord, setWitelsRecord] = useState<Record<string, string>>({});
   const [actualDatesMap, setActualDatesMap] = useState<Map<string, ActualDateAll[]>>(new Map());
   const [loadingActualDates, setLoadingActualDates] = useState(false);
   const [viewLevel, setViewLevel] = useState<'list' | 'detail'>('list');
   const [selectedLink, setSelectedLink] = useState<FlattenedLink | null>(null);
   const [projects, setProjects] = useState<ProjectResponse[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('all');
   const [showStatusDropdown, setShowStatusDropdown] = useState(false);
   const [isMetadataOpen, setIsMetadataOpen] = useState(false);
   const [kmlData, setKmlData] = useState<any>(null); // KML data from API
   const [isLoadingKML, setIsLoadingKML] = useState<boolean>(false);

   // BA Survey state
   const [baSurveyList, setBaSurveyList] = useState<BASurveyResponse[]>([]);
   const [allBASurveys, setAllBASurveys] = useState<BASurveyResponse[]>([]); // NEW: All BA Surveys for status calculation
   const [loadingBASurvey, setLoadingBASurvey] = useState(false);
   const [isCreateBASurveyModalOpen, setIsCreateBASurveyModalOpen] = useState(false);
   const [isEditBASurveyModalOpen, setIsEditBASurveyModalOpen] = useState(false);
   const [isDeleteBASurveyModalOpen, setIsDeleteBASurveyModalOpen] = useState(false);
   const [selectedBASurvey, setSelectedBASurvey] = useState<BASurveyResponse | null>(null);
   const [isExportingPDF, setIsExportingPDF] = useState(false);
   const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

   // Detail View State
   const [activeTab, setActiveTab] = useState<'points' | 'span' | 'kml' | 'redline' | 'matrix' | 'boq' | 'drawing' | 'ba-survey' | 'as-built'>('points');
   const [localDesignators, setLocalDesignators] = useState<any[]>([]); // To simulate adding points locally

   // Auto-scroll ref — scroll content area into view when tab changes (except kml & redline)
   const contentAreaRef = useRef<HTMLDivElement>(null);
   const AUTO_SCROLL_TABS: Array<typeof activeTab> = ['points', 'span', 'matrix', 'boq', 'drawing', 'ba-survey', 'as-built'];

   useEffect(() => {
      if (AUTO_SCROLL_TABS.includes(activeTab) && contentAreaRef.current) {
         setTimeout(() => {
            contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }, 80);
      }
   }, [activeTab]);

   // BOQ State
   const [boqData, setBoqData] = useState<any>(null);
   const [isLoadingBOQ, setIsLoadingBOQ] = useState(false);

   // Document Management State
   const [documents, setDocuments] = useState<Record<string, any[]>>({
      kml: [{ name: 'Survey_Route.kml', size: '1.2 MB', date: '2 days ago' }],
      boq: [{ name: 'Survey_BOQ.xlsx', size: '3.4 MB', date: '1 week ago' }],
      redline: [],
      matrix: [{ name: 'Survey_Matrix.xlsx', size: '2.8 MB', date: '3 days ago' }],
      drawing: [{ name: 'Sketch_Draft.pdf', size: '4.5 MB', date: '1 day ago' }],
   });

   // Survey Done State
   const [isSurveyDone, setIsSurveyDone] = useState(false);
   const [isMarkingDone, setIsMarkingDone] = useState(false);

   const fileInputRef = useRef<HTMLInputElement>(null);
   const [activeUploadCategory, setActiveUploadCategory] = useState<string | null>(null);

   // Fetch projects and lookups on mount
   useEffect(() => {
      if (token) {
         fetchProjects();
         fetchAllBASurveys(); // NEW: Fetch all BA Surveys for status calculation
         
         const loadLookups = async () => {
            try {
               const [regionals, witels] = await Promise.all([
                  getAllRegionals(),
                  getAllWitels(),
               ]);
               const rRecord: Record<string, string> = {};
               regionals.forEach((r: Regional) => { rRecord[r.id] = r.region; });
               setRegionalsRecord(rRecord);

               const wRecord: Record<string, string> = {};
               witels.forEach((w: Witel) => { wRecord[w.id] = w.witel; });
               setWitelsRecord(wRecord);
            } catch (e) {
               console.error('Failed to load regional/witel lookups in Survey:', e);
            }
         };
         loadLookups();
      }
   }, [token]);

   // Fetch actual dates for all projects
   useEffect(() => {
      const fetchActualDates = async () => {
         if (!token || projects.length === 0) return;

         setLoadingActualDates(true);
         try {
            const projectIds = projects.map(p => typeof p.id === 'string' ? p.id : extractId(p.id));
            const actualDatesData = await actualDateService.getActualDatesForProjects(projectIds, token);
            setActualDatesMap(actualDatesData);
         } catch (error) {
            console.error('Failed to fetch actual dates in Survey:', error);
         } finally {
            setLoadingActualDates(false);
         }
      };

      fetchActualDates();
   }, [projects, token]);

   // Fetch KML data when selectedLink changes
   useEffect(() => {
      const fetchKMLData = async () => {
         if (!selectedLink || !selectedLink.projectId) {
            setKmlData(null);
            return;
         }

         setIsLoadingKML(true);
         try {
            console.log('📥 Fetching KML data for project:', selectedLink.projectId);
            const data = await getProjectKMLFiles(selectedLink.projectId, token);
            console.log('✅ KML data fetched:', data);
            setKmlData(data);
         } catch (error) {
            console.error('❌ Error fetching KML data:', error);
            // Set empty data structure on error
            setKmlData({
               kml_project: [],
               kml_survey: [],
               kml_span: []
            });
         } finally {
            setIsLoadingKML(false);
         }
      };

      fetchKMLData();
   }, [selectedLink, token]);

   // Function to manually refetch KML and Survey data
   const handleRefetchData = async () => {
      if (!selectedLink || !selectedLink.projectId) return;

      console.log('🔄 Manual refetch triggered for KML and Survey data');

      // Refetch KML data
      setIsLoadingKML(true);
      try {
         console.log('📥 Refetching KML data for project:', selectedLink.projectId);
         const data = await getProjectKMLFiles(selectedLink.projectId, token);
         console.log('✅ KML data refetched:', data);
         setKmlData(data);
      } catch (error) {
         console.error('❌ Error refetching KML data:', error);
      } finally {
         setIsLoadingKML(false);
      }

      // Refetch Survey data (if needed)
      // Add survey refetch logic here if you have a separate survey fetch function
   };

   // Fetch BA Survey data when selectedLink changes
   useEffect(() => {
      const fetchBASurveyData = async () => {
         if (!selectedLink || !selectedLink.projectId) {
            setBaSurveyList([]);
            return;
         }

         setLoadingBASurvey(true);
         try {
            console.log('📥 Fetching BA Survey data for project:', selectedLink.projectId);
            console.log('📥 Fetching BA Survey data for link:', selectedLink.linkId);
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);
            console.log('✅ BA Survey data fetched:', data);

            // Filter BA Surveys by link_id
            const filteredData = data.filter(ba => {
               if (!ba.link_id) {
                  console.log('⚠️ BA Survey has no link_id:', ba);
                  return false; // Don't show BA Surveys without link_id
               }

               const baSurveyLinkId = typeof ba.link_id === 'string'
                  ? ba.link_id
                  : extractId(ba.link_id);

               const matches = baSurveyLinkId === selectedLink.linkId;
               console.log(`${matches ? '✅' : '❌'} BA Survey link_id: ${baSurveyLinkId} ${matches ? '==' : '!='} ${selectedLink.linkId}`);
               return matches;
            });

            console.log('✅ Filtered BA Survey data:', filteredData);
            setBaSurveyList(filteredData);
         } catch (error) {
            console.error('❌ Error fetching BA Survey data:', error);
            setBaSurveyList([]);
         } finally {
            setLoadingBASurvey(false);
         }
      };

      fetchBASurveyData();
   }, [selectedLink]);

   // Fetch BOQ data when selectedLink changes
   useEffect(() => {
      const fetchBOQData = async () => {
         if (!selectedLink || !selectedLink.projectId) {
            setBoqData(null);
            return;
         }

         setIsLoadingBOQ(true);
         try {
            console.log('📥 Fetching BOQ data for link:', selectedLink.linkId, 'project:', selectedLink.projectId);
            const { boqService } = await import('@/services/boqService');
            // Use link-based matrix API (per link)
            const data = await boqService.getBOQMatrixByProjectId(selectedLink.projectId, selectedLink.linkId);
            console.log('✅ BOQ data fetched:', data);
            setBoqData(data);
         } catch (error) {
            console.error('❌ Error fetching BOQ data:', error);
            setBoqData(null);
         } finally {
            setIsLoadingBOQ(false);
         }
      };

      fetchBOQData();
   }, [selectedLink]);

   const fetchProjects = async () => {
      if (!token) {
         console.warn('⚠️ No token available, skipping fetch');
         setLoading(false);
         return;
      }

      try {
         setLoading(true);

         // All users (admin, PM, surveyor) fetch all projects
         // Backend will handle access control for surveyors
         const data = await getAllProjects(token);

         // Sort by created_at descending (newest first)
         const sortedData = data.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA; // Descending order (newest first)
         });

         setProjects(sortedData);
      } catch (error) {
         console.error('Error fetching projects:', error);
         toast.error('Failed to load projects');
      } finally {
         setLoading(false);
      }
   };

   // NEW: Fetch all BA Surveys (without project filter) for status calculation
   const fetchAllBASurveys = async () => {
      try {
         console.log('📥 Fetching all BA Surveys for status calculation');
         const data = await baSurveyService.getAllBASurveys(); // No project_id filter
         console.log('✅ All BA Surveys fetched:', data.length, 'items');
         setAllBASurveys(data);
      } catch (error) {
         console.error('❌ Error fetching all BA Surveys:', error);
         setAllBASurveys([]);
      }
   };

   const handleUploadClick = (category: string) => {
      setActiveUploadCategory(category);
      if (fileInputRef.current) {
         fileInputRef.current.value = ''; // Reset
         fileInputRef.current.click();
      }
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUploadCategory) {
         const newDoc = {
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            date: 'Just now'
         };
         setDocuments(prev => ({
            ...prev,
            [activeUploadCategory]: [...(prev[activeUploadCategory] || []), newDoc]
         }));
         alert(`Uploaded ${file.name} to ${activeUploadCategory.toUpperCase()}`);
      }
      setActiveUploadCategory(null);
   };

   const handleDownload = (fileName: string) => {
      alert(`Downloading ${fileName}...`);
   };

   // Flatten projects into links (1 project with 2 links = 2 rows)
   const flattenedLinks = useMemo(() => {
      const links: FlattenedLink[] = [];

      projects.forEach(project => {
         // Use extractId helper from contractService
         const projectId = extractId(project.id);

         // Ensure it's a string
         const projectIdString = String(projectId);

         console.log('📋 Project ID extraction:');
         console.log('  - Original:', project.id);
         console.log('  - Extracted:', projectId);
         console.log('  - Type:', typeof projectId);
         console.log('  - Final string:', projectIdString);

         // Check if project has links array
         if (project.links && Array.isArray(project.links) && project.links.length > 0) {
            // Create a row for each link
            project.links.forEach(link => {
               const linkId = String(extractId(link.id));

               // Determine ss_status based on BA Survey count for THIS SPECIFIC LINK
               // Filter BA Surveys that belong to this project AND this link
               const linkBASurveys = allBASurveys.filter(ba => {
                  // Check if BA Survey belongs to this project
                  const baSurveyProjectId = typeof ba.project_id === 'string'
                     ? ba.project_id
                     : extractId(ba.project_id);

                  if (baSurveyProjectId !== projectIdString) {
                     return false;
                  }

                  // Check if BA Survey belongs to this link
                  if (ba.link_id) {
                     const baSurveyLinkId = typeof ba.link_id === 'string'
                        ? ba.link_id
                        : extractId(ba.link_id);
                     return baSurveyLinkId === linkId;
                  }

                  // If BA Survey doesn't have link_id, don't count it for any specific link
                  return false;
               });

               const ss_status = linkBASurveys.length > 0 ? 'survey completed' : 'under survey';

               links.push({
                  linkId: linkId,
                  linkName: link.link_name || 'Unnamed Link',
                  projectId: projectIdString,
                  projectName: project.name,
                  regional: link.regional, // NEW: From link.regional
                  witel: link.witel, // NEW: From link.witel
                  status: project.status,
                  ss_status: ss_status, // NEW: Survey status
                  ss_contract_value: (link as any).ss_contract_value || (project as any).contract_value, // NEW: SS Contract value
                  survey_actual_meters: (link as any).survey_actual_meters,
                  survey_planned_meters: (link as any).survey_planned_meters,
                  plan_date: (project as any).start_date_plan, // Start Plan Date from API
                  actual_date: (link as any).actual_date || (project as any).actual_date, // Actual Date - will be added by backend later
                  project: project // Keep full project data
               });
            });
         } else {
            // If no links, create one row with project name only
            // Determine ss_status based on BA Survey count
            const projectBASurveys = allBASurveys.filter(ba => {
               const baSurveyProjectId = typeof ba.project_id === 'string'
                  ? ba.project_id
                  : extractId(ba.project_id);
               return baSurveyProjectId === projectIdString;
            });

            const ss_status = projectBASurveys.length > 0 ? 'survey completed' : 'under survey';

            links.push({
               linkId: 'no-link',
               linkName: '-',
               projectId: projectIdString,
               projectName: project.name,
               regional: '-', // No link, no regional
               witel: '-', // No link, no witel
               status: project.status,
               ss_status: ss_status, // NEW: Survey status
               ss_contract_value: (project as any).contract_value, // NEW: SS Contract value
               plan_date: (project as any).start_date_plan, // Start Plan Date from API
               actual_date: (project as any).actual_date, // Actual Date - will be added by backend later
               project: project
            });
         }
      });

      return links;
   }, [projects, allBASurveys]);

   // Filter Links
   const filteredLinks = useMemo(() => {
      return flattenedLinks.filter(link => {
         const matchesSearch = link.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.linkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (link.regional || '').toLowerCase().includes(searchQuery.toLowerCase());
         const matchesStatus = statusFilter === 'all' || link.ss_status === statusFilter;
         return matchesSearch && matchesStatus;
      });
   }, [flattenedLinks, searchQuery, statusFilter]);

   // Stat cards computations
   const surveyStats = useMemo(() => {
      const totalLinks = flattenedLinks.length;
      const completedLinks = flattenedLinks.filter(l => l.ss_status === 'survey completed').length;
      const underSurvey = flattenedLinks.filter(l => l.ss_status !== 'survey completed').length;
      const totalPlannedMeters = flattenedLinks.reduce((sum, l) => sum + (l.survey_planned_meters || 0), 0);
      const totalActualMeters = flattenedLinks.reduce((sum, l) => sum + (l.survey_actual_meters || 0), 0);
      return { totalLinks, completedLinks, underSurvey, totalPlannedMeters, totalActualMeters };
   }, [flattenedLinks]);

   // Handle Link Selection → buka Detail View gabungan (RuasDetail) pada stage Survey
   const handleLinkSelect = (link: FlattenedLink) => {
      localStorage.setItem('ruasDetailParams', JSON.stringify({
         linkId: link.linkId,
         projectId: link.projectId,
         projectName: link.projectName,
         linkName: link.linkName,
         initialStage: 'survey',
         originTab: 'survey',
      }));
      onTabChange?.('ruas-detail');
   };

   const handleBack = () => {
      setViewLevel('list');
      setSelectedLink(null);
      setLocalDesignators([]);
   };

   // Handler for Survey Done button
   const handleSurveyDone = async () => {
      if (!selectedLink) {
         toast.error('No survey link selected');
         return;
      }

      try {
         setIsMarkingDone(true);

         // Call the service (currently using mock implementation)
         const result = await markSurveyAsDone(
            selectedLink.linkId,
            selectedLink.projectId
         );

         if (result.success) {
            setIsSurveyDone(true);

            // NEW: Save to localStorage for DRM page
            const doneSurveys = JSON.parse(localStorage.getItem('doneSurveys') || '[]');
            if (!doneSurveys.includes(selectedLink.linkId)) {
               doneSurveys.push(selectedLink.linkId);
               localStorage.setItem('doneSurveys', JSON.stringify(doneSurveys));

               // Dispatch custom event to notify DRM page (same tab)
               window.dispatchEvent(new Event('doneSurveysUpdated'));
            }

            toast.success('Survey marked as done! This survey will now appear in DRM menu.');

            // Optional: You can add additional logic here
            // For example, refresh the survey list or update UI state
         } else {
            toast.error('Failed to mark survey as done');
         }
      } catch (error) {
         console.error('Error marking survey as done:', error);
         toast.error('An error occurred while marking survey as done');
      } finally {
         setIsMarkingDone(false);
      }
   };

   // Check survey done status when selectedLink changes
   useEffect(() => {
      const checkSurveyDoneStatus = async () => {
         if (!selectedLink) {
            setIsSurveyDone(false);
            return;
         }

         try {
            // NEW: Check localStorage first
            const doneSurveys = JSON.parse(localStorage.getItem('doneSurveys') || '[]');
            if (doneSurveys.includes(selectedLink.linkId)) {
               setIsSurveyDone(true);
               return;
            }

            // Fallback to API check
            const statusResult = await getSurveyDoneStatus(selectedLink.linkId);
            if (statusResult.success) {
               setIsSurveyDone(statusResult.data.is_done);
            }
         } catch (error) {
            console.error('Error checking survey done status:', error);
            // Default to false on error
            setIsSurveyDone(false);
         }
      };

      checkSurveyDoneStatus();
   }, [selectedLink]);

   const handlePointSaved = (data: any) => {
      // Add mock point to local state to simulate update
      const newPoint = {
         no: localDesignators.length + 1,
         location: 'New Survey Point',
         designator: data.designator || 'ODP-New',
         soilType: data.soilType,
         status: 'verified',
         hasCoordinates: true
      };
      setLocalDesignators(prev => [...prev, newPoint]);
      toast.success('Survey point added successfully');
   };

   // BA Survey handlers
   const handleCreateBASurvey = async (formData: BASurveyFormData) => {
      try {
         setLoadingBASurvey(true);

         console.log('🔍 handleCreateBASurvey called with formData:', formData);
         console.log('🔍 selectedLink:', selectedLink);
         console.log('🔍 selectedLink.projectId:', selectedLink?.projectId);

         // Validation: Ensure project_id is not empty
         if (!formData.project_id || formData.project_id.trim() === '') {
            console.error('❌ project_id is empty in formData');
            toast.error('Project ID is missing. Please try again.');
            setLoadingBASurvey(false);
            return;
         }

         // Upload document if provided
         let documentData = undefined;
         if (formData.documentFile) {
            const uploadResult = await baSurveyService.uploadDocument(formData.documentFile, token);
            documentData = {
               file_path: uploadResult.file_path,
               file_name: uploadResult.file_name,
               file_type: uploadResult.file_type,
               file_size: uploadResult.file_size,
               keterangan: formData.keterangan || 'Berita Acara Survey',
               status: 'approved',
            };
         }

         // Create BA Survey with NEW fields
         const payload = {
            project_id: formData.project_id,
            link_id: formData.link_id,
            lokasi: formData.lokasi,
            // BACKWARD COMPATIBILITY: Send old tanggal field (use tanggal_ba as default)
            tanggal: `${formData.tanggal_ba}T00:00:00Z`,
            // NEW: 3 separate date fields (convert to ISO format with time)
            tanggal_kontrak: `${formData.tanggal_kontrak}T00:00:00Z`,
            tanggal_ba: `${formData.tanggal_ba}T00:00:00Z`,
            tanggal_amandemen: `${formData.tanggal_amandemen}T00:00:00Z`,
            // NEW: Required fields
            nama_proyek: formData.nama_proyek,
            nomor_kontrak: formData.nomor_kontrak,
            no_ba_drm: formData.no_ba_drm,
            no_amandemen: formData.no_amandemen,
            pelaksana: formData.pelaksana,
            // NEW: Optional content field
            content: formData.content,
            document: documentData,
            approved_by_user1_id: formData.approved_by_user1_id || undefined,
            approved_by_user1_jabatan: formData.approved_by_user1_jabatan || undefined,
            approved_by_user2_id: formData.approved_by_user2_id || undefined,
            approved_by_user2_jabatan: formData.approved_by_user2_jabatan || undefined,
         };

         console.log('📤 Creating BA Survey with payload:', payload);

         await baSurveyService.createBASurvey(payload, token);

         toast.success('BA Survey created successfully!');
         setIsCreateBASurveyModalOpen(false);

         // Reload BA Survey list for current link
         if (selectedLink) {
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);
            setBaSurveyList(data);
         }

         // Reload all BA Surveys for status update
         await fetchAllBASurveys();
      } catch (error: any) {
         console.error('Failed to create BA Survey:', error);
         toast.error(error.message || 'Failed to create BA Survey');
      } finally {
         setLoadingBASurvey(false);
      }
   };

   const handleEditBASurvey = async (formData: EditBASurveyFormData) => {
      if (!selectedBASurvey) return;

      try {
         setLoadingBASurvey(true);

         // Upload new document if provided
         let documentData = undefined;
         if (formData.documentFile) {
            const uploadResult = await baSurveyService.uploadDocument(formData.documentFile, token);
            documentData = {
               file_path: uploadResult.file_path,
               file_name: uploadResult.file_name,
               file_type: uploadResult.file_type,
               file_size: uploadResult.file_size,
               keterangan: formData.keterangan || 'Berita Acara Survey',
               status: 'approved',
            };
         }

         // Extract BA Survey ID
         const baSurveyId = extractBASurveyId(selectedBASurvey.id);

         // Build update payload with NEW fields (all optional)
         const updatePayload: any = {};

         if (formData.lokasi) updatePayload.lokasi = formData.lokasi;
         if (formData.tanggal_kontrak) updatePayload.tanggal_kontrak = `${formData.tanggal_kontrak}T00:00:00Z`;
         if (formData.tanggal_ba) updatePayload.tanggal_ba = `${formData.tanggal_ba}T00:00:00Z`;
         if (formData.tanggal_amandemen) updatePayload.tanggal_amandemen = `${formData.tanggal_amandemen}T00:00:00Z`;
         if (formData.nama_proyek) updatePayload.nama_proyek = formData.nama_proyek;
         if (formData.nomor_kontrak) updatePayload.nomor_kontrak = formData.nomor_kontrak;
         if (formData.no_ba_drm) updatePayload.no_ba_drm = formData.no_ba_drm;
         if (formData.no_amandemen) updatePayload.no_amandemen = formData.no_amandemen;
         if (formData.pelaksana) updatePayload.pelaksana = formData.pelaksana;
         if (formData.content) updatePayload.content = formData.content;
         if (documentData) updatePayload.document = documentData;
         
         // Update PM Waspang & PM Mitra IDs and manual Jabatans
         if (formData.approved_by_user1_id !== undefined) {
            updatePayload.approved_by_user1_id = formData.approved_by_user1_id;
         }
         if (formData.approved_by_user1_jabatan !== undefined) {
            updatePayload.approved_by_user1_jabatan = formData.approved_by_user1_jabatan;
         }
         if (formData.approved_by_user2_id !== undefined) {
            updatePayload.approved_by_user2_id = formData.approved_by_user2_id;
         }
         if (formData.approved_by_user2_jabatan !== undefined) {
            updatePayload.approved_by_user2_jabatan = formData.approved_by_user2_jabatan;
         }

         // Update BA Survey
         await baSurveyService.updateBASurvey(baSurveyId, updatePayload, token);

         toast.success('BA Survey updated successfully!');
         setIsEditBASurveyModalOpen(false);
         setSelectedBASurvey(null);

         // Reload BA Survey list for current link
         if (selectedLink) {
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);
            setBaSurveyList(data);
         }

         // Reload all BA Surveys for status update
         await fetchAllBASurveys();
      } catch (error: any) {
         console.error('Failed to update BA Survey:', error);
         toast.error(error.message || 'Failed to update BA Survey');
      } finally {
         setLoadingBASurvey(false);
      }
   };

   const handleDeleteBASurvey = async () => {
      if (!selectedBASurvey) return;

      try {
         const baSurveyId = extractBASurveyId(selectedBASurvey.id);
         await baSurveyService.deleteBASurvey(baSurveyId, token);
         toast.success('BA Survey deleted successfully!');

         setIsDeleteBASurveyModalOpen(false);
         setSelectedBASurvey(null);

         // Reload BA Survey list for current link
         if (selectedLink) {
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);
            setBaSurveyList(data);
         }

         // Reload all BA Surveys for status update
         await fetchAllBASurveys();
      } catch (error: any) {
         console.error('Failed to delete BA Survey:', error);
         toast.error(error.message || 'Failed to delete BA Survey');
      }
   };

   // Export BA Survey to PDF
   const handleExportBASurveyPDF = async (baSurvey: BASurveyResponse) => {
      setIsExportingPDF(true);
      try {
         console.log('📄 Exporting BA Survey to PDF:', baSurvey);
         await generateBASurveyPDFWithQR(baSurvey);
         toast.success('PDF berhasil diexport');
      } catch (err: any) {
         console.error('Error exporting PDF:', err);
         toast.error('Gagal export PDF: ' + (err.message || 'Unknown error'));
      } finally {
         setIsExportingPDF(false);
      }
   };

   // Handle approval success (refetch BA Survey data)
   const handleApprovalSuccess = async () => {
      try {
         // Reload BA Survey list for current link
         if (selectedLink) {
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);

            // Filter by link_id
            const filteredData = data.filter(ba => {
               if (!ba.link_id) return false;

               const baSurveyLinkId = typeof ba.link_id === 'string'
                  ? ba.link_id
                  : extractId(ba.link_id);

               return baSurveyLinkId === selectedLink.linkId;
            });

            setBaSurveyList(filteredData);

            // Also update selectedBASurvey from the fresh list
            if (selectedBASurvey) {
               const currentId = extractBASurveyId(selectedBASurvey.id);
               const updated = filteredData.find(ba => extractBASurveyId(ba.id) === currentId);
               if (updated) {
                  setSelectedBASurvey(updated);
               }
            }
         }

         // Reload all BA Surveys for status update
         await fetchAllBASurveys();

         toast.success('Status berhasil diperbarui!');
      } catch (error) {
         console.error('Error reloading BA Survey data:', error);
      }
   };

   // Handle approval submission (calls backend API)
   const handleApprove = async (userType: 'user1' | 'user2', nama: string, jabatan: string) => {
      if (!selectedBASurvey) {
         throw new Error('No BA Survey selected');
      }

      try {
         const baSurveyId = extractBASurveyId(selectedBASurvey.id);

         // Prepare approval payload based on user type
         const approvalPayload = userType === 'user1'
            ? { approved_by_user1: true, approved_by_user1_name: nama, approved_by_user1_jabatan: jabatan }
            : { approved_by_user2: true, approved_by_user2_name: nama, approved_by_user2_jabatan: jabatan };

         console.log('📤 Submitting approval:', { baSurveyId, userType, approvalPayload });

         // Call backend API to update approval
         const result = await baSurveyService.updateApproval(baSurveyId, approvalPayload, token);

         console.log('✅ Approval response:', result);

         // Fetch fresh BA Survey data to get updated documents list (including new signature)
         const freshBaSurvey = await baSurveyService.getBASurveyById(baSurveyId);
         setSelectedBASurvey(freshBaSurvey);

         // Reload BA Survey data
         await handleApprovalSuccess();
      } catch (error: any) {
         console.error('❌ Error submitting approval:', error);
         throw new Error(error.message || 'Failed to submit approval');
      }
   };

   // Helper function to extract ID from nested structure
   const extractBASurveyId = (id: any): string => {
      if (typeof id === 'string') return id;
      if (id && typeof id.id === 'string') return id.id;
      if (id.id && typeof id.id.String === 'string') return id.id.String;
      return 'unknown';
   };

   // Helper function to parse date from backend format
   const parseBackendDate = (dateStr: string): Date => {
      // Remove d' prefix and trailing ' if present
      // Format from backend: d'2026-02-11T00:00:00Z'
      let cleanDate = dateStr;
      if (typeof dateStr === 'string') {
         cleanDate = dateStr.replace(/^d'/, '').replace(/'$/, '');
      }
      return new Date(cleanDate);
   };

   // ✅ Submit BA Survey: draft → submitted
   const handleSubmitBASurvey = async (ba: BASurveyResponse) => {
      const baSurveyId = extractBASurveyId(ba.id);
      try {
         await baSurveyService.transitionState(baSurveyId, 'submit', undefined, token);
         toast.success('BA Survey berhasil di-submit! Menunggu tanda tangan Waspang & Mitra.');
         // Reload list
         if (selectedLink) {
            const data = await baSurveyService.getAllBASurveys(selectedLink.projectId);
            const filtered = data.filter(b => {
               if (!b.link_id) return false;
               const lid = typeof b.link_id === 'string' ? b.link_id : extractId(b.link_id);
               return lid === selectedLink.linkId;
            });
            setBaSurveyList(filtered);
         }
         await fetchAllBASurveys();
      } catch (err: any) {
         console.error('Failed to submit BA Survey:', err);
         toast.error(err.message || 'Gagal men-submit BA Survey');
      }
   };

   return (
      <>
         <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
         <div className="space-y-3 flex flex-col min-h-screen overflow-hidden">{/* Add overflow-hidden to prevent page scroll */}
            <PhotoMetadataEditor
               isOpen={isMetadataOpen}
               onClose={() => setIsMetadataOpen(false)}
               onSave={handlePointSaved}
               selectedLink={selectedLink || undefined}
            />

            {/* BA Survey Modals */}
            <CreateBASurveyModal
               open={isCreateBASurveyModalOpen}
               onOpenChange={setIsCreateBASurveyModalOpen}
               onSubmit={handleCreateBASurvey}
               projectId={selectedLink?.projectId || ''}
               linkId={selectedLink?.linkId || ''}
               projectName={selectedLink?.projectName || ''}
               contractNumber={(selectedLink?.project as any)?.no_kontrak || ''}
            />
            {(() => {
               console.log('🔍 Rendering CreateBASurveyModal with projectId:', selectedLink?.projectId || '');
               console.log('🔍 Rendering CreateBASurveyModal with linkId:', selectedLink?.linkId || '');
               return null;
            })()}
            <EditBASurveyModal
               open={isEditBASurveyModalOpen}
               onOpenChange={setIsEditBASurveyModalOpen}
               onSubmit={handleEditBASurvey}
               baSurvey={selectedBASurvey}
            />
            <DeleteBASurveyModal
               open={isDeleteBASurveyModalOpen}
               onOpenChange={setIsDeleteBASurveyModalOpen}
               onConfirm={handleDeleteBASurvey}
               baSurvey={selectedBASurvey}
            />
            <BASurveyApprovalModal
               isOpen={isApprovalModalOpen}
               onClose={() => setIsApprovalModalOpen(false)}
               baSurvey={selectedBASurvey!}
               onApprove={handleApprove}
               onStateChange={handleApprovalSuccess}
            />

            {/* --- LEVEL 1: LINKS LIST --- */}
            {viewLevel === 'list' && (
               <>
                  {/* Page Header - matching mockup */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                     <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Stage Monitor</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Survey Monitor</h1>
                        <p className="mt-1 text-sm text-gray-500">Cross-ruas status survey titik jaringan fiber-optic.</p>
                     </div>
                     <div className="flex gap-2">
                        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                           <MapIcon className="w-4 h-4" /> Lihat di Peta
                        </button>
                        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm">
                           <Plus className="w-4 h-4" /> Tambah Ruas
                        </button>
                     </div>
                  </div>

                  {/* Stat Cards - matching mockup */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                     <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#EF4444]" />
                        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Ruas dalam Survey</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-[#EF4444]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                           {loading ? '—' : surveyStats.totalLinks}
                        </p>
                     </div>
                     <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-gray-300" />
                        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Titik Disurvei</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900" style={{ fontFamily: 'ui-monospace, monospace' }}>
                           {loading ? '—' : surveyStats.totalActualMeters}
                           <span className="ml-1 text-base font-normal text-gray-400">/ {surveyStats.totalPlannedMeters}</span>
                        </p>
                     </div>
                     <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-amber-400" />
                        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Menunggu Review TI</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-amber-600" style={{ fontFamily: 'ui-monospace, monospace' }}>
                           {loading ? '—' : surveyStats.underSurvey}
                        </p>
                     </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap gap-3 items-center">
                     <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                           placeholder="Cari ruas atau proyek…"
                           className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#EF4444]/40 focus:ring-2 focus:ring-[#EF4444]/15"
                        />
                     </div>
                     <div className="relative">
                        <button
                           onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                           className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                           <Filter className="w-4 h-4" />
                           <span>{statusFilter === 'all' ? 'Filter Status' : statusFilter === 'survey completed' ? 'Survey Completed' : 'Under Survey'}</span>
                           <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {showStatusDropdown && (
                           <>
                              <div className="fixed inset-0 z-30" onClick={() => setShowStatusDropdown(false)} />
                              <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                 <button onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${statusFilter === 'all' ? 'text-[#EF4444] font-bold bg-red-50/50' : 'text-gray-700'}`}>All Status</button>
                                 <button onClick={() => { setStatusFilter('survey completed'); setShowStatusDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${statusFilter === 'survey completed' ? 'text-[#EF4444] font-bold bg-red-50/50' : 'text-gray-700'}`}>Survey Completed</button>
                                 <button onClick={() => { setStatusFilter('under survey'); setShowStatusDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${statusFilter === 'under survey' ? 'text-[#EF4444] font-bold bg-red-50/50' : 'text-gray-700'}`}>Under Survey</button>
                              </div>
                           </>
                        )}
                     </div>
                  </div>

                  {/* Table */}
                  <GlassCard className="flex-1 p-0 flex flex-col min-w-0 overflow-hidden">
                     <div className="flex-1 overflow-auto min-w-0">
                        {loading ? (
                           <div className="flex items-center justify-center p-12">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF4444]"></div>
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
                                          <tr
                                             key={`${link.projectId}-${link.linkId}-${index}`}
                                             className="group transition border-b border-gray-100 last:border-b-0"
                                          >
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
                                                   ? new Date((project as any).start_date_plan).toLocaleDateString('id-ID', {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric'
                                                   })
                                                   : '-'
                                                }
                                             </td>
                                             <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                                {(project as any).end_date_plan
                                                   ? new Date((project as any).end_date_plan).toLocaleDateString('id-ID', {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric'
                                                   })
                                                   : '-'
                                                }
                                             </td>
                                             <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                                {(() => {
                                                   const actualDates = actualDatesMap.get(link.projectId);
                                                   const linkActualDate = actualDates?.find(ad => {
                                                      const adLinkId = ad.link_id ? extractRegionalId(ad.link_id) : null;
                                                      return adLinkId === link.linkId;
                                                   }) || actualDates?.[0];
                                                   return linkActualDate && linkActualDate.actual_start_date_survey
                                                      ? new Date(linkActualDate.actual_start_date_survey).toLocaleDateString('id-ID', {
                                                         day: '2-digit',
                                                         month: 'short',
                                                         year: 'numeric'
                                                      })
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
                                                      ? new Date(linkActualDate.actual_end_date_survey).toLocaleDateString('id-ID', {
                                                         day: '2-digit',
                                                         month: 'short',
                                                         year: 'numeric'
                                                      })
                                                      : '-';
                                                })()}
                                             </td>
                                             <td className="p-4 font-mono text-gray-600">
                                                {link.ss_contract_value
                                                   ? `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(link.ss_contract_value)}`
                                                   : '---'
                                                }
                                             </td>
                                             <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${link.ss_status === 'survey completed'
                                                   ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                   : 'bg-amber-100 text-amber-700 border-amber-200'
                                                   }`}>
                                                   {link.ss_status || 'under survey'}
                                                </span>
                                             </td>
                                             <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${link.status === 'survey' ? 'bg-red-100 text-[#DC2626] border-red-200' : 'bg-gray-100 text-gray-600'}`}>
                                                   {link.status}
                                                </span>
                                             </td>
                                             <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                   <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                                      {(() => {
                                                         const planned = link.survey_planned_meters || 1000; // fallback to 1000m dummy
                                                         const actual = link.survey_actual_meters || 0;
                                                         const percentage = Math.min((actual / planned) * 100, 100);
                                                         return (
                                                            <div className="h-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] transition-all duration-500" style={{ width: `${percentage}%` }} />
                                                         );
                                                      })()}
                                                   </div>
                                                   <span className="text-xs font-mono text-gray-500">
                                                      {(() => {
                                                         const planned = link.survey_planned_meters || 1000;
                                                         const actual = link.survey_actual_meters || 0;
                                                         const percentage = Math.min((actual / planned) * 100, 100);
                                                         return `${percentage.toFixed(1)}%`;
                                                      })()}
                                                   </span>
                                                </div>
                                             </td>
                                             <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                   <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                                      {(() => {
                                                         const isCompleted = link.ss_status === 'survey completed';
                                                         const percentage = isCompleted ? 100 : 0;
                                                         return (
                                                            <div className="h-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] transition-all duration-500" style={{ width: `${percentage}%` }} />
                                                         );
                                                      })()}
                                                   </div>
                                                   <span className="text-xs font-mono text-gray-500">
                                                      {(() => {
                                                         const isCompleted = link.ss_status === 'survey completed';
                                                         return isCompleted ? '100.0%' : '0.0%';
                                                       })()}
                                                   </span>
                                                </div>
                                             </td>
                                             <td className="p-4 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <button onClick={() => handleLinkSelect(link)} className="p-1.5 hover:bg-white rounded-full text-[#EF4444] hover:text-[#DC2626] shadow-sm transition cursor-pointer">
                                                   <ChevronRight className="w-4 h-4" />
                                                </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {filteredLinks.length === 0 && !loading && (
                                       <tr>
                                          <td colSpan={17} className="p-8 text-center text-gray-400 italic">
                                             No links found
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
               </>
            )}

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
         
         /* Ensure sticky columns are fully visible */
         .overflow-x-auto table {
           border-collapse: separate;
           border-spacing: 0;
         }
         
         /* Add shadow to pinned right column for better visibility */
         .overflow-x-auto table th.sticky.right-0,
         .overflow-x-auto table td.sticky.right-0 {
           box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05);
         }
       `}</style>

            {/* --- LEVEL 2: DETAIL & UPLOAD WITH TABS --- */}
            {/* DINONAKTIFKAN: navigasi detail sekarang pakai RuasDetail gabungan. Blok lama dipertahankan sebagai referensi (SHOW_LEGACY_DETAIL = false). */}
            {SHOW_LEGACY_DETAIL && viewLevel === 'detail' && selectedLink && (
               <>
               <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                  <button
                     onClick={handleBack}
                     className="hover:text-[#EF4444] transition flex items-center gap-1 text-[#DC2626] font-bold"
                  >
                     <ArrowLeft className="w-3 h-3" /> Survey Links
                  </button>
               </div>
               <TabWithMarkDone
                  tabName="boq"
                  linkId={selectedLink.linkId}
                  projectId={selectedLink.projectId}
                  boqData={boqData}
                  kmlData={kmlData}
                  linkName={selectedLink.linkName}
                  projectData={selectedLink.project}
               >
                  {({ markAsDoneButton }) => (
                     <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300 min-w-0 h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>{/* Add min-w-0 to allow shrinking */}

                  {/* Header Card - Clean minimal style */}
                  <div className="p-5 bg-white rounded-xl border border-gray-200 flex justify-between items-center">
                     <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Survey Link</p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{selectedLink?.linkName || 'Survey Link'}</h2>
                        <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                           <MapPin className="w-3.5 h-3.5" /> {selectedLink?.projectName}
                        </p>
                     </div>
                     <div>
                        <div className="relative w-14 h-14 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                           <Network className="w-7 h-7 text-[#EF4444]" />
                           <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF4444] rounded-full border-2 border-white flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* TABS NAVIGATION */}
                  <div className="flex bg-white/50 p-1 rounded-lg border border-gray-200/50 gap-1 w-fit overflow-x-auto">
                     <button
                        onClick={() => setActiveTab('points')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'points' ? 'bg-white shadow text-[#EF4444]' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <MapPin className="w-3.5 h-3.5" /> Data Survey
                     </button>
                     <button
                        onClick={() => setActiveTab('span')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'span' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <Network className="w-3.5 h-3.5" /> Span
                     </button>
                     <button
                        onClick={() => setActiveTab('kml')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'kml' ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <MapIcon className="w-3.5 h-3.5" /> KML
                     </button>
                     <button
                        onClick={() => setActiveTab('redline')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'redline' ? 'bg-white shadow text-[#DC2626]' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <Activity className="w-3.5 h-3.5" /> Redline
                     </button>
                     <button
                        onClick={() => setActiveTab('matrix')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'matrix' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <Network className="w-3.5 h-3.5" /> Matrix
                     </button>
                     <button
                        onClick={() => setActiveTab('boq')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'boq' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <FileText className="w-3.5 h-3.5" /> BOQ
                     </button>
                     <button
                        onClick={() => setActiveTab('drawing')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'drawing' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <Layers className="w-3.5 h-3.5" /> Drawing
                     </button>
                     <button
                        onClick={() => setActiveTab('ba-survey')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'ba-survey' ? 'bg-white shadow text-[#DC2626]' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <FileText className="w-3.5 h-3.5" /> BA Survey
                     </button>
                     <button
                        onClick={() => setActiveTab('as-built')}
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${activeTab === 'as-built' ? 'bg-white shadow text-gray-600' : 'text-gray-500 hover:bg-white/50'}`}
                     >
                        <Layers className="w-3.5 h-3.5" /> As Plan Drawing
                     </button>
                  </div>

                  {/* CONTENT AREA */}
                  <div ref={contentAreaRef} className="flex-1 flex flex-col overflow-hidden min-h-0">
                     <GlassCard className="flex-1 p-0 flex flex-col overflow-hidden">

                        {/* 1. SURVEY POINTS TABLE - Using TabSurvey Component */}
                        {activeTab === 'points' && selectedLink && (() => {
                           console.log('🔍 Rendering TabSurvey with:');
                           console.log('  - selectedLink.projectId:', selectedLink.projectId);
                           console.log('  - typeof:', typeof selectedLink.projectId);
                           console.log('  - selectedLink.projectName:', selectedLink.projectName);
                           console.log('  - selectedLink.linkId:', selectedLink.linkId);
                           return (
                              <TabSurvey
                                 contractId={selectedLink.projectId}
                                 contractName={selectedLink.projectName}
                                 linkId={selectedLink.linkId}
                                 onDataChanged={handleRefetchData}
                              />
                           );
                        })()}

                        {/* 2. SPAN TABLE - Using TabSpan Component */}
                        {activeTab === 'span' && selectedLink && (() => {
                           console.log('🔍 Rendering TabSpan with:');
                           console.log('  - selectedLink.projectId:', selectedLink.projectId);
                           console.log('  - typeof:', typeof selectedLink.projectId);
                           console.log('  - selectedLink.projectName:', selectedLink.projectName);
                           console.log('  - selectedLink.linkId:', selectedLink.linkId);
                           return (
                              <TabSpan
                                 projectId={selectedLink.projectId}
                                 projectName={selectedLink.projectName}
                                 linkId={selectedLink.linkId}
                                 onDataChanged={handleRefetchData}
                              />
                           );
                        })()}

                        {/* 3. KML Tab - Using TabKML Component */}
                        {activeTab === 'kml' && selectedLink && (() => {
                           console.log('🔍 Rendering TabKML with:');
                           console.log('  - selectedLink.projectId:', selectedLink.projectId);
                           console.log('  - selectedLink.linkId:', selectedLink.linkId);
                           console.log('  - kmlData:', kmlData);
                           console.log('  - isLoadingKML:', isLoadingKML);

                           return (
                              <TabKML
                                 kmlFileName=""
                                 kmlFileContent=""
                                 kmlData={kmlData}
                                 projectId={selectedLink.projectId}
                                 linkId={selectedLink.linkId}
                                 onPreview={() => { }}
                                 onRefetchData={handleRefetchData}
                              />
                           );
                        })()}

                        {/* 4. Redline Tab - Using TabRedLine Component */}
                        {activeTab === 'redline' && selectedLink && (
                           <TabRedLine
                              contractId={selectedLink.projectId}
                              linkId={selectedLink.linkId}
                           />
                        )}
                        {/* 5. Matrix Tab - Using TabMatrix Component */}
                        {activeTab === 'matrix' && selectedLink && (
                           <TabMatrix
                              contractId={selectedLink.projectId}
                              contractName={selectedLink.projectName}
                              linkId={selectedLink.linkId}
                           />
                        )}

                        {/* 6. BOQ Tab - Using TabBOQ Component Fully */}
                        {activeTab === 'boq' && selectedLink && (
                           <TabBOQ
                              boqItems={boqData?.items || []}
                              boqFileName={(selectedLink.project as any).boq_file_name}
                              lokasi={selectedLink.linkName}
                              projectId={selectedLink.projectId}
                              linkId={selectedLink.linkId} // Pass linkId for bulk update
                              summary={boqData?.summary}
                              isLoading={isLoadingBOQ}
                              markAsDoneButton={markAsDoneButton}
                              onDataChange={() => {
                                 // Refresh BOQ data after changes
                                 const fetchBOQData = async () => {
                                    if (!selectedLink?.projectId || !selectedLink?.linkId) return;
                                    setIsLoadingBOQ(true);
                                    try {
                                       const { boqService } = await import('@/services/boqService');
                                       // Use link-based matrix API (per link)
                                       const data = await boqService.getBOQMatrixByProjectId(selectedLink.projectId, selectedLink.linkId);
                                       setBoqData(data);
                                    } catch (error) {
                                       console.error('Error refreshing BOQ data:', error);
                                    } finally {
                                       setIsLoadingBOQ(false);
                                    }
                                 };
                                 fetchBOQData();
                              }}
                           />
                        )}

                        {/* 7. DRAWING */}
                        {activeTab === 'drawing' && (
                           <div className="flex flex-col h-full">
                              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                 <div>
                                    <h3 className="text-gray-800 font-bold text-sm">Technical Drawings</h3>
                                    <p className="text-[10px] text-gray-500">As-Built / Layouts</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <button
                                       onClick={() => handleUploadClick('drawing')}
                                       className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded shadow hover:bg-gray-200 transition flex items-center gap-1"
                                    >
                                       <Upload className="w-3.5 h-3.5" /> Upload Drawing
                                    </button>
                                 </div>
                              </div>
                              <div className="p-4 grid grid-cols-2 gap-4 overflow-auto flex-1">
                                 {documents.drawing.length > 0 ? documents.drawing.map((doc, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                                       <div className="flex justify-between items-start mb-2">
                                          <Layers className="w-6 h-6 text-gray-500" />
                                          <button onClick={() => handleDownload(doc.name)}><Download className="w-4 h-4 text-gray-400 hover:text-[#EF4444]" /></button>
                                       </div>
                                       <p className="font-bold text-xs text-gray-700 truncate" title={doc.name}>{doc.name}</p>
                                       <p className="text-[10px] text-gray-400 mt-1">{doc.size}</p>
                                    </div>
                                 )) : (
                                    <div className="col-span-2 text-center py-10 text-gray-400 italic text-sm">No drawings uploaded.</div>
                                 )}
                              </div>
                           </div>
                        )}

                        {/* 7. BA SURVEY */}
                        {activeTab === 'ba-survey' && (
                           <div className="flex flex-col h-full">
                              <div className="p-4 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
                                 <div>
                                    <h3 className="text-[#DC2626] font-bold text-sm">BA Survey for this link</h3>
                                    <p className="text-[10px] text-gray-500">Berita Acara Survey documents</p>
                                 </div>
                                 <button
                                    onClick={() => {
                                       console.log('🔍 Opening BA Survey modal from header');
                                       console.log('🔍 selectedLink:', selectedLink);
                                       console.log('🔍 selectedLink.projectId:', selectedLink?.projectId);
                                       setIsCreateBASurveyModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white rounded-lg text-sm hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center gap-2"
                                 >
                                    <Plus className="w-4 h-4" />
                                    <span>Add BA Survey</span>
                                 </button>
                              </div>

                              {baSurveyList.length === 0 ? (
                                 /* Empty State */
                                 <div className="flex-1 flex items-center justify-center p-8">
                                    <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white w-full">
                                       <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                       <div className="text-gray-400 text-lg mb-2">No BA Survey available</div>
                                       <div className="text-gray-500 text-sm">Click "Add BA Survey" to create the first BA Survey for this link</div>
                                    </div>
                                 </div>
                              ) : (
                                 /* Table with Data */
                                 <div className="flex-1 overflow-auto">
                                    <div className="px-4 py-4 min-w-0">
                                       <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-0">
                                          <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                                             <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, minWidth: '850px' }}>
                                                <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                                   <tr>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '25%' }}>
                                                         Location
                                                      </th>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '15%' }}>
                                                         Survey Date
                                                      </th>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '20%' }}>
                                                         Description
                                                      </th>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '12%' }}>
                                                         Status
                                                      </th>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '12%' }}>
                                                         Created At
                                                      </th>
                                                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', width: '16%' }}>
                                                         Action
                                                      </th>
                                                   </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white/60">
                                                   {baSurveyList.map((ba) => {
                                                      const baSurveyId = extractBASurveyId(ba.id);
                                                      return (
                                                         <tr
                                                            key={baSurveyId}
                                                            className="hover:bg-red-50/50 transition"
                                                            style={{ fontFamily: 'inherit' }}
                                                         >
                                                            <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                               <div className="flex items-start gap-2">
                                                                  <MapPin className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
                                                                  <span>{ba.lokasi}</span>
                                                               </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                                {parseBackendDate(ba.tanggal_ba || ba.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 text-sm" style={{ fontFamily: 'inherit' }}>
                                                               {ba.documents && ba.documents.length > 0 && ba.documents[0].keterangan
                                                                  ? ba.documents[0].keterangan
                                                                  : <span className="text-gray-400 italic text-xs">-</span>
                                                               }
                                                            </td>
                                                            <td className="px-6 py-4" style={{ fontFamily: 'inherit' }}>
                                                               {/* Approval Status Badge based on state */}
                                                               {ba.state === 'approved' ? (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                                                     <CheckCircle className="w-3.5 h-3.5" />
                                                                     Fully Approved
                                                                  </span>
                                                               ) : ba.state === 'rejected' ? (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                                                                     <X className="w-3.5 h-3.5" />
                                                                     Rejected
                                                                  </span>
                                                               ) : ba.state === 'waspang_signed' ? (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                                                                     <Activity className="w-3.5 h-3.5" />
                                                                     Waspang Signed
                                                                  </span>
                                                               ) : ba.state === 'mitra_signed' ? (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                                                                     <Activity className="w-3.5 h-3.5" />
                                                                     Mitra Signed
                                                                  </span>
                                                               ) : ba.state === 'submitted' ? (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                                                                     <Activity className="w-3.5 h-3.5" />
                                                                     Submitted
                                                                  </span>
                                                               ) : (
                                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                                                                     <Activity className="w-3.5 h-3.5" />
                                                                     Draft
                                                                  </span>
                                                               )}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 text-xs" style={{ fontFamily: 'inherit' }}>
                                                               {parseBackendDate(ba.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2 text-gray-400">
                                                                   {/* ✅ Tombol Submit: khusus state draft */}
                                                                   {(!ba.state || ba.state === 'draft') && (
                                                                      <button
                                                                         className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition"
                                                                         title="Submit ke Waspang & Mitra"
                                                                         onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSubmitBASurvey(ba);
                                                                         }}
                                                                      >
                                                                         <Activity className="w-3.5 h-3.5" />
                                                                         Submit
                                                                      </button>
                                                                   )}

                                                                   {/* Preview & Tanda Tangan — hanya jika state >= submitted */}
                                                                   {ba.state && ba.state !== 'approved' && ba.state !== 'draft' && (
                                                                      <button
                                                                         className="p-1.5 hover:text-[#EF4444] hover:bg-red-50 rounded transition"
                                                                         title="Preview & Tanda Tangan"
                                                                         onClick={() => {
                                                                            setSelectedBASurvey(ba);
                                                                            setIsApprovalModalOpen(true);
                                                                         }}
                                                                      >
                                                                         <PenTool className="w-4 h-4" />
                                                                      </button>
                                                                   )}

                                                                   {/* Preview PDF saja jika draft atau approved */}
                                                                   {(!ba.state || ba.state === 'draft' || ba.state === 'approved') && (
                                                                      <button
                                                                         className="p-1.5 hover:text-gray-600 hover:bg-gray-50 rounded transition"
                                                                         title="Preview Dokumen"
                                                                         onClick={() => {
                                                                            setSelectedBASurvey(ba);
                                                                            setIsApprovalModalOpen(true);
                                                                         }}
                                                                      >
                                                                         <FileText className="w-4 h-4" />
                                                                      </button>
                                                                   )}

                                                                   <button
                                                                      className="p-1.5 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                                      title="Export PDF"
                                                                      onClick={() => handleExportBASurveyPDF(ba)}
                                                                      disabled={isExportingPDF}
                                                                   >
                                                                      <Download className="w-4 h-4" />
                                                                   </button>
                                                                   {(user?.role === 'pm_mitra' || user?.role === 'admin' || user?.role === 'surveyor') && (!ba.state || ba.state === 'draft' || ba.state === 'rejected') && (
                                                                      <>
                                                                         <button
                                                                            className="p-1.5 hover:text-[#EF4444] hover:bg-red-50 rounded transition"
                                                                            title="Edit"
                                                                            onClick={() => {
                                                                               setSelectedBASurvey(ba);
                                                                               setIsEditBASurveyModalOpen(true);
                                                                            }}
                                                                         >
                                                                            <Edit className="w-4 h-4" />
                                                                         </button>
                                                                         <button
                                                                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                                            title="Delete"
                                                                            onClick={() => {
                                                                               setSelectedBASurvey(ba);
                                                                               setIsDeleteBASurveyModalOpen(true);
                                                                            }}
                                                                         >
                                                                            <Trash2 className="w-4 h-4" />
                                                                         </button>
                                                                      </>
                                                                   )}
                                                                </div>
                                                            </td>
                                                         </tr>
                                                      );
                                                   })}
                                                </tbody>
                                             </table>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}

                        {/* 8. AS BUILT DRAWING */}
                        {activeTab === 'as-built' && selectedLink && (
                           <TabAsBuiltDrawing
                              contractId={selectedLink.projectId}
                              linkId={selectedLink.linkId}
                           />
                        )}

                     </GlassCard>
                  </div>
                  <style>{`
                @keyframes dash {
                   to { stroke-dashoffset: -1000; }
                }
             `}</style>
               </div>
                  )}
               </TabWithMarkDone>
               </>
            )}
         </div>
      </>
   );
}
