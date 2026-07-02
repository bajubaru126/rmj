import { useState, useMemo, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, IDetailCellRendererParams, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import { ChevronRight, ChevronDown, Paperclip, MapPin, Eye, Edit, Trash2, Upload, CheckCircle, Image as ImageIcon, X, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AddRuasModal, RuasFormData } from '../components/modals/ruas/AddRuasModal';
import { UploadDRMModal } from '../components/modals/ruas/UploadDRMModal';
import { UploadKMLModal } from '../components/modals/ruas/UploadKMLModal';
import { OrbitProgress } from 'react-loading-indicators';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

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

interface RuasData {
  id: string;
  tahunProject: string;
  program: string;
  projectSitelist: string;
  siteName: string;
  regional: string;
  project: string;
  mitra: string;
  planRFS: string;
  spCurrMilestone: string;
  m0sInstallation: boolean;
  planEndDate: string;
  actualEndDate?: string;
  owner: string;
  segmentasi?: SegmentasiData[];
}

const mockRuasData: RuasData[] = [
  {
    id: 'r1',
    tahunProject: '2024',
    program: 'RMJ Ring Jawbel',
    projectSitelist: 'UNX-JKT-001',
    siteName: 'K BARUSUJIAN',
    regional: 'R01 Sumbasel',
    project: 'PRJ-001',
    mitra: 'PT Meindo',
    planRFS: '2024-06-30',
    spCurrMilestone: 'Implementation',
    m0sInstallation: true,
    planEndDate: '2024-06-15',
    actualEndDate: '2024-06-10',
    owner: 'Faisal Ahmad',
    segmentasi: [
      {
        id: 'seg1',
        segName: 'SEG-A',
        length: '2.5 km',
        status: 'Progress',
        cells: [
          {
            id: 'cell1',
            cellName: 'CELL-01',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team A',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
            evidencePhotos: ['photo1', 'photo2'],
          },
          {
            id: 'cell2',
            cellName: 'CELL-02',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team A',
            status: 'OK',
            evidenceCount: 4,
            hasKML: true,
          },
          {
            id: 'cell3',
            cellName: 'CELL-03',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team B',
            status: 'Delay',
            evidenceCount: 2,
            hasKML: true,
          },
          {
            id: 'cell4',
            cellName: 'CELL-04',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team A',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
          {
            id: 'cell5',
            cellName: 'CELL-05',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team B',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
          },
        ],
      },
      {
        id: 'seg2',
        segName: 'SEG-B',
        length: '1.8 km',
        status: 'OK',
        cells: [
          {
            id: 'cell6',
            cellName: 'CELL-06',
            length: '600m',
            material: 'FO 96 Core',
            owner: 'Team C',
            status: 'OK',
            evidenceCount: 7,
            hasKML: true,
          },
          {
            id: 'cell7',
            cellName: 'CELL-07',
            length: '600m',
            material: 'FO 96 Core',
            owner: 'Team C',
            status: 'Issue',
            evidenceCount: 1,
            hasKML: false,
          },
          {
            id: 'cell8',
            cellName: 'CELL-08',
            length: '600m',
            material: 'FO 96 Core',
            owner: 'Team C',
            status: 'OK',
            evidenceCount: 8,
            hasKML: true,
          },
        ],
      },
      {
        id: 'seg3',
        segName: 'SEG-C',
        length: '3.2 km',
        status: 'Progress',
        cells: [
          {
            id: 'cell9',
            cellName: 'CELL-09',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team D',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
          {
            id: 'cell10',
            cellName: 'CELL-10',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team D',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
          },
          {
            id: 'cell11',
            cellName: 'CELL-11',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team E',
            status: 'Delay',
            evidenceCount: 3,
            hasKML: true,
          },
          {
            id: 'cell12',
            cellName: 'CELL-12',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team D',
            status: 'OK',
            evidenceCount: 7,
            hasKML: true,
          },
          {
            id: 'cell13',
            cellName: 'CELL-13',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team E',
            status: 'OK',
            evidenceCount: 4,
            hasKML: true,
          },
          {
            id: 'cell14',
            cellName: 'CELL-14',
            length: '450m',
            material: 'FO 48 Core',
            owner: 'Team D',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
          {
            id: 'cell15',
            cellName: 'CELL-15',
            length: '500m',
            material: 'FO 48 Core',
            owner: 'Team E',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
          },
        ],
      },
      {
        id: 'seg4',
        segName: 'SEG-D',
        length: '2.1 km',
        status: 'OK',
        cells: [
          {
            id: 'cell16',
            cellName: 'CELL-16',
            length: '550m',
            material: 'FO 96 Core',
            owner: 'Team F',
            status: 'OK',
            evidenceCount: 8,
            hasKML: true,
          },
          {
            id: 'cell17',
            cellName: 'CELL-17',
            length: '550m',
            material: 'FO 96 Core',
            owner: 'Team F',
            status: 'OK',
            evidenceCount: 7,
            hasKML: true,
          },
          {
            id: 'cell18',
            cellName: 'CELL-18',
            length: '550m',
            material: 'FO 96 Core',
            owner: 'Team G',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
          {
            id: 'cell19',
            cellName: 'CELL-19',
            length: '450m',
            material: 'FO 96 Core',
            owner: 'Team F',
            status: 'OK',
            evidenceCount: 9,
            hasKML: true,
          },
        ],
      },
      {
        id: 'seg5',
        segName: 'SEG-E',
        length: '1.5 km',
        status: 'Progress',
        cells: [
          {
            id: 'cell20',
            cellName: 'CELL-20',
            length: '500m',
            material: 'FO 72 Core',
            owner: 'Team H',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
          },
          {
            id: 'cell21',
            cellName: 'CELL-21',
            length: '500m',
            material: 'FO 72 Core',
            owner: 'Team H',
            status: 'Delay',
            evidenceCount: 2,
            hasKML: false,
          },
          {
            id: 'cell22',
            cellName: 'CELL-22',
            length: '500m',
            material: 'FO 72 Core',
            owner: 'Team I',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
        ],
      },
      {
        id: 'seg6',
        segName: 'SEG-F',
        length: '2.8 km',
        status: 'OK',
        cells: [
          {
            id: 'cell23',
            cellName: 'CELL-23',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team J',
            status: 'OK',
            evidenceCount: 7,
            hasKML: true,
          },
          {
            id: 'cell24',
            cellName: 'CELL-24',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team J',
            status: 'OK',
            evidenceCount: 8,
            hasKML: true,
          },
          {
            id: 'cell25',
            cellName: 'CELL-25',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team K',
            status: 'OK',
            evidenceCount: 6,
            hasKML: true,
          },
          {
            id: 'cell26',
            cellName: 'CELL-26',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team J',
            status: 'Issue',
            evidenceCount: 2,
            hasKML: false,
          },
          {
            id: 'cell27',
            cellName: 'CELL-27',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team K',
            status: 'OK',
            evidenceCount: 7,
            hasKML: true,
          },
          {
            id: 'cell28',
            cellName: 'CELL-28',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team J',
            status: 'OK',
            evidenceCount: 5,
            hasKML: true,
          },
          {
            id: 'cell29',
            cellName: 'CELL-29',
            length: '400m',
            material: 'FO 96 Core',
            owner: 'Team K',
            status: 'OK',
            evidenceCount: 8,
            hasKML: true,
          },
        ],
      },
    ],
  },
  {
    id: 'r2',
    tahunProject: '2024',
    program: 'RMJ Metro',
    projectSitelist: 'UNX-BDG-045',
    siteName: 'BANDUNG CENTRAL',
    regional: 'R02 Jawa Barat',
    project: 'PRJ-002',
    mitra: 'PT Sumatera',
    planRFS: '2024-07-15',
    spCurrMilestone: 'Survey',
    m0sInstallation: false,
    planEndDate: '2024-07-01',
    owner: 'Hendra Pratama',
  },
];

export function Segmentasi() {
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  
  // Modal States
  const [isAddRuasModalOpen, setIsAddRuasModalOpen] = useState(false);
  const [isUploadDRMModalOpen, setIsUploadDRMModalOpen] = useState(false);
  const [isUploadKMLModalOpen, setIsUploadKMLModalOpen] = useState(false);
  
  // Filter and Search States
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedTreg, setSelectedTreg] = useState('TREG');
  const [selectedMilestone, setSelectedMilestone] = useState('Milestone');
  const [selectedMitra, setSelectedMitra] = useState('MITRA');
  const [gridApi, setGridApi] = useState<any>(null);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Modal Handlers
  const handleAddRuas = (data: RuasFormData) => {
    console.log('Adding new ruas:', data);
    // TODO: Implement API call to add ruas
    alert('Ruas baru berhasil ditambahkan!');
  };

  const handleUploadDRM = (file: File, ruasId: string) => {
    console.log('Uploading DRM:', file.name, 'for ruas:', ruasId);
    // TODO: Implement API call to upload DRM
    alert(`File DRM "${file.name}" berhasil diupload untuk ruas ${ruasId}!`);
  };

  const handleUploadKML = (file: File, cellId: string, description: string) => {
    console.log('Uploading KML:', file.name, 'for cell:', cellId, 'description:', description);
    // TODO: Implement API call to upload KML
    alert(`File KML "${file.name}" berhasil diupload untuk cell ${cellId}!`);
  };

  // Get unique values for dropdowns
  const tregOptions = useMemo(() => {
    const tregs = new Set(mockRuasData.map(row => row.regional));
    return ['TREG', ...Array.from(tregs)];
  }, []);

  const milestoneOptions = useMemo(() => {
    const milestones = new Set(mockRuasData.map(row => row.spCurrMilestone));
    return ['Milestone', ...Array.from(milestones)];
  }, []);

  const mitraOptions = useMemo(() => {
    const mitras = new Set(mockRuasData.map(row => row.mitra));
    return ['MITRA', ...Array.from(mitras)];
  }, []);

  // Handle grid ready
  const onGridReady = useCallback((params: any) => {
    setGridApi(params.api);
  }, []);

  // External filter functions
  const isExternalFilterPresent = useCallback(() => {
    return debouncedSearchText !== '' || 
           (selectedTreg !== '' && selectedTreg !== 'TREG') || 
           (selectedMilestone !== '' && selectedMilestone !== 'Milestone') || 
           (selectedMitra !== '' && selectedMitra !== 'MITRA');
  }, [debouncedSearchText, selectedTreg, selectedMilestone, selectedMitra]);

  const doesExternalFilterPass = useCallback((node: any) => {
    const data = node.data;
    if (!data) return true;

    // Search filter
    if (debouncedSearchText) {
      const searchLower = debouncedSearchText.toLowerCase();
      const matchesSearch = 
        data.projectSitelist?.toLowerCase().includes(searchLower) ||
        data.siteName?.toLowerCase().includes(searchLower) ||
        data.program?.toLowerCase().includes(searchLower) ||
        data.regional?.toLowerCase().includes(searchLower) ||
        data.mitra?.toLowerCase().includes(searchLower) ||
        data.owner?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // TREG filter
    if (selectedTreg && selectedTreg !== 'TREG') {
      if (!data.regional?.includes(selectedTreg)) return false;
    }

    // Milestone filter
    if (selectedMilestone && selectedMilestone !== 'Milestone') {
      if (data.spCurrMilestone !== selectedMilestone) return false;
    }

    // MITRA filter
    if (selectedMitra && selectedMitra !== 'MITRA') {
      if (data.mitra !== selectedMitra) return false;
    }

    return true;
  }, [debouncedSearchText, selectedTreg, selectedMilestone, selectedMitra]);

  // Update grid when filters change
  useEffect(() => {
    if (gridApi) {
      gridApi.onFilterChanged();
    }
  }, [gridApi, debouncedSearchText, selectedTreg, selectedMilestone, selectedMitra]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-[#4CAF50] text-white';
      case 'Delay': return 'bg-[#FFC107] text-gray-900';
      case 'Issue': return 'bg-[#FF5252] text-white';
      case 'Implementation': return 'bg-blue-500 text-white';
      case 'Survey': return 'bg-purple-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  // Custom Master Detail Cell Renderer with Expand Button
  const MasterDetailCellRenderer = (props: ICellRendererParams) => {
    const isExpanded = props.node.expanded;

    return (
      <div className="flex items-center h-10  gap-2">
        <button
          onClick={() => props.node.setExpanded(!isExpanded)}
          className="expand-button"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-700" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-700" />
          )}
        </button>
        <span className="text-sm font-medium">{props.value}</span>
      </div>
    );
  };

  // Status Badge Renderer
  const StatusRenderer = (props: ICellRendererParams) => {
    const status = props.value;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  // Checkbox Renderer
  const CheckboxRenderer = (props: ICellRendererParams) => {
    return props.value ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <span className="text-xs text-gray-400">-</span>
    );
  };

  // Action Buttons Renderer
  const ActionRenderer = () => {
    return (
      <div className="flex items-center justify-center gap-1">
        <button className="p-1 hover:bg-gray-200 rounded" title="View">
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded" title="Edit">
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded" title="Delete">
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  // Cell Action Renderer
  const CellActionRenderer = () => {
    return (
      <div className="flex items-center justify-center gap-1">
        <button className="p-1 hover:bg-gray-200 rounded" title="View">
          <Eye className="w-3 h-3 text-gray-600" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded" title="Upload Evidence">
          <Upload className="w-3 h-3 text-blue-600" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded" title="Map">
          <MapPin className="w-3 h-3 text-green-600" />
        </button>
      </div>
    );
  };

  // Evidence Renderer
  const EvidenceRenderer = (props: ICellRendererParams) => {
    return (
      <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
        <Paperclip className="w-3 h-3" />
        {props.value} files
      </button>
    );
  };

  // KML Renderer
  const KMLRenderer = (props: ICellRendererParams) => {
    return props.value ? (
      <button className="text-xs text-green-600 hover:underline">View KML</button>
    ) : (
      <span className="text-xs text-red-600">No KML</span>
    );
  };

  // Cell Table Column Definitions
  const cellColumnDefs: ColDef[] = useMemo(() => [
    { field: 'cellName', headerName: 'Cell', width: 120, minWidth: 135 },
    { field: 'length', headerName: 'Length', width: 135, minWidth: 80 },
    { field: 'material', headerName: 'Material', flex: 1, minWidth: 150 },
    { field: 'owner', headerName: 'Owner', width: 120, minWidth: 135 },
    {
      field: 'status',
      headerName: 'Status',
      width: 135,
      minWidth: 135,
      cellRenderer: StatusRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    {
      field: 'evidenceCount',
      headerName: 'Evidence',
      width: 135,
      minWidth: 135,
      cellRenderer: EvidenceRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    {
      field: 'hasKML',
      headerName: 'KML',
      width: 135,
      minWidth: 80,
      cellRenderer: KMLRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 135,
      minWidth: 135,
      cellRenderer: CellActionRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
  ], []);

  // Detail Cell Renderer for Segmentasi
  const DetailCellRenderer = useCallback((props: IDetailCellRendererParams) => {
    const ruas = props.data as RuasData;
    const currentTab = activeTab[ruas.id] || 'segmentasi';
    const [expandedSegmentasi, setExpandedSegmentasi] = useState<Set<string>>(new Set());

    const toggleSegmentasi = (segId: string) => {
      const newExpanded = new Set(expandedSegmentasi);
      if (newExpanded.has(segId)) {
        newExpanded.delete(segId);
      } else {
        newExpanded.add(segId);
      }
      setExpandedSegmentasi(newExpanded);
    };

    return (
      <div className="ag-details-panel">
        {/* Tab Headers */}
        <div className="detail-tab-navigation">
          {['segmentasi', 'drm', 'boq', 'iboq', 'issue', 'evidence', 'kml'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab({ ...activeTab, [ruas.id]: tab })}
              className={`detail-tab-button ${currentTab === tab ? 'active' : ''}`}
            >
              {tab === 'drm' && 'DRM Data'}
              {tab === 'boq' && 'BOQ Customer'}
              {tab === 'iboq' && 'Indikatif BOQ'}
              {tab === 'segmentasi' && 'Segmentasi & Cell'}
              {tab === 'issue' && 'Issue Log'}
              {tab === 'evidence' && 'Evidence'}
              {tab === 'kml' && 'KML Map'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '450px' }}>
          {currentTab === 'segmentasi' && ruas.segmentasi && (
            <div className="space-y-3">
              {ruas.segmentasi.map(seg => {
                const isSegExpanded = expandedSegmentasi.has(seg.id);
                return (
                  <div key={seg.id} className="segmentasi-accordion">
                    {/* Segmentasi Header */}
                    <div
                      className="segmentasi-header"
                      onClick={() => toggleSegmentasi(seg.id)}
                    >
                      <div className="flex items-center gap-3">
                        <button className="segmentasi-expand-button">
                          {isSegExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <span className="text-sm text-gray-900">{seg.segName}</span>
                          <span className="text-xs text-gray-500 ml-2">({seg.length})</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${seg.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {seg.status}
                      </span>
                    </div>

                    {/* Cell AG Grid Table */}
                    {isSegExpanded && (
                      <div className="border-t border-gray-200 bg-white" style={{ height: '320px', width: '100%' }}>
                        <div className="ag-theme-quartz h-full w-full">
                          <AgGridReact
                            rowData={seg.cells}
                            theme={themeQuartz}
                            columnDefs={cellColumnDefs}
                            domLayout="normal"
                            rowSelection="single"
                            onRowClicked={(event) => setSelectedCell(event.data)}
                            suppressCellFocus={false}
                            headerHeight={40}
                            rowHeight={45}
                            animateRows={true}
                            rowClass="cursor-pointer"
                            suppressHorizontalScroll={false}
                            alwaysShowVerticalScroll={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentTab === 'drm' && (
            <div className="glass-card rounded-lg p-6">
              <div className="text-sm text-gray-600">DRM Data content...</div>
            </div>
          )}

          {currentTab === 'evidence' && (
            <div className="glass-card rounded-lg p-6">
              <div className="text-sm text-gray-600">Evidence content...</div>
            </div>
          )}

          {currentTab === 'kml' && (
            <div className="glass-card rounded-lg p-6">
              <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeTab, cellColumnDefs]);

  // Main Grid Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'tahunProject',
      headerName: 'Tahun Project',
      width: 160,
      checkboxSelection: true,
      headerCheckboxSelection: true
    },
    {
      field: 'program',
      headerName: 'Program',
      width: 180,
      cellRenderer: MasterDetailCellRenderer,
      cellRendererParams: {
        suppressCount: true,
      }
    },
    { field: 'projectSitelist', headerName: 'PROJECT_SITELIST / UNXID', width: 180 },
    { field: 'siteName', headerName: 'Site Name', width: 180 },
    { field: 'regional', headerName: 'Regional', width: 150 },
    { field: 'project', headerName: 'Project', width: 120 },
    { field: 'mitra', headerName: 'MITRA', width: 140 },
    { field: 'planRFS', headerName: 'PLAN RFS', width: 120 },
    {
      field: 'spCurrMilestone',
      headerName: 'S.P Curr. Milestone',
      width: 160,
      cellRenderer: StatusRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }
    },
    {
      field: 'm0sInstallation',
      headerName: 'M-0S Installation',
      width: 150,
      cellRenderer: CheckboxRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    { field: 'planEndDate', headerName: 'Plan End Date', width: 130 },
    { field: 'actualEndDate', headerName: 'Actual End Date', width: 130 },
    { field: 'owner', headerName: 'Owner', width: 140 },
    {
      field: 'action',
      headerName: 'Action',
      width: 120,
      cellRenderer: ActionRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      pinned: 'right'
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: true,
    floatingFilter: false,
  }), []);

  // Determine which rows can be expanded (all rows in this case)
  const isRowMaster = useCallback(() => {
    return true; // All rows can be expanded
  }, []);

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Main Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Ruas..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-64 pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <Select value={selectedTreg || 'TREG'} onValueChange={setSelectedTreg}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="TREG" />
              </SelectTrigger>
              <SelectContent>
                {tregOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMilestone || 'Milestone'} onValueChange={setSelectedMilestone}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Milestone" />
              </SelectTrigger>
              <SelectContent>
                {milestoneOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMitra || 'MITRA'} onValueChange={setSelectedMitra}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="MITRA" />
              </SelectTrigger>
              <SelectContent>
                {mitraOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {isExternalFilterPresent() && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSearchText('');
                  setSelectedTreg('TREG');
                  setSelectedMilestone('Milestone');
                  setSelectedMitra('MITRA');
                }}
              >
                Clear Filters
              </Button>
            )}

            <div className="flex-1"></div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddRuasModalOpen(true)}
            >
              + Tambah Ruas
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsUploadDRMModalOpen(true)}
            >
              Upload DRM
            </Button>
            <Button 
              size="sm" 
              className="bg-[#005EB8] hover:bg-[#004a94]"
              onClick={() => setIsUploadKMLModalOpen(true)}
            >
              Import KML
            </Button>
          </div>
          
          {/* Filter Status Indicator */}
          {isExternalFilterPresent() && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-gray-600">Active filters:</span>
              {searchText && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  Search: "{searchText}"
                </span>
              )}
              {selectedTreg && selectedTreg !== 'TREG' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  TREG: {selectedTreg}
                </span>
              )}
              {selectedMilestone && selectedMilestone !== 'Milestone' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  Milestone: {selectedMilestone}
                </span>
              )}
              {selectedMitra && selectedMitra !== 'MITRA' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  MITRA: {selectedMitra}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AG Grid Table */}
        <div className="flex-1 p-6">
          <div className="ag-theme-quartz ag-grid-container h-full">
            <AgGridReact
              rowData={mockRuasData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              isRowMaster={isRowMaster}
              detailCellRenderer={DetailCellRenderer}
              theme={themeQuartz}
              detailRowHeight={500}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              domLayout="normal"
              headerHeight={45}
              rowHeight={50}
              suppressCellFocus={false}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              onGridReady={onGridReady}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              loadingOverlayComponent={() => (
                <div className="flex items-center justify-center h-full">
                  <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
                </div>
              )}
              noRowsOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-gray-400 text-lg mb-2">No data available</div>
                  <div className="text-gray-500 text-sm">Try adjusting your filters</div>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Cell Evidence Detail */}
      {selectedCell && (
        <div className="w-96 bg-white border-l border-gray-200 shadow-soft-lg flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm">Cell Evidence</h3>
                <p className="text-xs text-blue-100 mt-1">{selectedCell.cellName}</p>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedCell.status)}`}>
                      {selectedCell.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence Photos */}
              <div className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs text-gray-600">Evidence Photos ({selectedCell.evidenceCount})</h4>
                  <button className="text-xs text-blue-600 hover:underline">Upload</button>
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
                <button className="w-full px-3 py-2 bg-[#005EB8] text-white rounded text-xs hover:bg-[#004a94]">
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
                        <Eye className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddRuasModal
        isOpen={isAddRuasModalOpen}
        onClose={() => setIsAddRuasModalOpen(false)}
        onSubmit={handleAddRuas}
      />
      <UploadDRMModal
        isOpen={isUploadDRMModalOpen}
        onClose={() => setIsUploadDRMModalOpen(false)}
        onUpload={handleUploadDRM}
      />
      <UploadKMLModal
        isOpen={isUploadKMLModalOpen}
        onClose={() => setIsUploadKMLModalOpen(false)}
        onUpload={handleUploadKML}
      />
    </div>
  );
}
