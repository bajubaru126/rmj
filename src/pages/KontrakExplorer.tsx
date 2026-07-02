import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText,
  MapPin,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Users,
  CheckCircle,
  Paperclip,
  Eye,
  Edit,
  Image as ImageIcon,
  Search,
  ArrowLeft,
  Download,
  AlertTriangle,
  LayoutGrid,
  List as ListIcon,
  SlidersHorizontal,
  Calendar,
  ChevronRight,
  Layers,
  Building2,
} from 'lucide-react';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { KMLMapViewer } from '@/components/shared/KMLMapViewer';
import { OrbitProgress } from 'react-loading-indicators';
import { TabKML } from '@/components/kontrak/TabKML';
import { AddSpanModal } from '@/components/modals/span/AddSpanModal';
import { CreateSpanModal } from '@/components/modals/span/CreateSpanModal';
import { CreateContractModal } from '@/components/modals/contract/CreateContractModal';
import { EditContractModal } from '@/components/modals/contract/EditContractModal';
import { CreateKOMModal, KOMFormData } from '@/components/modals/kom/CreateKOMModal';
import { EditKOMModal } from '@/components/modals/kom/EditKOMModal';
import { DeleteKOMModal } from '@/components/modals/kom/DeleteKOMModal';
import { ViewKOMModal } from '@/components/modals/kom/ViewKOMModal';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Contract,
  BOQItem,
  getContractsFromStorage
} from '@/types/contract';
import { useContract } from '@/hooks/useContract';
import { getProjectKMLFiles, getProjectDocuments, getAllProjects } from '@/services/contractService';
import { extractId, ProjectResponse } from '@/services/contractService';
import { spanService } from '@/services/spanService';
import { komService, type KOM, type CreateKOMRequest, type UpdateKOMRequest } from '@/services/komService';
import { useAuth } from '@/context/AuthContext';
import { getAllRegionals, getAllWitels, extractId as extractRegionalId, type Regional, type Witel } from '@/services/regionalService';
import { vendorService, type Vendor } from '@/services/vendorService';

// Interfaces for Segment & Cell Table (using actual Project structure)
interface CellData {
  id: string;
  cellName: string;
  length: string;
  material: string;
  owner: string;
  status: 'OK' | 'Delay' | 'Issue';
  evidenceCount: number;
  hasKML: boolean;
  evidencePhotos?: string[];
}

interface SegmentasiData {
  id: string;
  segName: string;
  length: string;
  status: string;
  cells: CellData[];
}

// Extended ProjectResponse with segmentasi for table display
interface ProjectTableData extends ProjectResponse {
  segmentasi?: SegmentasiData[];
}

// Status Badge Component - Mockup Tag style
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
    survey: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', dot: 'bg-purple-500' },
    inactive: { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' },
    completed: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200', dot: 'bg-green-500' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', dot: 'bg-yellow-500' },
    on_going: { bg: 'bg-[#E0F2FE]', text: 'text-[#2563EB]', ring: 'ring-[#BFDBFE]', dot: 'bg-[#2563EB]' },
  };

  const displayStatus = status?.toLowerCase() === 'active' ? 'survey' : status?.toLowerCase();
  const style = styles[displayStatus] || { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' };

  const getStatusLabel = (status: string) => {
    if (status === 'survey') return 'Survey';
    if (status === 'on_going') return 'On Going';
    if (status === 'completed') return 'Completed';
    if (status === 'pending') return 'Pending';
    if (status === 'inactive') return 'Inactive';
    return status;
  };

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {getStatusLabel(displayStatus)}
    </span>
  );
};

// Add slide animation styles
const slideAnimationStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

export function KontrakExplorer() {
  // API Hook
  const {
    contracts: apiContracts,
    loading: apiLoading,
    fetchContracts,
    fetchContractById,
    createContract: createApiContract
  } = useContract();

  // Refs
  const tabContentRef = useRef<HTMLDivElement>(null);

  // State management - merge localStorage with API data
  const [localContracts, setLocalContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(() => {
    return localStorage.getItem('selectedContractId') || null;
  });
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'kml' | 'document' | 'kom' | 'sslink'>('kom');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [editingProjectDocuments, setEditingProjectDocuments] = useState<any>(null); // Store documents for editing project
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [showAddSpanModal, setShowAddSpanModal] = useState<boolean>(false);
  const [contractForSpan, setContractForSpan] = useState<string | null>(null);
  const [kmlData, setKmlData] = useState<any>(null); // KML data from API
  const [documentsData, setDocumentsData] = useState<any>(null); // Documents data from API
  const [isLoadingKML, setIsLoadingKML] = useState<boolean>(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);
  const [spanNameForModal, setSpanNameForModal] = useState<string | null>(null);
  const [showCreateSpanModal, setShowCreateSpanModal] = useState<boolean>(false);
  const [projectForSpan, setProjectForSpan] = useState<string | null>(null);

  // KOM state
  const [komList, setKomList] = useState<KOM[]>([]);
  const [isCreateKOMModalOpen, setIsCreateKOMModalOpen] = useState(false);
  const [isEditKOMModalOpen, setIsEditKOMModalOpen] = useState(false);
  const [isDeleteKOMModalOpen, setIsDeleteKOMModalOpen] = useState(false);
  const [isViewKOMModalOpen, setIsViewKOMModalOpen] = useState(false);
  const [selectedKOM, setSelectedKOM] = useState<KOM | null>(null);
  const [loadingKOM, setLoadingKOM] = useState(false);
  const [uploadingKOM, setUploadingKOM] = useState(false);
  const { token } = useAuth();

  // State for regional and witel lookup (ID -> name) - use plain object for React reactivity
  const [regionalsRecord, setRegionalsRecord] = useState<Record<string, string>>({});
  const [witelsRecord, setWitelsRecord] = useState<Record<string, string>>({});
  const [vendorsRecord, setVendorsRecord] = useState<Record<string, string>>({});

  // SS Links state for create modal
  const [ssLinks, setSSLinks] = useState<Array<{ link_name: string; sub_pelaksana?: string; ss_contract_value?: string; kml_file?: File }>>([
    { link_name: '', sub_pelaksana: '', ss_contract_value: '' }
  ]);

  // View mode state - restore from localStorage
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(() => {
    const savedContractId = localStorage.getItem('selectedContractId');
    return savedContractId ? 'detail' : 'list';
  });
  const [displayView, setDisplayView] = useState<'list' | 'grid'>('list');

  // Load regionals and witels lookup on mount
  useEffect(() => {
    const loadLookups = async () => {
      try {
        console.log('🌐 Loading regional/witel/vendor lookups...');
        const [regionals, witels, vendors] = await Promise.all([
          getAllRegionals(),
          getAllWitels(),
          vendorService.getAllVendors().catch(() => []),
        ]);
        console.log('✅ Regionals loaded:', regionals.length);
        console.log('✅ Witels loaded:', witels.length);
        console.log('✅ Vendors loaded:', vendors.length);

        const rRecord: Record<string, string> = {};
        regionals.forEach((r: Regional) => { rRecord[r.id] = r.region; });
        setRegionalsRecord(rRecord);

        const wRecord: Record<string, string> = {};
        witels.forEach((w: Witel) => { wRecord[w.id] = w.witel; });
        setWitelsRecord(wRecord);

        const vRecord: Record<string, string> = {};
        vendors.forEach((v: Vendor) => { vRecord[v.id] = v.name; });
        setVendorsRecord(vRecord);

        console.log('✅ Lookup maps set:', { regionals: rRecord, witels: wRecord });
      } catch (e) {
        console.error('❌ Failed to load regional/witel lookups:', e);
      }
    };
    loadLookups();
  }, []);

  // Save selectedContractId to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kontrakExplorerActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedContractId) {
      localStorage.setItem('selectedContractId', selectedContractId);
      setViewMode('detail');
    } else {
      localStorage.removeItem('selectedContractId');
      setViewMode('list');
    }
  }, [selectedContractId]);

  // Re-fetch project detail when selectedContractId is restored (e.g. after navigating back from another page)
  useEffect(() => {
    if (!selectedContractId || apiContracts.length === 0) return;

    const refetchDetail = async () => {
      try {
        setIsLoadingDetail(true);
        console.log('🔄 Re-fetching project detail for restored ID:', selectedContractId);
        await fetchContractById(selectedContractId);

        // Also re-fetch spans
        try {
          const spans = await spanService.getSpansByProjectId(selectedContractId);
          const mappedSpans = spans.map(span => {
            const extractedId = extractIdFromResponse(span.id);
            return { id: extractedId, name: span.span_name };
          });
          setProjectSpans(prev => ({ ...prev, [selectedContractId]: mappedSpans }));
        } catch (e) {
          console.error('Failed to re-fetch spans:', e);
        }

        console.log('✅ Project detail re-fetched successfully');
      } catch (error) {
        console.error('❌ Failed to re-fetch project detail:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    refetchDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractId, apiContracts.length]);

  // State to store spans per project
  const [projectSpans, setProjectSpans] = useState<Record<string, Array<{ id: string, name: string }>>>({});

  // State for Segment & Cell Table
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const { toast, showToast, hideToast } = useToast();

  // Transform API contracts to table data format
  const projectTableData: ProjectTableData[] = useMemo(() => {
    // Sort by created_at descending (newest first) before mapping
    const sortedContracts = [...apiContracts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    return sortedContracts.map(contract => {
      return {
        ...contract,
        // Add mock segmentasi data for now (will be replaced with real span data later)
        segmentasi: []
      };
    });
  }, [apiContracts]);

  // Form states
  const [boqItems, setBOQItems] = useState<BOQItem[]>([]);
  const [boqFileName, setBOQFileName] = useState<string>('');
  const [boqFile, setBOQFile] = useState<File | null>(null);
  const [kmlFileName, setKMLFileName] = useState<string>('');
  const [kmlFile, setKMLFile] = useState<File | null>(null);
  const [showKMLPreview, setShowKMLPreview] = useState<boolean>(false);
  const [kmlPreviewData, setKMLPreviewData] = useState<string>('');
  const [isDraggingBOQ, setIsDraggingBOQ] = useState<boolean>(false);
  const [isDraggingKML, setIsDraggingKML] = useState<boolean>(false);
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    nomorKontrak: '',
    namaProject: '',
    contractSigned: '',
    contractValue: '',
    contractDuration: '',
    startDatePlan: '',
    endDatePlan: '',
    location: '',
    link: '',
    lokasi: '',
    employeer: 'PT. Telkom Indonesia',
    mainVendor: 'PT. Telkom Infra',
    pelaksana: ''
  });

  const [editFormData, setEditFormData] = useState({
    nomorKontrak: '',
    namaProject: '',
    contractSigned: '',
    contractValue: '',
    contractDuration: '',
    startDatePlan: '',
    endDatePlan: '',
    location: '',
    link: '',
    lokasi: '',
    employeer: '',
    mainVendor: '',
    pelaksana: ''
  });

  const [isUpdatingContract, setIsUpdatingContract] = useState<boolean>(false);
  const [isDeletingContract, setIsDeletingContract] = useState<boolean>(false);

  // State for merged contracts
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Update contracts when dependencies change
  // This combines both BOQ mapping logic and spans logic
  useEffect(() => {
    const mergedContracts = [...localContracts, ...apiContracts.map(apiContract => {
      const contractId = extractId(apiContract.id);
      const fetchedSpans = projectSpans[contractId] || [];

      // ✅ FIX: Resolve regional name from regionalsRecord using Thing reference ID
      const regionalId = apiContract.regional ? extractRegionalId(apiContract.regional) : null;
      const regionalName = regionalId && regionalsRecord[regionalId] ? regionalsRecord[regionalId] : '-';

      // ✅ FIX: Resolve witel name from witelsRecord using Thing reference ID
      const witelId = apiContract.witel ? extractRegionalId(apiContract.witel) : null;
      const witelName = witelId && witelsRecord[witelId] ? witelsRecord[witelId] : '-';

      console.log(`📍 [${apiContract.name}] regional: ${regionalId} → "${regionalName}" | witel: ${witelId} → "${witelName}"`);

      // Map boq_planned from API to BOQItem format expected by TabBOQ
      const boqItems = (apiContract.boq_planned || [])
        .map((item: any, index: number) => {
          // Extract ID from the nested structure
          const itemId = typeof item.id === 'object' && item.id?.id
            ? (typeof item.id.id === 'string' ? item.id.id : item.id.id?.String)
            : (typeof item.id === 'string' ? item.id : String(item.id));

          return {
            id: itemId,
            no: item.no || (index + 1),
            designator: item.designator || '',
            uraianPekerjaan: item.uraian_pekerjaan || '',
            satuan: item.satuan || 'meter',
            material: String(item.harga_satuan_material || 0),
            jasa: String(item.harga_satuan_jasa || 0),
            drm: String(item.drm || 0),
            actual: String(item.planned || 0), // Backend uses 'planned' field
            tambah: String(item.tambah || 0),
            kurang: String(item.kurang || 0)
          };
        })
        .sort((a, b) => a.no - b.no); // Sort by 'no' field ascending

      return {
        id: contractId,
        nomorKontrak: apiContract.no_kontrak,
        namaProject: apiContract.name,
        contractSigned: apiContract.contract_signed,
        contractValue: apiContract.contract_value,
        contractDuration: apiContract.contract_duration,
        startDatePlan: apiContract.start_date_plan,
        endDatePlan: apiContract.end_date_plan,
        location: witelName,   // ✅ FIX: resolve witel name
        link: '', // Deprecated - now using links array
        lokasi: regionalName,  // ✅ FIX: resolve regional name
        employeer: apiContract.employeer || '',
        mainVendor: apiContract.main_vendor || '',
        pelaksana: apiContract.pelaksana || '',
        boqItems: boqItems, // Include mapped and sorted BOQ items from backend
        boqFileName: apiContract.boq_id || '',
        kmlFileName: apiContract.kml_path || '',
        kmlFileContent: '',
        spans: fetchedSpans.map(s => s.name), // Span names for display
        spanObjects: fetchedSpans, // Full span objects with IDs
        createdAt: apiContract.created_at
      };
    })];

    // Sort contracts by created_at descending (newest first)
    const sortedContracts = mergedContracts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    setContracts(sortedContracts);
  }, [localContracts, apiContracts, projectSpans, regionalsRecord, witelsRecord]);

  // Load local contracts on mount
  useEffect(() => {
    const loadedContracts = getContractsFromStorage();
    setLocalContracts(loadedContracts);
    console.log('📦 Loaded contracts from localStorage:', loadedContracts);
  }, []);

  // Get selected contract
  const selectedContract = contracts.find(c => c.id === selectedContractId);

  // Fetch KML data when contract is selected
  useEffect(() => {
    const fetchKMLData = async () => {
      if (!selectedContractId) {
        setKmlData(null);
        return;
      }

      setIsLoadingKML(true);
      try {
        console.log('📥 Fetching KML data for project:', selectedContractId);
        const data = await getProjectKMLFiles(selectedContractId, token);
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
  }, [selectedContractId, token]);

  // Fetch Documents data when contract is selected
  useEffect(() => {
    const fetchDocumentsData = async () => {
      if (!selectedContractId) {
        setDocumentsData(null);
        return;
      }

      setIsLoadingDocuments(true);
      try {
        console.log('📥 Fetching Documents data for project:', selectedContractId);
        const data = await getProjectDocuments(selectedContractId, token);
        console.log('✅ Documents data fetched:', data);
        setDocumentsData(data);
      } catch (error) {
        console.error('❌ Error fetching Documents data:', error);
        // Set empty data structure on error
        setDocumentsData({
          project_id: selectedContractId,
          project_name: '',
          documents: {
            kml: [],
            kml_actual: [],
            field_evidence: [],
            kom_document: [],
            other_document_project: [],
            other_document_kom: []
          }
        });
      } finally {
        setIsLoadingDocuments(false);
      }
    };

    fetchDocumentsData();
  }, [selectedContractId]);

  // Fetch KOM data when contract is selected
  useEffect(() => {
    const fetchKOMData = async () => {
      if (!selectedContractId || !token) {
        setKomList([]);
        return;
      }

      setLoadingKOM(true);
      try {
        console.log('📥 Fetching KOM data for project:', selectedContractId);
        const allKOMs = await komService.getAllKOMs(token);
        // Filter KOMs for this project
        const projectKOMs = allKOMs.filter((kom: KOM) => {
          const komProjectId = extractId(kom.project_id);
          return komProjectId === selectedContractId;
        });
        console.log('✅ KOM data fetched:', projectKOMs);
        setKomList(projectKOMs);
      } catch (error) {
        console.error('❌ Error fetching KOM data:', error);
        setKomList([]);
      } finally {
        setLoadingKOM(false);
      }
    };

    fetchKOMData();
  }, [selectedContractId, token]);

  // Log selected contract for debugging
  if (selectedContract && selectedContractId) {
    console.log('📌 Selected contract:', selectedContract.namaProject);
    console.log('  Contract ID:', selectedContract.id);
    console.log('  BOQ Items count:', selectedContract.boqItems?.length || 0);
    if (selectedContract.boqItems && selectedContract.boqItems.length > 0) {
      console.log('  First BOQ item:', selectedContract.boqItems[0]);
    }
  }

  // Auto scroll to tab content when KML tab is opened and has file
  useEffect(() => {
    if (activeTab === 'kml' && selectedContract?.kmlFileContent && tabContentRef.current) {
      const timer = setTimeout(() => {
        tabContentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedContract?.kmlFileContent]);

  // Helper function to extract ID from various formats
  const extractIdFromResponse = (id: any): string => {
    if (typeof id === 'object' && id !== null) {
      const idObj = id as any;
      // Handle format: {tb: "span", id: "abc123"} or {tb: "span", id: {String: "abc"}}
      if ('id' in idObj) {
        const innerId = idObj.id;
        // Check if inner id is also an object
        if (typeof innerId === 'object' && innerId !== null) {
          if ('String' in innerId) {
            return innerId.String;
          }
          return String(innerId);
        }
        return String(innerId);
      } else if ('String' in idObj) {
        return idObj.String;
      }
    }
    return String(id);
  };

  // Helper function to download file (handles images properly)
  const handleDownloadFile = async (filePath: string) => {
    try {
      const url = `http://127.0.0.1:8080/${filePath}`;

      // Get file extension
      const extension = filePath.split('.').pop()?.toLowerCase();

      // For images, fetch as blob to force download
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
        const response = await fetch(url);
        const blob = await response.blob();

        // Create blob URL and download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filePath.split('/').pop() || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // For other files, use standard download
        const link = document.createElement('a');
        link.href = url;
        link.download = filePath.split('/').pop() || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: open in new tab
      window.open(`http://127.0.0.1:8080/${filePath}`, '_blank');
    }
  };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;

    setIsDeletingContract(true);

    try {
      const { deleteProject } = await import('@/services/contractService');
      const { authService } = await import('@/services/authService');

      const token = authService.getToken();

      console.log('🗑️ Deleting project:', {
        projectId: contractToDelete.id,
        hasToken: !!token
      });

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Delete from API
      await deleteProject(contractToDelete.id, token);
      console.log('✅ Contract deleted from API:', contractToDelete.id);

      if (selectedContractId === contractToDelete.id) {
        setSelectedContractId(null);
      }

      setShowDeleteModal(false);
      setContractToDelete(null);

      // Refresh contracts list
      console.log('🔄 Refreshing contracts list...');
      await fetchContracts();

      showToast('Project deleted successfully!', 'success');
    } catch (error) {
      console.error('❌ Error deleting contract:', error);
      setShowDeleteModal(false);
      setContractToDelete(null);

      let errorMessage = 'Failed to delete project';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast(`Failed to delete project: ${errorMessage}`, 'error');
    } finally {
      setIsDeletingContract(false);
    }
  };

  const handleSpanAdded = async (_spanData: any) => {
    // Refresh contracts list after span is added
    await fetchContracts();

    setShowAddSpanModal(false);
    setContractForSpan(null);
  };

  const handleSpanCreated = async () => {
    // Refresh contracts list after span is created
    await fetchContracts();

    // Fetch spans for the project
    if (projectForSpan) {
      try {
        console.log('🔄 Fetching spans for project:', projectForSpan);
        const spans = await spanService.getSpansByProjectId(projectForSpan);
        console.log('✅ Spans fetched:', spans);

        // Update projectSpans state with full span objects
        const mappedSpans = spans.map(span => {
          const extractedId = extractIdFromResponse(span.id);
          console.log('🔍 Span (after create):', span.span_name, 'Raw ID:', span.id, 'Extracted ID:', extractedId);
          return {
            id: extractedId,
            name: span.span_name
          };
        });

        console.log('💾 Storing spans after create for project', projectForSpan, ':', mappedSpans);

        setProjectSpans(prev => ({
          ...prev,
          [projectForSpan]: mappedSpans
        }));
      } catch (error) {
        console.error('❌ Failed to fetch spans:', error);
        showToast(`Failed to load spans: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }

    setShowCreateSpanModal(false);
    setProjectForSpan(null);
  };

  // KOM Handlers
  const loadKOMsForProject = async () => {
    if (!selectedContractId || !token) return;

    try {
      setLoadingKOM(true);
      const allKOMs = await komService.getAllKOMs(token);
      const projectKOMs = allKOMs.filter((kom: KOM) => {
        const komProjectId = extractId(kom.project_id);
        return komProjectId === selectedContractId;
      });
      setKomList(projectKOMs);
    } catch (error: any) {
      console.error('Failed to load KOMs:', error);
      showToast(error.message || 'Failed to load KOMs', 'error');
    } finally {
      setLoadingKOM(false);
    }
  };

  // Helper function to format datetime for SurrealDB
  // SurrealDB expects format: "2026-02-07T14:57:44Z" (without microseconds)
  const formatDateTimeForSurrealDB = (dateString: string): string => {
    const date = new Date(dateString);
    // Get ISO string and remove microseconds
    const isoString = date.toISOString();
    // Remove milliseconds: "2026-02-07T14:57:44.978Z" -> "2026-02-07T14:57:44Z"
    return isoString.replace(/\.\d{3}Z$/, 'Z');
  };

  const handleCreateKOM = async (formData: KOMFormData) => {
    if (!token || !selectedContractId) {
      showToast('Missing authentication or project information', 'error');
      return;
    }

    try {
      setUploadingKOM(true);

      let momFilePath: string | null = null;
      let otherDocsFilePaths: string[] = [];

      if (formData.komMomFile) {
        const momResponse = await komService.uploadKOMMoM(formData.komMomFile, token);
        momFilePath = momResponse.file_path;
      }

      if (formData.otherDocsFiles.length > 0) {
        const docsResponse = await komService.uploadKOMDocs(formData.otherDocsFiles, token);
        otherDocsFilePaths = docsResponse.file_paths;
      }

      const createData: CreateKOMRequest = {
        project_id: selectedContractId,
        project_name: selectedContract?.namaProject || '',
        kom_start_date: formatDateTimeForSurrealDB(formData.komStartDate),
        kom_end_date: formatDateTimeForSurrealDB(formData.komEndDate),
        kom_venue: formData.komVenue || null,
        kom_mom_file: momFilePath,
        other_docs_files: otherDocsFilePaths,
        remarks: formData.remarks,
        status: 'completed',
      };

      await komService.createKOM(createData, token);
      showToast('KOM created successfully!', 'success');
      setIsCreateKOMModalOpen(false);
      loadKOMsForProject();
    } catch (error: any) {
      console.error('Failed to create KOM:', error);
      showToast(error.message || 'Failed to create KOM', 'error');
    } finally {
      setUploadingKOM(false);
    }
  };

  const handleEditKOM = async (id: string, formData: KOMFormData) => {
    if (!token) {
      showToast('Missing authentication', 'error');
      return;
    }

    try {
      setUploadingKOM(true);

      const existingKOM = komList.find(k => extractId(k.id) === id);
      if (!existingKOM) {
        throw new Error('KOM not found');
      }

      let momFilePath = existingKOM.kom_mom_file;
      let otherDocsFilePaths = existingKOM.other_docs_files;

      if (formData.komMomFile) {
        const momResponse = await komService.uploadKOMMoM(formData.komMomFile, token);
        momFilePath = momResponse.file_path;
      }

      if (formData.otherDocsFiles.length > 0) {
        const docsResponse = await komService.uploadKOMDocs(formData.otherDocsFiles, token);
        otherDocsFilePaths = docsResponse.file_paths;
      }

      const updateData: UpdateKOMRequest = {
        project_name: formData.projectName,
        kom_start_date: formatDateTimeForSurrealDB(formData.komStartDate),
        kom_end_date: formatDateTimeForSurrealDB(formData.komEndDate),
        kom_venue: formData.komVenue || null,
        kom_mom_file: momFilePath,
        other_docs_files: otherDocsFilePaths,
        remarks: formData.remarks,
        status: 'completed',
      };

      await komService.updateKOM(id, updateData, token);
      showToast('KOM updated successfully!', 'success');
      setIsEditKOMModalOpen(false);
      setSelectedKOM(null);
      loadKOMsForProject();
    } catch (error: any) {
      console.error('Failed to update KOM:', error);
      showToast(error.message || 'Failed to update KOM', 'error');
    } finally {
      setUploadingKOM(false);
    }
  };

  const handleDeleteKOM = async (id: string) => {
    if (!token) {
      showToast('Missing authentication', 'error');
      return;
    }

    try {
      await komService.deleteKOM(id, token);
      showToast('KOM deleted successfully!', 'success');
      setIsDeleteKOMModalOpen(false);
      setSelectedKOM(null);
      loadKOMsForProject();
    } catch (error: any) {
      console.error('Failed to delete KOM:', error);
      showToast(error.message || 'Failed to delete KOM', 'error');
    }
  };

  const parseExcelBOQ = async (file: File) => {
    try {
      console.log('📄 Parsing Excel file:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        showToast('No worksheet found in Excel file', 'error');
        return;
      }

      // Convert worksheet to array of arrays
      const excelData: any[][] = [];
      worksheet.eachRow((row) => {
        const rowValues: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowValues[colNumber - 1] = cell.value;
        });
        excelData.push(rowValues);
      });

      console.log('📊 Total rows in Excel:', excelData.length);

      // Map Excel data to BOQ items
      const boqData = mapExcelToBOQDetails(excelData);

      if (boqData.length === 0) {
        showToast('No BOQ data found in the Excel file. Please check the file format.', 'warning');
      } else {
        setBOQItems(boqData);
        console.log(`✅ Loaded ${boqData.length} BOQ items`);
      }
    } catch (error) {
      console.error('Error parsing Excel:', error);
      showToast(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Function to map Excel data to BOQ form fields
  const mapExcelToBOQDetails = (excelData: any[]): BOQItem[] => {
    if (!excelData || excelData.length <= 1) return [];

    console.log('📊 Processing Excel data, total rows:', excelData.length);

    // Available unit options
    const unitOptions = ['meter', 'pcs', 'unit', 'set', 'core', 'ls', 'lsnd'];

    // Find the header row that contains "DESIGNATOR" or "URAIAN PEKERJAAN"
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, excelData.length); i++) {
      const row = excelData[i];
      if (!Array.isArray(row)) continue;

      const rowStr = row.map(cell => String(cell || '').trim().toUpperCase()).join('|');
      if (rowStr.includes('DESIGNATOR') || rowStr.includes('URAIAN PEKERJAAN')) {
        headerRowIndex = i;
        console.log('📍 Found header row at index:', i);
        break;
      }
    }

    // If no header found, start from row 0
    const startSearchIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    console.log('🔍 Starting data search from row:', startSearchIndex);

    // Pattern untuk mendeteksi designator yang valid - SANGAT FLEKSIBEL
    // Menerima format: DC-OF-SM-48C, AC-OF-SM-48D, SC-OF-SM-24, OS-SM-1, ODC-C-48, TC-SM-24, dll
    // Termasuk format dengan angka desimal seperti: PU-S7.0-140, PU-S9.0-140
    // Dan format khusus seperti: BCTR-KHUSUS (KH)-0,8 (dengan spasi dan tanda kurung)
    const designatorPattern = /^[A-Z0-9]+-[A-Z0-9-.,\s()]+$/i;

    const boqItems: BOQItem[] = [];
    let rowIndex = 0;
    const skippedRows: any[] = [];

    // Iterate through all rows starting from after header
    for (let i = startSearchIndex; i < excelData.length; i++) {
      const row = excelData[i];

      // Skip non-array or completely empty rows
      if (!Array.isArray(row) || row.every(cell => cell === undefined || cell === null || cell === '')) {
        continue;
      }

      // Map the Excel columns based on the structure:
      // Column 0: NO
      // Column 1: DESIGNATOR
      // Column 2: URAIAN PEKERJAAN
      // Column 3: SATUAN
      // Column 4: HARGA SATUAN - Material
      // Column 5: HARGA SATUAN - Jasa
      // Column 6: DRM
      // Column 7: ACTUAL
      // Column 8: TAMBAH
      // Column 9: KURANG

      const no = row[0];
      const designator = row[1];
      const uraian = row[2];
      const satuan = row[3];
      const material = row[4];
      const jasa = row[5];

      // DRM, ACTUAL, TAMBAH, KURANG
      const drm = row[6];
      const actual = row[7];
      const tambah = row[8];
      const kurang = row[9];

      const designatorStr = String(designator || '').trim();
      const uraianStr = String(uraian || '').trim();
      const noStr = String(no || '').trim();
      const satuanStr = String(satuan || '').trim().toLowerCase();

      // Skip jika ini adalah header row
      const rowStrUpper = [noStr, designatorStr, uraianStr].join('|').toUpperCase();
      if (rowStrUpper.includes('DESIGNATOR') || rowStrUpper.includes('URAIAN PEKERJAAN') || rowStrUpper.includes('SATUAN')) {
        console.log(`⏭️ Row ${i + 1}: Skipping header row`);
        continue;
      }

      // Skip jika ini adalah section header (contoh: "A", "B", "C" dengan uraian panjang tapi tanpa designator)
      // Section header biasanya punya NO berupa huruf tunggal dan tidak punya designator
      if (noStr.length === 1 && isNaN(Number(noStr)) && !designatorStr) {
        console.log(`⏭️ Row ${i + 1}: Skipping section header: ${noStr} - ${uraianStr.substring(0, 30)}`);
        continue;
      }

      // Skip jika tidak ada designator DAN tidak ada uraian (row kosong)
      if (!designatorStr && !uraianStr) {
        continue;
      }

      // Skip jika designator kosong tapi uraian berisi text panjang tanpa satuan/material/jasa
      // Ini biasanya section header yang tidak punya NO
      if (!designatorStr && uraianStr && !satuanStr && !material && !jasa && !drm) {
        console.log(`⏭️ Row ${i + 1}: Skipping section header (no designator): ${uraianStr.substring(0, 30)}`);
        continue;
      }

      // VALIDASI: Harus punya designator yang valid dengan format yang benar
      const hasValidDesignator = designatorStr && designatorPattern.test(designatorStr);

      // Jika tidak ada designator yang valid, log dan skip
      if (!hasValidDesignator) {
        console.log(`⏭️ Row ${i + 1}: Invalid designator format: "${designatorStr}" | Uraian: ${uraianStr.substring(0, 30)}`);
        skippedRows.push({ row: i + 1, designator: designatorStr, uraian: uraianStr.substring(0, 50) });
        continue;
      }

      // Skip summary rows (rows dengan nilai tapi tanpa uraian yang jelas)
      if (!uraianStr && (material || jasa || drm)) {
        console.log(`⏭️ Row ${i + 1}: Skipping summary row`);
        continue;
      }

      // PENTING: Jangan skip jika tidak ada satuan, karena beberapa item mungkin tidak punya satuan di Excel
      // Kita akan set default 'meter' nanti

      // Clean and validate the unit
      let unit = 'meter'; // default

      if (satuanStr) {
        // Map common unit names to the standard options
        if (unitOptions.includes(satuanStr)) {
          unit = satuanStr;
        } else if (satuanStr === 'pcs' || satuanStr === 'unit') {
          unit = 'pcs';
        } else {
          // Jika satuan tidak dikenali, coba deteksi dari uraian
          const uraianLower = uraianStr.toLowerCase();
          if (uraianLower.includes('meter') || uraianLower.includes('kabel')) {
            unit = 'meter';
          } else if (uraianLower.includes('pcs') || uraianLower.includes('unit') || uraianLower.includes('buah')) {
            unit = 'pcs';
          } else if (uraianLower.includes('core')) {
            unit = 'core';
          } else {
            console.log(`⚠️ Row ${i + 1}: Unknown unit "${satuanStr}", using default "meter"`);
            unit = 'meter';
          }
        }
      } else {
        // Jika tidak ada satuan, coba deteksi dari uraian pekerjaan
        const uraianLower = uraianStr.toLowerCase();
        if (uraianLower.includes('meter') || uraianLower.includes('kabel')) {
          unit = 'meter';
        } else if (uraianLower.includes('pcs') || uraianLower.includes('unit') || uraianLower.includes('buah')) {
          unit = 'pcs';
        } else if (uraianLower.includes('core')) {
          unit = 'core';
        } else if (uraianLower.includes('set')) {
          unit = 'set';
        } else {
          console.log(`⚠️ Row ${i + 1}: No unit found, using default "meter"`);
          unit = 'meter';
        }
      }

      // Parse numeric values - handle both number and string formats
      const parseNumber = (value: any): string => {
        if (value === undefined || value === null || value === '') return '0';
        const str = String(value).replace(/[^0-9.-]/g, '');
        return str || '0';
      };

      const parseMaterial = parseNumber(material);
      const parseJasa = parseNumber(jasa);
      const parseDRM = parseNumber(drm);
      const parseActual = parseNumber(actual);
      const parseTambah = parseNumber(tambah);
      const parseKurang = parseNumber(kurang);

      rowIndex++;

      const boqItem: BOQItem = {
        id: String(rowIndex),
        designator: designatorStr,
        uraianPekerjaan: uraianStr,
        satuan: unit,
        material: parseMaterial,
        jasa: parseJasa,
        drm: parseDRM,
        actual: parseActual,
        tambah: parseTambah,
        kurang: parseKurang,
        // keterangan: ''
      };

      console.log(`✅ Row ${i + 1}: ${designatorStr} - ${uraianStr.substring(0, 30)}...`);
      boqItems.push(boqItem);
    }

    console.log(`📦 Total BOQ items extracted: ${boqItems.length}`);

    if (skippedRows.length > 0) {
      console.log(`⚠️ Skipped ${skippedRows.length} rows with invalid designators:`);
      skippedRows.forEach(item => {
        console.log(`   Row ${item.row}: "${item.designator}" - ${item.uraian}`);
      });
    }

    return boqItems;
  };

  const handleBOQUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBOQFileName(file.name);
      setBOQFile(file);
      await parseExcelBOQ(file);
    }
  };

  const handleKMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setKMLFileName(file.name);
      setKMLFile(file);

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.kmz')) {
        // Handle KMZ file
        console.log('📦 Processing KMZ file...');
        try {
          const { extractKMLFromKMZ } = await import('@/utils/kmlToGeoJSON');
          const kmlString = await extractKMLFromKMZ(file);
          setKMLPreviewData(kmlString);
          console.log('✅ KMZ extracted successfully');
        } catch (error) {
          console.error('❌ Error extracting KMZ:', error);
          showToast('Failed to extract KMZ file. Please try again.', 'error');
        }
      } else if (fileName.endsWith('.kml')) {
        // Handle KML file
        console.log('📄 Processing KML file...');
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setKMLPreviewData(content);
        };
        reader.readAsText(file);
      } else {
        showToast('Please upload a KML or KMZ file', 'warning');
      }
    }
  };

  const handleKMLPreview = () => {
    if (kmlPreviewData) {
      setShowKMLPreview(true);
    }
  };

  const handleBOQDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBOQ(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setBOQFileName(file.name);
      setBOQFile(file);
      await parseExcelBOQ(file);
    }
  };

  const handleKMLDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingKML(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.kml') || file.name.endsWith('.kmz'))) {
      setKMLFileName(file.name);
      setKMLFile(file);

      // Check if file is KMZ (compressed) or KML (text)
      if (file.name.endsWith('.kmz')) {
        try {
          const { extractKMLFromKMZ } = await import('@/utils/kmlToGeoJSON');
          const kmlString = await extractKMLFromKMZ(file);
          setKMLPreviewData(kmlString);
          console.log('✅ KMZ extracted successfully');
        } catch (error) {
          console.error('❌ Error extracting KMZ:', error);
          showToast('Failed to extract KMZ file. Please try again.', 'error');
        }
      } else if (file.name.endsWith('.kml')) {
        // Handle KML file
        console.log('📄 Processing dropped KML file...');
        setKMLFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setKMLPreviewData(content);
        };
        reader.readAsText(file);
      } else {
        showToast('Please drop a KML or KMZ file', 'warning');
      }
    }
  };

  const handleAddBOQRow = () => {
    const newRow: BOQItem = {
      id: String(boqItems.length + 1),
      designator: '',
      uraianPekerjaan: '',
      satuan: 'Meter',
      material: '0',
      jasa: '0',
      drm: '0',
      actual: '0',
      tambah: '0',
      kurang: '0',
      // keterangan: ''
    };
    setBOQItems([...boqItems, newRow]);
  };

  const handleDeleteBOQRow = (id: string) => {
    setBOQItems(boqItems.filter(item => item.id !== id));
  };

  const handleBOQItemChange = (id: string, field: keyof BOQItem, value: string) => {
    setBOQItems(boqItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateContract = async () => {
    // Comprehensive validation for all required fields
    const requiredFields = [
      { field: 'namaProject', label: 'Project Name' },
      { field: 'nomorKontrak', label: 'No. Contract' },
      { field: 'contractSigned', label: 'Contract Signed' },
      { field: 'startDatePlan', label: 'Start Date' },
      { field: 'endDatePlan', label: 'End Date' },
      { field: 'employeer', label: 'Customer' },
      { field: 'mainVendor', label: 'Pelaksana' },
      { field: 'lokasi', label: 'Region' },
      { field: 'location', label: 'Location' }
    ];

    const emptyFields = requiredFields.filter(({ field }) => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData].trim() === '');

    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(f => f.label).join(', ');
      showToast(`Please fill in all required fields: ${fieldNames}`, 'warning');
      return;
    }

    // Validate SS/Links - at least one link must be filled
    const validLinks = ssLinks.filter(link => link.link_name && link.link_name.trim() !== '');

    if (validLinks.length === 0) {
      showToast('Please add at least one SS/Link', 'warning');
      return;
    }

    // Validate that each filled SS/Link has a KML file uploaded
    const linksWithoutKML = validLinks.filter(link => !link.kml_file);

    if (linksWithoutKML.length > 0) {
      const linkNames = linksWithoutKML.map(link => link.link_name).join(', ');
      showToast(`Please upload KML file for: ${linkNames}`, 'warning');
      return;
    }

    setIsCreatingContract(true);

    try {
      // Import services
      const { mapBOQItemToBackend, uploadFile } = await import('@/services/contractService');
      const { authService } = await import('@/services/authService');

      const token = authService.getToken();
      console.log('🔑 Token available:', !!token);

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      let boqFilePath: string | undefined;
      let kmlFilePath: string | undefined;

      // Step 1: Upload BOQ file if exists
      if (boqFile) {
        console.log('📤 Step 1: Uploading BOQ file...');
        try {
          const boqUploadResult = await uploadFile(boqFile, 'boq_planned', token);
          boqFilePath = boqUploadResult.file_path;
          console.log('✅ BOQ uploaded:', boqFilePath);
        } catch (error) {
          console.error('❌ BOQ upload failed:', error);
          throw new Error(`BOQ upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 1.5: Upload Contract Document if exists
      let contractDocumentMetadata: any = undefined;
      const contractDocFile = (formData as any).contractDocFile;
      if (contractDocFile) {
        console.log('📤 Step 1.5: Uploading Contract Document...');
        try {
          const contractUploadResult = await uploadFile(contractDocFile, 'contract_document', token);
          contractDocumentMetadata = {
            file_path: contractUploadResult.file_path,
            file_name: contractUploadResult.file_name || contractDocFile.name,
            file_type: contractUploadResult.file_type || contractDocFile.type,
            file_size: contractUploadResult.file_size || contractDocFile.size,
            keterangan: 'Contract document',
            status: 'approved'
          };
          console.log('✅ Contract document uploaded:', contractUploadResult.file_path);
        } catch (error) {
          console.error('❌ Contract document upload failed:', error);
          throw new Error(`Contract document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 1.6: Upload Other Documents if exists
      let otherDocumentsMetadata: any[] = [];
      const otherDocsData = (formData as any).otherDocsData;
      if (otherDocsData && otherDocsData.length > 0) {
        console.log(`📤 Step 1.6: Uploading ${otherDocsData.length} Other Documents...`);
        for (const doc of otherDocsData) {
          try {
            const otherUploadResult = await uploadFile(doc.file, 'other_document_project', token);
            otherDocumentsMetadata.push({
              file_path: otherUploadResult.file_path,
              file_name: otherUploadResult.file_name || doc.file.name,
              file_type: otherUploadResult.file_type || doc.file.type,
              file_size: otherUploadResult.file_size || doc.file.size,
              title: doc.title || null, // User-provided title or null
              keterangan: doc.title || 'Other project document',
              status: 'approved'
            });
            console.log(`✅ Other document uploaded: ${doc.fileName}`);
          } catch (error) {
            console.error(`❌ Other document upload failed for ${doc.fileName}:`, error);
            throw new Error(`Other document upload failed for ${doc.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Helper function to validate if string is a valid ID format
      const isValidId = (value: string | null | undefined): boolean => {
        if (!value) return false;
        // Valid ID should be alphanumeric without spaces or special chars (except colon for prefix)
        return /^[a-zA-Z0-9:_-]+$/.test(value) && value.length > 5;
      };

      // ✅ FIX: Check if we have valid regional & witel for links
      const hasValidRegionalWitel = isValidId(formData.lokasi) && isValidId(formData.location);

      console.log('🔍 Regional/Witel Validation:');
      console.log('  formData.lokasi (Regional):', formData.lokasi);
      console.log('  formData.location (Witel):', formData.location);
      console.log('  isValidId(lokasi):', isValidId(formData.lokasi));
      console.log('  isValidId(location):', isValidId(formData.location));
      console.log('  hasValidRegionalWitel:', hasValidRegionalWitel);

      if (!hasValidRegionalWitel) {
        // ❌ CRITICAL: Regional and Witel are REQUIRED at link level
        throw new Error('Regional and Witel are required. Please select valid Regional and Witel from the dropdowns.');
      }

      // Step 2: Upload KML files per SS/Link
      console.log('📤 Step 2: Uploading KML files per SS/Link...');
      const linksWithKML: any[] = [];

      for (let i = 0; i < ssLinks.length; i++) {
        const link = ssLinks[i];

        // Skip empty links
        if (!link.link_name || !link.link_name.trim()) {
          continue;
        }

        const linkData: any = {
          link_name: link.link_name.trim(),
          regional: formData.lokasi, // ✅ REQUIRED at link level
          witel: formData.location,   // ✅ REQUIRED at link level
          sub_pelaksana: link.sub_pelaksana || undefined,
          ss_contract_value: link.ss_contract_value || undefined
        };

        console.log(`📋 Link data for "${link.link_name}":`, {
          link_name: linkData.link_name,
          regional: linkData.regional,
          witel: linkData.witel,
          sub_pelaksana: linkData.sub_pelaksana,
          ss_contract_value: linkData.ss_contract_value
        });

        // Upload KML file if exists for this link
        if (link.kml_file) {
          console.log(`📤 Uploading KML for link "${link.link_name}"...`);
          try {
            const kmlUploadResult = await uploadFile(link.kml_file, 'kml_planned', token);

            // Add KML document to link
            linkData.kml_document = {
              file_path: kmlUploadResult.file_path,
              file_name: kmlUploadResult.file_name || link.kml_file.name,
              file_type: kmlUploadResult.file_type || 'application/vnd.google-earth.kml+xml',
              file_size: kmlUploadResult.file_size || link.kml_file.size,
              keterangan: `KML planned for ${link.link_name}`,
              status: 'approved'
            };

            console.log(`✅ KML uploaded for "${link.link_name}":`, kmlUploadResult.file_path);
          } catch (error) {
            console.error(`❌ KML upload failed for "${link.link_name}":`, error);
            throw new Error(`KML upload failed for "${link.link_name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        linksWithKML.push(linkData);
      }

      console.log('✅ All KML files uploaded. Links with KML:', linksWithKML);

      // Step 3: Prepare BOQ data (parsed from Excel)
      const boqData = boqItems.length > 0 ? mapBOQItemToBackend(boqItems) : undefined;
      console.log('📊 BOQ data prepared:', boqData?.length || 0, 'items');

      // Step 4: Create contract via API with uploaded file paths
      console.log('📝 Step 4: Creating contract...');

      // Convert date strings to ISO format if provided
      const contractSignedISO = formData.contractSigned ? new Date(formData.contractSigned).toISOString() : undefined;
      const startDatePlanISO = formData.startDatePlan ? new Date(formData.startDatePlan).toISOString() : undefined;
      const endDatePlanISO = formData.endDatePlan ? new Date(formData.endDatePlan).toISOString() : undefined;

      const requestPayload = {
        name: formData.namaProject,
        // ✅ FIX: Only send regional if it's a valid ID format, otherwise undefined
        regional: isValidId(formData.lokasi) ? formData.lokasi : undefined,
        // ✅ FIX: Only send witel if it's a valid ID format, otherwise undefined  
        witel: isValidId(formData.location) ? formData.location : undefined,
        region: formData.lokasi, // Legacy field (kept for compatibility)
        status: 'on_going', // ✅ FIX: Changed from 'Survey' to 'on_going'
        no_kontrak: formData.nomorKontrak,
        pelaksana: formData.pelaksana || undefined,
        employeer: formData.employeer || undefined,
        main_vendor: formData.mainVendor || undefined,
        contract_signed: contractSignedISO,
        contract_value: formData.contractValue || undefined,
        contract_duration: formData.contractDuration || undefined,
        start_date_plan: startDatePlanISO,
        end_date_plan: endDatePlanISO,
        // location is deprecated - now per-link as witel
        links: linksWithKML.length > 0 ? linksWithKML : undefined, // Send links with KML documents
        boq_id: boqFilePath,
        boq_data: boqData,
        contract_document: contractDocumentMetadata, // Contract document metadata
        other_documents: otherDocumentsMetadata.length > 0 ? otherDocumentsMetadata : undefined // Other documents metadata
      };

      console.log('📤 Request payload:', JSON.stringify(requestPayload, null, 2));

      const newApiContract = await createApiContract(requestPayload);

      console.log('✅ Contract created via API:', newApiContract);

      // Step 5: Get project ID
      const projectId = extractId(newApiContract.id);
      console.log('📌 Project ID:', projectId);

      // Step 6: Fetch project detail to get links (workaround for backend not returning links)
      console.log('🔄 Step 6: Fetching project detail to get links...');
      const projectDetail = await fetchContractById(projectId);
      console.log('✅ Project detail fetched:', projectDetail);

      // Get links from the fetched project detail
      const createdLinks = projectDetail.links || [];

      console.log('📋 Created links from project detail:', createdLinks);
      console.log(`📋 Total links to initialize: ${createdLinks.length}`);

      // Log each link detail for debugging
      if (createdLinks.length > 0) {
        createdLinks.forEach((link: any, index: number) => {
          console.log(`📋 Link ${index + 1}:`, {
            raw_id: link.id,
            extracted_id: extractId(link.id),
            link_name: link.link_name,
            sub_pelaksana: link.sub_pelaksana
          });
        });
      }

      if (createdLinks.length > 0) {
        console.log(`🚀 Starting BOQ detail initialization for ${createdLinks.length} links...`);

        // Initialize BOQ detail for each link sequentially
        for (let i = 0; i < createdLinks.length; i++) {
          const link = createdLinks[i];

          try {
            // Extract link ID from the response
            const linkId = extractId(link.id);

            // Get base URL from API config
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
            const initializeUrl = `${baseUrl}/links/${linkId}/boq-detail/initialize`;

            console.log(`\n📤 [${i + 1}/${createdLinks.length}] Initializing BOQ detail for link:`);
            console.log(`   - Link ID: ${linkId}`);
            console.log(`   - Link Name: ${link.link_name}`);
            console.log(`   - Base URL: ${baseUrl}`);
            console.log(`   - Full API URL: ${initializeUrl}`);

            // Call initialize BOQ detail API
            const response = await fetch(initializeUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            console.log(`   - Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`   ❌ API Error:`, errorData);
              throw new Error(errorData.error || `Failed to initialize BOQ detail for ${link.link_name}`);
            }

            const result = await response.json();
            console.log(`   ✅ BOQ detail initialized successfully:`, result);
            console.log(`   ✅ [${i + 1}/${createdLinks.length}] Completed for ${link.link_name}`);
          } catch (error) {
            console.error(`\n   ❌ Failed to initialize BOQ detail for ${link.link_name}:`, error);
            // Don't throw error, just log it - we don't want to fail the whole process
            showToast(`Warning: Failed to initialize BOQ detail for ${link.link_name}`, 'warning');
          }
        }

        console.log('\n✅ All BOQ detail initialization attempts completed');
        console.log(`✅ Successfully initialized ${createdLinks.length} links`);
      } else {
        console.warn('⚠️ No links found in project detail!');
        console.warn('⚠️ Project Detail:', projectDetail);
        console.warn('⚠️ Skipping BOQ detail initialization');
      }

      // Step 7: Refresh contracts list
      console.log('🔄 Step 7: Refreshing contracts list...');
      await fetchContracts();
      console.log('✅ Contracts list refreshed');

      // Step 8: Select the newly created contract
      console.log('📌 Step 8: Selecting contract:', projectId);
      setSelectedContractId(projectId);

      // Reset form
      setShowCreateModal(false);
      setFormData({
        nomorKontrak: '',
        namaProject: '',
        contractSigned: '',
        contractValue: '',
        contractDuration: '',
        startDatePlan: '',
        endDatePlan: '',
        location: '',
        link: '',
        lokasi: '',
        employeer: 'PT. Telkom Indonesia',
        mainVendor: 'PT. Telkom Infra',
        pelaksana: ''
      });
      setBOQItems([]);
      setBOQFileName('');
      setBOQFile(null);
      setKMLFileName('');
      setKMLFile(null);
      setKMLPreviewData('');
      setSSLinks([{ link_name: '', sub_pelaksana: '', ss_contract_value: '' }]); // Reset SS Links

      // Show success modal instead of alert
      setSuccessMessage('Project created successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Error creating contract:', error);
      // Show error modal instead of alert
      setSuccessMessage(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessModal(true);
    } finally {
      setIsCreatingContract(false);
    }
  };

  // Handler to open edit modal
  const handleEditProject = async (project: ProjectResponse) => {
    setEditingProject(project);
    setEditFormData({
      nomorKontrak: project.no_kontrak,
      namaProject: project.name,
      contractSigned: project.contract_signed ? new Date(project.contract_signed).toISOString().split('T')[0] : '',
      contractValue: project.contract_value || '',
      contractDuration: project.contract_duration || '',
      startDatePlan: project.start_date_plan ? new Date(project.start_date_plan).toISOString().split('T')[0] : '',
      endDatePlan: project.end_date_plan ? new Date(project.end_date_plan).toISOString().split('T')[0] : '',
      location: '', // Deprecated - moved to link table as witel
      link: '', // Deprecated - now using links array
      lokasi: '', // Deprecated - moved to link table as regional
      employeer: project.employeer || '',
      mainVendor: project.main_vendor || '',
      pelaksana: project.pelaksana || ''
    });

    // Fetch full project details including links with sub_pelaksana, ss_contract_value, and documents
    try {
      const projectId = extractId(project.id);
      const { getProjectById, getProjectDocuments } = await import('@/services/contractService');

      // Fetch project details and documents
      const [fullProject, documents] = await Promise.all([
        getProjectById(projectId, token),
        getProjectDocuments(projectId, token)
      ]);

      console.log('📋 [EDIT PROJECT] Full project data:', fullProject);
      console.log('📋 [EDIT PROJECT] Links:', fullProject.links);

      // Log each link's ss_contract_value for debugging
      fullProject.links?.forEach((link: any, index: number) => {
        console.log(`📋 [EDIT PROJECT] Link ${index + 1}:`, {
          link_name: link.link_name,
          sub_pelaksana: link.sub_pelaksana,
          ss_contract_value: link.ss_contract_value, // ✅ Check if this exists
          ss_status: link.ss_status
        });
      });

      // Store data in state
      setEditingProject(fullProject);
      setEditingProjectDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch project details:', error);
      showToast('Failed to load project details', 'error');
    }

    setShowEditModal(true);
  };

  // Handler to update contract
  const handleUpdateContract = async (
    updatedLinks: Array<{ id?: string; link_name: string; sub_pelaksana: string; ss_contract_value?: string }>, // ✅ ADD ss_contract_value
    contractDocFile: File | null,
    otherDocs: Array<{ fileName: string; title: string; file: File }>,
    deletedOtherDocIds: string[],
    existingContractDocId: string | null
  ) => {
    if (!editingProject) {
      console.error('❌ No project selected for editing');
      return;
    }

    // Validation
    if (!editFormData.nomorKontrak || !editFormData.namaProject || !editFormData.lokasi) {
      showToast('Nomor Kontrak, Nama Project, dan Region harus diisi!', 'warning');
      return;
    }

    setIsUpdatingContract(true);

    try {
      const { updateProject, updateLink, uploadFile, deleteProjectDocument } = await import('@/services/contractService');
      const { authService } = await import('@/services/authService');

      const token = authService.getToken();

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const projectId = extractId(editingProject.id);

      // Step 1: If uploading new contract document, delete existing one first (auto-replace)
      if (contractDocFile && existingContractDocId) {
        try {
          await deleteProjectDocument(projectId, existingContractDocId, token);
        } catch (error) {
          console.error('Failed to delete existing contract document:', error);
        }
      }

      // Step 2: Delete marked other documents
      if (deletedOtherDocIds.length > 0) {
        for (const docId of deletedOtherDocIds) {
          try {
            await deleteProjectDocument(projectId, docId, token);
          } catch (error) {
            console.error('Failed to delete document:', error);
          }
        }
      }

      // Step 3: Upload new contract document if provided
      if (contractDocFile) {
        try {
          const uploadResult = await uploadFile(contractDocFile, 'contract_document', token);

          await fetch(`http://127.0.0.1:8080/api/projects/${projectId}/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              file_path: uploadResult.file_path,
              file_name: uploadResult.file_name,
              file_type: uploadResult.file_type,
              file_size: uploadResult.file_size,
              file_category: 'contract_document',
              keterangan: 'Contract document',
              status: 'approved'
            })
          });
        } catch (error) {
          console.error('Failed to upload contract document:', error);
          throw new Error(`Contract document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 4: Upload new other documents if provided
      if (otherDocs.length > 0) {
        for (const doc of otherDocs) {
          try {
            const uploadResult = await uploadFile(doc.file, 'other_document_project', token);

            await fetch(`http://127.0.0.1:8080/api/projects/${projectId}/documents`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                file_path: uploadResult.file_path,
                file_name: uploadResult.file_name,
                file_type: uploadResult.file_type,
                file_size: uploadResult.file_size,
                file_category: 'other_document_project',
                title: doc.title || null,
                keterangan: doc.title || 'Other project document',
                status: 'approved'
              })
            });
          } catch (error) {
            console.error('Failed to upload document:', error);
          }
        }
      }

      // Step 5: Update project basic info
      const contractSignedISO = editFormData.contractSigned ? new Date(editFormData.contractSigned).toISOString() : undefined;
      const startDatePlanISO = editFormData.startDatePlan ? new Date(editFormData.startDatePlan).toISOString() : undefined;
      const endDatePlanISO = editFormData.endDatePlan ? new Date(editFormData.endDatePlan).toISOString() : undefined;

      const updatePayload = {
        name: editFormData.namaProject,
        region: editFormData.lokasi,
        no_kontrak: editFormData.nomorKontrak,
        pelaksana: editFormData.pelaksana || undefined,
        employeer: editFormData.employeer || undefined,
        main_vendor: editFormData.mainVendor || undefined,
        contract_signed: contractSignedISO,
        contract_value: editFormData.contractValue || undefined,
        contract_duration: editFormData.contractDuration || undefined,
        start_date_plan: startDatePlanISO,
        end_date_plan: endDatePlanISO,
        // location is deprecated - now per-link as witel
        link: editFormData.link || undefined,
      };

      const updatedProject = await updateProject(projectId, updatePayload, token);

      // Step 6: Update links with sub_pelaksana and ss_contract_value
      console.log('📝 [UPDATE LINKS] Updating links:', updatedLinks);
      for (const link of updatedLinks) {
        if (link.id) {
          try {
            console.log(`📝 [UPDATE LINK] Updating link ${link.link_name}:`, {
              link_name: link.link_name,
              sub_pelaksana: link.sub_pelaksana,
              ss_contract_value: link.ss_contract_value // ✅ LOG
            });

            await updateLink(link.id, {
              link_name: link.link_name,
              sub_pelaksana: link.sub_pelaksana,
              ss_contract_value: link.ss_contract_value // ✅ FIX: Include ss_contract_value
            }, token);

            console.log(`✅ [UPDATE LINK] Link ${link.link_name} updated successfully`);
          } catch (error) {
            console.error(`❌ [UPDATE LINK] Failed to update link ${link.link_name}:`, error);
          }
        }
      }

      // Step 7: Refresh contracts list
      await fetchContracts();

      // Step 8: Close modal and reset state
      setShowEditModal(false);
      setEditingProject(null);
      setEditingProjectDocuments(null);
      setEditFormData({
        nomorKontrak: '',
        namaProject: '',
        contractSigned: '',
        contractValue: '',
        contractDuration: '',
        startDatePlan: '',
        endDatePlan: '',
        location: '',
        link: '',
        lokasi: '',
        employeer: '',
        mainVendor: '',
        pelaksana: ''
      });

      showToast('Project updated successfully!', 'success');
    } catch (error) {
      console.error('❌ Error updating contract:', error);

      // More detailed error message
      let errorMessage = 'Failed to update project';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      showToast(`Failed to update project: ${errorMessage}`, 'error');
    } finally {
      setIsUpdatingContract(false);
    }
  };

  // Get unique values for dropdowns from actual project data
  const statusOptions = useMemo(() => {
    const statuses = new Set(projectTableData.map(row => row.status).filter(Boolean));
    return ['All Status', ...Array.from(statuses)];
  }, [projectTableData]);

  // Helper function to format status label for display
  const formatStatusLabel = (status: string) => {
    if (status === 'All Status') return status;
    if (status === 'on_going') return 'On Going';
    if (status === 'survey') return 'Survey';
    if (status === 'completed') return 'Completed';
    if (status === 'pending') return 'Pending';
    if (status === 'inactive') return 'Inactive';
    return status;
  };

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    return projectTableData.filter(project => {
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch =
          project.no_kontrak?.toLowerCase().includes(searchLower) ||
          project.name?.toLowerCase().includes(searchLower) ||
          // regional and witel are now per-link, not per-project
          project.pelaksana?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Status filter
      if (selectedStatus && selectedStatus !== 'All Status') {
        if (project.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [projectTableData, searchText, selectedStatus]);

  // Handler to open delete confirmation modal
  const handleDeleteClick = (project: ProjectResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    // Convert ProjectResponse to Contract format for modal
    const contractForDelete: Contract = {
      id: extractId(project.id),
      nomorKontrak: project.no_kontrak,
      namaProject: project.name,
      contractSigned: project.contract_signed,
      contractValue: project.contract_value,
      contractDuration: project.contract_duration,
      startDatePlan: project.start_date_plan,
      endDatePlan: project.end_date_plan,
      location: '', // Deprecated - moved to link table as witel
      link: '', // Deprecated - now using links array
      lokasi: '', // Deprecated - moved to link table as regional
      pelaksana: project.pelaksana || '',
      boqItems: [],
      boqFileName: project.boq_id || '',
      kmlFileName: project.kml_path || '',
      kmlFileContent: '',
      spans: [],
      createdAt: project.created_at
    };

    setContractToDelete(contractForDelete);
    setShowDeleteModal(true);
  };

  // Handler to open edit modal
  const handleEditClick = (project: ProjectResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    handleEditProject(project);
  };

  // Handler to download single project
  const handleDownloadProject = async (project: ProjectResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const projectId = extractId(project.id);
      showToast('Preparing project download...', 'info');

      // Create a new JSZip instance
      const zip = new JSZip();

      // Add project data as JSON
      const projectData = {
        id: project.id,
        name: project.name,
        no_kontrak: project.no_kontrak,
        // regional and witel are now per-link, not per-project
        status: project.status,
        contract_value: project.contract_value,
        contract_signed: project.contract_signed,
        contract_duration: project.contract_duration,
        start_date: project.start_date_plan,
        end_date: project.end_date_plan,
        // location is deprecated - now per-link as witel
        employeer: project.employeer,
        main_vendor: project.main_vendor,
        pelaksana: project.pelaksana,
        links_count: project.links?.length || 0,
        links: project.links || [],
        created_at: project.created_at
      };

      zip.file(`${project.name.replace(/[^a-z0-9]/gi, '_')}_data.json`, JSON.stringify(projectData, null, 2));

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${projectId}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Project "${project.name}" downloaded successfully`, 'success');
    } catch (error) {
      console.error('Error downloading project:', error);
      showToast('Failed to download project', 'error');
    }
  };

  // Handle row click to load project detail
  const handleRowClick = useCallback(async (project: ProjectResponse) => {
    const projectId = extractId(project.id);
    console.log('🖱️ Row clicked - Project ID:', projectId);

    // If already selected, just switch to detail view
    if (selectedContractId === projectId) {
      console.log('ℹ️ Project already selected, switching to detail view');
      setViewMode('detail');
      return;
    }

    try {
      setIsLoadingDetail(true);
      console.log('🔄 Loading project detail for:', projectId);

      // Hit API to get project detail with BOQ
      const projectDetail = await fetchContractById(projectId);
      console.log('✅ Project detail loaded:', projectDetail);

      // Set as selected contract and switch to detail view
      setSelectedContractId(projectId);
      setViewMode('detail');

      // Fetch spans for this project
      try {
        const spans = await spanService.getSpansByProjectId(projectId);
        const mappedSpans = spans.map(span => {
          const extractedId = extractIdFromResponse(span.id);
          return {
            id: extractedId,
            name: span.span_name
          };
        });

        setProjectSpans(prev => ({
          ...prev,
          [projectId]: mappedSpans
        }));

        console.log('✅ Loaded', mappedSpans.length, 'spans for project');
      } catch (error) {
        console.error('❌ Failed to load spans:', error);
      }

    } catch (error) {
      console.error('❌ Failed to load project detail:', error);
      setSuccessMessage(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessModal(true);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedContractId, fetchContractById]);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedContractId(null);
    setViewMode('list');
  }, []);

  return (
    <>
      <style>{slideAnimationStyles}</style>
      <div className="flex min-h-screen bg-[#FAFAFA] overflow-hidden">
        {/* Main Panel - Full Width */}
        <div className="flex-1 flex flex-col min-w-0">{/* Add min-w-0 to allow flex child to shrink */}
          {/* Page Header - Mockup Style (only in list view) */}
          {viewMode === 'list' && (
          <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
            <div className="flex justify-between items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">Portofolio</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Semua Project</h1>
                <p className="mt-1 text-sm text-gray-500">{filteredProjects.length} project · monitored</p>
              </div>
              <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        showToast('Preparing download...', 'info');
                        const allProjects = await getAllProjects(token);
                        const zip = new JSZip();
                        const summaryData = allProjects.map(project => ({ id: project.id, name: project.name, status: project.status, contract_value: project.contract_value, start_date: project.start_date_plan, end_date: project.end_date_plan, links_count: project.links?.length || 0 }));
                        zip.file('projects_summary.json', JSON.stringify(summaryData, null, 2));
                        const projectsFolder = zip.folder('projects');
                        allProjects.forEach((project, index) => { const projectId = extractId(project.id); const fileName = `${index + 1}_${project.name.replace(/[^a-z0-9]/gi, '_')}_${projectId}.json`; projectsFolder?.file(fileName, JSON.stringify(project, null, 2)); });
                        const zipBlob = await zip.generateAsync({ type: 'blob' });
                        const url = window.URL.createObjectURL(zipBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `all_projects_${new Date().toISOString().split('T')[0]}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        showToast(`Downloaded ${allProjects.length} projects successfully`, 'success');
                      } catch (error) { console.error('Error downloading projects:', error); showToast('Failed to download projects', 'error'); }
                    }}
                    className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-semibold hover:bg-[#1D4ED8] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Project</span>
                  </button>
                </div>
            </div>
          </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 min-w-0">{/* Add min-w-0 to allow flex child to shrink */}
            {/* Table - Show when viewMode is 'list' */}
            {viewMode === 'list' && (
              <div className="bg-transparent py-1 px-0 h-full overflow-y-auto overflow-x-hidden min-w-0 space-y-3">
                {/* Toolbar - Mockup Style */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari nama project atau nomor K.TEL…"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="h-9 w-full pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedStatus || 'All Status'} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-9 w-[140px] bg-white border-gray-200">
                        <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {formatStatusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex overflow-hidden rounded-lg border border-gray-200">
                      <button onClick={() => setDisplayView('list')} className={`flex h-9 w-9 items-center justify-center transition ${displayView === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                        <ListIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDisplayView('grid')} className={`flex h-9 w-9 items-center justify-center transition ${displayView === 'grid' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content - List or Grid */}
                {apiLoading || isLoadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <OrbitProgress color="#1f2937" size="medium" text="" textColor="" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200">
                    <div className="text-gray-400 text-lg mb-2">No projects available</div>
                    <div className="text-gray-500 text-sm">Try adjusting your filters or create a new project</div>
                  </div>
                ) : displayView === 'list' ? (
                  /* LIST VIEW - Mockup Style Table */
                  <div className="relative border border-gray-200 rounded-xl overflow-hidden min-w-0 bg-white">
                    <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                      <style>{`
                        .sticky-col-left { position: sticky; left: 0; z-index: 30; border-right: 1px solid #E5E7EB; }
                        .sticky-col-right { position: sticky; right: 0; z-index: 30; border-left: 1px solid #E5E7EB; }
                        thead .sticky-col-left, thead .sticky-col-right { background-color: #F8FAFC !important; }
                        tbody .sticky-col-left, tbody .sticky-col-right { background-color: #FFFFFF !important; }
                        tbody tr:hover .sticky-col-left, tbody tr:hover .sticky-col-right { background-color: #F8FAFC !important; }
                        .overflow-x-auto::-webkit-scrollbar { height: 8px; }
                        .overflow-x-auto::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                        .overflow-x-auto::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
                        .overflow-x-auto::-webkit-scrollbar-thumb:hover { background: #64748b; }
                      `}</style>
                      <table className="w-full text-sm text-left" style={{ minWidth: '1600px', tableLayout: 'auto' }}>
                        <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                          <tr>
                            <th className="sticky-col-left px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '220px' }}>Project</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '150px' }}>No. Kontrak</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '120px' }}>Region</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '140px' }}>Location</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '160px' }}>Customer</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '160px' }}>Pelaksana</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap text-right" style={{ minWidth: '110px' }}>Start Date</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap text-right" style={{ minWidth: '110px' }}>End Date</th>
                            <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ minWidth: '110px' }}>Status</th>
                            <th className="sticky-col-right px-5 py-3.5 text-[11px] uppercase tracking-wider font-semibold text-right whitespace-nowrap" style={{ minWidth: '130px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredProjects.map((project) => (
                            <tr
                              key={extractId(project.id)}
                              className="hover:bg-[#F8FAFC] transition cursor-pointer group"
                              onClick={() => handleRowClick(project)}
                            >
                              <td className="sticky-col-left px-5 py-3.5 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 group-hover:text-[#EF4444] leading-tight transition-colors">{project.name}</span>
                                  <span className="font-mono text-[11px] text-gray-400 leading-none mt-0.5">{project.no_kontrak}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap font-mono text-xs">{project.no_kontrak}</td>
                              <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                {(() => { const rId = project.regional ? extractRegionalId(project.regional) : null; return rId && regionalsRecord[rId] ? regionalsRecord[rId] : '-'; })()}
                              </td>
                              <td className="px-5 py-3.5 text-gray-500 text-xs capitalize whitespace-nowrap">
                                {(() => { const wId = project.witel ? extractRegionalId(project.witel) : null; return wId && witelsRecord[wId] ? witelsRecord[wId] : '-'; })()}
                              </td>
                              <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{project.employeer || '-'}</td>
                              <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{project.main_vendor || '-'}</td>
                              <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap text-right">
                                {project.start_date_plan ? new Date(project.start_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap text-right">
                                {project.end_date_plan ? new Date(project.end_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={project.status} /></td>
                              <td className="sticky-col-right px-5 py-3.5 text-right whitespace-nowrap">
                                <div className="flex justify-end gap-1.5 text-gray-400">
                                  <button className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded transition" title="Download" onClick={(e) => handleDownloadProject(project, e)}>
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button className="p-1.5 hover:text-orange-600 hover:bg-orange-50 rounded transition" title="Edit" onClick={(e) => handleEditClick(project, e)}>
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete" onClick={(e) => handleDeleteClick(project, e)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded transition" title="Detail">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* GRID VIEW - Card Layout */
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProjects.map((project) => {
                      const rId = project.regional ? extractRegionalId(project.regional) : null;
                      const regionalName = rId && regionalsRecord[rId] ? regionalsRecord[rId] : '-';
                      const wId = project.witel ? extractRegionalId(project.witel) : null;
                      const witelName = wId && witelsRecord[wId] ? witelsRecord[wId] : '-';
                      return (
                        <div
                          key={extractId(project.id)}
                          onClick={() => handleRowClick(project)}
                          className="flex flex-col p-5 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-gray-300 group"
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <StatusBadge status={project.status} />
                            <div className="flex gap-1.5 text-gray-400">
                              <button className="p-1 hover:text-gray-700 hover:bg-gray-100 rounded transition" onClick={(e) => handleDownloadProject(project, e)} title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 hover:text-orange-600 hover:bg-orange-50 rounded transition" onClick={(e) => handleEditClick(project, e)} title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition" onClick={(e) => handleDeleteClick(project, e)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="font-medium text-gray-900 leading-snug group-hover:text-[#EF4444] transition-colors line-clamp-2">{project.name}</p>
                          <p className="mt-1 font-mono text-[11px] text-gray-400">{project.no_kontrak}</p>
                          <div className="my-4 space-y-2 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 flex-shrink-0" />{regionalName} · {witelName}</div>
                            <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 flex-shrink-0" />{project.start_date_plan ? new Date(project.start_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} – {project.end_date_plan ? new Date(project.end_date_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          </div>
                          <div className="mt-auto space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Users className="h-3.5 w-3.5 flex-shrink-0" />{project.employeer || '-'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-600">Pelaksana:</span> {project.main_vendor || '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Project Detail and Tabs - Show when viewMode is 'detail' */}
            {viewMode === 'detail' && selectedContractId && (
              <div className="bg-transparent py-1 px-0 h-full overflow-y-auto min-w-0 space-y-3">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-24">
                    <OrbitProgress color="#1f2937" size="medium" text="" textColor="" />
                  </div>
                ) : (
                  <>
                    {/* Breadcrumb */}
                    <button
                      onClick={handleBackToList}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Projects
                    </button>

                    {/* Header: Title + Status + Doc Buttons */}
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {selectedContract ? selectedContract.namaProject : '-'}
                          </h1>
                          {selectedContract && (() => {
                            const project = apiContracts.find(p => extractId(p.id) === selectedContractId);
                            return project ? <StatusBadge status={project.status} /> : null;
                          })()}
                        </div>
                        <p className="mt-1 font-mono text-sm text-gray-400">
                          {selectedContract ? selectedContract.nomorKontrak : '-'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-[4px_4px_8px_rgba(163,177,198,0.3)] hover:bg-gray-800 transition-all">
                          <Download className="w-4 h-4" /> Project ZIP
                        </button>
                      </div>
                    </div>

                    {/* Overview Grid - 2/3 Info Panel + 1/3 Map Panel */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {/* Info Panel */}
                      <div className="lg:col-span-2 bg-white rounded-[10px] border border-gray-200 p-5">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                          {[
                            { label: 'Kontrak Signed', value: selectedContract?.contractSigned ? new Date(selectedContract.contractSigned).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-', icon: FileText },
                            { label: 'Durasi', value: selectedContract?.contractDuration || '-', icon: Calendar },
                            { label: 'Start', value: selectedContract?.startDatePlan ? new Date(selectedContract.startDatePlan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-', icon: Calendar },
                            { label: 'End', value: selectedContract?.endDatePlan ? new Date(selectedContract.endDatePlan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-', icon: Calendar },
                            { label: 'Region', value: selectedContract?.lokasi || '-', icon: MapPin },
                            { label: 'Customer', value: selectedContract?.employeer || '-', icon: Building2 },
                            { label: 'Pelaksana', value: selectedContract?.mainVendor || '-', icon: Building2 },
                          ].map((m) => (
                            <div key={m.label}>
                              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-gray-400">
                                <m.icon className="w-3 h-3" />{m.label}
                              </p>
                              <p className="mt-1.5 text-sm font-medium text-gray-900">{m.value}</p>
                            </div>
                          ))}
                          {/* Overall Progress */}
                          <div className="col-span-2 border-t border-gray-200 pt-4 sm:col-span-4">
                            <div className="mb-1.5 flex items-center justify-between">
                              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Overall Progress</p>
                              <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">—</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-[#EF4444]" style={{ width: '0%' }} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-gray-400">
                              <span><span className="text-gray-900">{selectedContract?.spans?.length || 0}</span> ruas</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Map Panel - Dark GIS Visualization */}
                      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden p-0">
                        <div className="h-[220px] relative w-full overflow-hidden bg-[#0a0e15]">
                          <svg className="absolute inset-0 h-full w-full opacity-[0.15]" preserveAspectRatio="none">
                            <defs>
                              <pattern id="detail-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                <path d="M32 0H0V32" fill="none" stroke="#3a4350" strokeWidth="0.5" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#detail-grid)" />
                          </svg>
                          <svg viewBox="0 0 620 340" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                            <path d="M30,210 C90,150 150,250 220,180 C290,120 330,200 400,150 C470,110 520,190 590,140" fill="none" stroke="#e4002b" strokeWidth="18" strokeLinecap="round" opacity="0.06" />
                            <path d="M30,210 C90,150 150,250 220,180 C290,120 330,200 400,150 C470,110 520,190 590,140" fill="none" stroke="#232b36" strokeWidth="10" strokeLinecap="round" />
                            <path d="M30,210 C90,150 150,250 220,180 C290,120 330,200 400,150 C470,110 520,190 590,140" fill="none" stroke="#e4002b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 5" />
                            {Array.from({ length: 9 }).map((_, i) => {
                              const t = i / 8;
                              const x = 30 + t * 560 + Math.sin(t * 9) * 6;
                              const y = 175 - Math.sin(t * 6.2) * 50 + (i % 2 ? 14 : -10);
                              const done = i < 6;
                              return (
                                <g key={i}>
                                  <circle cx={x} cy={y} r="7" fill={done ? '#e4002b' : '#0e1116'} stroke={done ? '#ff5a76' : '#4a5563'} strokeWidth="2" />
                                  {done && <circle cx={x} cy={y} r="2.5" fill="#fff" />}
                                </g>
                              );
                            })}
                          </svg>
                          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-1.5 backdrop-blur">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4002b]" />
                            <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">Live Route · GIS</span>
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-white/60">
                            <span>-6.2349, 106.8456</span>
                            <span>{selectedContract?.spans?.length || 0} TITIK TAGGED</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Sebaran Ruas</span>
                          <button className="text-xs font-medium text-gray-600 hover:underline">Buka GIS →</button>
                        </div>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mb-3 mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-900">Project Data</h2>
                      </div>
                      <div className="flex overflow-hidden rounded-lg border border-gray-200">
                        {(['kom', 'kml', 'document', 'sslink'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs font-semibold transition-colors ${
                              activeTab === tab
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            {tab === 'sslink' ? 'SS/LINK' : tab.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                  {/* Tab Content Area */}
                  <div className="p-6 bg-gray-50/30">
                    <div ref={tabContentRef}>
                      {selectedContract && (
                        <>
                          {activeTab === 'kml' && (
                            <div
                              key="kml"
                              style={{
                                animation: 'slideIn 0.3s ease-out'
                              }}
                            >
                              {isLoadingKML ? (
                                <div className="flex items-center justify-center py-12">
                                  <OrbitProgress
                                    color="#1f2937"
                                    size="medium"
                                    text=""
                                    textColor=""
                                  />
                                </div>
                              ) : (
                                <TabKML
                                  kmlFileName={selectedContract.kmlFileName}
                                  kmlFileContent={selectedContract.kmlFileContent}
                                  kmlPath={selectedContract.kmlFileName}
                                  kmlData={kmlData}
                                  projectId={selectedContract.id}
                                  onPreview={() => { }}
                                />
                              )}
                            </div>
                          )}

                          {activeTab === 'document' && (
                            <div
                              key="document"
                              style={{
                                animation: 'slideIn 0.3s ease-out'
                              }}
                            >
                              {(() => {
                                // Show loading state
                                if (isLoadingDocuments) {
                                  return (
                                    <div className="flex flex-col items-center justify-center py-12">
                                      <OrbitProgress color="#6b7280" size="medium" />
                                      <p className="text-gray-500 mt-4">Loading documents...</p>
                                    </div>
                                  );
                                }

                                // Get documents from API
                                const docs = documentsData?.documents || {};
                                const otherProjectDocs = docs.other_document_project || [];
                                const komDocs = docs.kom_document || [];

                                const totalDocs = otherProjectDocs.length + komDocs.length;

                                if (totalDocs === 0) {
                                  return (
                                    <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white">
                                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                      <div className="text-gray-400 text-lg mb-2">No documents available</div>
                                      <div className="text-gray-500 text-sm">Documents will appear here once uploaded</div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-6">
                                    {/* Contract Documents Section (from other_document_project) */}
                                    {otherProjectDocs.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-orange-600" />
                                          Contract Document
                                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                            {otherProjectDocs.length}
                                          </span>
                                        </h3>
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                              <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                                <tr>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '80px' }}>
                                                    No
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '300px' }}>
                                                    Document Name
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                    Type
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', minWidth: '120px' }}>
                                                    Action
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 bg-white/60">
                                                {otherProjectDocs.map((doc: any, idx: number) => (
                                                  <tr
                                                    key={extractId(doc.id)}
                                                    className="hover:bg-gray-50 transition"
                                                    style={{ fontFamily: 'inherit' }}
                                                  >
                                                    <td className="px-6 py-4 text-gray-600" style={{ fontFamily: 'inherit' }}>
                                                      {idx + 1}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                                                      {doc.file_name}
                                                    </td>
                                                    <td className="px-6 py-4" style={{ fontFamily: 'inherit' }}>
                                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200">
                                                        {doc.file_type}
                                                      </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                      <button
                                                        className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-medium transition flex items-center gap-1 ml-auto"
                                                        onClick={() => handleDownloadFile(doc.file_path)}
                                                      >
                                                        <Download className="w-3 h-3" />
                                                        Download
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Other Documents Section (from kom_document) */}
                                    {komDocs.length > 0 && (
                                      <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-gray-600" />
                                          Other Documents
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                                            {komDocs.length}
                                          </span>
                                        </h3>
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                              <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                                <tr>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '80px' }}>
                                                    No
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '300px' }}>
                                                    Document Name
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                    Type
                                                  </th>
                                                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', minWidth: '120px' }}>
                                                    Action
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 bg-white/60">
                                                {komDocs.map((doc: any, idx: number) => (
                                                  <tr
                                                    key={extractId(doc.id)}
                                                    className="hover:bg-gray-50 transition"
                                                    style={{ fontFamily: 'inherit' }}
                                                  >
                                                    <td className="px-6 py-4 text-gray-600" style={{ fontFamily: 'inherit' }}>
                                                      {idx + 1}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                                                      {doc.file_name}
                                                    </td>
                                                    <td className="px-6 py-4" style={{ fontFamily: 'inherit' }}>
                                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200">
                                                        {doc.file_type}
                                                      </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                      <button
                                                        className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-medium transition flex items-center gap-1 ml-auto"
                                                        onClick={() => handleDownloadFile(doc.file_path)}
                                                      >
                                                        <Download className="w-3 h-3" />
                                                        Download
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Summary */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                                      <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-800 font-medium">
                                          Total Documents: <span className="font-bold">{totalDocs}</span>
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {otherProjectDocs.length} Contract Document{otherProjectDocs.length !== 1 ? 's' : ''} • {komDocs.length} Other Document{komDocs.length !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {activeTab === 'kom' && (
                            <div
                              key="kom"
                              style={{
                                animation: 'slideIn 0.3s ease-out'
                              }}
                            >
                              {loadingKOM ? (
                                <div className="flex items-center justify-center py-12">
                                  <OrbitProgress
                                    color="#1f2937"
                                    size="medium"
                                    text=""
                                    textColor=""
                                  />
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Header with Add Button - Only show if no KOM exists */}
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700">
                                      KOM for this project
                                    </h3>
                                    {komList.length === 0 && (
                                      <button
                                        onClick={() => setIsCreateKOMModalOpen(true)}
                                        className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-sm font-semibold hover:bg-[#1D4ED8] transition-all flex items-center gap-2"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>Add KOM</span>
                                      </button>
                                    )}
                                  </div>

                                  {komList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white">
                                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                      <div className="text-gray-400 text-lg mb-2">No KOM available</div>
                                      <div className="text-gray-500 text-sm">Click "Add KOM" to create the first KOM for this project</div>
                                    </div>
                                  ) : komList.length === 1 ? (
                                    <>
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm text-left">
                                            <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                              <tr>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                                  Project Name
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                  Start Date
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                  End Date
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                                  Venue
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '100px' }}>
                                                  Status
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', minWidth: '140px' }}>
                                                  Action
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white/60">
                                              {komList.map((kom) => {
                                                const komId = extractId(kom.id);
                                                return (
                                                  <tr
                                                    key={komId}
                                                    className="hover:bg-gray-50 transition"
                                                    style={{ fontFamily: 'inherit' }}
                                                  >
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                                                      {kom.project_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                      {new Date(kom.kom_start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                      {new Date(kom.kom_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600" style={{ fontFamily: 'inherit' }}>
                                                      {kom.kom_venue || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200">
                                                        {kom.status}
                                                      </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                      <div className="flex justify-end gap-2 text-gray-400">
                                                        <button
                                                          className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded"
                                                          title="View"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsViewKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          className="p-1.5 hover:text-orange-600 hover:bg-orange-50 rounded"
                                                          title="Edit"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsEditKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded"
                                                          title="Delete"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsDeleteKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {/* Warning message - More than 1 KOM (should not happen) */}
                                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                          <p className="text-sm text-yellow-900 font-medium">
                                            Warning: Multiple KOM records found
                                          </p>
                                          <p className="text-xs text-yellow-700 mt-1">
                                            This project has {komList.length} KOM records. Each project should only have one KOM. Please delete the extra records.
                                          </p>
                                        </div>
                                      </div>

                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm text-left">
                                            <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                              <tr>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                                  Project Name
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                  Start Date
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '150px' }}>
                                                  End Date
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                                  Venue
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '100px' }}>
                                                  Status
                                                </th>
                                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', minWidth: '140px' }}>
                                                  Action
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white/60">
                                              {komList.map((kom) => {
                                                const komId = extractId(kom.id);
                                                return (
                                                  <tr
                                                    key={komId}
                                                    className="hover:bg-gray-50 transition"
                                                    style={{ fontFamily: 'inherit' }}
                                                  >
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                                                      {kom.project_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                      {new Date(kom.kom_start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                                                      {new Date(kom.kom_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600" style={{ fontFamily: 'inherit' }}>
                                                      {kom.kom_venue || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200">
                                                        {kom.status}
                                                      </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                      <div className="flex justify-end gap-2 text-gray-400">
                                                        <button
                                                          className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded"
                                                          title="View"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsViewKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          className="p-1.5 hover:text-orange-600 hover:bg-orange-50 rounded"
                                                          title="Edit"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsEditKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded"
                                                          title="Delete"
                                                          onClick={() => {
                                                            setSelectedKOM(kom);
                                                            setIsDeleteKOMModalOpen(true);
                                                          }}
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Table Footer */}
                                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                                          <p className="text-xs text-gray-600">
                                            Total: <span className="font-bold text-gray-900">{komList.length}</span> KOM
                                          </p>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === 'sslink' && (
                            <div
                              key="sslink"
                              style={{
                                animation: 'slideIn 0.3s ease-out'
                              }}
                            >
                              {(() => {
                                // Get links from API contract
                                const project = apiContracts.find(p => extractId(p.id) === selectedContractId);
                                const links = project?.links || [];

                                if (links.length === 0) {
                                  return (
                                    <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white">
                                      <LinkIcon className="w-12 h-12 text-gray-300 mb-3" />
                                      <div className="text-gray-400 text-lg mb-2">No SS/Link available</div>
                                      <div className="text-gray-500 text-sm">This project doesn't have any links yet</div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Table Header */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-left">
                                        <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                                          <tr>
                                            <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '250px' }}>
                                              Nama Project
                                            </th>
                                            <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                              SS/Link
                                            </th>
                                            <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                              Sub Pelaksana
                                            </th>
                                            <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', minWidth: '200px' }}>
                                              Contract Value
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white/60">
                                          {links.map((link: any, idx: number) => {
                                            // Format contract value to Rupiah
                                            const formatRupiah = (value: any) => {
                                              if (value == null || value === '') return '-';
                                              const numValue = typeof value === 'number' ? value : Number(value);
                                              if (isNaN(numValue)) return String(value);
                                              return `Rp ${new Intl.NumberFormat('id-ID').format(numValue)}`;
                                            };

                                            // Resolve SurrealDB vendor reference to vendor name
                                            const resolveVendorName = (val: any) => {
                                              if (val == null) return '-';
                                              let vendorId = '';
                                              if (typeof val === 'object') {
                                                // SurrealDB record ID: {tb: "vendor", id: {String: "xxx"}} or {tb: "vendor", id: "xxx"}
                                                if (val.id) {
                                                  const innerId = val.id;
                                                  vendorId = (typeof innerId === 'object' && innerId !== null)
                                                    ? (innerId.String || String(innerId))
                                                    : String(innerId);
                                                }
                                              } else {
                                                vendorId = String(val);
                                              }
                                              if (!vendorId) return '-';
                                              // Look up vendor name from vendorsRecord
                                              const vendorName = vendorsRecord[vendorId];
                                              if (vendorName) return vendorName;
                                              // Also try matching without prefix
                                              const cleanId = vendorId.includes(':') ? vendorId.split(':')[1] : vendorId;
                                              return vendorsRecord[cleanId] || vendorsRecord[`vendor:${cleanId}`] || vendorId;
                                            };

                                            return (
                                              <tr
                                                key={idx}
                                                className="hover:bg-gray-50 transition"
                                                style={{ fontFamily: 'inherit' }}
                                              >
                                                <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                                                  {project?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 500 }}>
                                                  {link.link_name || link.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600" style={{ fontFamily: 'inherit' }}>
                                                  {resolveVendorName(link.sub_pelaksana)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit', fontWeight: 500 }}>
                                                  {formatRupiah(link.ss_contract_value)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Table Footer - Total Count */}
                                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                                      <p className="text-xs text-gray-600">
                                        Total: <span className="font-bold text-gray-900">{links.length}</span> SS/Link
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Right Panel - Cell Evidence Detail */}
        {selectedCell && (
          <div className="w-96 bg-white border-l border-gray-200 shadow-soft-lg flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8] relative overflow-hidden">
              {/* Decorative Pattern Background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl transform translate-x-8 -translate-y-8"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl transform -translate-x-4 translate-y-4"></div>
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="1" fill="white" opacity="0.3" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                </svg>
              </div>

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-white text-sm font-semibold">Cell Evidence</h3>
                  <p className="text-xs text-white/60 mt-1">{selectedCell.cellName}</p>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {/* Cell Info */}
                <div className="glass-card rounded-lg p-4">
                  <h4 className="text-xs text-gray-600 mb-3">Cell Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Length:</span>
                      <span className="text-gray-900">{selectedCell.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Material:</span>
                      <span className="text-gray-900">{selectedCell.material}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="text-gray-900">{selectedCell.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        {selectedCell.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence Photos */}
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs text-gray-600">Evidence Photos ({selectedCell.evidenceCount})</h4>
                    <button className="text-xs text-gray-700 hover:underline">Upload</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* KML Preview */}
                <div className="glass-card rounded-lg p-4">
                  <h4 className="text-xs text-gray-600 mb-3">KML Location</h4>
                  <div className="h-32 bg-gray-200 rounded flex items-center justify-center mb-3">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                  <button className="w-full px-3 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-medium hover:bg-[#1D4ED8] transition-colors">
                    Open in Map
                  </button>
                </div>

                {/* Evidence Files */}
                <div className="glass-card rounded-lg p-4">
                  <h4 className="text-xs text-gray-600 mb-3">Evidence Files</h4>
                  <div className="space-y-2">
                    {['survey_report.pdf', 'installation_photo.jpg', 'test_result.xlsx'].map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-900">{file}</div>
                          <div className="text-xs text-gray-500">2024-03-15 14:30</div>
                        </div>
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <Eye className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Contract Modal */}
        <CreateContractModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          formData={formData}
          setFormData={setFormData}
          ssLinks={ssLinks}
          setSSLinks={setSSLinks}
          boqItems={boqItems}
          boqFileName={boqFileName}
          kmlFileName={kmlFileName}
          kmlPreviewData={kmlPreviewData}
          isDraggingBOQ={isDraggingBOQ}
          isDraggingKML={isDraggingKML}
          isCreatingContract={isCreatingContract}
          setIsDraggingBOQ={setIsDraggingBOQ}
          setIsDraggingKML={setIsDraggingKML}
          handleBOQUpload={handleBOQUpload}
          handleKMLUpload={handleKMLUpload}
          handleBOQDrop={handleBOQDrop}
          handleKMLDrop={handleKMLDrop}
          handleKMLPreview={handleKMLPreview}
          handleAddBOQRow={handleAddBOQRow}
          handleDeleteBOQRow={handleDeleteBOQRow}
          handleBOQItemChange={handleBOQItemChange}
          handleCreateContract={handleCreateContract}
        />

        {/* Edit Contract Modal */}
        <EditContractModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
            setEditingProjectDocuments(null);
          }}
          formData={editFormData}
          setFormData={setEditFormData}
          isUpdating={isUpdatingContract}
          handleUpdateContract={handleUpdateContract}
          existingLinks={editingProject?.links?.map(link => ({
            id: extractId(link.id),
            link_name: link.link_name,
            sub_pelaksana: link.sub_pelaksana || '',
            ss_contract_value: link.ss_contract_value || '' // ✅ FIX: Include ss_contract_value
          })) || []}
          existingDocuments={
            editingProjectDocuments ? {
              contract_document: editingProjectDocuments?.documents?.contract_document?.map((doc: any) => ({
                id: extractId(doc.id),
                file_name: doc.file_name,
                file_path: doc.file_path,
                file_size: doc.file_size
              })),
              other_document_project: editingProjectDocuments?.documents?.other_document_project?.map((doc: any) => ({
                id: extractId(doc.id),
                file_name: doc.file_name,
                file_path: doc.file_path,
                file_size: doc.file_size
              })),
              kml: editingProjectDocuments?.documents?.kml?.map((doc: any) => ({
                id: extractId(doc.id),
                file_name: doc.file_name,
                file_path: doc.file_path,
                process_id: doc.process_id
              }))
            } : undefined
          }
        />

        {/* KML Map Preview Modal */}
        {showKMLPreview && kmlPreviewData && (
          <KMLMapViewer
            kmlData={kmlPreviewData}
            onClose={() => setShowKMLPreview(false)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && contractToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-xl shadow-2xl" style={{ width: '420px' }}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delete Contract</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-2">Are you sure you want to delete this contract?</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div><span className="font-medium">Contract:</span> {contractToDelete.nomorKontrak}</div>
                    <div><span className="font-medium">Project:</span> {contractToDelete.namaProject}</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    All BOQ data, Matrix, RedLine, and KML files associated with this contract will be permanently deleted.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setContractToDelete(null);
                    }}
                    disabled={isDeletingContract}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      backgroundColor: 'white',
                      cursor: isDeletingContract ? 'not-allowed' : 'pointer',
                      opacity: isDeletingContract ? 0.5 : 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteContract}
                    disabled={isDeletingContract}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#DC2626',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      border: 'none',
                      cursor: isDeletingContract ? 'not-allowed' : 'pointer',
                      opacity: isDeletingContract ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isDeletingContract ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-xl shadow-2xl" style={{ width: '420px' }}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${successMessage.includes('Failed') || successMessage.includes('Error')
                    ? 'bg-red-100'
                    : 'bg-green-100'
                    }`}>
                    {successMessage.includes('Failed') || successMessage.includes('Error') ? (
                      <X className="w-6 h-6 text-red-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {successMessage.includes('Failed') || successMessage.includes('Error') ? 'Error' : 'Success'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{successMessage}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: successMessage.includes('Failed') || successMessage.includes('Error') ? '#DC2626' : '#10B981',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add SPAN Item Modal */}
        {showAddSpanModal && contractForSpan && (
          <AddSpanModal
            isOpen={showAddSpanModal}
            onClose={() => {
              setShowAddSpanModal(false);
              setContractForSpan(null);
              setSpanNameForModal(null);
            }}
            spanId={contractForSpan}
            spanName={spanNameForModal || undefined}
            onAddSpan={handleSpanAdded}
          />
        )}

        {/* Create SPAN Modal */}
        {showCreateSpanModal && projectForSpan && (
          <CreateSpanModal
            isOpen={showCreateSpanModal}
            onClose={() => {
              setShowCreateSpanModal(false);
              setProjectForSpan(null);
            }}
            projectId={projectForSpan}
            onSpanCreated={handleSpanCreated}
          />
        )}

        {/* KOM Modals */}
        <CreateKOMModal
          open={isCreateKOMModalOpen}
          onOpenChange={setIsCreateKOMModalOpen}
          onSubmit={handleCreateKOM}
          projectId={selectedContractId || undefined}
          projectName={selectedContract?.namaProject || undefined}
        />

        {selectedKOM && (
          <>
            <EditKOMModal
              open={isEditKOMModalOpen}
              onOpenChange={(open) => {
                setIsEditKOMModalOpen(open);
                if (!open) setSelectedKOM(null);
              }}
              onSubmit={(id, formData) => handleEditKOM(id, formData)}
              komData={selectedKOM}
            />

            <DeleteKOMModal
              open={isDeleteKOMModalOpen}
              onOpenChange={(open) => {
                setIsDeleteKOMModalOpen(open);
                if (!open) setSelectedKOM(null);
              }}
              onConfirm={() => handleDeleteKOM(extractId(selectedKOM.id))}
              komName={selectedKOM.project_name}
            />

            <ViewKOMModal
              open={isViewKOMModalOpen}
              onOpenChange={(open) => {
                setIsViewKOMModalOpen(open);
                if (!open) setSelectedKOM(null);
              }}
              komData={selectedKOM}
            />
          </>
        )}

        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isOpen={toast.isOpen}
          onClose={hideToast}
        />
      </div>
    </>
  );
}

