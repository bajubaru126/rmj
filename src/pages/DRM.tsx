import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2, Layers, MapPin, ChevronRight, Network, ArrowLeft, Map as MapIcon, ScanLine, CheckCircle2, X } from 'lucide-react';
import { CreateDRMModal, DRMFormData } from '@/components/modals/drm/CreateDRMModal';
import { EditDRMModal } from '@/components/modals/drm/EditDRMModal';
import { DeleteDRMModal } from '@/components/modals/drm/DeleteDRMModal';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { drmService, DRMResponse, DRMDocument } from '@/services/drmService';
import { projectService } from '@/services/projectService';
import { getAllProjects, ProjectResponse, extractId, getProjectKMLFiles } from '@/services/contractService';
import { API_CONFIG } from '@/config/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { TabKML } from '@/components/DRM/TabKML';
import { TabBOQ } from '@/components/DRM/TabBOQ';
import { TabMatrix } from '@/components/DRM/TabMatrix';
import { TabRedLine } from '@/components/DRM/TabRedLine';
import { TabAsBuiltDrawingDRM } from '@/components/DRM/TabAsBuiltDrawing';
import { TabAsPlanDrawingDRM } from '@/components/DRM/TabAsPlanDrawingDRM';
import { TabPOW } from '@/components/DRM/TabPOW';
import { TabBASurvey } from '@/components/DRM/TabBADRM';
import { getAllRegionals, getAllWitels, extractId as extractRegionalId, type Regional, type Witel } from '@/services/regionalService';
import { actualDateService, type ActualDateAll } from '@/services/actualDateService';
import { vendorService } from '@/services/vendorService';
import { kmlFinalizeService } from '@/services/kmlFinalizeService';
import { installationProjectService } from '@/services/installationService';
import { uploadBOQToInstallation, uploadMatrixToInstallation, uploadRedlineToInstallation } from '@/utils/installationUploadHelpers';
import { ConfirmFinalizeInstallationModal, FinalizeProgress } from '@/components/modals/drm/ConfirmFinalizeInstallationModal';
import { ConfirmUnfinalizeModal } from '@/components/modals/drm/ConfirmUnfinalizeModal';

interface DRMData {
  id: string;
  projectId: string;
  projectName: string;
  linkId: string;
  linkName: string;
  regionalId?: string;
  region?: string;
  witel?: string;
  location?: string;
  customer?: string;
  pelaksana?: string;
  subPelaksana?: any;
  noKontrak?: string;
  contractDuration?: string;
  contractSigned?: string;
  contractValue?: number;
  startPlanDate?: string;
  endPlanDate?: string;
  ssStatus: string;
  status: string;
  progress: number;
  lastUpdated?: string;
  notes?: string;
  remarks?: string;
  drmStartDate: string;
  drmEndDate: string;
  drmMomFiles: number;
  boqFinalDocsFiles: number;
  redlineFinalDocsFiles: number;
  matrixFinalDocsFiles: number;
  otherDocsFiles: number;
  createdAt: string;
  updatedAt: string | null;
}

// Flattened link interface for table display (same as Survey page)
interface FlattenedLink {
  linkId: string;
  linkName: string;
  projectId: string;
  projectName: string;
  regional?: any; // NEW: Regional name (from link.regional)
  witel?: any; // NEW: Witel name (from link.witel)
  status: string;
  ss_status?: string;
  ss_contract_value?: number;
  plan_date?: string;
  actual_date?: string;
  project: ProjectResponse;
}

interface DRMProps {
  onTabChange?: (tab: string) => void;
}

export function DRM({ onTabChange }: DRMProps = {}) {
  // Saklar untuk menampilkan detail view embedded LAMA (dipertahankan sbg referensi). Selalu false — detail kini di RuasDetail gabungan.
  const SHOW_LEGACY_DETAIL: boolean = false;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [drmList, setDrmList] = useState<DRMData[]>([]);
  const [selectedDRM, setSelectedDRM] = useState<DRMData | null>(null);
  const [selectedDRMDetail, setSelectedDRMDetail] = useState<DRMResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { token } = useAuth();

  const [regionalsRecord, setRegionalsRecord] = useState<Record<string, string>>({});
  const [witelsRecord, setWitelsRecord] = useState<Record<string, string>>({});
  const [vendorsRecord, setVendorsRecord] = useState<Record<string, string>>({});
  const [actualDatesMap, setActualDatesMap] = useState<Map<string, ActualDateAll[]>>(new Map());
  const [loadingActualDates, setLoadingActualDates] = useState(false);

  // NEW: State for Survey Done Links
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [viewMode, setViewMode] = useState<'surveys' | 'drm'>('surveys'); // Default to surveys view
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Track which linkIds have finalized data (from API checks)
  const [finalizedLinkIds, setFinalizedLinkIds] = useState<Set<string>>(new Set());
  const [isCheckingFinalized, setIsCheckingFinalized] = useState(false);
  
  // NEW: State for detail view (same as Survey page)
  const [viewLevel, setViewLevel] = useState<'list' | 'detail'>('list');
  const [selectedLink, setSelectedLink] = useState<FlattenedLink | null>(null);
  const [activeTab, setActiveTab] = useState<'kml' | 'redline' | 'matrix' | 'boq' | 'as-plan' | 'pow' | 'ba-survey'>('kml');

  // Auto-scroll ke content area setiap kali tab berubah
  const contentAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contentAreaRef.current) {
      setTimeout(() => {
        contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [activeTab]);
  const [kmlData, setKmlData] = useState<any>(null);
  const [isLoadingKML, setIsLoadingKML] = useState<boolean>(false);
  const [boqData, setBoqData] = useState<any>(null);
  const [isLoadingBOQ, setIsLoadingBOQ] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeProgress, setFinalizeProgress] = useState<FinalizeProgress>({
    project: 'idle',
    pow: 'idle',
    boq: 'idle',
    matrix: 'idle',
    redline: 'idle'
  });

  const [isInstallationFinalized, setIsInstallationFinalized] = useState(false);
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(false);
  const [showUnfinalizeModal, setShowUnfinalizeModal] = useState(false);

  // Fetch DRM list, projects, and lookups on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchDRMList();
      } catch (error) {
        console.error('❌ Failed to fetch DRM list (non-critical):', error);
      }
    };
    
    initializeData();

    const loadLookups = async () => {
      try {
        const [regionals, witels, vendors] = await Promise.all([
          getAllRegionals(),
          getAllWitels(),
          vendorService.getAllVendors().catch(() => []),
        ]);
        const rRecord: Record<string, string> = {};
        regionals.forEach((r: Regional) => { rRecord[r.id] = r.region; });
        setRegionalsRecord(rRecord);

        const wRecord: Record<string, string> = {};
        witels.forEach((w: Witel) => { wRecord[w.id] = w.witel; });
        setWitelsRecord(wRecord);

        const vRecord: Record<string, string> = {};
        vendors.forEach((v: any) => { vRecord[v.id] = v.name; });
        setVendorsRecord(vRecord);
      } catch (e) {
        console.error('Failed to load regional/witel/vendor lookups in DRM:', e);
      }
    };
    loadLookups();
  }, []);

  // Fetch actual dates for all projects in the DRM list
  useEffect(() => {
    const fetchActualDates = async () => {
      if (!token || drmList.length === 0) return;

      setLoadingActualDates(true);
      try {
        const projectIds = Array.from(new Set(drmList.map(d => d.projectId)));
        const actualDatesData = await actualDateService.getActualDatesForProjects(projectIds, token);
        setActualDatesMap(actualDatesData);
      } catch (error) {
        console.error('Failed to fetch actual dates for DRM:', error);
      } finally {
        setLoadingActualDates(false);
      }
    };

    fetchActualDates();
  }, [drmList, token]);

  // Check finalized status for all links via API (no localStorage dependency)
  useEffect(() => {
    if (!initialLoadComplete || projects.length === 0) return;

    const checkFinalizedLinks = async () => {
      setIsCheckingFinalized(true);
      console.log('🔍 Checking finalized status for all links...');

      const { boqFinalizeService } = await import('@/services/boqFinalizeService');
      const { matrixFinalizeService } = await import('@/services/matrixFinalizeService');

      const finalized = new Set<string>();

      // Collect all links across all projects
      const allLinks: { linkId: string; projectId: string }[] = [];
      projects.forEach(project => {
        const projectId = typeof project.id === 'string' ? project.id : extractId(project.id);
        (project.links || []).forEach((link: any) => {
          const linkId = typeof link.id === 'string' ? link.id : extractId(link.id);
          if (linkId) allLinks.push({ linkId, projectId });
        });
      });

      // Parallel check: BOQ finalized per link + Matrix finalized per project
      // Matrix is per-project so we deduplicate project checks
      const checkedProjects = new Set<string>();

      await Promise.allSettled(
        allLinks.map(async ({ linkId, projectId }) => {
          try {
            // Check BOQ finalized for this link
            const boqDone = await boqFinalizeService.isLinkFinalized(linkId);
            if (boqDone) {
              finalized.add(linkId);
              return;
            }
          } catch { /* ignore */ }

          // Check Matrix finalized for this project (once per project)
          if (!checkedProjects.has(projectId)) {
            checkedProjects.add(projectId);
            try {
              const matrixItems = await matrixFinalizeService.getFinalizedMatrix(projectId);
              if (matrixItems && matrixItems.length > 0) {
                // Mark all links of this project that have matrix data
                const projectLinks = allLinks.filter(l => l.projectId === projectId);
                projectLinks.forEach(l => finalized.add(l.linkId));
              }
            } catch { /* ignore */ }
          }
        })
      );

      console.log(`✅ Found ${finalized.size} links with finalized data`);
      setFinalizedLinkIds(new Set(finalized));
      setIsCheckingFinalized(false);
    };

    checkFinalizedLinks();
  }, [initialLoadComplete, projects, refreshTrigger]);

  // NEW: Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching projects for survey list...');
      const data = await getAllProjects(token);
      console.log('✅ Projects fetched for survey list:', data.length);
      setProjects(data);
      setInitialLoadComplete(true); // Mark initial load as complete
    } catch (error) {
      console.error('❌ Failed to fetch projects for survey list:', error);
      toast.error('Failed to load projects for survey list');
      setProjects([]);
      setInitialLoadComplete(true); // Mark as complete even on error
    } finally {
      setLoading(false);
    }
  };

  // NEW: Flatten links from projects - filter by finalized data from API
  const flattenedLinks = useMemo(() => {
    if (!initialLoadComplete) return [];
    
    const links: FlattenedLink[] = [];
    
    projects.forEach(project => {
      const projectIdString = typeof project.id === 'string' ? project.id : extractId(project.id);
      
      if (project.links && project.links.length > 0) {
        project.links.forEach((link: any) => {
          const linkId = typeof link.id === 'string' ? link.id : extractId(link.id);
          
          // FILTER: Only show links that have finalized data (BOQ or Matrix)
          if (!finalizedLinkIds.has(linkId)) return;
          
          links.push({
            linkId: linkId,
            linkName: link.link_name || 'Unnamed Link',
            projectId: projectIdString,
            projectName: project.name,
            regional: link.regional,
            witel: link.witel,
            status: project.status,
            ss_status: 'survey completed',
            ss_contract_value: (link as any).ss_contract_value || (project as any).contract_value,
            plan_date: (project as any).start_date_plan,
            actual_date: (link as any).actual_date || (project as any).actual_date,
            project: project
          });
        });
      }
    });
    
    console.log(`📊 Links with finalized data: ${links.length}`);
    return links;
  }, [projects, finalizedLinkIds, initialLoadComplete]);

  const fetchDRMList = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching DRM list...');
      
      const drmListData = await drmService.listAllDRMs();
      console.log('✅ DRM list fetched:', drmListData);
      
      console.log('🔄 Transforming DRM data...');
      const transformedData: DRMData[] = drmListData.map((drm: any, i: number) => {
        // Extract DRM ID - handle nested structure
        const drmId = typeof drm.id === 'string' ? drm.id : (drm.id?.id?.String || drm.id?.id || `unknown_${i}`);
        
        // Extract Project ID - handle nested structure
        const projectId = typeof drm.project_id === 'string' ? drm.project_id : (drm.project_id?.id?.String || drm.project_id?.id || '');
        
        // Extract Link ID - handle nested structure
        const linkId = typeof drm.link_id === 'string' ? drm.link_id : (drm.link_id?.id?.String || drm.link_id?.id || '');
        
        // Parse contract value
        let contractValue = undefined;
        if (drm.contract_value) {
          if (typeof drm.contract_value === 'number') {
            contractValue = drm.contract_value;
          } else {
            const parsed = parseFloat(drm.contract_value);
            if (!isNaN(parsed)) contractValue = parsed;
          }
        }
        
        return {
          id: drmId,
          projectId,
          projectName: drm.project_name || '',
          linkId,
          linkName: drm.link_name || '',
          regionalId: drm.regional_id?.id?.String || drm.regional_id?.id || undefined,
          region: drm.region || undefined,
          witel: drm.witel || undefined,
          location: drm.location || undefined,
          customer: drm.customer || undefined,
          pelaksana: drm.pelaksana || undefined,
          subPelaksana: drm.sub_pelaksana,
          noKontrak: drm.no_kontrak || undefined,
          contractDuration: drm.contract_duration || undefined,
          contractSigned: drm.contract_signed || undefined,
          contractValue,
          startPlanDate: drm.start_date_plan,
          endPlanDate: drm.end_date_plan,
          ssStatus: drm.ss_status || 'not_started',
          status: drm.status || 'not_started',
          progress: drm.progress || 0,
          lastUpdated: drm.last_updated,
          notes: drm.notes || undefined,
          remarks: drm.remarks || undefined,
          drmStartDate: drm.start_date_plan || new Date().toISOString(),
          drmEndDate: drm.end_date_plan || new Date().toISOString(),
          drmMomFiles: 0,
          boqFinalDocsFiles: 0,
          redlineFinalDocsFiles: 0,
          matrixFinalDocsFiles: 0,
          otherDocsFiles: 0,
          createdAt: drm.created_at || new Date().toISOString(),
          updatedAt: drm.updated_at || null,
        };
      });
      
      console.log('✅ DRM data transformed:', transformedData.length);
      setDrmList(transformedData);
    } catch (error: any) {
      console.error('❌ Failed to fetch DRM list:', error);
      toast.error('Failed to load DRM list');
      setDrmList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDRM = async (formData: DRMFormData) => {
    try {
      setUploading(true);
      
      // Upload files and prepare document arrays
      const uploadedDocs: {
        drm_mom?: DRMDocument[];
        boq_final_docs?: DRMDocument[];
        redline_final_docs?: DRMDocument[];
        matrix_final_docs?: DRMDocument[];
        other_docs?: DRMDocument[];
      } = {};

      // Upload MOM file
      if (formData.drmMomFile) {
        const uploadResult = await drmService.uploadEvidence(formData.drmMomFile, token);
        uploadedDocs.drm_mom = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Minutes of Meeting DRM',
          status: 'approved',
        }];
      }

      // Upload BOQ Final docs
      if (formData.boqFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.boqFinalDocsFile, token);
        uploadedDocs.boq_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'BOQ Final Document',
          status: 'approved',
        }];
      }

      // Upload Redline Final docs
      if (formData.redlineFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.redlineFinalDocsFile, token);
        uploadedDocs.redline_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Redline Final Document',
          status: 'approved',
        }];
      }

      // Upload Matrix Final docs
      if (formData.matrixFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.matrixFinalDocsFile, token);
        uploadedDocs.matrix_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Matrix Final Document',
          status: 'approved',
        }];
      }

      // Upload Other docs
      if (formData.otherDocsFiles && formData.otherDocsFiles.length > 0) {
        const otherDocsUploads = await Promise.all(
          formData.otherDocsFiles.map(file => drmService.uploadEvidence(file, token))
        );
        uploadedDocs.other_docs = otherDocsUploads.map(result => ({
          file_path: result.file_path,
          file_name: result.file_name,
          file_type: result.file_type,
          file_size: result.file_size,
          keterangan: 'Other DRM Document',
          status: 'approved',
        }));
      }

      // Create DRM
      await drmService.createDRM({
        project_id: formData.projectId,
        start_date: new Date(formData.drmStartDate).toISOString(),
        end_date: new Date(formData.drmEndDate).toISOString(),
        ...uploadedDocs,
      }, token);
      
      toast.success('DRM created successfully!');
      setIsCreateModalOpen(false);
      
      // Reload list with error handling
      try {
        await fetchDRMList();
      } catch (error) {
        console.error('Failed to reload DRM list after create:', error);
        // Don't show error toast here, just log it
      }
    } catch (error: any) {
      console.error('Failed to create DRM:', error);
      toast.error(error.message || 'Failed to create DRM');
    } finally {
      setUploading(false);
    }
  };

  const handleEditDRM = async (formData: DRMFormData) => {
    if (!selectedDRM) return;
    
    try {
      setUploading(true);
      
      // Upload new files if provided
      const uploadedDocs: {
        start_date?: string;
        end_date?: string;
        drm_mom?: DRMDocument[];
        boq_final_docs?: DRMDocument[];
        redline_final_docs?: DRMDocument[];
        matrix_final_docs?: DRMDocument[];
        other_docs?: DRMDocument[];
      } = {
        start_date: new Date(formData.drmStartDate).toISOString(),
        end_date: new Date(formData.drmEndDate).toISOString(),
      };

      // Upload MOM file if changed
      if (formData.drmMomFile) {
        const uploadResult = await drmService.uploadEvidence(formData.drmMomFile, token);
        uploadedDocs.drm_mom = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Minutes of Meeting DRM',
          status: 'approved',
        }];
      }

      // Upload BOQ Final docs if changed
      if (formData.boqFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.boqFinalDocsFile, token);
        uploadedDocs.boq_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'BOQ Final Document',
          status: 'approved',
        }];
      }

      // Upload Redline Final docs if changed
      if (formData.redlineFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.redlineFinalDocsFile, token);
        uploadedDocs.redline_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Redline Final Document',
          status: 'approved',
        }];
      }

      // Upload Matrix Final docs if changed
      if (formData.matrixFinalDocsFile) {
        const uploadResult = await drmService.uploadEvidence(formData.matrixFinalDocsFile, token);
        uploadedDocs.matrix_final_docs = [{
          file_path: uploadResult.file_path,
          file_name: uploadResult.file_name,
          file_type: uploadResult.file_type,
          file_size: uploadResult.file_size,
          keterangan: 'Matrix Final Document',
          status: 'approved',
        }];
      }

      // Upload Other docs if changed
      if (formData.otherDocsFiles && formData.otherDocsFiles.length > 0) {
        const otherDocsUploads = await Promise.all(
          formData.otherDocsFiles.map(file => drmService.uploadEvidence(file, token))
        );
        uploadedDocs.other_docs = otherDocsUploads.map(result => ({
          file_path: result.file_path,
          file_name: result.file_name,
          file_type: result.file_type,
          file_size: result.file_size,
          keterangan: 'Other DRM Document',
          status: 'approved',
        }));
      }

      // Update DRM
      await drmService.updateDRM(selectedDRM.id, uploadedDocs, token);
      
      toast.success('DRM updated successfully!');
      setIsEditModalOpen(false);
      fetchDRMList(); // Reload list
    } catch (error: any) {
      console.error('Failed to update DRM:', error);
      toast.error(error.message || 'Failed to update DRM');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDRM = async () => {
    if (!selectedDRM) return;
    
    try {
      await drmService.deleteDRM(selectedDRM.id, token);
      
      toast.success('DRM deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedDRM(null);
      fetchDRMList(); // Reload list
    } catch (error: any) {
      console.error('Failed to delete DRM:', error);
      toast.error(error.message || 'Failed to delete DRM');
    }
  };

  const openEditModal = async (drm: DRMData) => {
    try {
      setLoadingEdit(true);
      console.log('📡 Fetching DRM details for edit...');
      // Fetch full DRM details
      const drmDetail = await drmService.getDRMById(drm.id);
      console.log('✅ DRM details fetched:', drmDetail);
      
      setSelectedDRM(drm);
      setSelectedDRMDetail(drmDetail);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('❌ Failed to fetch DRM details:', error);
      toast.error('Failed to load DRM details');
    } finally {
      setLoadingEdit(false);
    }
  };

  const openDeleteModal = (drm: DRMData) => {
    setSelectedDRM(drm);
    setIsDeleteModalOpen(true);
  };

  const getDocumentCountBadge = (count: number) => {
    if (count === 0) {
      return <span className="text-xs text-gray-400">No files</span>;
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
        {count} {count === 1 ? 'file' : 'files'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper to resolve vendor name
  const getVendorName = (subPelaksana: any) => {
    if (!subPelaksana) return '-';
    let idStr = '';
    if (typeof subPelaksana === 'string') {
      idStr = subPelaksana;
    } else if (subPelaksana.id) {
      if (typeof subPelaksana.id === 'string') {
        idStr = subPelaksana.id;
      } else if (subPelaksana.id.String) {
        idStr = subPelaksana.id.String;
      }
    }
    if (!idStr) return '-';
    const cleanId = idStr.includes(':') ? idStr.split(':')[1] : idStr;
    return vendorsRecord[cleanId] || vendorsRecord[idStr] || vendorsRecord[`vendor:${cleanId}`] || idStr;
  };

  // Search query filtering based on all DRMs
  const filteredDrmList = useMemo(() => {
    return drmList.filter(drm => 
      drm.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drm.linkName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drmList, searchQuery]);

  // NEW: Filter for survey done links (retained for backward compatibility or future check)
  const filteredLinks = useMemo(() => {
    return flattenedLinks.filter(link =>
      link.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.linkName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flattenedLinks, searchQuery]);

  // NEW: Handler for link selection from DRM list → buka Detail View gabungan (RuasDetail) pada stage DRM
  const handleLinkSelect = (drm: DRMData) => {
    localStorage.setItem('ruasDetailParams', JSON.stringify({
      linkId: drm.linkId,
      projectId: drm.projectId,
      projectName: drm.projectName,
      linkName: drm.linkName,
      initialStage: 'drm',
      originTab: 'drm',
    }));
    onTabChange?.('ruas-detail');
  };

  // NEW: Handler for back button
  const handleBack = () => {
    setViewLevel('list');
    setSelectedLink(null);
    setSearchParams({});
    setIsInstallationFinalized(false);
  };

  // Check if installation project exists for selected link
  useEffect(() => {
    const checkInstallationStatus = async () => {
      if (!selectedLink || !token) return;
      
      setIsCheckingInstallation(true);
      try {
        const projects = await installationProjectService.getByLinkId(selectedLink.linkId, token);
        setIsInstallationFinalized(projects && projects.length > 0);
      } catch (error) {
        console.error('Failed to check installation status:', error);
        setIsInstallationFinalized(false);
      } finally {
        setIsCheckingInstallation(false);
      }
    };

    checkInstallationStatus();
  }, [selectedLink, token]);

  // Handler: Finalize DRM → Installation (multi-step API flow)
  const handleFinalizeToInstallation = async () => {
    if (!selectedLink || !token) return;

    // Cari data DRM yang sesuai dengan link yang dipilih
    const drmData = drmList.find(d => d.linkId === selectedLink.linkId);

    setIsFinalizing(true);
    setFinalizeProgress({
      project: 'loading',
      pow: 'idle',
      boq: 'idle',
      matrix: 'idle',
      redline: 'idle'
    });
    const copiedItems: string[] = [];
    let hasError = false;

    try {
      // ── Step 1: Create Installation Project ────────────────────────────
      let subPelaksanaId: string | undefined;
      if (drmData?.subPelaksana) {
        if (typeof drmData.subPelaksana === 'string') {
          subPelaksanaId = drmData.subPelaksana;
        } else if (drmData.subPelaksana?.id) {
          const raw = drmData.subPelaksana.id;
          subPelaksanaId = typeof raw === 'string' ? raw : (raw?.String || raw?.id || undefined);
        }
      }

      let witelId: string | undefined;
      let regionalId: string | undefined;
      if (drmData?.witel) {
        witelId = drmData.witel;
      }
      if (drmData?.regionalId) {
        regionalId = drmData.regionalId;
      }

      console.log('🚀 Step 1/5: Creating installation project for link:', selectedLink.linkId);
      const step1 = await installationProjectService.createInstallationProject(
        {
          project_id: selectedLink.projectId,
          project_name: selectedLink.projectName,
          link_id: selectedLink.linkId,
          link_name: selectedLink.linkName,
          no_kontrak: drmData?.noKontrak,
          contract_duration: drmData?.contractDuration,
          contract_signed: drmData?.contractSigned,
          customer: drmData?.customer || (selectedLink.project as any)?.customer,
          pelaksana: drmData?.pelaksana || (selectedLink.project as any)?.pelaksana,
          sub_pelaksana: subPelaksanaId,
          witel: witelId,
          regional: regionalId,
          start_plan_date: drmData?.startPlanDate,
          end_plan_date: drmData?.endPlanDate,
        },
        token
      );
      console.log('✅ Step 1 sukses:', step1);
      setFinalizeProgress(prev => ({ ...prev, project: 'done', pow: 'loading' }));

      // ── Step 2: Finalize POW (copy pow_drm → pow_installasi) ──────────
      try {
        console.log('🚀 Step 2/5: Finalizing POW for link:', selectedLink.linkId);
        const powResult = await installationProjectService.finalizePOW(
          selectedLink.linkId,
          token
        );
        console.log('✅ Step 2 sukses:', powResult);
        if (powResult.pow_copied) copiedItems.push('POW');
        setFinalizeProgress(prev => ({ ...prev, pow: 'done', boq: 'loading' }));
      } catch (err) {
        console.error('⚠️ Step 2 (POW) gagal:', err);
        setFinalizeProgress(prev => ({ ...prev, pow: 'error', boq: 'loading' }));
        hasError = true;
      }

      // ── Step 3: Upload BOQ DRM → BOQ Installasi ───────────────────────
      try {
        console.log('🚀 Step 3/5: Uploading BOQ to installation...');
        const boqResult = await uploadBOQToInstallation(
          selectedLink.projectId,
          selectedLink.linkId
        );
        console.log('✅ Step 3 sukses:', boqResult);
        if (!boqResult.skipped) copiedItems.push('BOQ');
        setFinalizeProgress(prev => ({ ...prev, boq: 'done', matrix: 'loading' }));
      } catch (err) {
        console.error('⚠️ Step 3 (BOQ) gagal:', err);
        setFinalizeProgress(prev => ({ ...prev, boq: 'error', matrix: 'loading' }));
        hasError = true;
      }

      // ── Step 4: Upload Matrix DRM → Matrix Installasi ─────────────────
      try {
        console.log('🚀 Step 4/5: Uploading Matrix to installation...');
        const matrixResult = await uploadMatrixToInstallation(
          selectedLink.projectId,
          selectedLink.linkId
        );
        console.log('✅ Step 4 sukses:', matrixResult);
        if (!matrixResult.skipped) copiedItems.push('Matrix');
        setFinalizeProgress(prev => ({ ...prev, matrix: 'done', redline: 'loading' }));
      } catch (err) {
        console.error('⚠️ Step 4 (Matrix) gagal:', err);
        setFinalizeProgress(prev => ({ ...prev, matrix: 'error', redline: 'loading' }));
        hasError = true;
      }

      // ── Step 5: Upload Redline DRM → Redline Installasi ───────────────
      try {
        console.log('🚀 Step 5/5: Uploading Redline to installation...');
        const redlineResult = await uploadRedlineToInstallation(
          selectedLink.projectId,
          selectedLink.linkId
        );
        console.log('✅ Step 5 sukses:', redlineResult);
        if (!redlineResult.skipped) copiedItems.push('Redline');
        setFinalizeProgress(prev => ({ ...prev, redline: 'done' }));
      } catch (err) {
        console.error('⚠️ Step 5 (Redline) gagal:', err);
        setFinalizeProgress(prev => ({ ...prev, redline: 'error' }));
        hasError = true;
      }

      // ── Summary ────────────────────────────────────────────────────────
      const copiedStr = copiedItems.join(', ');
      
      // Tunggu sebentar agar user bisa melihat status sukses semua di modal
      setTimeout(() => {
        setShowFinalizeModal(false);
        if (hasError) {
          toast.warning(
            `Installation project dibuat, tapi sebagian data gagal disalin.${copiedStr ? ` Berhasil: ${copiedStr}.` : ''} Cek console untuk detail.`,
            { id: 'finalize-installation', duration: 5000 }
          );
        } else {
          toast.success(
            `Installation project berhasil dibuat!${copiedStr ? ` Data yang disalin: ${copiedStr}.` : ''}`,
            { id: 'finalize-installation', duration: 5000 }
          );
          setIsInstallationFinalized(true);
        }
      }, 1500);

    } catch (error: any) {
      console.error('❌ Finalize to Installation gagal:', error);
      setFinalizeProgress(prev => ({ ...prev, project: 'error' }));
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Terjadi kesalahan saat finalize ke installation.';
      toast.error(message, { id: 'finalize-installation', duration: 5000 });
      
      setTimeout(() => {
        setShowFinalizeModal(false);
      }, 2000);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleUnfinalizeInstallation = async () => {
    if (!selectedLink || !token) return;

    setIsFinalizing(true);
    toast.loading('Membatalkan finalisasi installation...', { id: 'unfinalize-installation' });

    try {
      await installationProjectService.unfinalizeInstallation(selectedLink.linkId, token);
      toast.success('Finalisasi berhasil dibatalkan. Semua data installation terhapus.', { id: 'unfinalize-installation', duration: 5000 });
      setIsInstallationFinalized(false);
      setShowUnfinalizeModal(false);
    } catch (error: any) {
      console.error('Failed to unfinalize installation:', error);
      toast.error(error?.response?.data?.message || 'Gagal membatalkan finalisasi.', { id: 'unfinalize-installation', duration: 5000 });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    if (selectedLink) {
      setSearchParams({
        linkId: selectedLink.linkId,
        projectId: selectedLink.projectId,
        tab: tabId,
      });
    }
  };

  const paramLinkId = searchParams.get('linkId');
  const paramProjectId = searchParams.get('projectId');
  const paramTab = searchParams.get('tab');

  // NEW: Restore detail view state from URL search params on mount / reload using DRM List
  useEffect(() => {
    if (drmList.length === 0) return;

    if (paramLinkId && paramProjectId) {
      // Guard to prevent infinite loop of setting state with new mockLink reference
      if (selectedLink && 
          selectedLink.linkId === paramLinkId && 
          selectedLink.projectId === paramProjectId && 
          activeTab === (paramTab || 'kml')) {
        return;
      }

      const matchedDrm = drmList.find(
        (drm) => drm.linkId === paramLinkId && drm.projectId === paramProjectId
      );
      if (matchedDrm) {
        console.log('🔄 Restoring DRM detail view from URL params:', matchedDrm);
        const mockLink: FlattenedLink = {
          linkId: matchedDrm.linkId,
          linkName: matchedDrm.linkName,
          projectId: matchedDrm.projectId,
          projectName: matchedDrm.projectName,
          regional: matchedDrm.region,
          witel: matchedDrm.witel,
          status: matchedDrm.status,
          ss_status: matchedDrm.ssStatus,
          ss_contract_value: matchedDrm.contractValue,
          plan_date: matchedDrm.startPlanDate,
          project: {
            id: matchedDrm.projectId,
            name: matchedDrm.projectName,
            status: matchedDrm.status,
            customer: matchedDrm.customer,
            pelaksana: matchedDrm.pelaksana,
          } as any
        };
        setSelectedLink(mockLink);
        setViewLevel('detail');
        if (paramTab) {
          setActiveTab(paramTab as any);
        }
      }
    }
  }, [drmList, paramLinkId, paramProjectId, paramTab, selectedLink, activeTab]);

  // NEW: Fetch KML data when selectedLink changes (fetches finalized KML from kml_drm API by link)
  useEffect(() => {
    const fetchKMLData = async () => {
      if (!selectedLink || !selectedLink.linkId) {
        setKmlData(null);
        return;
      }

      setIsLoadingKML(true);
      try {
        console.log('📥 Fetching finalized KML data for link:', selectedLink.linkId);
        const response = await kmlFinalizeService.getFinalizedKmlByLink(selectedLink.linkId);
        console.log('✅ Finalized KML data fetched:', response);
        
        // Transform finalized KmlDrmItems to KMLData structure matching TabKML expected types
        const projectFiles: any[] = [];
        const surveyGroupsMap = new Map<string, { item_name: string; files: any[] }>();
        
        const items = response.kml_drm_items || [];
        items.forEach((item: any) => {
          const fileObj = {
            id: {
              tb: 'evidence',
              id: { String: item.original_evidence_id?.includes(':') ? item.original_evidence_id.split(':')[1] : item.original_evidence_id }
            },
            process_id: item.process_id,
            project_id: {
              tb: 'project',
              id: { String: item.project_id?.includes(':') ? item.project_id.split(':')[1] : item.project_id }
            },
            file_path: item.file_path,
            file_name: item.file_name,
            file_type: item.file_type,
            file_size: item.file_size,
            file_category: item.file_category === 'kml_project' ? 'kml' : 'evidence',
            keterangan: item.keterangan || '',
            status: item.status || 'approved',
            created_at: item.created_at || new Date().toISOString()
          };
          
          if (item.file_category === 'kml_project') {
            projectFiles.push(fileObj);
          } else if (item.file_category === 'kml_survey') {
            const itemId = item.span_item_id || 'unknown';
            const itemName = item.item_name || 'Survey Item';
            if (!surveyGroupsMap.has(itemId)) {
              surveyGroupsMap.set(itemId, { item_name: itemName, files: [] });
            }
            surveyGroupsMap.get(itemId)!.files.push(fileObj);
          }
        });
        
        const kml_project = projectFiles.length > 0 ? [{
          project_name: selectedLink.projectName,
          files: projectFiles
        }] : [];
        
        const kml_survey: any[] = [];
        surveyGroupsMap.forEach((group, itemId) => {
          kml_survey.push({
            item_id: itemId,
            item_name: group.item_name,
            files: group.files
          });
        });
        
        const transformedData = {
          kml_project,
          kml_survey,
          kml_span: []
        };
        
        console.log('🔄 Transformed KML data for TabKML:', transformedData);
        setKmlData(transformedData);
      } catch (error) {
        console.error('❌ Error fetching finalized KML data:', error);
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
  }, [selectedLink]);

  // Fetch BOQ data when selectedLink changes
  useEffect(() => {
    const fetchBOQData = async () => {
      if (!selectedLink || !selectedLink.linkId) {
        setBoqData(null);
        return;
      }

      setIsLoadingBOQ(true);
      try {
        console.log('📥 Fetching DRM BOQ data for link:', selectedLink.linkId);
        const response = await fetch(`${API_CONFIG.BASE_URL}/boq-drm/link/${selectedLink.linkId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const record = await response.json();
          if (record && record.doc) {
            setBoqData({ items: record.doc, summary: null });
          } else {
            setBoqData(null);
          }
        } else {
          setBoqData(null);
        }
      } catch (error) {
        console.error('❌ Error fetching DRM BOQ data:', error);
        setBoqData(null);
      } finally {
        setIsLoadingBOQ(false);
      }
    };

    fetchBOQData();
  }, [selectedLink]);


  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Content */}
      <div className="flex-1 overflow-auto py-1 px-0 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c5cfc]"></div>
            <p className="ml-3 text-gray-600">Loading DRM data...</p>
          </div>
        ) : (
          <>
            {/* --- LEVEL 1: LINKS LIST --- */}
            {viewLevel === 'list' && (
              <>
                {/* Page Header — matching mockup */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Stage Monitor</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">DRM Monitor</h1>
                    <p className="mt-1 text-sm text-gray-500">Cross-ruas status dokumen DRM dan persetujuan POW.</p>
                  </div>
                </div>

                {/* Stat Cards — matching mockup */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#7c5cfc]" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Ruas dalam DRM</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#7c5cfc]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {filteredDrmList.length}
                    </p>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#e4002b]" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Dokumen Ditolak</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#c00023]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      0
                    </p>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <span className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl bg-[#16a34a]" />
                    <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">POW Disetujui</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#15803d]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      0
                    </p>
                  </div>
                </div>

                {/* Filter Bar — matching mockup */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari ruas atau proyek…"
                      className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#7c5cfc]/40 focus:ring-2 focus:ring-[#7c5cfc]/15"
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
                    {loading ? (
                      <div className="flex items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c5cfc]"></div>
                      </div>
                    ) : filteredDrmList.length === 0 ? (
                      /* Empty State */
                      <div className="flex flex-col items-center justify-center py-16 px-6 bg-white">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data DRM</h3>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                          Belum ada data DRM yang terdaftar. Data DRM akan terbuat otomatis setelah survey selesai difinalisasi.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border border-gray-200 rounded-lg overflow-hidden min-w-0">
                        <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                          <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'auto', minWidth: '2020px', width: '2020px' }}>
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                              <tr>
                                <th className="p-4 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px] whitespace-nowrap">Project Name</th>
                                <th className="p-4 sticky left-[200px] bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 min-w-[200px] whitespace-nowrap">Link / Ruas</th>
                                <th className="p-4 min-w-[120px] whitespace-nowrap">Region</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Location</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Customer</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Pelaksana</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Sub Pelaksana</th>
                                <th className="p-4 min-w-[120px] whitespace-nowrap">Last Updated</th>
                                <th className="p-4 min-w-[130px] whitespace-nowrap">Start Plan Date</th>
                                <th className="p-4 min-w-[160px] whitespace-nowrap">Actual Start Date</th>
                                <th className="p-4 min-w-[160px] whitespace-nowrap">Actual End Date</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">SS Contract Value</th>
                                <th className="p-4 min-w-[140px] whitespace-nowrap">SS Status</th>
                                <th className="p-4 min-w-[100px] whitespace-nowrap">Status</th>
                                <th className="p-4 min-w-[150px] whitespace-nowrap">Progress</th>
                                <th className="p-4 min-w-[80px] text-center sticky right-0 bg-gray-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredDrmList.map((drm, index) => {
                                return (
                                  <tr 
                                    key={`${drm.projectId}-${drm.linkId}-${index}`}
                                    onClick={() => handleLinkSelect(drm)}
                                    className="group transition border-b border-gray-100 last:border-b-0 cursor-pointer"
                                  >
                                    <td className="p-4 font-bold text-gray-900 sticky left-0 bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{drm.projectName}</td>
                                    <td className="p-4 sticky left-[200px] bg-white z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                                      <div className="flex items-center gap-2">
                                        {drm.linkName !== '-' ? (
                                          <>
                                            <Layers className="w-3.5 h-3.5 text-[#7c5cfc] flex-shrink-0" />
                                            <span className="font-bold text-gray-900 group-hover:text-[#7c5cfc]">{drm.linkName}</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-400 italic text-xs">No Links</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                      {drm.region || '-'}
                                    </td>
                                    <td className="p-4 text-gray-600 capitalize">
                                      {drm.witel || drm.location || '-'}
                                    </td>
                                    <td className="p-4 text-gray-600">{drm.customer || 'Telkom Indonesia'}</td>
                                    <td className="p-4 text-gray-600 text-[10px] font-bold uppercase">{drm.pelaksana || '-'}</td>
                                    <td className="p-4 text-gray-600 text-[10px] font-bold uppercase">{getVendorName(drm.subPelaksana)}</td>
                                    <td className="p-4 text-gray-500 text-xs italic">{drm.lastUpdated ? formatDate(drm.lastUpdated) : 'Just now'}</td>
                                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                      {drm.startPlanDate 
                                        ? formatDate(drm.startPlanDate)
                                        : '-'
                                      }
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                      {(() => {
                                        const actualDates = actualDatesMap.get(drm.projectId);
                                        const linkActualDate = actualDates?.find(ad => {
                                          const adLinkId = ad.link_id ? extractRegionalId(ad.link_id) : null;
                                          return adLinkId === drm.linkId;
                                        }) || actualDates?.[0];
                                        return linkActualDate && linkActualDate.asd_drm
                                          ? formatDate(linkActualDate.asd_drm)
                                          : '-';
                                      })()}
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap">
                                      {(() => {
                                        const actualDates = actualDatesMap.get(drm.projectId);
                                        const linkActualDate = actualDates?.find(ad => {
                                          const adLinkId = ad.link_id ? extractRegionalId(ad.link_id) : null;
                                          return adLinkId === drm.linkId;
                                        }) || actualDates?.[0];
                                        return linkActualDate && linkActualDate.aed_drm
                                          ? formatDate(linkActualDate.aed_drm)
                                          : '-';
                                      })()}
                                    </td>
                                    <td className="p-4 font-mono text-gray-600">
                                      {drm.contractValue 
                                        ? `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(drm.contractValue)}`
                                        : '---'
                                      }
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                                        {drm.ssStatus || 'survey completed'}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${drm.status === 'survey' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600'}`}>
                                        {drm.status}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                                          <div className="h-full bg-gradient-to-r from-[#7c5cfc] to-[#6c4cf0] transition-all duration-500" style={{ width: `${drm.progress || 0}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-gray-500">{drm.progress || 0}%</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      <button className="p-1.5 hover:bg-white rounded-full text-[#7c5cfc] hover:text-[#6c4cf0] shadow-sm transition">
                                        <ChevronRight className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredDrmList.length === 0 && !loading && (
                                <tr>
                                  <td colSpan={16} className="p-8 text-center text-gray-400 italic">
                                    No DRM data found
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

            {/* --- LEVEL 2: LINK DETAIL VIEW --- */}
            {/* DINONAKTIFKAN: navigasi detail sekarang pakai RuasDetail gabungan. Blok lama dipertahankan sebagai referensi (SHOW_LEGACY_DETAIL = false). */}
            {SHOW_LEGACY_DETAIL && viewLevel === 'detail' && selectedLink && (
              <div className="flex flex-col gap-4 h-full">
                {/* Header Card - Enhanced with MORE visual elements */}
                <div className="p-6 bg-gradient-to-br from-[#15396C] via-[#1e4b8a] to-[#0078D7] rounded-xl text-white shadow-2xl flex justify-between items-center relative overflow-hidden border border-white/10">
                   {/* Animated gradient mesh background - MORE VIBRANT */}
                   <div className="absolute inset-0 opacity-40">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400/60 via-blue-400/40 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-300/50 via-cyan-300/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '2s' }} />
                   </div>

                   {/* Geometric pattern overlay - MORE VISIBLE */}
                   <div className="absolute inset-0 opacity-15" style={{
                      backgroundImage: `
                   linear-gradient(30deg, transparent 48%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 52%),
                   linear-gradient(150deg, transparent 48%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 52%)
                 `,
                      backgroundSize: '15px 15px'
                   }} />

                   {/* Decorative circles - MORE ELEMENTS */}
                   <div className="absolute -top-10 -right-10 w-40 h-40 border-4 border-white/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
                   <div className="absolute -top-5 -right-5 w-32 h-32 border-2 border-cyan-300/30 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                   <div className="absolute -bottom-10 -left-10 w-32 h-32 border-4 border-white/20 rounded-full" />
                   <div className="absolute top-1/2 right-20 w-24 h-24 border-2 border-white/10 rounded-full animate-pulse" />
                   <div className="absolute bottom-10 right-40 w-16 h-16 border-2 border-cyan-300/20 rounded-full" />

                   {/* Floating dots - NEW */}
                   <div className="absolute top-8 left-20 w-2 h-2 bg-cyan-300/60 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
                   <div className="absolute top-16 left-40 w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                   <div className="absolute bottom-12 left-32 w-2 h-2 bg-blue-300/50 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
                   <div className="absolute top-20 right-60 w-1 h-1 bg-white/50 rounded-full animate-ping" />
                   <div className="absolute bottom-16 right-80 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }} />

                   {/* Diagonal lines - NEW */}
                   <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                   <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent" />

                   {/* Glow effect - STRONGER */}
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />

                   {/* Left side - Title only */}
                   <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                         <h2 className="text-2xl font-bold drop-shadow-lg">{selectedLink?.linkName || 'Survey Link'}</h2>
                      </div>
                      <p className="text-blue-100 text-sm flex items-center gap-2">
                         <MapPin className="w-3.5 h-3.5" /> {selectedLink?.projectName}
                      </p>
                   </div>

                   {/* Right side - Icon with MORE decoration */}
                   <div className="relative z-10">
                      <div className="relative">
                         {/* Outer glow ring */}
                         <div className="absolute inset-0 w-24 h-24 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />

                         {/* Main icon circle */}
                         <div className="relative w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                            <Network className="w-10 h-10" />

                            {/* Corner badges */}
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400 rounded-full border-2 border-white flex items-center justify-center">
                               <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                         </div>

                         {/* Orbiting dots */}
                         <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-300 rounded-full animate-ping" />
                         <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                      </div>
                   </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between gap-2 pb-2 pt-2" style={{ overflowY: 'visible' }}>
                  <div className="flex gap-2" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                    {[
                      { id: 'kml',       label: 'KML',                  icon: MapIcon  },
                      { id: 'redline',   label: 'Redline',              icon: ScanLine },
                      { id: 'matrix',    label: 'Matrix',               icon: Layers   },
                      { id: 'boq',       label: 'BOQ',                  icon: FileText },
                      { id: 'as-plan',   label: 'As Plan Drawing DRM',  icon: Layers   },
                      { id: 'pow',       label: 'POW',                  icon: Network  },
                      { id: 'ba-survey', label: 'BA DRM',            icon: FileText },
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id as any)}
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

                  {/* Finalize to Installation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFinalizeProgress({
                          project: 'idle',
                          pow: 'idle',
                          boq: 'idle',
                          matrix: 'idle',
                          redline: 'idle'
                        });
                        setShowFinalizeModal(true);
                      }}
                      disabled={isFinalizing || isCheckingInstallation || isInstallationFinalized}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap text-white shadow-md flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: (isFinalizing || isInstallationFinalized) ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                    >
                      {isCheckingInstallation ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Checking...
                        </>
                      ) : isInstallationFinalized ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Finalized to Installation
                        </>
                      ) : isFinalizing ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Finalize to Installation
                        </>
                      )}
                    </button>

                    {isInstallationFinalized && (
                      <button
                        onClick={() => setShowUnfinalizeModal(true)}
                        disabled={isFinalizing}
                        className="px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 flex-shrink-0"
                        title="Buka kembali finalisasi (Unfinalize) ke installation"
                      >
                        <X className="w-4 h-4" />
                        Unfinalize
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                <div ref={contentAreaRef} className="flex-1 overflow-hidden">
                  {(() => {
                    // All tabs show content directly - link is already filtered to have finalized data
                    if (activeTab === 'kml') {
                      return (
                        <TabKML 
                          kmlFileName=""
                          kmlFileContent=""
                          projectId={selectedLink.projectId}
                          linkId={selectedLink.linkId}
                          kmlData={kmlData}
                          onPreview={() => {}}
                        />
                      );
                    }
                    
                    if (activeTab === 'redline') {
                      return (
                        <TabRedLine 
                          contractId={selectedLink.projectId}
                          linkId={selectedLink.linkId}
                        />
                      );
                    }
                    
                    if (activeTab === 'matrix') {
                      return (
                        <TabMatrix 
                          contractId={selectedLink.projectId}
                          contractName={selectedLink.projectName}
                          linkId={selectedLink.linkId}
                        />
                      );
                    }
                    
                    if (activeTab === 'boq') {
                      return (
                        <TabBOQ 
                          projectId={selectedLink.projectId}
                          linkId={selectedLink.linkId}
                          boqItems={boqData?.items || []}
                          summary={boqData?.summary}
                          isLoading={isLoadingBOQ}
                          onDataChange={async () => {

                            setIsLoadingBOQ(true);
                            try {
                              const response = await fetch(`${API_CONFIG.BASE_URL}/boq-drm/link/${selectedLink.linkId}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                const record = await response.json();
                                if (record && record.doc) {
                                  setBoqData({ items: record.doc, summary: null });
                                } else {
                                  setBoqData(null);
                                }
                              } else {
                                setBoqData(null);
                              }
                            } catch (error) {
                              console.error('❌ Error refreshing BOQ data:', error);
                            } finally {
                              setIsLoadingBOQ(false);
                            }
                          }}

                        />
                      );
                    }

                    if (activeTab === 'as-plan') {
                      return (
                        <TabAsPlanDrawingDRM
                          projectId={selectedLink.projectId}
                        />
                      );
                    }

                    if (activeTab === 'pow') {
                      return (
                        <TabPOW
                          contractId={selectedLink.projectId}
                          linkId={selectedLink.linkId}
                          linkName={selectedLink.linkName}
                        />
                      );
                    }

                    if (activeTab === 'ba-survey') {
                      return (
                        <TabBASurvey
                          contractId={selectedLink.projectId}
                          linkId={selectedLink.linkId}
                          linkName={selectedLink.linkName}
                        />
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateDRMModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateDRM}
      />

      {selectedDRM && selectedDRMDetail && (
        <>
          <EditDRMModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            onSubmit={handleEditDRM}
            initialData={{
              projectId: selectedDRM.projectId,
              projectName: selectedDRM.projectName,
              drmStartDate: new Date(selectedDRM.drmStartDate).toISOString().split('T')[0],
              drmEndDate: new Date(selectedDRM.drmEndDate).toISOString().split('T')[0],
              drmMomFile: null,
              boqFinalDocsFile: null,
              redlineFinalDocsFile: null,
              matrixFinalDocsFile: null,
              otherDocsFiles: [],
              remarks: '',
            }}
            existingFiles={{
              drmMom: selectedDRMDetail.drm_mom,
              boqFinalDocs: selectedDRMDetail.boq_final_docs,
              redlineFinalDocs: selectedDRMDetail.redline_final_docs,
              matrixFinalDocs: selectedDRMDetail.matrix_final_docs,
              otherDocs: selectedDRMDetail.other_docs,
            }}
          />

          <DeleteDRMModal
            open={isDeleteModalOpen}
            onOpenChange={setIsDeleteModalOpen}
            onConfirm={handleDeleteDRM}
            drmName={selectedDRM.projectName}
          />
        </>
      )}

      {/* Confirm Finalize to Installation Modal */}
      {showFinalizeModal && selectedLink && (
        <ConfirmFinalizeInstallationModal
          linkName={selectedLink.linkName || selectedLink.linkId}
          onConfirm={handleFinalizeToInstallation}
          onCancel={() => setShowFinalizeModal(false)}
          isProcessing={isFinalizing}
          progress={finalizeProgress}
        />
      )}

      {/* Confirm Unfinalize Modal */}
      {selectedLink && (
        <ConfirmUnfinalizeModal
          isOpen={showUnfinalizeModal}
          onClose={() => setShowUnfinalizeModal(false)}
          onConfirm={handleUnfinalizeInstallation}
          linkName={selectedLink.linkName || selectedLink.linkId}
          isProcessing={isFinalizing}
        />
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8] mb-4"></div>
            <p className="text-gray-700">Uploading files...</p>
          </div>
        </div>
      )}

      {/* Loading Edit Overlay */}
      {loadingEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8] mb-4"></div>
            <p className="text-gray-700">Loading DRM details...</p>
          </div>
        </div>
      )}
    </div>
  );
}
