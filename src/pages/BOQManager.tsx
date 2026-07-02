import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, IDetailCellRendererParams, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import {  Download, Eye, Edit, Trash2, MapPin, Paperclip, X } from 'lucide-react';
import { EditBOQModal } from '../components/modals/boqmanager/EditBOQModal';
import { DeleteBOQModal } from '../components/modals/boqmanager/DeleteBOQModal';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface BOQItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
}

interface BOQData {
  id: string;
  ruas: string;
  kategori: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
  status: 'Approved' | 'Draft' | 'Rejected';
  items?: BOQItem[];
  tahunProject?: string;
  program?: string;
  mitra?: string;
  regional?: string;
}

export function BOQManager() {
  const [selectedBOQ, setSelectedBOQ] = useState<BOQData | null>(null);
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boqToEdit, setBOQToEdit] = useState<BOQData | null>(null);
  const [boqToDelete, setBOQToDelete] = useState<BOQData | null>(null);

  // Changed to useState for data management
  const [boqData, setBOQData] = useState<BOQData[]>([
    {
      id: 'BOQ-001',
      ruas: 'SS-JKT-001',
      kategori: 'A. Kabel',
      uraian: 'Kabel Fiber Optik 48 Core',
      volume: 1500,
      satuan: 'meter',
      hargaSatuan: 125000,
      total: 187500000,
      status: 'Approved',
      tahunProject: '2024',
      program: 'RMJ Ring Jawbel',
      mitra: 'PT Meindo',
      regional: 'R01 Sumbasel',
      items: [
        { id: 'item1', kategori: 'Material', uraian: 'Kabel FO 48C', volume: 1500, satuan: 'meter', hargaSatuan: 85000, total: 127500000 },
        { id: 'item2', kategori: 'Labor', uraian: 'Instalasi Kabel', volume: 1500, satuan: 'meter', hargaSatuan: 30000, total: 45000000 },
        { id: 'item3', kategori: 'Equipment', uraian: 'Tools & Equipment', volume: 1, satuan: 'ls', hargaSatuan: 15000000, total: 15000000 },
      ],
    },
    {
      id: 'BOQ-002',
      ruas: 'SS-JKT-001',
      kategori: 'B. Manhole',
      uraian: 'Manhole Beton 120x80 cm',
      volume: 25,
      satuan: 'unit',
      hargaSatuan: 3500000,
      total: 87500000,
      status: 'Draft',
      tahunProject: '2024',
      program: 'RMJ Ring Jawbel',
      mitra: 'PT Meindo',
      regional: 'R01 Sumbasel',
      items: [
        { id: 'item4', kategori: 'Material', uraian: 'Beton K-300', volume: 25, satuan: 'unit', hargaSatuan: 2000000, total: 50000000 },
        { id: 'item5', kategori: 'Labor', uraian: 'Pembuatan Manhole', volume: 25, satuan: 'unit', hargaSatuan: 1200000, total: 30000000 },
        { id: 'item6', kategori: 'Equipment', uraian: 'Cover Manhole', volume: 25, satuan: 'unit', hargaSatuan: 300000, total: 7500000 },
      ],
    },
    {
      id: 'BOQ-003',
      ruas: 'SS-BDG-002',
      kategori: 'A. Kabel',
      uraian: 'Kabel Fiber Optik 96 Core',
      volume: 2200,
      satuan: 'meter',
      hargaSatuan: 185000,
      total: 407000000,
      status: 'Approved',
      tahunProject: '2024',
      program: 'RMJ Metro',
      mitra: 'PT Sumatera',
      regional: 'R02 Jawa Barat',
      items: [
        { id: 'item7', kategori: 'Material', uraian: 'Kabel FO 96C', volume: 2200, satuan: 'meter', hargaSatuan: 125000, total: 275000000 },
        { id: 'item8', kategori: 'Labor', uraian: 'Instalasi Kabel', volume: 2200, satuan: 'meter', hargaSatuan: 45000, total: 99000000 },
        { id: 'item9', kategori: 'Equipment', uraian: 'Tools & Equipment', volume: 1, satuan: 'ls', hargaSatuan: 33000000, total: 33000000 },
      ],
    },
  ]);

  // Modal Handlers
  const handleEditBOQ = (data: Partial<BOQData>) => {
    if (!boqToEdit) return;
    
    console.log('Editing BOQ:', boqToEdit.id, data);
    
    // Update the BOQ data
    setBOQData(prevData => 
      prevData.map(boq => 
        boq.id === boqToEdit.id 
          ? { ...boq, ...data }
          : boq
      )
    );
    
    // Update selected BOQ if it's the one being edited
    if (selectedBOQ?.id === boqToEdit.id) {
      setSelectedBOQ(prev => prev ? { ...prev, ...data } : null);
    }
    
    alert('BOQ berhasil diperbarui!');
    setIsEditModalOpen(false);
    setBOQToEdit(null);
  };

  const handleDeleteBOQ = () => {
    if (!boqToDelete) return;
    
    console.log('Deleting BOQ:', boqToDelete.id);
    
    // Remove BOQ from data
    setBOQData(prevData => 
      prevData.filter(boq => boq.id !== boqToDelete.id)
    );
    
    // Clear selected BOQ if it's the one being deleted
    if (selectedBOQ?.id === boqToDelete.id) {
      setSelectedBOQ(null);
    }
    
    alert('BOQ berhasil dihapus!');
    setIsDeleteModalOpen(false);
    setBOQToDelete(null);
  };

  // Custom Cell Renderers
  const StatusRenderer = (props: ICellRendererParams) => {
    const status = props.value;
    const getStatusColor = () => {
      switch (status) {
        case 'Approved': return 'bg-green-100 text-green-700';
        case 'Draft': return 'bg-yellow-100 text-yellow-700';
        case 'Rejected': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor()}`}>
        {status}
      </span>
    );
  };

  const ActionRenderer = (props: ICellRendererParams) => {
    const boq = props.data as BOQData;
    
    return (
      <div className="flex items-center justify-center gap-1">
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="View"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBOQ(boq);
          }}
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            setBOQToEdit(boq);
            setIsEditModalOpen(true);
          }}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            setBOQToDelete(boq);
            setIsDeleteModalOpen(true);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  const CurrencyRenderer = (props: ICellRendererParams) => {
    return <span>Rp {props.value?.toLocaleString('id-ID') || 0}</span>;
  };

  const NumberRenderer = (props: ICellRendererParams) => {
    return <span>{props.value?.toLocaleString('id-ID') || 0}</span>;
  };

  // Removed - AG Grid handles master-detail expand button automatically

  // Detail Cell Renderer for BOQ Items
  const DetailCellRenderer = useCallback((props: IDetailCellRendererParams) => {
    const boq = props.data as BOQData;
    const currentTab = activeTab[boq.id] || 'breakdown';

    return (
      <div className="ag-details-panel">
        {/* Tab Headers */}
        <div className="detail-tab-navigation">
          {['breakdown', 'evidence', 'kml', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab({ ...activeTab, [boq.id]: tab })}
              className={`detail-tab-button ${currentTab === tab ? 'active' : ''}`}
            >
              {tab === 'breakdown' && 'Material Breakdown'}
              {tab === 'evidence' && 'Evidence'}
              {tab === 'kml' && 'KML Map'}
              {tab === 'history' && 'History'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {currentTab === 'breakdown' && boq.items && (
            <div className="p-4">
              <div className="ag-theme-quartz" style={{ height: '300px' }}>
                <AgGridReact
                  rowData={boq.items}
                  theme={themeQuartz}
                  columnDefs={[
                    { field: 'kategori', headerName: 'Kategori', width: 150 },
                    { field: 'uraian', headerName: 'Uraian', flex: 1 },
                    { 
                      field: 'volume', 
                      headerName: 'Volume', 
                      width: 120,
                      cellRenderer: NumberRenderer,
                      cellStyle: { textAlign: 'right' }
                    },
                    { field: 'satuan', headerName: 'Satuan', width: 100 },
                    { 
                      field: 'hargaSatuan', 
                      headerName: 'Harga Satuan', 
                      width: 150,
                      cellRenderer: CurrencyRenderer,
                      cellStyle: { textAlign: 'right' }
                    },
                    { 
                      field: 'total', 
                      headerName: 'Total', 
                      width: 180,
                      cellRenderer: CurrencyRenderer,
                      cellStyle: { textAlign: 'right' }
                    },
                  ]}
                  domLayout="autoHeight"
                  headerHeight={40}
                  rowHeight={45}
                />
              </div>
            </div>
          )}

          {currentTab === 'evidence' && (
            <div className="glass-card rounded-lg p-6 m-4">
              <div className="text-sm text-gray-600">Evidence documents and photos...</div>
              <div className="mt-4 space-y-2">
                {['survey_report.pdf', 'material_spec.xlsx', 'installation_photo.jpg'].map((file, idx) => (
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
          )}

          {currentTab === 'kml' && (
            <div className="glass-card rounded-lg p-6 m-4">
              <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          )}

          {currentTab === 'history' && (
            <div className="glass-card rounded-lg p-6 m-4">
              <div className="text-sm text-gray-600">BOQ revision history...</div>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeTab]);

  // Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'BOQ ID', 
      width: 140,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRenderer: 'agGroupCellRenderer',
    },
    { field: 'ruas', headerName: 'Ruas', width: 150 },
    { field: 'kategori', headerName: 'Kategori', width: 150 },
    { field: 'uraian', headerName: 'Uraian', flex: 1, minWidth: 200 },
    { 
      field: 'volume', 
      headerName: 'Volume', 
      width: 120,
      cellRenderer: NumberRenderer,
      cellStyle: { textAlign: 'right' } as any
    },
    { field: 'satuan', headerName: 'Satuan', width: 100 },
    { 
      field: 'hargaSatuan', 
      headerName: 'Harga Satuan', 
      width: 150,
      cellRenderer: CurrencyRenderer,
      cellStyle: { textAlign: 'right' } as any
    },
    { 
      field: 'total', 
      headerName: 'Total', 
      width: 180,
      cellRenderer: CurrencyRenderer,
      cellStyle: { textAlign: 'right' } as any
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellRenderer: StatusRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 120,
      cellRenderer: ActionRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      pinned: 'right'
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const isRowMaster = useCallback(() => {
    return true; // All rows can be expanded
  }, []);

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>Tahun Project</option>
              <option>2024</option>
              <option>2023</option>
            </select>

            <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>Program</option>
              <option>RMJ Ring</option>
              <option>OSP Metro</option>
            </select>

            <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>MITRA</option>
              <option>PT Meindo</option>
              <option>PT Sumatera</option>
            </select>

            <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>Status BOQ</option>
              <option>Draft</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>

            <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>TREG</option>
              <option>TREG-1</option>
              <option>TREG-2</option>
            </select>

            <div className="flex-1"></div>

            <button className="flex items-center gap-2 px-4 py-2 bg-[#005EB8] text-white rounded hover:bg-[#004a94] text-sm">
              <Download className="w-4 h-4" />
              Export BOQ
            </button>
          </div>
        </div>

        {/* AG Grid Table */}
        <div className="flex-1 p-6">
          <div className="ag-theme-quartz ag-grid-container h-full">
            <AgGridReact
              rowData={boqData}
              theme={themeQuartz}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              masterDetail={true}
              isRowMaster={isRowMaster}
              detailCellRenderer={DetailCellRenderer}
              detailRowHeight={400}
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
              onRowClicked={(event) => setSelectedBOQ(event.data)}
              loadingOverlayComponent={() => (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-600">Loading BOQ data...</div>
                </div>
              )}
              noRowsOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-gray-400 text-lg mb-2">No BOQ data available</div>
                  <div className="text-gray-500 text-sm">Try adjusting your filters</div>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - BOQ Detail */}
      {selectedBOQ && (
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-soft-lg">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm">BOQ Detail</h3>
                <p className="text-xs text-blue-100 mt-1">{selectedBOQ.id}</p>
              </div>
              <button
                onClick={() => setSelectedBOQ(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* BOQ Info */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">BOQ Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ruas:</span>
                    <span className="text-gray-900">{selectedBOQ.ruas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Program:</span>
                    <span className="text-gray-900">{selectedBOQ.program}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MITRA:</span>
                    <span className="text-gray-900">{selectedBOQ.mitra}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Regional:</span>
                    <span className="text-gray-900">{selectedBOQ.regional}</span>
                  </div>
                </div>
              </div>

              {/* Material Breakdown */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">Material Breakdown</h4>
                <div className="space-y-2">
                  {selectedBOQ.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.kategori}</span>
                      <span className="text-gray-900">Rp {item.total.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                    <span className="text-sm text-gray-900 font-semibold">Total</span>
                    <span className="text-sm text-gray-900 font-semibold">
                      Rp {selectedBOQ.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence Tagging */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">Evidence Tagged</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-900">survey_report.pdf</div>
                      <div className="text-xs text-gray-500">2.4 MB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-900">material_spec.xlsx</div>
                      <div className="text-xs text-gray-500">856 KB</div>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-2 px-3 py-2 border border-dashed border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50">
                  + Add Evidence
                </button>
              </div>

              {/* KML Location */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">KML Location</h4>
                <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center mb-3">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <button className="w-full px-3 py-2 bg-[#005EB8] text-white rounded text-xs hover:bg-[#004a94]">
                  View on Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditBOQModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setBOQToEdit(null);
        }}
        onSubmit={handleEditBOQ}
        boqData={boqToEdit}
      />
      <DeleteBOQModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBOQToDelete(null);
        }}
        onConfirm={handleDeleteBOQ}
        boqData={boqToDelete}
      />
    </div>
  );
}
