import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, IDetailCellRendererParams, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import { ChevronRight, ChevronDown, Paperclip, AlertCircle, Edit, Trash2, Eye } from 'lucide-react';
import { DeleteAttributeModal } from '../modals/attribute/DeleteAttributeModal';
import { EditAttributeModal } from '../modals/attribute/EditAttributeModal';
import { AttributeFormData, Attribute } from '@/types';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface RMJTableProps {
  selectedRows: string[];
  onSelectionChange: (rows: string[]) => void;
}

interface RowData {
  id: string;
  level: number;
  kontrak: string;
  treg: string;
  paketArea: string;
  lokasi?: string;
  ruasKontrak?: string;
  segmentasi?: string;
  cell?: string;
  currentMilestone?: string;
  planRFS?: string;
  actualEnd?: string;
  owner?: string;
  evidenceCount?: number;
  issueCount?: number;
  hasChildren?: boolean;
  children?: RowData[];
}

const mockData: RowData[] = [
  {
    id: 'k1',
    level: 0,
    kontrak: 'RMJ-2024-001',
    treg: 'TREG-1',
    paketArea: 'Paket 1',
    currentMilestone: 'Design',
    planRFS: '2024-06-30',
    owner: 'PT Meindo',
    evidenceCount: 15,
    issueCount: 3,
    hasChildren: true,
    children: [
      {
        id: 'k1-l1',
        level: 1,
        kontrak: 'RMJ-2024-001',
        treg: 'TREG-1',
        paketArea: 'Paket 1',
        lokasi: 'Jakarta Pusat',
        currentMilestone: 'Survey',
        planRFS: '2024-05-15',
        owner: 'Team A',
        evidenceCount: 8,
        issueCount: 1,
        hasChildren: true,
        children: [
          {
            id: 'k1-l1-r1',
            level: 2,
            kontrak: 'RMJ-2024-001',
            treg: 'TREG-1',
            paketArea: 'Paket 1',
            lokasi: 'Jakarta Pusat',
            ruasKontrak: 'SS-JKT-001',
            currentMilestone: 'Implementation',
            planRFS: '2024-05-20',
            actualEnd: '2024-05-18',
            owner: 'Vendor XYZ',
            evidenceCount: 12,
            issueCount: 0,
            hasChildren: true,
          }
        ]
      }
    ]
  },
  {
    id: 'k2',
    level: 0,
    kontrak: 'RMJ-2024-002',
    treg: 'TREG-2',
    paketArea: 'Paket 2',
    currentMilestone: 'Planning',
    planRFS: '2024-07-15',
    owner: 'PT Sumatera',
    evidenceCount: 5,
    issueCount: 2,
    hasChildren: false,
  }
];

export function RMJTable({ selectedRows, onSelectionChange }: RMJTableProps) {
  const [activeSubTab, setActiveSubTab] = useState<{ [key: string]: string }>({});
  const [rowData, setRowData] = useState<RowData[]>(mockData);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<RowData | null>(null);
  const [attributeToDelete, setAttributeToDelete] = useState<Attribute | null>(null);
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rowToEdit, setRowToEdit] = useState<RowData | null>(null);
  const [editFormData, setEditFormData] = useState<AttributeFormData>({
    name: '',
    label: '',
    type: 'text',
    category: 'main',
    level: 0,
    required: false,
    options: [''],
    defaultValue: '',
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Implementation':
      case 'Done':
        return 'bg-[#4CAF50] text-white';
      case 'Design':
      case 'Survey':
      case 'Planning':
        return 'bg-[#FFC107] text-gray-900';
      case 'Issue':
        return 'bg-[#FF5252] text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  // Custom Cell Renderers
  const StatusRenderer = (props: ICellRendererParams) => {
    if (!props.value) return null;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(props.value)}`}>
        {props.value}
      </span>
    );
  };

  const EvidenceRenderer = (props: ICellRendererParams) => {
    const count = props.data?.evidenceCount || 0;
    if (count === 0) return null;
    return (
      <button className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
        <Paperclip className="w-3 h-3" />
        {count}
      </button>
    );
  };

  const IssueRenderer = (props: ICellRendererParams) => {
    const count = props.data?.issueCount || 0;
    if (count === 0) return null;
    return (
      <button className="flex items-center gap-1 text-red-600 hover:underline text-sm">
        <AlertCircle className="w-3 h-3" />
        {count}
      </button>
    );
  };

  const handleDeleteRow = useCallback((rowData: RowData) => {
    setRowToDelete(rowData);
    // Convert RowData to Attribute format for DeleteAttributeModal
    setAttributeToDelete({
      id: rowData.id,
      name: rowData.kontrak || '',
      label: rowData.kontrak || '',
      type: 'text',
      category: 'main',
      level: rowData.level || 0,
      required: false,
      defaultValue: '',
      options: [],
      createdBy: rowData.owner || 'System',
      createdDate: new Date().toISOString(),
    });
    setDeleteModalOpen(true);
  }, []);

  const handleEditRow = useCallback((rowData: RowData) => {
    setRowToEdit(rowData);
    // Populate form data from row data
    setEditFormData({
      name: rowData.kontrak || '',
      label: rowData.kontrak || '',
      type: 'text',
      category: 'main',
      level: rowData.level || 0,
      required: false,
      options: [''],
      defaultValue: '',
    });
    setEditModalOpen(true);
  }, []);

  const handleEditSubmit = useCallback(() => {
    // Handle the edit submission logic here
    console.log('Editing row:', rowToEdit, 'with data:', editFormData);
    setEditModalOpen(false);
    setRowToEdit(null);
  }, [rowToEdit, editFormData]);

  const handleEditCancel = useCallback(() => {
    setEditModalOpen(false);
    setRowToEdit(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!rowToDelete) return;
    
    const deleteRowRecursive = (data: RowData[]): RowData[] => {
      return data.filter(item => {
        if (item.id === rowToDelete.id) {
          return false;
        }
        if (item.children) {
          item.children = deleteRowRecursive(item.children);
        }
        return true;
      });
    };
    
    setRowData(prevData => deleteRowRecursive([...prevData]));
    setDeleteModalOpen(false);
    setRowToDelete(null);
    setAttributeToDelete(null);
  }, [rowToDelete]);

  const cancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setRowToDelete(null);
    setAttributeToDelete(null);
  }, []);

  const ActionRenderer = (props: ICellRendererParams) => {
    return (
      <div className="flex items-center gap-1 justify-center">
        <button className="p-1 hover:bg-gray-200 rounded" title="View">
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Edit"
          onClick={() => handleEditRow(props.data)}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Delete"
          onClick={() => handleDeleteRow(props.data)}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  const KontrakRenderer = (props: ICellRendererParams) => {
    return (
      <span className="text-sm text-blue-600 hover:underline cursor-pointer">
        {props.value}
      </span>
    );
  };

  const RuasKontrakRenderer = (props: ICellRendererParams) => {
    if (!props.value) return <span className="text-sm text-gray-400">-</span>;
    
    const hasDetail = props.data?.hasChildren;
    
    if (!hasDetail) return <span className="text-sm">{props.value}</span>;
    
    return (
      <button
        onClick={() => props.node.setExpanded(!props.node.expanded)}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        {props.value}
        {props.node.expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
    );
  };

  // Detail Cell Renderer for Sub-Tabs
  const DetailCellRenderer = useCallback((props: IDetailCellRendererParams) => {
    const rowId = props.data?.id;
    const currentTab = activeSubTab[rowId] || 'drm';

    return (
      <div className="bg-[#F8FAFC] border-t border-[#D1D5DB]">
        {/* Sub Tab Navigation */}
        <div className="flex border-b border-[#D1D5DB] px-6">
          {['drm', 'boq', 'iboq', 'segmentasi', 'issue', 'evidence'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab({ ...activeSubTab, [rowId]: tab })}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                currentTab === tab
                  ? 'border-[#005EB8] text-[#005EB8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'drm' && 'DRM Data'}
              {tab === 'boq' && 'BOQ Customer'}
              {tab === 'iboq' && 'Indikatif BOQ'}
              {tab === 'segmentasi' && 'Segmentasi'}
              {tab === 'issue' && 'Issue Log'}
              {tab === 'evidence' && 'Evidence'}
            </button>
          ))}
        </div>

        {/* Sub Tab Content */}
        <div className="p-6">
          {currentTab === 'drm' && (
            <table className="w-full text-sm">
              <thead className="bg-[#E9ECEF]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs">No Ruas</th>
                  <th className="px-4 py-2 text-left text-xs">Nama Ruas</th>
                  <th className="px-4 py-2 text-left text-xs">Panjang KM</th>
                  <th className="px-4 py-2 text-left text-xs">Evidence</th>
                  <th className="px-4 py-2 text-left text-xs">Updated By</th>
                  <th className="px-4 py-2 text-left text-xs">Updated At</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3">DRM-001</td>
                  <td className="px-4 py-3">Ruas Jakarta-Bandung</td>
                  <td className="px-4 py-3">45.5 km</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Paperclip className="w-3 h-3" />
                      5 files
                    </button>
                  </td>
                  <td className="px-4 py-3">Hendra P.</td>
                  <td className="px-4 py-3">2024-03-15 14:30</td>
                </tr>
              </tbody>
            </table>
          )}

          {currentTab === 'boq' && (
            <table className="w-full text-sm">
              <thead className="bg-[#E9ECEF]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs">BOQID</th>
                  <th className="px-4 py-2 text-left text-xs">Kategori</th>
                  <th className="px-4 py-2 text-left text-xs">Designator</th>
                  <th className="px-4 py-2 text-left text-xs">Uraian</th>
                  <th className="px-4 py-2 text-left text-xs">Qty</th>
                  <th className="px-4 py-2 text-left text-xs">Satuan</th>
                  <th className="px-4 py-2 text-left text-xs">Harga</th>
                  <th className="px-4 py-2 text-left text-xs">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3">BOQ-001</td>
                  <td className="px-4 py-3">A. Kabel</td>
                  <td className="px-4 py-3">KB-48F</td>
                  <td className="px-4 py-3">Kabel Fiber Optik 48 Core</td>
                  <td className="px-4 py-3">1500</td>
                  <td className="px-4 py-3">meter</td>
                  <td className="px-4 py-3">Rp 125,000</td>
                  <td className="px-4 py-3">Rp 187,500,000</td>
                </tr>
              </tbody>
            </table>
          )}

          {currentTab === 'segmentasi' && (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">SEG-A (2.5 km)</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
                <div className="ml-4 space-y-1 text-sm text-gray-600">
                  <div>Cell 01 - 500m - Status: OK</div>
                  <div>Cell 02 - 500m - Status: OK</div>
                  <div>Cell 03 - 500m - Status: Progress</div>
                  <div>Cell 04 - 500m - Status: OK</div>
                  <div>Cell 05 - 500m - Status: OK</div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'issue' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <div className="flex-1">
                  <div className="text-sm text-red-900">Route change required due to permit issue</div>
                  <div className="text-xs text-red-600">Reported by: Faisal A. - 2024-03-10</div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'evidence' && (
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-gray-200 rounded p-3 text-center">
                <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                  <Paperclip className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-xs text-gray-600">survey_report.pdf</div>
                <div className="text-xs text-gray-400">2.4 MB</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeSubTab]);

  // Flatten data for AG Grid (handling hierarchical structure)
  const flattenData = (data: RowData[]): RowData[] => {
    const result: RowData[] = [];
    
    const flatten = (items: RowData[], parentPath: string[] = []) => {
      items.forEach(item => {
        result.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children, [...parentPath, item.id]);
        }
      });
    };
    
    flatten(data);
    return result;
  };

  const flatData = useMemo(() => flattenData(rowData), [rowData]);

  // Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'kontrak', 
      headerName: 'No Kontrak', 
      minWidth: 150,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        innerRenderer: KontrakRenderer,
      },
      sortable: true,
      filter: true,
    },
    { 
      field: 'treg', 
      headerName: 'TREG', 
      width: 100,
      sortable: true,
      filter: true,
    },
    { 
      field: 'paketArea', 
      headerName: 'Paket Area', 
      width: 130,
      sortable: true,
      filter: true,
    },
    { 
      field: 'lokasi', 
      headerName: 'Lokasi / Witel', 
      minWidth: 150,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true,
    },
    { 
      field: 'ruasKontrak', 
      headerName: 'Ruas Kontrak', 
      minWidth: 150,
      cellRenderer: RuasKontrakRenderer,
      sortable: true,
      filter: true,
    },
    { 
      field: 'segmentasi', 
      headerName: 'Segmentasi', 
      width: 130,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true,
    },
    { 
      field: 'cell', 
      headerName: 'Cell', 
      width: 100,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true,
    },
    { 
      field: 'currentMilestone', 
      headerName: 'Current Milestone', 
      width: 170,
      cellRenderer: StatusRenderer,
      cellStyle: { display: 'flex', alignItems: 'center' } as any,
      sortable: true,
      filter: true,
    },
    { 
      field: 'planRFS', 
      headerName: 'Plan RFS Date', 
      width: 130,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true,
    },
    { 
      field: 'actualEnd', 
      headerName: 'Actual End Date', 
      width: 140,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true,
    },
    { 
      field: 'owner', 
      headerName: 'Owner', 
      minWidth: 150,
      sortable: true,
      filter: true,
    },
    { 
      field: 'evidenceCount', 
      headerName: 'Evidence', 
      width: 100,
      cellRenderer: EvidenceRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      sortable: true,
    },
    { 
      field: 'issueCount', 
      headerName: 'Issues', 
      width: 100,
      cellRenderer: IssueRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      sortable: true,
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 120,
      cellRenderer: ActionRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      pinned: 'right',
      sortable: false,
      filter: false,
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Data path for tree structure
  const getDataPath = useCallback((data: RowData) => {
    const path: string[] = [];
    
    // Build path based on hierarchy level
    if (data.level === 0) {
      path.push(data.kontrak);
    } else if (data.level === 1) {
      path.push(data.kontrak, data.lokasi || data.id);
    } else if (data.level === 2) {
      path.push(data.kontrak, data.lokasi || '', data.ruasKontrak || data.id);
    }
    
    return path;
  }, []);

  const onSelectionChanged = useCallback((event: any) => {
    const selectedNodes = event.api.getSelectedNodes();
    const selectedIds = selectedNodes.map((node: any) => node.data?.id).filter(Boolean);
    onSelectionChange(selectedIds);
  }, [onSelectionChange]);

  return (
    <div className="ag-theme-quartz h-full" style={{ width: '100%', height: 'calc(100vh - 280px)' }}>
      <AgGridReact
        rowData={flatData}
        theme={themeQuartz}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="multiple"
        suppressRowClickSelection={true}
        animateRows={true}
        groupDefaultExpanded={1}
        treeData={true}
        getDataPath={getDataPath}
        masterDetail={true}
        detailCellRenderer={DetailCellRenderer}
        detailRowHeight={400}
        isRowMaster={(dataItem) => {
          return dataItem.ruasKontrak != null && dataItem.level === 2;
        }}
        onSelectionChanged={onSelectionChanged}
        headerHeight={40}
        rowHeight={50}
        suppressCellFocus={false}
        pagination={true}
        paginationPageSize={20}
        paginationPageSizeSelector={[10, 20, 50, 100]}
        enableCellTextSelection={true}
        ensureDomOrder={true}
      />

      {/* Delete Confirmation Modal */}
      <DeleteAttributeModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        attribute={attributeToDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Edit Attribute Modal */}
      <EditAttributeModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        formData={editFormData}
        onFormDataChange={setEditFormData}
        onSubmit={handleEditSubmit}
        onCancel={handleEditCancel}
        attributeId={rowToEdit?.id}
      />
    </div>
  );
}
