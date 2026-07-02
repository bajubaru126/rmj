//BOQTable.tsx
import { AgGridReact } from 'ag-grid-react';
import { ColDef, themeQuartz } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Download, FileText, Edit, Check, Upload, GitCompare } from 'lucide-react';
import { CompareModal } from './compare/CompareModal';
import { BOQ_COLUMNS, normalizeBoq, CompareRow } from './compare/compareAdapters';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import '../kontrak/TabBOQ.css';
import { boqService } from '@/services/boqService';
import { authService } from '@/services/authService';
import { API_CONFIG } from '@/config/api';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DrmUploadModal } from './shared/DrmUploadModal';
import { DrmVersionSelector } from './shared/DrmVersionSelector';
import { drmUploadService, DrmUploadRecord } from '@/services/drmUploadService';
import { ManageFilesModal } from './shared/ManageFilesModal';


interface BOQData {
  id?: string;
  no: number | string;
  designator: string;
  uraianPekerjaan: string;
  satuan: string;
  hargaSatuanMaterial: number | string;
  hargaSatuanJasa: number | string;
  drm: number;
  actual: number;
  tambah: number;
  kurang: number;
  isSummaryRow?: boolean;
  isTotalRow?: boolean;
}

interface TabBOQProps {
  boqItems?: any[];
  boqFileName?: string;
  lokasi?: string;
  projectId?: string;
  linkId?: string;
  onDataChange?: () => void;
  isLoading?: boolean;
  onInitialize?: () => Promise<void>;
  markAsDoneButton?: React.ReactNode;
  /** 'drm' (default) → /boq-drm/link/{id}  |  'installasi' → /boq-installasi/link/{id} */
  dataSource?: 'drm' | 'installasi';
  summary?: {
    total_material: {
      total_drm: number;
      total_actual: number;
      total_tambah: number;
      total_kurang: number;
    };
    total_jasa: {
      total_drm: number;
      total_actual: number;
      total_tambah: number;
      total_kurang: number;
    };
    grand_total: {
      total_drm: number;
      total_actual: number;
      total_tambah: number;
      total_kurang: number;
    };
  };
}

export function TabBOQ(props: TabBOQProps) {
  // Get lokasi from props or use default
  const lokasi = props.lokasi || 'SSH#4 T. CLOUD SUMENEP - T. CLOUD AMBUNTEN';
  
  const [boqItemsState, setBoqItemsState] = useState<any[]>([]);
  const [isBoqLoading, setIsBoqLoading] = useState(false);

  // New multi-version state
  const [versions, setVersions] = useState<DrmUploadRecord[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManageFilesModal, setShowManageFilesModal] = useState(false);

  // Ref to track selectedVersionId without causing re-renders in the fetch effect
  const selectedVersionIdRef = useRef<string | null>(selectedVersionId);
  selectedVersionIdRef.current = selectedVersionId;

  // Counter to force re-fetch when user uploads new data
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const fetchBOQDrmData = useCallback(async () => {
    if (!props.linkId) {
      setBoqItemsState([]);
      return;
    }

    setIsBoqLoading(true);
    try {
      const source = props.dataSource === 'installasi' ? 'boq-installasi' : 'boq-drm';
      console.log(`📥 TabBOQ fetching ${source} data for link:`, props.linkId);
      const token = authService.getToken();
      
      // If it's installasi, keep using the old single-fetch way for now
      if (source === 'boq-installasi') {
        const response = await fetch(`${API_CONFIG.BASE_URL}/${source}/link/${props.linkId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const record = await response.json();
          const docData = record?.data?.doc ?? record?.doc ?? null;
          setBoqItemsState(docData || []);
        } else {
          setBoqItemsState([]);
        }
      } else {
        // It's boq-drm -> use the new multi-version fetch
        const allVersions = await drmUploadService.getAllBoqByLink(props.linkId);
        setVersions(allVersions);
        
        if (allVersions && allVersions.length > 0) {
          const currentSelectedId = selectedVersionIdRef.current;
          // If a version is selected, try to keep it, otherwise pick the latest (first in array)
          let activeVersion = allVersions[0];
          if (currentSelectedId) {
            const found = allVersions.find((v: any) => {
              const vId = drmUploadService.formatRecordId(v.id);
              return vId === currentSelectedId;
            });
            if (found) activeVersion = found;
          }
          
          const vId = drmUploadService.formatRecordId(activeVersion.id);
          setSelectedVersionId(vId);
          setBoqItemsState(activeVersion.doc || []);
        } else {
          setBoqItemsState([]);
          setSelectedVersionId(null);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching BOQ data in TabBOQ:', error);
      setBoqItemsState([]);
    } finally {
      setIsBoqLoading(false);
    }
  }, [props.linkId, props.dataSource]);

  // Fetch BOQ DRM data on mount/change/trigger
  useEffect(() => {
    fetchBOQDrmData();
  }, [fetchBOQDrmData, fetchTrigger]);

  const triggerRefresh = useCallback(() => {
    if (props.onDataChange) {
      props.onDataChange();
    }
  }, [props.onDataChange]);

  const handleVersionChange = (id: string) => {
    setSelectedVersionId(id);
    const selected = versions.find((v: any) => {
      const vId = drmUploadService.formatRecordId(v.id);
      return vId === id;
    });
    if (selected) {
      setBoqItemsState(selected.doc || []);
    }
  };

  // Convert items to BOQData format
  const convertedData: BOQData[] = useMemo(() => {
    const activeItems = boqItemsState.length > 0 ? boqItemsState : (props.boqItems || []);
    console.log('🔄 Converting BOQ items:', activeItems.length, 'items');
    
    if (activeItems && activeItems.length > 0) {
      const converted = activeItems.map((item: any, index: number) => {
        let itemId = item.id;
        if (typeof itemId === 'object' && itemId?.id) {
          itemId = typeof itemId.id === 'string' ? itemId.id : itemId.id?.String;
        }
        
        const convertedItem = {
          id: itemId || String(index + 1),
          no: item.no || index + 1,
          designator: item.designator || '',
          uraianPekerjaan: item.uraian_pekerjaan || item.uraianPekerjaan || '',
          satuan: item.satuan || 'meter',
          hargaSatuanMaterial: parseFloat(item.harga_satuan_material || item.material) || 100,
          hargaSatuanJasa: parseFloat(item.harga_satuan_jasa || item.jasa) || 100,
          drm: parseFloat(item.drm) || 0,
          actual: parseFloat(item.aktual || item.planned || item.actual) || 0,
          tambah: parseFloat(item.tambah) || 0,
          kurang: parseFloat(item.kurang) || 0
        };
        
        return convertedItem;
      });
      return converted;
    }
    return [];
  }, [boqItemsState, props.boqItems]);

  const [rowData, setRowData] = useState<BOQData[]>(convertedData);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BOQData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null); // Track which row is being edited
  const gridRef = useRef<any>(null); // Reference to AG Grid API
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectData, setProjectData] = useState<any>(null); // Project data from API
  const [linkName, setLinkName] = useState<string>(props.lokasi || ''); // Link name for export filename

  // Compare Survey vs DRM
  const [showCompare, setShowCompare] = useState(false);
  const [surveyRows, setSurveyRows] = useState<CompareRow[]>([]);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  const drmRows: CompareRow[] = useMemo(
    () => normalizeBoq(boqItemsState.length > 0 ? boqItemsState : (props.boqItems || [])),
    [boqItemsState, props.boqItems]
  );

  const handleOpenCompare = async () => {
    setShowCompare(true);
    if (!props.projectId) return;
    setLoadingSurvey(true);
    try {
      const data = await boqService.getBOQMatrixByProjectId(props.projectId, props.linkId);
      setSurveyRows(normalizeBoq(data?.items || []));
    } catch (error) {
      console.error('❌ Error fetching survey BOQ for compare:', error);
      toast.error('Gagal memuat data BOQ Survey');
      setSurveyRows([]);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        const parsedItems: any[] = [];
        
        for (let i = 9; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const designator = row[1]?.toString() || '';
          if (!designator || ['Material', 'Jasa', 'Total', 'SUB TOTAL', 'GRAND TOTAL'].includes(designator.trim())) {
            break;
          }
          
          parsedItems.push({
            no: parseInt(row[0]) || (parsedItems.length + 1),
            designator: designator,
            uraian_pekerjaan: row[2]?.toString() || '',
            satuan: row[3]?.toString() || '',
            material: parseFloat(row[4]) || 0,
            jasa: parseFloat(row[5]) || 0,
            drm: parseFloat(row[6]) || 0,
            actual: parseFloat(row[7]) || 0,
            planned: parseFloat(row[7]) || 0,
            tambah: parseFloat(row[8]) || 0,
            kurang: parseFloat(row[9]) || 0,
          });
        }
        
        if (parsedItems.length === 0) {
          toast.error('No valid data rows found in the Excel file');
          setIsLoading(false);
          return;
        }

        const token = authService.getToken();
        const response = await fetch(`${API_CONFIG.BASE_URL}/boq-drm/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            project_id: props.projectId,
            project_name: projectData?.name || '',
            link_id: props.linkId,
            link_name: linkName,
            doc: parsedItems
          })
        });

        if (!response.ok) {
          throw new Error('Failed to upload DRM BOQ');
        }

        toast.success('DRM BOQ Excel uploaded and processed successfully');
        triggerRefresh();
      } catch (err: any) {
        console.error('Error parsing/uploading Excel:', err);
        toast.error(err.message || 'Error processing Excel file');
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const [addFormData, setAddFormData] = useState<BOQData>({
    no: 0,
    designator: '',
    uraianPekerjaan: '',
    satuan: 'meter',
    hargaSatuanMaterial: 0,
    hargaSatuanJasa: 0,
    drm: 0,
    actual: 0,
    tambah: 0,
    kurang: 0
  });

  // Calculate summary rows for bottom of table (not pinned)
  const calculateSummaryRows = useCallback((): BOQData[] => {
    // Use summary from API if available, but recalculate ACTUAL column with correct formula
    if (props.summary) {
      console.log('📊 Using summary from API but recalculating ACTUAL with formula:', props.summary);
      
      // Still need to calculate from convertedData for ACTUAL column
      const totalMaterialCost = convertedData.reduce((sum, item) => {
        return sum + (Number(item.hargaSatuanMaterial) * Number(item.actual));
      }, 0);
      
      const totalJasaCost = convertedData.reduce((sum, item) => {
        return sum + (Number(item.hargaSatuanJasa) * Number(item.actual));
      }, 0);
      
      console.log('📊 API Summary with calculated ACTUAL:');
      console.log(`  Material Cost: ${totalMaterialCost}`);
      console.log(`  Jasa Cost: ${totalJasaCost}`);
      console.log(`  Grand Total: ${totalMaterialCost + totalJasaCost}`);
      
      return [
        {
          id: 'summary-material',
          no: '',
          designator: 'Material',
          uraianPekerjaan: '',
          satuan: '',
          hargaSatuanMaterial: 0, // Don't show individual price in summary
          hargaSatuanJasa: 0,
          drm: props.summary.total_material.total_drm || 0,
          actual: totalMaterialCost, // Use calculated material cost
          tambah: props.summary.total_material.total_tambah || 0,
          kurang: props.summary.total_material.total_kurang || 0,
          isSummaryRow: true
        },
        {
          id: 'summary-jasa',
          no: '',
          designator: 'Jasa',
          uraianPekerjaan: '',
          satuan: '',
          hargaSatuanMaterial: 0,
          hargaSatuanJasa: 0, // Don't show individual price in summary
          drm: props.summary.total_jasa.total_drm || 0,
          actual: totalJasaCost, // Use calculated jasa cost
          tambah: props.summary.total_jasa.total_tambah || 0,
          kurang: props.summary.total_jasa.total_kurang || 0,
          isSummaryRow: true
        },
        {
          id: 'summary-total',
          no: '',
          designator: 'Total',
          uraianPekerjaan: '',
          satuan: '',
          hargaSatuanMaterial: 0,
          hargaSatuanJasa: 0,
          drm: props.summary.grand_total.total_drm || 0,
          actual: totalMaterialCost + totalJasaCost, // Use calculated grand total
          tambah: props.summary.grand_total.total_tambah || 0,
          kurang: props.summary.grand_total.total_kurang || 0,
          isSummaryRow: true,
          isTotalRow: true
        }
      ];
    }

    // Fallback: Calculate totals from convertedData with correct formula
    console.log('📊 Calculating totals from convertedData with new formula');
    
    // Calculate total material cost (harga_material × actual for each row)
    const totalMaterialCost = convertedData.reduce((sum, item) => {
      const materialCost = Number(item.hargaSatuanMaterial) * Number(item.actual);
      console.log(`  ${item.designator}: Material ${item.hargaSatuanMaterial} × Actual ${item.actual} = ${materialCost}`);
      return sum + materialCost;
    }, 0);
    
    // Calculate total jasa cost (harga_jasa × actual for each row)
    const totalJasaCost = convertedData.reduce((sum, item) => {
      const jasaCost = Number(item.hargaSatuanJasa) * Number(item.actual);
      console.log(`  ${item.designator}: Jasa ${item.hargaSatuanJasa} × Actual ${item.actual} = ${jasaCost}`);
      return sum + jasaCost;
    }, 0);
    
    // Calculate other totals (unchanged)
    const totalDRM = convertedData.reduce((sum, item) => sum + item.drm, 0);
    const totalTambah = convertedData.reduce((sum, item) => sum + item.tambah, 0);
    const totalKurang = convertedData.reduce((sum, item) => sum + item.kurang, 0);
    
    console.log('📊 Summary calculations:');
    console.log(`  Total Material Cost: ${totalMaterialCost}`);
    console.log(`  Total Jasa Cost: ${totalJasaCost}`);
    console.log(`  Grand Total Cost: ${totalMaterialCost + totalJasaCost}`);

    return [
      {
        id: 'summary-material',
        no: '',
        designator: 'Material',
        uraianPekerjaan: '',
        satuan: '',
        hargaSatuanMaterial: 0, // Don't show individual price in summary
        hargaSatuanJasa: 0,
        drm: totalDRM,
        actual: totalMaterialCost, // Show calculated material cost in ACTUAL column
        tambah: totalTambah,
        kurang: totalKurang,
        isSummaryRow: true
      },
      {
        id: 'summary-jasa',
        no: '',
        designator: 'Jasa',
        uraianPekerjaan: '',
        satuan: '',
        hargaSatuanMaterial: 0,
        hargaSatuanJasa: 0, // Don't show individual price in summary
        drm: totalDRM,
        actual: totalJasaCost, // Show calculated jasa cost in ACTUAL column
        tambah: totalTambah,
        kurang: totalKurang,
        isSummaryRow: true
      },
      {
        id: 'summary-total',
        no: '',
        designator: 'Total',
        uraianPekerjaan: '',
        satuan: '',
        hargaSatuanMaterial: 0,
        hargaSatuanJasa: 0,
        drm: totalDRM,
        actual: totalMaterialCost + totalJasaCost, // Show grand total cost in ACTUAL column
        tambah: totalTambah,
        kurang: totalKurang,
        isSummaryRow: true,
        isTotalRow: true
      }
    ];
  }, [props.summary, convertedData]);

  // Fetch project data from API
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!props.projectId) return;

      try {
        console.log('🔄 Fetching project data for projectId:', props.projectId);
        const { getProjectById } = await import('@/services/contractService');
        const token = authService.getToken();
        const project = await getProjectById(props.projectId, token);
        console.log('✅ Project data received:', project);
        setProjectData(project);
        
        // Extract link name if linkId is provided
        if (props.linkId && project.links) {
          const link = project.links.find((l: any) => {
            const lId = typeof l.id === 'string' ? l.id : l.id?.id?.String || l.id?.String;
            return lId === props.linkId;
          });
          if (link) {
            setLinkName(link.link_name || props.lokasi || '');
            console.log('✅ Link name found:', link.link_name);
          }
        } else if (props.lokasi) {
          setLinkName(props.lokasi);
        }
      } catch (err) {
        console.error('❌ Error fetching project data:', err);
        setProjectData(null);
      }
    };

    fetchProjectData();
  }, [props.projectId, props.linkId, props.lokasi]);

  // Update rowData when props change, but show empty array when loading
  useEffect(() => {
    const showLoading = props.isLoading || isBoqLoading;
    if (showLoading) {
      console.log('🔄 Loading state active, showing empty table');
      setRowData([]);
    } else {
      console.log('🔄 Updating rowData with convertedData:', convertedData.length, 'items');
      
      // Add summary rows at the end if we have data (as regular rows, not pinned)
      if (convertedData.length > 0) {
        const summaryRows = calculateSummaryRows();
        console.log('📊 Summary rows created:', summaryRows.length, 'rows');
        console.log('📊 Summary rows:', summaryRows.map(r => r.designator));
        const finalData = [...convertedData, ...summaryRows];
        console.log('📊 Final rowData length:', finalData.length, '(', convertedData.length, 'data +', summaryRows.length, 'summary)');
        setRowData(finalData);
      } else {
        setRowData(convertedData);
      }
      
      // Log untuk debugging
      if (convertedData.length === 0) {
        console.log('⚠️ No data available, AG Grid should show "No Rows To Show"');
      }
    }
  }, [convertedData, props.isLoading, isBoqLoading, calculateSummaryRows]);

  const handleAddRow = () => {
    setAddFormData({
      no: rowData.length + 1,
      designator: '',
      uraianPekerjaan: '',
      satuan: 'meter',
      hargaSatuanMaterial: 0,
      hargaSatuanJasa: 0,
      drm: 0,
      actual: 0,
      tambah: 0,
      kurang: 0
    });
    setShowAddModal(true);
  };

  const handleInitializeBOQ = async () => {
    if (!props.linkId) {
      toast.error('Link ID is required to initialize BOQ');
      return;
    }

    setIsLoading(true);
    try {
      const result = await boqService.initializeBOQForLink(props.linkId);
      toast.success(`BOQ initialized successfully! ${result.count} entries created.`);
      
      // Refresh data
      triggerRefresh();
    } catch (error: any) {
      console.error('Error initializing BOQ:', error);
      toast.error(error.message || 'Failed to initialize BOQ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAdd = async () => {
    if (!props.projectId) {
      toast.error('Project ID is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        project_id: props.projectId,
        no: rowData.length + 1,
        designator: addFormData.designator,
        uraian_pekerjaan: addFormData.uraianPekerjaan,
        satuan: addFormData.satuan,
        harga_satuan_material: Number(addFormData.hargaSatuanMaterial),
        harga_satuan_jasa: Number(addFormData.hargaSatuanJasa),
        drm: addFormData.drm,
        planned: addFormData.actual,
        tambah: addFormData.tambah,
        kurang: addFormData.kurang
      };

      await boqService.createBOQPlannedItem(payload);
      toast.success('BOQ item added successfully');
      
      setShowAddModal(false);
      setAddFormData({
        no: 0,
        designator: '',
        uraianPekerjaan: '',
        satuan: 'meter',
        hargaSatuanMaterial: 0,
        hargaSatuanJasa: 0,
        drm: 0,
        actual: 0,
        tambah: 0,
        kurang: 0
      });

      // Refresh data
      triggerRefresh();
    } catch (error: any) {
      console.error('Error adding BOQ item:', error);
      toast.error(error.message || 'Failed to add BOQ item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFormChange = (field: keyof BOQData, value: string | number) => {
    setAddFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportExcel = async () => {
    try {
      console.log('🚀 Starting professional BOQ Excel export...');
      
      // Filter out summary rows from export data
      const dataRows = rowData.filter(item => !item.isSummaryRow);
      const summaryRows = rowData.filter(item => item.isSummaryRow);
      
      console.log('📊 Data rows to export:', dataRows.length);
      console.log('📊 Summary rows to export:', summaryRows.length);

      if (dataRows.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Import ExcelJS
      const ExcelJS = (await import('exceljs')).default;

      // Create workbook and worksheet
      console.log('📝 Creating workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('BOQ Data');
      console.log('✅ Workbook and worksheet created');

      // Add header information (rows 1-6) - use dynamic project data with better formatting (like TabRedLine)
      console.log('📝 Adding header information...');
      worksheet.addRow(['BILL OF QUANTITY']);
      worksheet.addRow([projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ']);
      worksheet.addRow(['No.Kontrak', '', `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}`]);
      worksheet.addRow(['SS / LINK', '', `: ${lokasi}`]);
      worksheet.addRow(['Lokasi', '', `: ${projectData?.location || '-'}`]);
      worksheet.addRow(['Pelaksana', '', `: ${projectData?.pelaksana || '-'}`]);
      
      // Style header rows (like TabRedLine)
      const setHeaderCell = (row: number, col: number, value: string, bold = true, size = 12) => {
        const cell = worksheet.getCell(row, col);
        cell.value = value;
        cell.font = { name: 'Calibri', bold, size };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      };
      
      // Row 1: BILL OF QUANTITY title
      setHeaderCell(1, 1, 'BILL OF QUANTITY', true, 14);
      worksheet.getRow(1).height = 20;
      
      // Row 2: Project name
      setHeaderCell(2, 1, projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ', true, 12);
      worksheet.getRow(2).height = 18;
      
      // Rows 3-6: Info with labels and values
      const infoRows = [
        { row: 3, label: 'No.Kontrak', value: `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}` },
        { row: 4, label: 'SS / LINK', value: `: ${lokasi}` },
        { row: 5, label: 'Lokasi', value: `: ${projectData?.location || '-'}` },
        { row: 6, label: 'Pelaksana', value: `: ${projectData?.pelaksana || '-'}` }
      ];
      
      infoRows.forEach(({ row, label, value }) => {
        setHeaderCell(row, 1, label, true, 11);
        setHeaderCell(row, 3, value, true, 11);
        worksheet.getRow(row).height = 18;
      });
      
      // Add empty row between project info and headers (row 7)
      worksheet.addRow([]);
      worksheet.getRow(7).height = 15;

      // Add the exact header structure from reference (row 8)
      console.log('📝 Creating header structure exactly like reference...');
      const headerRow = [
        'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN', 
        'HARGA SATUAN', '', // HARGA SATUAN spans 2 columns
        `${lokasi}`, '', '', '' // Location spans 4 columns
      ];
      worksheet.addRow(headerRow);

      // Add sub-header row (row 9) - exactly like reference
      const subHeaderRow = [
        'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN',
        'Material', 'Jasa', 'DRM', 'ACTUAL', 'TAMBAH', 'KURANG'
      ];
      worksheet.addRow(subHeaderRow);

      console.log('📝 Adding data rows...');
      // Add data rows (starting from row 10)
      dataRows.forEach((item, index) => {
        console.log(`  Exporting data row ${index + 1}: ${item.designator} - Material: ${item.hargaSatuanMaterial}, Jasa: ${item.hargaSatuanJasa}, Actual: ${item.actual}`);
        const row = [
          index + 1, // Row number
          item.designator || '',
          item.uraianPekerjaan || '',
          item.satuan || '',
          Number(item.hargaSatuanMaterial) || '',
          Number(item.hargaSatuanJasa) || '',
          Number(item.drm) || '',
          Number(item.actual) || '',
          Number(item.tambah) || '',
          Number(item.kurang) || ''
        ];
        worksheet.addRow(row);
      });

      // Add summary rows
      console.log('📝 Adding summary rows...');
      summaryRows.forEach(summaryRow => {
        console.log(`  Exporting summary row: ${summaryRow.designator} - ACTUAL: ${summaryRow.actual}`);
        const row = [
          '', // NO
          summaryRow.designator, // Material, Jasa, or Total
          '', // URAIAN PEKERJAAN
          '', // SATUAN
          Number(summaryRow.hargaSatuanMaterial) || '',
          Number(summaryRow.hargaSatuanJasa) || '',
          Number(summaryRow.drm) || '',
          Number(summaryRow.actual) || '',
          Number(summaryRow.tambah) || '',
          Number(summaryRow.kurang) || ''
        ];
        worksheet.addRow(row);
      });

      console.log('📝 Setting column widths exactly like reference...');
      // Set column widths to match reference exactly - analyzed from screenshot
      worksheet.columns = [
        { width: 6 },   // NO - narrower like reference
        { width: 18 },  // DESIGNATOR - exact width from reference
        { width: 45 },  // URAIAN PEKERJAAN - exact width from reference
        { width: 10 },  // SATUAN - narrower like reference
        { width: 12 },  // Material - exact width from reference
        { width: 12 },  // Jasa - exact width from reference
        { width: 10 },  // DRM - exact width from reference
        { width: 10 },  // ACTUAL - exact width from reference
        { width: 10 },  // TAMBAH - exact width from reference
        { width: 10 }   // KURANG - exact width from reference
      ];

      console.log('🎨 Applying styles exactly like reference...');
      // Style header information (rows 1-6)
      for (let row = 1; row <= 6; row++) {
        const cell = worksheet.getCell(row, 1);
        cell.font = { bold: true, size: row === 1 ? 14 : 11 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' } as any;
      }

      // Style main header row (row 8) - EXACT colors from reference (GRAY, not blue!)
      const mainHeaderRow8 = worksheet.getRow(8);
      mainHeaderRow8.height = 25; // Taller row like reference
      mainHeaderRow8.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 }; // Black text
        
        // Special styling for SS/LINK header (columns 7-10: DRM, ACTUAL, TAMBAH, KURANG)
        if (colNumber >= 7 && colNumber <= 10) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; // Pink salmon soft for SS/LINK header
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray header for other columns
        }
        
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style sub header row (row 9) - EXACT colors from reference (Light gray)
      const subHeaderRow9 = worksheet.getRow(9);
      subHeaderRow9.height = 25; // Taller row like reference
      subHeaderRow9.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 }; // Black text
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; // Light gray like reference
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style data rows (starting from row 10) - exact styling from reference
      const dataStartRow = 10;
      const dataEndRow = dataStartRow + dataRows.length - 1;
      for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        row.height = 20; // Standard row height like reference
        row.eachCell((cell, colNumber) => {
          // Text alignment based on column type
          let alignment: any = { horizontal: 'center', vertical: 'middle' };
          if (colNumber === 3) { // URAIAN PEKERJAAN - left aligned
            alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          cell.font = { size: 10 };
          cell.alignment = alignment;
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      }

      // Style summary rows (bold and colored background) - exact styling from reference
      const summaryStartRow = dataEndRow + 1;
      const summaryEndRow = summaryStartRow + summaryRows.length - 1;
      for (let rowNum = summaryStartRow; rowNum <= summaryEndRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        row.height = 22; // Slightly taller for summary rows
        const summaryRowData = summaryRows[rowNum - summaryStartRow];
        const isTotalRow = summaryRowData?.isTotalRow;
        
        // Merge columns 1-2 (NO + DESIGNATOR) for summary label
        worksheet.mergeCells(rowNum, 1, rowNum, 2);
        
        // Style the merged cell (columns 1-2)
        const firstCell = row.getCell(1);
        firstCell.value = summaryRowData?.designator || '';
        firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
        firstCell.font = { 
          bold: true, 
          color: { argb: isTotalRow ? 'FFFFFFFF' : 'FF000000' },
          size: 10
        };
        firstCell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' } // Dark blue for total, light gray for others
        };
        
        // Style all cells in the row
        row.eachCell((cell, colNumber) => {
          // Skip columns 1-2 (already styled above)
          if (colNumber <= 2) {
            cell.fill = { 
              type: 'pattern', 
              pattern: 'solid', 
              fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
            return;
          }
          
          // For other columns, center align
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { 
            bold: true, 
            color: { argb: isTotalRow ? 'FFFFFFFF' : 'FF000000' },
            size: 10
          };
          cell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: isTotalRow ? 'FF4F81BD' : 'FFE7E6E6' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      }

      console.log('🔗 Merging cells exactly like reference...');
      // Merge cells exactly like reference
      try {
        // Merge duplicate columns between row 8 and 9 for NO, DESIGNATOR, URAIAN PEKERJAAN, SATUAN
        worksheet.mergeCells(8, 1, 9, 1); // NO
        worksheet.mergeCells(8, 2, 9, 2); // DESIGNATOR  
        worksheet.mergeCells(8, 3, 9, 3); // URAIAN PEKERJAAN
        worksheet.mergeCells(8, 4, 9, 4); // SATUAN
        console.log('✅ Merged duplicate header columns');
        
        // Merge HARGA SATUAN header (columns E, F) in row 8
        worksheet.mergeCells(8, 5, 8, 6);
        console.log('✅ Merged HARGA SATUAN header');
        
        // Merge location header (columns G, H, I, J) in row 8
        worksheet.mergeCells(8, 7, 8, 10);
        console.log('✅ Merged location header');
        
      } catch (mergeError) {
        console.warn('⚠️ Could not merge header cells:', mergeError);
      }

      console.log('❄️ Setting freeze panes exactly like reference...');
      // Set freeze panes exactly like reference - freeze at row 7 (before headers)
      worksheet.views = [{
        state: 'frozen',
        xSplit: 0,  // No column freeze
        ySplit: 7,  // Freeze after row 7 (empty row before headers)
        topLeftCell: 'A8' // Active cell in unfrozen area (first header row)
      }];

      console.log('💾 Generating file...');
      // Generate filename with format: BOQ-ProjectName-LinkName-Date.xlsx
      const projectName = projectData?.name || 'Project';
      const linkPart = linkName ? `-${linkName}` : '';
      const datePart = new Date().toISOString().split('T')[0];
      const fileName = `BOQ-${projectName}${linkPart}-${datePart}.xlsx`;

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Professional BOQ Excel exported successfully');
      console.log('✅ Professional BOQ Excel exported successfully:', fileName);
    } catch (error) {
      console.error('❌ Error exporting Excel:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      toast.error(`Failed to export Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Add title
      doc.setFontSize(16);
      doc.text('BOQ Report', 14, 15);
      
      // Add info
      doc.setFontSize(10);
      doc.text(`Location: ${lokasi}`, 14, 22);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 27);
      
      // Filter out summary rows for main table
      const dataRows = rowData.filter(item => !item.isSummaryRow);
      
      // Prepare table data
      const tableData = dataRows.map(item => [
        item.no,
        item.designator,
        item.uraianPekerjaan.substring(0, 40), // Truncate long text
        item.satuan,
        Number(item.hargaSatuanMaterial) || 0,
        Number(item.hargaSatuanJasa) || 0,
        Number(item.drm) || 0,
        Number(item.actual) || 0,
        Number(item.tambah) || 0,
        Number(item.kurang) || 0
      ]);
      
      // Generate main table
      autoTable(doc, {
        head: [['NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN', 'MATERIAL', 'JASA', 'DRM', 'ACTUAL', 'TAMBAH', 'KURANG']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [21, 57, 108], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 60 },
          3: { cellWidth: 15 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 },
          9: { cellWidth: 18 }
        }
      });
      
      // Add summary table
      const summaryRows = rowData.filter(item => item.isSummaryRow);
      if (summaryRows.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY + 5;
        
        const summaryData = summaryRows.map(item => [
          item.designator,
          Number(item.hargaSatuanMaterial) || 0,
          Number(item.hargaSatuanJasa) || 0,
          Number(item.drm) || 0,
          Number(item.actual) || 0,
          Number(item.tambah) || 0,
          Number(item.kurang) || 0
        ]);
        
        autoTable(doc, {
          head: [['SUMMARY', 'MATERIAL', 'JASA', 'DRM', 'ACTUAL', 'TAMBAH', 'KURANG']],
          body: summaryData,
          startY: finalY,
          styles: { fontSize: 8, cellPadding: 2, fontStyle: 'bold' },
          headStyles: { fillColor: [75, 85, 99], textColor: 255 },
          theme: 'grid'
        });
      }
      
      // Save PDF with format: BOQ-ProjectName-LinkName-Date.pdf
      const projectName = projectData?.name || 'Project';
      const linkPart = linkName ? `-${linkName}` : '';
      const datePart = new Date().toISOString().split('T')[0];
      doc.save(`BOQ-${projectName}${linkPart}-${datePart}.pdf`);
      toast.success('PDF file exported successfully');
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  
  const handleEdit = (data: BOQData) => {
    // Start editing the row - we need to use AG Grid API to start editing
    // Find the row node and start editing on the first editable cell
    const gridApi = gridRef.current?.api;
    if (gridApi) {
      // Set editing state FIRST before starting edit
      setEditingRowId(data.id || '');
      
      // Find the row index
      const rowNode = gridApi.getRowNode(data.id || '');
      if (rowNode) {
        const rowIndex = rowNode.rowIndex;
        
        // Small delay to ensure state is set before starting edit
        setTimeout(() => {
          // Start editing on the first editable column (hargaSatuanMaterial)
          gridApi.startEditingCell({
            rowIndex: rowIndex!,
            colKey: 'hargaSatuanMaterial'
          });
          
          // Refresh Actions column after starting edit
          setTimeout(() => {
            gridApi.refreshCells({
              rowNodes: [rowNode],
              columns: ['Actions'],
              force: true
            });
          }, 50);
        }, 50);
      }
    }
  };

  const handleSaveEdit = async () => {
    // Get the edited row data before stopping edit
    const gridApi = gridRef.current?.api;
    if (!gridApi || !editingRowId) return;

    const rowNode = gridApi.getRowNode(editingRowId);
    if (!rowNode) return;

    // Stop editing to commit the changes to the row data
    gridApi.stopEditing(false); // false = don't cancel, save the changes

    // Get the updated data
    const updatedData = rowNode.data;
    
    // Don't update summary rows
    if (updatedData.isSummaryRow) {
      return;
    }

    if (!updatedData.id) {
      toast.error('BOQ item ID is required');
      return;
    }

    if (!selectedVersionId) {
      toast.error('No selected DRM version found');
      return;
    }

    setIsLoading(true);
    try {
      // Map and replace the edited item in the doc array
      const updatedDoc = boqItemsState.map((item, idx) => {
        // Compare by index (id is index+1) or designator
        const itemId = item.id || String(idx + 1);
        if (itemId === updatedData.id || item.designator === updatedData.designator) {
          return {
            ...item,
            no: updatedData.no,
            designator: updatedData.designator,
            uraian_pekerjaan: updatedData.uraianPekerjaan,
            satuan: updatedData.satuan,
            harga_satuan_material: Number(updatedData.hargaSatuanMaterial),
            harga_satuan_jasa: Number(updatedData.hargaSatuanJasa),
            drm: Number(updatedData.drm),
            tambah: Number(updatedData.tambah),
            kurang: Number(updatedData.kurang),
            aktual: Number(updatedData.actual)
          };
        }
        return item;
      });

      console.log('📤 Updating DRM BOQ doc for record:', selectedVersionId);
      await drmUploadService.updateDoc('boq', selectedVersionId, updatedDoc);
      toast.success('BOQ item updated successfully');

      // Refresh data
      setFetchTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('❌ Error updating BOQ item:', error);
      toast.error(error.message || 'Failed to update BOQ item');
      setFetchTrigger(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setEditingRowId(null);
    }
  };

  const handleCancelEdit = () => {
    // Stop editing and discard changes
    const gridApi = gridRef.current?.api;
    if (gridApi) {
      const currentEditingRowId = editingRowId;
      
      // Clear editing state first
      setEditingRowId(null);
      
      // Then stop editing (this will trigger onRowEditingStopped)
      gridApi.stopEditing(true); // true = cancel, discard changes
      
      // Refresh Actions column after a short delay
      if (currentEditingRowId) {
        const rowNode = gridApi.getRowNode(currentEditingRowId);
        if (rowNode) {
          setTimeout(() => {
            gridApi.refreshCells({
              rowNodes: [rowNode],
              columns: ['Actions'],
              force: true
            });
          }, 50);
        }
      }
    }
  };

  const handleDelete = (data: BOQData) => {
    setSelectedItem(data);
    setShowDeleteModal(true);
  };

  // Handle cell value change (when user finishes editing a cell)
  // This is just for local state update, actual save happens when user clicks checkmark
  const handleCellValueChanged = (params: any) => {
    // Just update local state, don't save to backend yet
    console.log('📝 Cell value changed:', params.colDef.field, '=', params.newValue);
  };

  // Handle when row editing starts
  const handleRowEditingStarted = (params: any) => {
    // Just log, don't set state here (already set in handleEdit)
    const rowId = params.data?.id;
    console.log('🔧 Row editing started:', rowId, 'editingRowId already set to:', editingRowId);
  };

  // Handle when row editing stops (user presses Enter or clicks outside)
  const handleRowEditingStopped = (params: any) => {
    // Clear editing state when editing stops
    console.log('🔧 Row editing stopped');
    const previousEditingRowId = editingRowId;
    setEditingRowId(null);
    
    // Refresh Actions column after clearing state
    const gridApi = gridRef.current?.api;
    if (gridApi && previousEditingRowId) {
      const rowNode = gridApi.getRowNode(previousEditingRowId);
      if (rowNode) {
        setTimeout(() => {
          gridApi.refreshCells({
            rowNodes: [rowNode],
            columns: ['Actions'],
            force: true
          });
        }, 50);
      }
    }
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!selectedItem) {
      toast.error('BOQ item is required');
      return;
    }
    if (!selectedVersionId) {
      toast.error('No selected DRM version found');
      return;
    }

    setIsLoading(true);
    try {
      const updatedDoc = boqItemsState.filter((item, idx) => {
        const itemId = item.id || String(idx + 1);
        return itemId !== selectedItem.id && item.designator !== selectedItem.designator;
      });

      console.log('🗑️ Deleting item from DRM BOQ doc for record:', selectedVersionId);
      await drmUploadService.updateDoc('boq', selectedVersionId, updatedDoc);
      toast.success('BOQ item deleted successfully');
      
      setShowDeleteModal(false);
      setSelectedItem(null);

      // Refresh data
      setFetchTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error deleting BOQ item:', error);
      toast.error(error.message || 'Failed to delete BOQ item');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom cell renderer for summary rows to handle empty cells properly and column spanning
  const SummaryCellRenderer = (params: any) => {
    // Check if this is a summary row
    const isSummaryRow = params.data?.isSummaryRow;
    
    // For regular rows, show value normally
    if (!isSummaryRow) {
      return params.value !== null && params.value !== undefined ? params.value : '';
    }

    // For summary rows, handle different columns
    const field = params.colDef.field;
    
    // For NO column in summary rows, show the designator value (Material/Jasa/Total) with left alignment
    if (field === 'no') {
      const label = params.data.designator || '';
      console.log('🏷️ Rendering NO cell for summary row:', label);
      return (
        <div style={{ 
          fontWeight: params.data?.isTotalRow ? '700' : '600', 
          color: '#495057',
          textAlign: 'left',
          paddingLeft: '12px',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center'
        }}>
          {label}
        </div>
      );
    }
    
    // For DESIGNATOR column in summary rows, hide it (because it's merged with NO)
    if (field === 'designator') {
      return '';
    }
    
    // Show value only for specific columns
    if (field === 'hargaSatuanMaterial' || field === 'hargaSatuanJasa' || 
        field === 'drm' || field === 'actual' || field === 'tambah' || field === 'kurang') {
      const value = params.value;
      
      // For Material row: show value in hargaSatuanMaterial column, hide in hargaSatuanJasa
      if (params.data.designator === 'Material') {
        if (field === 'hargaSatuanJasa') return '';
        return value !== null && value !== undefined ? value.toString() : '0';
      }
      
      // For Jasa row: show value in hargaSatuanJasa column, hide in hargaSatuanMaterial
      if (params.data.designator === 'Jasa') {
        if (field === 'hargaSatuanMaterial') return '';
        return value !== null && value !== undefined ? value.toString() : '0';
      }
      
      // For Total row: show both Material and Jasa values
      if (params.data.designator === 'Total') {
        return value !== null && value !== undefined ? value.toString() : '0';
      }
      
      return value !== null && value !== undefined ? value.toString() : '';
    }
    
    // For other columns in summary rows, show empty
    return '';
  };

  
  // Actions Cell Renderer for inline editing
  const ActionsCellRenderer = (params: any) => {
    // Don't show actions for summary rows
    if (params.data?.isSummaryRow) {
      return null;
    }
    
    // Get editingRowId from context
    const currentEditingRowId = params.context?.editingRowId;
    const isEditing = currentEditingRowId === params.data?.id;
    
    console.log('🎨 Rendering Actions for row:', params.data?.id, 'isEditing:', isEditing, 'editingRowId:', currentEditingRowId);
    
    if (isEditing) {
      // Show Save (Check) and Cancel (X) buttons when editing
      return (
        <div className="flex items-center justify-center gap-1">
          <button 
            className="p-1 hover:bg-green-100 rounded" 
            title="Save"
            onClick={(e) => {
              e.stopPropagation();
              params.context.handleSaveEdit();
            }}
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button 
            className="p-1 hover:bg-red-100 rounded" 
            title="Cancel"
            onClick={(e) => {
              e.stopPropagation();
              params.context.handleCancelEdit();
            }}
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      );
    }
    
    // Show Edit and Delete buttons when not editing
    return (
      <div className="flex items-center justify-center gap-1">
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            params.context.handleEdit(params.data);
          }}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            params.context.handleDelete(params.data);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  const columnDefs: ColDef<BOQData>[] = useMemo(() => [
    {
      headerName: 'NO',
      field: 'no',
      width: 80,
      cellClass: 'cell-center',
      cellStyle: { textAlign: 'center' },
      cellRenderer: SummaryCellRenderer,
      editable: false, // Not editable
      colSpan: (params: any) => {
        // For summary rows, span 2 columns (NO + DESIGNATOR)
        if (params.data?.isSummaryRow) {
          return 2;
        }
        return 1;
      }
    },
    {
      headerName: 'DESIGNATOR',
      field: 'designator',
      width: 150,
      cellRenderer: SummaryCellRenderer,
      editable: false // Not editable
    },
    {
      headerName: 'URAIAN PEKERJAAN',
      field: 'uraianPekerjaan',
      flex: 1,
      minWidth: 300,
      wrapText: true,
      autoHeight: true,
      cellRenderer: SummaryCellRenderer,
      editable: false // Not editable
    },
    {
      headerName: 'SATUAN',
      field: 'satuan',
      width: 120,
      cellStyle: { textAlign: 'center' },
      cellRenderer: SummaryCellRenderer,
      editable: false // Not editable
    },
    {
      headerName: 'HARGA SATUAN',
      children: [
        {
          headerName: 'Material',
          field: 'hargaSatuanMaterial',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: (params: any) => !params.data?.isSummaryRow, // Editable for non-summary rows
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 0
          }
        },
        {
          headerName: 'Jasa',
          field: 'hargaSatuanJasa',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: (params: any) => !params.data?.isSummaryRow, // Editable for non-summary rows
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 0
          }
        }
      ]
    },
    {
      headerName: lokasi, // Use dynamic lokasi from props
      children: [
        {
          headerName: 'DRM',
          field: 'drm',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: (params: any) => !params.data?.isSummaryRow, // Editable for non-summary rows
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 2
          }
        },
        {
          headerName: 'ACTUAL',
          field: 'actual',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: false // Not editable (read-only)
        },
        {
          headerName: 'TAMBAH',
          field: 'tambah',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: (params: any) => !params.data?.isSummaryRow, // Editable for non-summary rows
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 2
          }
        },
        {
          headerName: 'KURANG',
          field: 'kurang',
          width: 120,
          cellStyle: { textAlign: 'right' },
          cellRenderer: SummaryCellRenderer,
          editable: (params: any) => !params.data?.isSummaryRow, // Editable for non-summary rows
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: {
            min: 0,
            precision: 2
          }
        }
      ]
    },
    // Action column for inline editing
    { 
      headerName: 'Actions', 
      width: 120,
      cellRenderer: ActionsCellRenderer,
      cellRendererParams: {
        editingRowId: editingRowId,
        handleEdit: handleEdit,
        handleDelete: handleDelete,
        handleSaveEdit: handleSaveEdit,
        handleCancelEdit: handleCancelEdit
      },
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
      editable: false // Not editable
    }
  ], [lokasi, editingRowId]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="flex flex-col bg-white relative">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-medium" style={{fontWeight : 600}}>BOQ Data</h3>
          <p className="text-sm text-gray-500 mt-1">Bill of Quantity - Detail pekerjaan dan volume</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Show Initialize button only if no data */}
          {!props.isLoading && rowData.length === 0 && props.linkId && (
            <button
              onClick={handleInitializeBOQ}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.37)',
                transition: 'all 0.3s ease',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 1) 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(59, 130, 246, 0.37)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)';
                }
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Initialize BOQ</span>
            </button>
          )}

          {/* New Selector and Upload Button for DRM */}
          {props.dataSource !== 'installasi' && (
            <div className="flex items-center gap-2 mr-2">
              <DrmVersionSelector 
                versions={versions} 
                selectedId={selectedVersionId} 
                onChange={handleVersionChange} 
              />
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={props.isLoading}
                className="flex items-center gap-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%)',
                  padding: '8px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px 0 rgba(109, 40, 217, 0.37)',
                }}
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          )}

          {props.dataSource !== 'installasi' && (
            <button
              onClick={() => setShowManageFilesModal(true)}
              disabled={props.isLoading}
              className="flex items-center gap-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.9) 0%, rgba(55, 65, 81, 0.9) 100%)',
                padding: '8px 16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(55, 65, 81, 0.3)',
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Manage Files</span>
            </button>
          )}

          <button
            onClick={handleOpenCompare}
            disabled={props.isLoading}
            className="flex items-center gap-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(79, 70, 229, 0.95) 100%)',
              padding: '8px 16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(79, 70, 229, 0.37)',
            }}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={props.isLoading || rowData.length === 0}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: (props.isLoading || rowData.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.37)',
              transition: 'all 0.3s ease',
              opacity: (props.isLoading || rowData.length === 0) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!props.isLoading && rowData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(16, 185, 129, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!props.isLoading && rowData.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(16, 185, 129, 0.37)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)';
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={props.isLoading || rowData.length === 0}
            style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: (props.isLoading || rowData.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px 0 rgba(220, 38, 38, 0.37)',
              transition: 'all 0.3s ease',
              opacity: (props.isLoading || rowData.length === 0) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!props.isLoading && rowData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(220, 38, 38, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 1) 0%, rgba(185, 28, 28, 1) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!props.isLoading && rowData.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(220, 38, 38, 0.37)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)';
              }
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          {props.markAsDoneButton}
          {/* Hide Add Row button - feature not ready yet */}
          {/* <button
            onClick={handleAddRow}
            disabled={props.isLoading}
            style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: props.isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.37)',
            transition: 'all 0.3s ease',
            opacity: props.isLoading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!props.isLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(16, 185, 129, 0.5)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)';
            }
          }}
          onMouseLeave={(e) => {
            if (!props.isLoading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(16, 185, 129, 0.37)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)';
            }
          }}
        >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button> */}
        </div>
      </div>
      
      <div className="p-4 overflow-auto">
        <div className={`ag-theme-quartz w-full boq-table-custom ${props.isLoading ? 'ag-grid-loading' : ''}`}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            pagination={false}
            theme={themeQuartz}
            loading={props.isLoading}
            context={{ editingRowId, handleEdit, handleDelete, handleSaveEdit, handleCancelEdit }}
            editType="fullRow"
            suppressClickEdit={true}
            onCellValueChanged={handleCellValueChanged}
            suppressRowClickSelection={true}
            getRowId={(params) => params.data.id || String(params.data.no)}
            getRowHeight={(params) => {
              // Ensure all rows have the same height, including summary rows
              return 42;
            }}
            getRowClass={(params) => {
              // Add class for summary rows
              if (params.data?.isSummaryRow) {
                return params.data?.isTotalRow ? 'summary-row-total' : 'summary-row';
              }
              return undefined;
            }}
            getRowStyle={(params) => {
              // Style summary rows with header color
              if (params.data?.isSummaryRow) {
                return {
                  backgroundColor: '#F8F9FA',
                  fontWeight: params.data?.isTotalRow ? '700' : '600',
                  fontSize: '13px',
                  color: '#495057'
                };
              }
              return undefined;
            }}
            domLayout="autoHeight"
            overlayLoadingTemplate='<div style="padding: 20px; font-size: 14px; color: #6b7280; display: flex; flex-direction: column; align-items: center; gap: 12px;"><div style="display: flex; gap: 4px; align-items: center;"><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur1 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur2 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur3 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur4 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur5 1.2s ease-in-out infinite;"></div></div><div style="font-weight: 600; color: #374151;">Loading BOQ Data...</div><div style="font-size: 12px; color: #9ca3af;">Please wait</div></div><style>@keyframes blinkblur1 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur2 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur3 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur4 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur5 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } }</style>'
            overlayNoRowsTemplate='<span style="padding: 20px; font-size: 14px; color: #6b7280;">No Rows To Show</span>'
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-md overflow-hidden" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete BOQ Item</h3>
                  <p className="text-sm text-gray-500 mt-1">Are you sure you want to delete this item?</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-auto">
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">NO:</span>
                    <span className="font-medium text-gray-900">{selectedItem?.no}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Designator:</span>
                    <span className="font-medium text-gray-900">{selectedItem?.designator}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Uraian:</span>
                    <p className="font-medium text-gray-900 mt-1">{selectedItem?.uraianPekerjaan}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#b91c1c' }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#ef4444')}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#b91c1c')}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Modal */}
      {props.projectId && props.linkId && (
        <DrmUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setSelectedVersionId(null);
            setFetchTrigger(prev => prev + 1);
            triggerRefresh();
          }}
          drmType="boq"
          projectId={props.projectId}
          linkId={props.linkId}
        />
      )}

      {/* Add BOQ Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setShowAddModal(false)}>
          <div className="bg-white shadow-2xl w-full flex flex-col" style={{ 
            maxWidth: '780px',
            maxHeight: '85vh',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex items-center justify-between relative" style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              flexShrink: 0
            }}>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white" style={{ fontWeight: 900 }}>Add BOQ Item</h3>
                <p className="text-sm text-white mt-1" style={{ fontWeight: 500 }}>Add new BOQ item to the list</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all relative z-10"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 opacity-20" style={{ 
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 60%)'
              }}></div>
            </div>

            <div className="p-6" style={{ 
              background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
              overflowY: 'auto',
              flexShrink: 1,
              flexGrow: 1
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Designator</label>
                  <input
                    type="text"
                    value={addFormData.designator}
                    onChange={(e) => handleAddFormChange('designator', e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                    placeholder="e.g., BC-OF-SM-48C"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Satuan</label>
                  <select
                    value={addFormData.satuan}
                    onChange={(e) => handleAddFormChange('satuan', e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  >
                    <option value="meter">meter</option>
                    <option value="pcs">pcs</option>
                    <option value="core">core</option>
                    <option value="unit">unit</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Uraian Pekerjaan</label>
                  <textarea
                    value={addFormData.uraianPekerjaan}
                    onChange={(e) => handleAddFormChange('uraianPekerjaan', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                    placeholder="Deskripsi pekerjaan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Harga Satuan Material</label>
                  <input
                    type="number"
                    value={addFormData.hargaSatuanMaterial}
                    onChange={(e) => handleAddFormChange('hargaSatuanMaterial', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Harga Satuan Jasa</label>
                  <input
                    type="number"
                    value={addFormData.hargaSatuanJasa}
                    onChange={(e) => handleAddFormChange('hargaSatuanJasa', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">DRM</label>
                  <input
                    type="number"
                    value={addFormData.drm}
                    onChange={(e) => handleAddFormChange('drm', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Actual</label>
                  <input
                    type="number"
                    value={addFormData.actual}
                    onChange={(e) => handleAddFormChange('actual', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Tambah</label>
                  <input
                    type="number"
                    value={addFormData.tambah}
                    onChange={(e) => handleAddFormChange('tambah', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Kurang</label>
                  <input
                    type="number"
                    value={addFormData.kurang}
                    onChange={(e) => handleAddFormChange('kurang', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3" style={{ 
              background: 'linear-gradient(to top, #f9fafb 0%, #ffffff 100%)',
              flexShrink: 0
            }}>
              <button 
                onClick={() => setShowAddModal(false)}
                disabled={isLoading}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAdd}
                disabled={isLoading}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                  }
                }}
              >
                {isLoading ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CompareModal
        open={showCompare}
        onClose={() => setShowCompare(false)}
        title="Compare BOQ — Survey vs DRM"
        subtitle={linkName || lokasi}
        columns={BOQ_COLUMNS}
        leftRows={surveyRows}
        rightRows={drmRows}
        loadingLeft={loadingSurvey}
      />

      <ManageFilesModal
        isOpen={showManageFilesModal}
        onClose={() => setShowManageFilesModal(false)}
        onDeleteSuccess={() => {
          setFetchTrigger(prev => prev + 1);
          triggerRefresh();
        }}
        drmType="boq"
        linkId={props.linkId || ''}
        linkName={linkName || lokasi}
      />
    </div>
  );
}
