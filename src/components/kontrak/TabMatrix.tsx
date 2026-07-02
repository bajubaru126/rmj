import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { X, Upload, Trash2, Edit, Sparkles, MapPin, Ruler, Tag, Navigation, Download, FileText } from 'lucide-react';
import { OrbitProgress } from 'react-loading-indicators';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import './TabMatrix.css';
import { matrixService } from '@/services/matrixService';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface MatrixRowData {
  spanGroup: string;
  span: string;
  offset: string;
  offset_from: string;
  offset_to: string;
  length: string | number;
  depth: string;
  location: string;
  designator: string;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  [key: string]: string | number | string[] | boolean | undefined;
}

interface TabMatrixProps {
  contractId: string;
  contractName: string;
  linkId?: string; // Add linkId prop for filtering
  markAsDoneButton?: React.ReactNode; // Optional Mark as Done button from wrapper
}

export function TabMatrix({ contractId, contractName, linkId, markAsDoneButton }: TabMatrixProps) {
  const [selectedRow, setSelectedRow] = useState<MatrixRowData | null>(null);
  const [showAddSurveyModal, setShowAddSurveyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic'>(() => {
    const savedTab = localStorage.getItem('tabMatrixActiveTab');
    return (savedTab as 'manual' | 'automatic') || 'automatic';
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any>(null);
  
  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tabMatrixActiveTab', activeTab);
  }, [activeTab]);
  
  const [surveyForm, setSurveyForm] = useState({
    span: '',
    designator: '',
    length: '',
    a: '',
    b: '',
    longitudeA: '',
    latitudeA: '',
    longitudeB: '',
    latitudeB: '',
    soilType: '',
  });
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editingRow, setEditingRow] = useState<MatrixRowData | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // Base64 photos from existing row
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<MatrixRowData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for modal editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{[key: string]: any}>({});

  // State untuk matrix data
  const [allMatrixData, setAllMatrixData] = useState<MatrixRowData[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<ColDef[]>([]);
  const [designatorColumns, setDesignatorColumns] = useState<ColDef[]>([]);
  const [designatorsLoaded, setDesignatorsLoaded] = useState<boolean>(false);
  
  // State untuk project data
  const [projectData, setProjectData] = useState<any>(null);
  const [linkName, setLinkName] = useState<string>(''); // Link name for export filename

  // Helper function for value formatting
  const formatCellValue = (params: any) => {
    const value = params.value;
    const isGrandTotalRow = params.data?.isRekapGrandTotal || params.data?.isRekapGrandTotalRounded;
    const isGroupRow = params.node?.group;
    
    // For grand total rows, show 0 as "-"
    if (isGrandTotalRow) {
      if (value === null || value === undefined || value === 0) return '-';
      if (typeof value === 'number') {
        return value.toString();
      }
      return value.toString();
    }
    
    // For group rows (aggregated values), show 0 as "-"
    if (isGroupRow) {
      if (value === null || value === undefined || value === 0) return '-';
      if (typeof value === 'number') {
        return value.toString();
      }
      return value.toString();
    }
    
    // For other rows (regular data rows and subtotal rows)
    if (value === null || value === undefined || value === 0) return '-';
    if (typeof value === 'number') {
      return value.toString();
    }
    return value.toString();
  };

  // Helper function to render cell value (hide values in all group rows)
  const cellValueRenderer = (params: any) => {
    // Debug log for SUB TOTAL rows - ALWAYS log for debugging
    if (params.data?.rekapLabel && (params.data.rekapLabel.includes('SUB TOTAL') || params.data.rekapLabel.includes('SUBT TOTAL'))) {
      console.log(`🎨 cellValueRenderer CALLED for SUB TOTAL:`, {
        field: params.colDef.field,
        value: params.value,
        isRekapSubTotal: params.data?.isRekapSubTotal,
        isSpanSubTotal: params.data?.isSpanSubTotal, // Add manual SUB TOTAL debug
        isRekapGrandTotal: params.data?.isRekapGrandTotal,
        rekapLabel: params.data?.rekapLabel,
        allDataKeys: Object.keys(params.data || {}).slice(0, 20)
      });
    }
    
    // For REKAPITULASI SUB TOTAL rows, show the values
    if (params.data?.isRekapSubTotal || params.data?.isRekapGrandTotal || params.data?.isRekapGrandTotalRounded) {
      const value = params.value;
      // Show "-" for null, undefined, or 0
      if (value === null || value === undefined || value === 0) return '-';
      return value.toString();
    }
    
    // CRITICAL: For manual SPAN SUB TOTAL rows, show the values (same as REKAPITULASI)
    if (params.data?.isSpanSubTotal) {
      const value = params.value;
      // Show "-" for null, undefined, or 0
      if (value === null || value === undefined || value === 0) return '-';
      return value.toString();
    }
    
    // Hide values in all group rows
    if (params.node.group) {
      return '';
    }
    // For other cells, use the formatted value
    const formattedValue = params.valueFormatted || params.value;
    // Convert 0 to "-"
    if (formattedValue === '0' || formattedValue === 0) return '-';
    return formattedValue;
  };

  // Helper function for designator columns - EXACT COPY of cellValueRenderer logic
  const designatorCellRenderer = (params: any) => {
    // CRITICAL DEBUG: Log group footer (SUB TOTAL in expanded span)
    if (params.node.footer) {
      console.log(`🎯 GROUP FOOTER (SUB TOTAL in expanded span) for field: ${params.colDef.field} = ${params.value}`, {
        field: params.colDef.field,
        value: params.value,
        nodeKey: params.node.key,
        isFooter: params.node.footer,
        aggData: params.node.aggData,
        groupData: params.node.groupData
      });
    }
    
    // EXACT SAME DEBUG LOG as cellValueRenderer
    if (params.data?.rekapLabel && (params.data.rekapLabel.includes('SUB TOTAL') || params.data.rekapLabel.includes('SUBT TOTAL'))) {
      console.log(`🎨 designatorCellRenderer CALLED for SUB TOTAL:`, {
        field: params.colDef.field,
        value: params.value,
        isRekapSubTotal: params.data?.isRekapSubTotal,
        isSpanSubTotal: params.data?.isSpanSubTotal, // Add manual SUB TOTAL debug
        isRekapGrandTotal: params.data?.isRekapGrandTotal,
        rekapLabel: params.data?.rekapLabel,
        allDataKeys: Object.keys(params.data || {}).slice(0, 20)
      });
    }
    
    // CRITICAL: Handle group footer (SUB TOTAL in expanded span) - but this is now disabled
    if (params.node.footer) {
      const value = params.value;
      // Show "-" for null, undefined, or 0
      if (value === null || value === undefined || value === 0) return '-';
      return value.toString();
    }
    
    // EXACT SAME LOGIC as cellValueRenderer - NO CHANGES
    // For REKAPITULASI SUB TOTAL rows, show the values
    if (params.data?.isRekapSubTotal || params.data?.isRekapGrandTotal || params.data?.isRekapGrandTotalRounded) {
      const value = params.value;
      // Show "-" for null, undefined, or 0
      if (value === null || value === undefined || value === 0) return '-';
      return value.toString();
    }
    
    // CRITICAL: For manual SPAN SUB TOTAL rows, show the values (same as REKAPITULASI)
    if (params.data?.isSpanSubTotal) {
      const value = params.value;
      // Show "-" for null, undefined, or 0
      if (value === null || value === undefined || value === 0) return '-';
      return value.toString();
    }
    
    // Hide values in all group rows
    if (params.node.group) {
      return '';
    }
    // For other cells, use the formatted value
    const formattedValue = params.valueFormatted || params.value;
    // Convert 0 to "-"
    if (formattedValue === '0' || formattedValue === 0) return '-';
    return formattedValue;
  };

  // Fetch designators from API
  useEffect(() => {
    const fetchDesignators = async () => {
      try {
        console.log('🔄 Fetching designators from API...');
        
        // Use designatorV2Service for consistency
        const { designatorV2Service } = await import('@/services/designatorV2Service');
        const designators = await designatorV2Service.getAllDesignators();
        
        console.log('✅ Designators received:', designators);

        // Sort by 'no' field and extract 'name'
        const sortedDesignators = designators
          .sort((a: any, b: any) => (a.no || 0) - (b.no || 0))
          .map((d: any) => d.name);

        console.log('📋 Sorted designator names:', sortedDesignators);
        
        // CRITICAL DEBUG: Check if the fields that should have values are in the designator list
        const fieldsWithValues = ['DD-RV-1', 'BC-TR-SOIL-3', 'TC-SM-48', 'DC-OF-SM-48C', 'DD-BMR-1', 'MH-HH2', 'DD-DA-S2'];
        const missingFields = fieldsWithValues.filter(field => !sortedDesignators.includes(field));
        const presentFields = fieldsWithValues.filter(field => sortedDesignators.includes(field));
        
        console.log('🔍 Fields that should have values in SUB TOTAL:', fieldsWithValues);
        console.log('✅ Present in designator list:', presentFields);
        console.log('❌ Missing from designator list:', missingFields);

        // Create column definitions for each designator
        const designatorCols: ColDef[] = sortedDesignators
          .filter((name: string) => name && typeof name === 'string') // Filter out invalid names
          .map((name: string) => {
            // Check if field name contains a dot - AG Grid treats dots as nested property accessors
            const hasDot = name.includes('.');
            
            return {
              colId: name, // Use colId for unique identification
              field: name, // Keep field for AG Grid to work properly
              headerName: name.toUpperCase(),
              width: 150,
              aggFunc: 'sum',
              valueFormatter: formatCellValue,
              cellRenderer: designatorCellRenderer,
              // Use valueGetter for ALL designator columns to ensure consistent behavior
              valueGetter: (params: any) => {
                if (!params.data) return undefined;
                
                // Access the field directly using bracket notation to avoid dot interpretation
                const value = params.data[name];
                
                // Debug for problematic columns
                if (name === 'PU-S9.0-140' || name === 'PU-S7.0-140') {
                  console.log(`🔍 valueGetter for ${name}:`, {
                    field: name,
                    value,
                    valueType: typeof value,
                    hasDot,
                    dataKeys: Object.keys(params.data).filter(k => k.includes('PU-S')),
                    hasField: name in params.data,
                    directAccess: params.data[name]
                  });
                }
                
                // CRITICAL DEBUG: Log for fields that should have values in SUB TOTAL
                if ((params.data?.isRekapSubTotal || params.data?.isSpanSubTotal) && (name === 'DD-RV-1' || name === 'BC-TR-SOIL-3' || name === 'TC-SM-48' || name === 'DC-OF-SM-48C' || name === 'DD-BMR-1' || name === 'MH-HH2' || name === 'DD-DA-S2')) {
                  console.log(`🔍 valueGetter for SUB TOTAL field ${name}:`, {
                    field: name,
                    value,
                    valueType: typeof value,
                    isRekapSubTotal: params.data?.isRekapSubTotal,
                    isSpanSubTotal: params.data?.isSpanSubTotal,
                    rekapLabel: params.data?.rekapLabel,
                    designator: params.data?.designator,
                    hasField: name in params.data,
                    allDataKeys: Object.keys(params.data).slice(0, 20)
                  });
                }
                
                return value;
              }
            };
          });

        // Debug: Check for columns with dots
        const colsWithDots = designatorCols.filter(col => (col.colId as string).includes('.'));
        if (colsWithDots.length > 0) {
          console.log('⚠️ Columns with dots in field name (using valueGetter):', colsWithDots.map(c => c.colId));
        }

        setDesignatorColumns(designatorCols);
        setDesignatorsLoaded(true);  // Mark as loaded
        console.log('✅ Designator columns created:', designatorCols.length);

      } catch (err) {
        console.error('❌ Error fetching designators:', err);
        // Fallback to empty array if fetch fails
        setDesignatorColumns([]);
        setDesignatorsLoaded(true);  // Still mark as loaded even on error
      }
    };

    fetchDesignators();
  }, []);

  // Fetch project data from API
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!contractId) return;

      try {
        console.log('🔄 Fetching project data for contractId:', contractId);
        const { getProjectById } = await import('@/services/contractService');
        const project = await getProjectById(contractId);
        console.log('✅ Project data received:', project);
        setProjectData(project);
        
        // Extract link name if linkId is provided
        if (linkId && project.links) {
          const link = project.links.find((l: any) => {
            const lId = typeof l.id === 'string' ? l.id : l.id?.id?.String || l.id?.String;
            return lId === linkId;
          });
          if (link) {
            setLinkName(link.link_name || '');
            console.log('✅ Link name found:', link.link_name);
          }
        }
      } catch (err) {
        console.error('❌ Error fetching project data:', err);
        setProjectData(null);
      }
    };

    fetchProjectData();
  }, [contractId, linkId]);

  // Fetch matrix data from API
  useEffect(() => {
    // Wait for designators to be loaded first
    if (!designatorsLoaded) {
      console.log('⏳ Waiting for designators to load before fetching matrix...');
      return;
    }
    
    const fetchMatrixData = async () => {
      if (!contractId) return;

      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Fetching matrix data for project:', contractId);
        console.log(`📊 Designator columns ready: ${designatorColumns.length}`);
        
        // If linkId is provided, first fetch spans to get span IDs that belong to this link
        let spanIdsForLink: Set<string> | null = null;
        
        if (linkId) {
          console.log('🔍 Fetching spans for linkId:', linkId);
          const { spanService } = await import('@/services/spanService');
          const { authService } = await import('@/services/authService');
          authService.getToken();
          
          try {
            const spansForLink = await spanService.getSpansByProjectIdAndLinkId(contractId, linkId);
            console.log('✅ Found', spansForLink.length, 'spans for link:', linkId);
            
            // Extract span IDs
            spanIdsForLink = new Set(
              spansForLink.map(span => {
                // Extract ID from nested structure
                if (typeof span.id === 'string') {
                  return span.id;
                } else if (span.id && typeof span.id === 'object') {
                  const nestedId = (span.id as any).id;
                  if (typeof nestedId === 'string') {
                    return nestedId;
                  } else if (nestedId && nestedId.String) {
                    return nestedId.String;
                  }
                }
                return '';
              }).filter(id => id !== '')
            );
            
            console.log('📋 Span IDs for link:', Array.from(spanIdsForLink));
          } catch (spanError) {
            console.error('❌ Error fetching spans for link:', spanError);
            // Continue with matrix fetch even if span fetch fails
          }
        }
        
        const response = await matrixService.getMatrixByProjectId(contractId);
        console.log('✅ Matrix data received:', response);

        // Extract and store grand total data
        const grandTotal: any = {
          grand_total_length: response.grand_total_length || 0,
          grand_total_slack_berbayar: response.grand_total_slack_berbayar || 0,
          grand_total_fo_total: response.grand_total_fo_total || 0,
          grand_total_slack_tidak_berbayar: response.grand_total_slack_tidak_berbayar || 0,
          grand_total_tol_2_persen: response.grand_total_tol_2_persen || 0,
          grand_total_pengadaan: response.grand_total_pengadaan || 0,
          grand_total_bm: response.grand_total_bm || 0,
          grand_total_s3: response.grand_total_s3 || 0,
          grand_total_ds: response.grand_total_ds || 0,
          grand_total_bss: response.grand_total_bss || 0,
          grand_total_bts: response.grand_total_bts || 0,
          grand_total_da: response.grand_total_da || 0,
          grand_total_hps1: response.grand_total_hps1 || 0,
          grand_total_hps2: response.grand_total_hps2 || 0,
        };

        // Extract dynamic grand_total fields (designators)
        Object.keys(response).forEach(key => {
          if (key.startsWith('grand_total_') && !grandTotal.hasOwnProperty(key)) {
            grandTotal[key] = response[key] || 0;
          }
        });

        console.log('📊 Grand Total Data:', grandTotal);

        // Transform API data to grid format
        const transformedData: MatrixRowData[] = [];
        const allDesignatorFields = new Set<string>();

        response.spans.forEach((span) => {
          // Filter by linkId if provided
          if (linkId && spanIdsForLink) {
            // Extract span ID from span
            let spanId = '';
            if (typeof span.id === 'string') {
              spanId = span.id;
            } else if (span.id && typeof span.id === 'object') {
              const nestedId = (span.id as any).id;
              if (typeof nestedId === 'string') {
                spanId = nestedId;
              } else if (nestedId && nestedId.String) {
                spanId = nestedId.String;
              }
            }
            
            // Check if this span belongs to the selected link
            if (!spanIdsForLink.has(spanId)) {
              console.log(`  ❌ Span "${span.span_name}" (ID: ${spanId}) not in link, skipping`);
              return; // Skip this span
            }
            
            console.log(`  ✅ Span "${span.span_name}" (ID: ${spanId}) belongs to link, including`);
          }
          
          span.span_items.forEach((item, index) => {
            // Collect all designator child field names (dynamic columns)
            Object.keys(item).forEach(key => {
              // Exclude standard fields and calculated fields
              const excludedFields = [
                'id', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator',
                'slack_berbayar', 'fo_total', 'slack_tidak_berbayar', 'tol_2_persen', 'pengadaan',
                'bm', 's3', 'ds', 'bss', 'bts', 'da', 'hps1', 'hps2'
              ];
              if (!excludedFields.includes(key)) {
                allDesignatorFields.add(key);
              }
            });

            const row: MatrixRowData = {
              spanGroup: span.span_name,
              span: (index + 1).toString(),
              offset: item.offset !== null && item.offset !== undefined ? item.offset.toString() : '-',
              offset_from: item.offset_from !== null && item.offset_from !== undefined ? item.offset_from.toString() : '-',
              offset_to: item.offset_to !== null && item.offset_to !== undefined ? item.offset_to.toString() : '-',
              length: item.length !== null && item.length !== undefined ? item.length : 0,
              depth: item.depth !== null && item.depth !== undefined ? item.depth.toString() : '-',
              location: item.location || '-',
              designator: item.designator || '-',
              // Calculated fields - keep as numbers for aggregation
              slack_berbayar: item.slack_berbayar !== null && item.slack_berbayar !== undefined ? item.slack_berbayar : 0,
              fo_total: item.fo_total !== null && item.fo_total !== undefined ? item.fo_total : 0,
              slack_tidak_berbayar: item.slack_tidak_berbayar !== null && item.slack_tidak_berbayar !== undefined ? item.slack_tidak_berbayar : 0,
              tol_2_persen: item.tol_2_persen !== null && item.tol_2_persen !== undefined ? item.tol_2_persen : 0,
              pengadaan: item.pengadaan !== null && item.pengadaan !== undefined ? item.pengadaan : 0,
              // Position counts - keep as numbers for aggregation
              bm: item.bm !== null && item.bm !== undefined ? item.bm : 0,
              s3: item.s3 !== null && item.s3 !== undefined ? item.s3 : 0,
              ds: item.ds !== null && item.ds !== undefined ? item.ds : 0,
              bss: item.bss !== null && item.bss !== undefined ? item.bss : 0,
              bts: item.bts !== null && item.bts !== undefined ? item.bts : 0,
              da: item.da !== null && item.da !== undefined ? item.da : 0,
              hps1: item.hps1 !== null && item.hps1 !== undefined ? item.hps1 : 0,
              hps2: item.hps2 !== null && item.hps2 !== undefined ? item.hps2 : 0,
            };

            // Add all dynamic designator child fields as numbers for aggregation
            // The API provides values for each designator field in the response
            Object.keys(item).forEach(key => {
              const excludedFields = [
                'id', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator',
                'slack_berbayar', 'fo_total', 'slack_tidak_berbayar', 'tol_2_persen', 'pengadaan',
                'bm', 's3', 'ds', 'bss', 'bts', 'da', 'hps1', 'hps2'
              ];
              if (!excludedFields.includes(key)) {
                // The API already provides the correct value for each designator field
                const apiValue = item[key];
                if (apiValue !== null && apiValue !== undefined) {
                  const numValue = parseFloat(apiValue);
                  row[key] = !isNaN(numValue) ? numValue : 0;
                  
                  // CRITICAL DEBUG: Log individual row values for key fields
                  if ((key === 'DD-RV-1' || key === 'BC-TR-SOIL-3' || key === 'DC-OF-SM-48C' || key === 'TC-SM-48' || key === 'DD-BMR-1' || key === 'MH-HH2' || key === 'DD-DA-S2') && numValue > 0) {
                    console.log(`🔍 Individual row has value for ${key}:`, {
                      designator: item.designator,
                      field: key,
                      apiValue,
                      numValue,
                      finalValue: row[key],
                      length: item.length
                    });
                  }
                } else {
                  row[key] = 0;
                }
              }
            });
            
            // Additional debug: Log the complete row if it has PU-S9.0-140 value
            const puValue = row['PU-S9.0-140'];
            if (puValue && typeof puValue === 'number' && puValue > 0) {
              console.log('✅ Row created with PU-S9.0-140:', {
                designator: row.designator,
                length: row.length,
                'PU-S9.0-140': puValue,
                spanGroup: span.span_name,
                allKeys: Object.keys(row).filter(k => !['spanGroup', 'span', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator'].includes(k))
              });
            }

            transformedData.push(row);
          });
          
          // CRITICAL: Add manual SUB TOTAL row after each span's data (like REKAPITULASI)
          const spanSubTotalRow: MatrixRowData = {
            spanGroup: span.span_name, // Same group so it appears under the span
            span: '-', // Empty like REKAPITULASI
            offset: '-',
            offset_from: '-',
            offset_to: '-',
            length: span.total_length || 0,
            depth: '-',
            location: '-',
            designator: '-', // Empty like REKAPITULASI
            isSpanSubTotal: true, // New flag to identify span subtotal rows
            rekapLabel: `SUBT TOTAL SPAN ${span.span_name}`, // CRITICAL: Use rekapLabel like REKAPITULASI
            slack_berbayar: span.total_slack_berbayar || 0,
            fo_total: span.total_fo_total || 0,
            slack_tidak_berbayar: span.total_slack_tidak_berbayar || 0,
            tol_2_persen: span.total_tol_2_persen || 0,
            pengadaan: span.total_pengadaan || 0,
            bm: span.total_bm || 0,
            s3: span.total_s3 || 0,
            ds: span.total_ds || 0,
            bss: span.total_bss || 0,
            bts: span.total_bts || 0,
            da: span.total_da || 0,
            hps1: span.total_hps1 || 0,
            hps2: span.total_hps2 || 0,
          };

          // Add dynamic designator totals from API columns
          designatorColumns.forEach(col => {
            const field = col.field as string;
            // Based on API response, designator totals are provided directly without 'total_' prefix
            const directValue = span[field]; // Direct field access (e.g., span["DD-RV-1"])
            const totalValue = span[`total_${field}`]; // Also try with 'total_' prefix as fallback
            
            // Use direct value first (as per API response structure), then fallback to total_ prefixed
            spanSubTotalRow[field] = directValue !== null && directValue !== undefined ? directValue : (totalValue !== null && totalValue !== undefined ? totalValue : 0);
          });

          // Add dynamic designator totals from matrix data
          Array.from(allDesignatorFields).forEach(field => {
            // Skip if already processed by designatorColumns
            if (designatorColumns.some(col => col.field === field)) {
              return;
            }
            
            // Based on API response, designator totals are provided directly without 'total_' prefix
            const directValue = span[field]; // Direct field access
            const totalValue = span[`total_${field}`]; // Also try with 'total_' prefix as fallback
            
            // Use direct value first (as per API response structure), then fallback to total_ prefixed
            spanSubTotalRow[field] = directValue !== null && directValue !== undefined ? directValue : (totalValue !== null && totalValue !== undefined ? totalValue : 0);
          });

          console.log(`✅ Manual SPAN SUB TOTAL row created for ${span.span_name}:`, {
            rekapLabel: spanSubTotalRow.rekapLabel, // Now using rekapLabel like REKAPITULASI
            designator: spanSubTotalRow.designator, // Should be '-' like REKAPITULASI
            length: spanSubTotalRow.length,
            slack_berbayar: spanSubTotalRow.slack_berbayar,
            fo_total: spanSubTotalRow.fo_total,
            'DD-RV-1': spanSubTotalRow['DD-RV-1'],
            'BC-TR-SOIL-3': spanSubTotalRow['BC-TR-SOIL-3'],
            'DD-BMR-1': spanSubTotalRow['DD-BMR-1'],
            'TC-SM-48': spanSubTotalRow['TC-SM-48'],
            'DC-OF-SM-48C': spanSubTotalRow['DC-OF-SM-48C'],
            'MH-HH2': spanSubTotalRow['MH-HH2'],
            'DD-DA-S2': spanSubTotalRow['DD-DA-S2']
          });

          transformedData.push(spanSubTotalRow);
        });

        console.log('📊 Transformed data:', transformedData);
        console.log('🔤 Dynamic designator fields:', Array.from(allDesignatorFields));
        
        // Log sample data untuk verifikasi
        if (transformedData.length > 0) {
          console.log('📝 Sample row data:', transformedData[0]);
          console.log('📝 Sample numeric fields:', {
            length: transformedData[0].length,
            slack_berbayar: transformedData[0].slack_berbayar,
            fo_total: transformedData[0].fo_total,
            bm: transformedData[0].bm
          });
          
          // Check if PU-S9.0-140 exists in any row
          const rowsWithPU = transformedData.filter(r => {
            const puValue = r['PU-S9.0-140'];
            return puValue && typeof puValue === 'number' && puValue > 0;
          });
          console.log(`🔍 Rows with PU-S9.0-140 value > 0: ${rowsWithPU.length}`);
          if (rowsWithPU.length > 0) {
            console.log('📋 First row with PU-S9.0-140:', rowsWithPU[0]);
          }
        }

        // Generate dynamic columns for child designators with aggregation
        const designatorCols: ColDef[] = Array.from(allDesignatorFields)
          .filter(field => field && typeof field === 'string') // Filter out invalid fields
          .map(field => {
            return {
              colId: field,
              field: field, // Keep field for AG Grid
              headerName: field.toUpperCase(),
              width: 150,
              aggFunc: 'sum',
              valueFormatter: formatCellValue,
              cellRenderer: designatorCellRenderer,
              // Use valueGetter for all dynamic columns to ensure consistent behavior
              valueGetter: (params: any) => {
                if (!params.data) return undefined;
                return params.data[field];
              }
            };
          });

        console.log('📊 Dynamic columns from matrix data:', designatorCols.length);
        console.log('📊 Designator columns from API:', designatorColumns.length);
        
        // CRITICAL DEBUG: Check if the fields that should have values are in dynamic columns
        const fieldsWithValues = ['DD-RV-1', 'BC-TR-SOIL-3', 'TC-SM-48', 'DC-OF-SM-48C', 'DD-BMR-1', 'MH-HH2', 'DD-DA-S2'];
        const dynamicFieldNames = designatorCols.map(col => col.field);
        const missingInDynamic = fieldsWithValues.filter(field => !dynamicFieldNames.includes(field));
        const presentInDynamic = fieldsWithValues.filter(field => dynamicFieldNames.includes(field));
        
        console.log('🔍 Fields that should have values in SUB TOTAL:', fieldsWithValues);
        console.log('✅ Present in dynamic columns:', presentInDynamic);
        console.log('❌ Missing from dynamic columns:', missingInDynamic);
        
        // Show first few dynamic column names for verification
        console.log('📋 First 10 dynamic column names:', dynamicFieldNames.slice(0, 10));
        
        // Check if PU-S9.0-140 is in either list
        const puInDynamic = designatorCols.find(c => c.field === 'PU-S9.0-140');
        const puInDesignator = designatorColumns.find(c => c.field === 'PU-S9.0-140');
        console.log('🔍 PU-S9.0-140 in dynamic columns:', !!puInDynamic);
        console.log('🔍 PU-S9.0-140 in designator columns:', !!puInDesignator);

        setDynamicColumns(designatorCols);

        // Add REKAPITULASI group with multiple rows: header + sub totals per span + grand totals
        if (grandTotal) {
          // 1. Add header row for REKAPITULASI
          const rekapHeaderRow: MatrixRowData = {
            spanGroup: 'REKAPITULASI',
            span: 'NO',
            offset: 'OFFSET',
            offset_from: 'A',
            offset_to: 'B',
            length: 'LENGTH',
            depth: 'DEPTH',
            location: '-', // Hidden column
            designator: 'DESIGNATOR',
            isRekapHeader: true,
            slack_berbayar: 'SLACK BERBAYAR',
            fo_total: 'FO TOTAL',
            slack_tidak_berbayar: 'SLACK TIDAK BERBAYAR',
            tol_2_persen: 'TOL 2%',
            pengadaan: 'PENGADAAN',
            bm: 'BM',
            s3: 'S3',
            ds: 'DS',
            bss: 'BSS',
            bts: 'BTS',
            da: 'DA',
            hps1: 'HPS1',
            hps2: 'HPS2',
          };

          // Add dynamic designator headers from API
          designatorColumns.forEach(col => {
            const field = col.field as string;
            rekapHeaderRow[field] = field.toUpperCase();
          });

          // Add dynamic designator headers from matrix data
          Array.from(allDesignatorFields).forEach(field => {
            rekapHeaderRow[field] = field.toUpperCase();
          });

          transformedData.push(rekapHeaderRow);

          // 2. Add SUB TOTAL rows for each span
          response.spans.forEach((span) => {
            // Skip if this span was filtered out by linkId
            if (linkId && spanIdsForLink) {
              let spanId = '';
              if (typeof span.id === 'string') {
                spanId = span.id;
              } else if (span.id && typeof span.id === 'object') {
                const nestedId = (span.id as any).id;
                if (typeof nestedId === 'string') {
                  spanId = nestedId;
                } else if (nestedId && nestedId.String) {
                  spanId = nestedId.String;
                }
              }
              
              if (!spanIdsForLink.has(spanId)) {
                return; // Skip this span
              }
            }

            console.log(`📊 Creating SUB TOTAL for span: ${span.span_name}`, {
              total_length: span.total_length,
              total_slack_berbayar: span.total_slack_berbayar,
              total_fo_total: span.total_fo_total,
              total_slack_tidak_berbayar: span.total_slack_tidak_berbayar,
              total_tol_2_persen: span.total_tol_2_persen,
              total_pengadaan: span.total_pengadaan,
              allSpanKeys: Object.keys(span).filter(k => k.startsWith('total_')),
              // Show designator fields directly in span (without total_ prefix)
              designatorFieldsInSpan: Object.keys(span)
                .filter(k => !k.startsWith('total_') && !['id', 'span_name', 'span_items'].includes(k))
                .map(k => ({ field: k, value: span[k] }))
                .filter(item => item.value !== null && item.value !== undefined && item.value !== 0),
              // Show specific fields from user's API response
              'DD-RV-1': span['DD-RV-1'],
              'BC-TR-SOIL-3': span['BC-TR-SOIL-3'],
              'TC-SM-48': span['TC-SM-48'],
              'DC-OF-SM-48C': span['DC-OF-SM-48C'],
              'DD-BM-100-1': span['DD-BM-100-1'],
              'BC-TR-SOIL-1': span['BC-TR-SOIL-1'],
              'BC-TR-C-3': span['BC-TR-C-3'],
              'MH-HH2': span['MH-HH2'],
              'BC-TR-C-1': span['BC-TR-C-1'],
              'DD-HDPE-40-1': span['DD-HDPE-40-1'],
              'DD-BMR-1': span['DD-BMR-1'],
              'DD-DA-S2': span['DD-DA-S2']
            });

            const subTotalRow: MatrixRowData = {
              spanGroup: 'REKAPITULASI',
              span: '-',
              offset: '-',
              offset_from: '-',
              offset_to: '-',
              length: span.total_length || 0,
              depth: '-',
              location: '-',
              designator: '-',
              isRekapSubTotal: true,
              rekapLabel: `SUB TOTAL SPAN ${span.span_name}`, // Back to original format like REKAPITULASI
              slack_berbayar: span.total_slack_berbayar || 0,
              fo_total: span.total_fo_total || 0,
              slack_tidak_berbayar: span.total_slack_tidak_berbayar || 0,
              tol_2_persen: span.total_tol_2_persen || 0,
              pengadaan: span.total_pengadaan || 0,
              bm: span.total_bm || 0,
              s3: span.total_s3 || 0,
              ds: span.total_ds || 0,
              bss: span.total_bss || 0,
              bts: span.total_bts || 0,
              da: span.total_da || 0,
              hps1: span.total_hps1 || 0,
              hps2: span.total_hps2 || 0,
            };

            // Add dynamic designator totals from API columns
            designatorColumns.forEach(col => {
              const field = col.field as string;
              // Based on API response, designator totals are provided directly without 'total_' prefix
              const directValue = span[field]; // Direct field access (e.g., span["DD-RV-1"])
              const totalValue = span[`total_${field}`]; // Also try with 'total_' prefix as fallback
              
              // Use direct value first (as per API response structure), then fallback to total_ prefixed
              subTotalRow[field] = directValue !== null && directValue !== undefined ? directValue : (totalValue !== null && totalValue !== undefined ? totalValue : 0);
              
              // Debug log for specific fields
              if (field.includes('DD-RV-1') || field.includes('BC-TR-SOIL-3')) {
                console.log(`  📌 Designator ${field}:`, {
                  field,
                  directValue,
                  totalValue,
                  finalValue: subTotalRow[field],
                  spanHasDirectField: field in span,
                  spanHasTotalField: `total_${field}` in span
                });
              }
            });

            // Add dynamic designator totals from matrix data
            Array.from(allDesignatorFields).forEach(field => {
              // Skip if already processed by designatorColumns
              if (designatorColumns.some(col => col.field === field)) {
                return;
              }
              
              // Based on API response, designator totals are provided directly without 'total_' prefix
              const directValue = span[field]; // Direct field access
              const totalValue = span[`total_${field}`]; // Also try with 'total_' prefix as fallback
              
              // Use direct value first (as per API response structure), then fallback to total_ prefixed
              subTotalRow[field] = directValue !== null && directValue !== undefined ? directValue : (totalValue !== null && totalValue !== undefined ? totalValue : 0);
            });

            console.log(`✅ SUB TOTAL row created:`, {
              rekapLabel: subTotalRow.rekapLabel,
              length: subTotalRow.length,
              slack_berbayar: subTotalRow.slack_berbayar,
              fo_total: subTotalRow.fo_total,
              'DD-RV-1': subTotalRow['DD-RV-1'],
              'BC-TR-SOIL-3': subTotalRow['BC-TR-SOIL-3'],
              'DD-BMR-1': subTotalRow['DD-BMR-1'],
              'TC-SM-48': subTotalRow['TC-SM-48'],
              'DC-OF-SM-48C': subTotalRow['DC-OF-SM-48C'],
              'DD-BM-100-1': subTotalRow['DD-BM-100-1'],
              'BC-TR-SOIL-1': subTotalRow['BC-TR-SOIL-1'],
              'BC-TR-C-3': subTotalRow['BC-TR-C-3'],
              'MH-HH2': subTotalRow['MH-HH2'],
              'BC-TR-C-1': subTotalRow['BC-TR-C-1'],
              'DD-HDPE-40-1': subTotalRow['DD-HDPE-40-1'],
              'DD-DA-S2': subTotalRow['DD-DA-S2'],
              allKeys: Object.keys(subTotalRow).filter(k => !['spanGroup', 'span', 'offset', 'offset_from', 'offset_to', 'depth', 'location', 'designator', 'isRekapSubTotal', 'rekapLabel'].includes(k)),
              // Show all designator fields with non-zero values
              nonZeroDesignators: Object.keys(subTotalRow)
                .filter(k => !['spanGroup', 'span', 'offset', 'offset_from', 'offset_to', 'depth', 'location', 'designator', 'isRekapSubTotal', 'rekapLabel', 'length', 'slack_berbayar', 'fo_total', 'slack_tidak_berbayar', 'tol_2_persen', 'pengadaan', 'bm', 's3', 'ds', 'bss', 'bts', 'da', 'hps1', 'hps2'].includes(k))
                .map(k => ({ field: k, value: subTotalRow[k] }))
                .filter(item => item.value !== null && item.value !== undefined && item.value !== 0),
              // CRITICAL: Show which fields have values and should be visible
              fieldsWithValues: ['DD-RV-1', 'BC-TR-SOIL-3', 'TC-SM-48', 'DC-OF-SM-48C', 'DD-BMR-1', 'MH-HH2', 'DD-DA-S2']
                .map(field => ({ field, value: subTotalRow[field], hasValue: subTotalRow[field] !== null && subTotalRow[field] !== undefined && subTotalRow[field] !== 0 }))
            });

            transformedData.push(subTotalRow);
          });

          // 3. Add GRAND TOTAL row
          const grandTotalRow: MatrixRowData = {
            spanGroup: 'REKAPITULASI',
            span: '-',
            offset: '-',
            offset_from: '-',
            offset_to: '-',
            length: grandTotal.grand_total_length || 0,
            depth: '-',
            location: '-',
            designator: '-',
            isRekapGrandTotal: true,
            rekapLabel: 'GRAND TOTAL', // Custom label for group column
            slack_berbayar: grandTotal.grand_total_slack_berbayar || 0,
            fo_total: grandTotal.grand_total_fo_total || 0,
            slack_tidak_berbayar: grandTotal.grand_total_slack_tidak_berbayar || 0,
            tol_2_persen: grandTotal.grand_total_tol_2_persen || 0,
            pengadaan: grandTotal.grand_total_pengadaan || 0,
            bm: grandTotal.grand_total_bm || 0,
            s3: grandTotal.grand_total_s3 || 0,
            ds: grandTotal.grand_total_ds || 0,
            bss: grandTotal.grand_total_bss || 0,
            bts: grandTotal.grand_total_bts || 0,
            da: grandTotal.grand_total_da || 0,
            hps1: grandTotal.grand_total_hps1 || 0,
            hps2: grandTotal.grand_total_hps2 || 0,
          };

          // Add dynamic designator grand totals from API columns
          designatorColumns.forEach(col => {
            const field = col.field as string;
            const value = grandTotal[`grand_total_${field}`];
            grandTotalRow[field] = value !== null && value !== undefined ? value : 0;
          });

          // Add dynamic designator grand totals from matrix data
          Array.from(allDesignatorFields).forEach(field => {
            const value = grandTotal[`grand_total_${field}`];
            grandTotalRow[field] = value !== null && value !== undefined ? value : 0;
          });

          transformedData.push(grandTotalRow);

          // 4. Add GRAND TOTAL - ROUNDED row
          const grandTotalRoundedRow: MatrixRowData = {
            spanGroup: 'REKAPITULASI',
            span: '-',
            offset: '-',
            offset_from: '-',
            offset_to: '-',
            length: Math.round(grandTotal.grand_total_length || 0),
            depth: '-',
            location: '-',
            designator: '-',
            isRekapGrandTotalRounded: true,
            rekapLabel: 'GRAND TOTAL - ROUNDED', // Custom label for group column
            slack_berbayar: Math.round(grandTotal.grand_total_slack_berbayar || 0),
            fo_total: Math.round(grandTotal.grand_total_fo_total || 0),
            slack_tidak_berbayar: Math.round(grandTotal.grand_total_slack_tidak_berbayar || 0),
            tol_2_persen: Math.round(grandTotal.grand_total_tol_2_persen || 0),
            pengadaan: Math.round(grandTotal.grand_total_pengadaan || 0),
            bm: grandTotal.grand_total_bm || 0, // Integer, no rounding needed
            s3: grandTotal.grand_total_s3 || 0,
            ds: grandTotal.grand_total_ds || 0,
            bss: grandTotal.grand_total_bss || 0,
            bts: grandTotal.grand_total_bts || 0,
            da: grandTotal.grand_total_da || 0,
            hps1: grandTotal.grand_total_hps1 || 0,
            hps2: grandTotal.grand_total_hps2 || 0,
          };

          // Add dynamic designator grand totals (rounded) from API columns
          designatorColumns.forEach(col => {
            const field = col.field as string;
            const value = grandTotal[`grand_total_${field}`];
            grandTotalRoundedRow[field] = value !== null && value !== undefined ? Math.round(value) : 0;
          });

          // Add dynamic designator grand totals (rounded) from matrix data
          Array.from(allDesignatorFields).forEach(field => {
            const value = grandTotal[`grand_total_${field}`];
            grandTotalRoundedRow[field] = value !== null && value !== undefined ? Math.round(value) : 0;
          });

          transformedData.push(grandTotalRoundedRow);
        }

        setAllMatrixData(transformedData);
        
        // Debug: Log all data including SUB TOTAL rows
        console.log('📊 All matrix data set to grid:', {
          totalRows: transformedData.length,
          rekapRows: transformedData.filter(row => row.spanGroup === 'REKAPITULASI').length,
          subTotalRows: transformedData.filter(row => row.isRekapSubTotal).length,
          grandTotalRows: transformedData.filter(row => row.isRekapGrandTotal).length,
          sampleSubTotal: transformedData.find(row => row.isRekapSubTotal),
          allRekapRows: transformedData.filter(row => row.spanGroup === 'REKAPITULASI').map(r => ({
            rekapLabel: r.rekapLabel,
            isRekapSubTotal: r.isRekapSubTotal,
            isRekapGrandTotal: r.isRekapGrandTotal,
            length: r.length,
            slack_berbayar: r.slack_berbayar
          }))
        });

      } catch (err) {
        console.error('❌ Error fetching matrix data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matrix data');
      } finally {
        setLoading(false);
      }
    };

    fetchMatrixData();
  }, [contractId, linkId, designatorsLoaded, designatorColumns.length]);

  // Export to CSV handler
  const handleExportCSV = () => {
    try {
      // Prepare CSV headers
      const headers = ['NO', 'OFFSET', 'OFFSET FROM', 'OFFSET TO', 'LENGTH', 'DEPTH', 'LOCATION', 'DESIGNATOR'];
      
      // Add designator column headers from API
      const designatorHeaders = designatorColumns.map(col => col.headerName || col.field || '');
      
      // Add dynamic column headers from matrix data
      const dynamicHeaders = dynamicColumns.map(col => col.headerName || col.field || '');
      
      const allHeaders = [...headers, ...designatorHeaders, ...dynamicHeaders];

      // Prepare CSV rows
      const rows = allMatrixData.map(item => [
        item.span,
        item.offset,
        item.offset_from,
        item.offset_to,
        item.length,
        item.depth,
        item.location,
        item.designator,
        // Add designator column values from API
        ...designatorColumns.map(col => {
          const field = col.field || '';
          return item[field] || '-';
        }),
        // Add dynamic column values from matrix data
        ...dynamicColumns.map(col => {
          const field = col.field || '';
          return item[field] || '-';
        })
      ]);

      // Create CSV content
      const csvContent = [
        allHeaders.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Matrix_${contractId}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ CSV exported successfully');
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      toast.error('Failed to export CSV file');
    }
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Add title
      doc.setFontSize(16);
      doc.text('Matrix Data Report', 14, 15);
      
      // Add contract info
      doc.setFontSize(10);
      doc.text(`Contract: ${contractName}`, 14, 22);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 27);
      doc.text(`Total Items: ${allMatrixData.length}`, 14, 32);
      
      // Prepare table headers
      const headers = ['NO', 'A', 'B', 'LENGTH', 'DESIGNATOR'];
      
      // Add some key designator columns (limit to avoid overflow)
      const keyDesignatorCols = designatorColumns.slice(0, 5);
      keyDesignatorCols.forEach(col => {
        headers.push(col.headerName || col.colId as string || '');
      });
      
      // Prepare table data
      const tableData = allMatrixData
        .filter(item => !item.isRekapHeader && !item.isRekapSubTotal && !item.isRekapGrandTotal && !item.isRekapGrandTotalRounded)
        .map(item => {
          const row = [
            item.span,
            item.offset_from,
            item.offset_to,
            item.length,
            item.designator
          ];
          
          // Add key designator values
          keyDesignatorCols.forEach(col => {
            const field = col.colId as string || col.field as string;
            const value = item[field];
            row.push(value === 0 || value === null || value === undefined ? '-' : String(value));
          });
          
          return row;
        });
      
      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 37,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [21, 57, 108], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 37, left: 14, right: 14 },
      });
      
      // Save PDF with format: MATRIX-ProjectName-LinkName-Date.pdf
      const projectName = projectData?.name || contractName || 'Project';
      const linkPart = linkName ? `-${linkName}` : '';
      const datePart = new Date().toISOString().split('T')[0];
      doc.save(`MATRIX-${projectName}${linkPart}-${datePart}.pdf`);
      
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Export to Excel handler - EXACT COPY from TabBOQ with Matrix adaptations
  const handleExportExcel = async () => {
    try {
      console.log('🚀 Starting professional Matrix Excel export...');
      
      // Filter Matrix data - adapt from BOQ pattern
      const dataRows = allMatrixData.filter(item => 
        !item.isRekapHeader && !item.isRekapSubTotal && 
        !item.isRekapGrandTotal && !item.isRekapGrandTotalRounded
      );
      const summaryRows = allMatrixData.filter(item => 
        item.isRekapSubTotal || item.isRekapGrandTotal || item.isRekapGrandTotalRounded
      );
      
      console.log('📊 Data rows to export:', dataRows.length);
      console.log('📊 Summary rows to export:', summaryRows.length);
      console.log('📊 Summary rows detail:', summaryRows.map(r => ({
        label: r.rekapLabel,
        isRekapSubTotal: r.isRekapSubTotal,
        length: r.length,
        slack_berbayar: r.slack_berbayar,
        fo_total: r.fo_total
      })));

      if (dataRows.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Import ExcelJS - EXACT COPY from TabBOQ
      const ExcelJS = (await import('exceljs')).default;

      // Create workbook and worksheet - EXACT COPY from TabBOQ
      console.log('📝 Creating workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Matrix Data'); // Only change: worksheet name
      console.log('✅ Workbook and worksheet created');

      // Add header information (rows 1-6) - use dynamic project data with better formatting (like TabRedLine)
      console.log('📝 Adding header information...');
      worksheet.addRow(['MATRIX DATA']);
      worksheet.addRow([projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ']);
      worksheet.addRow(['No.Kontrak', '', `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}`]);
      worksheet.addRow(['SS / LINK', '', `: ${linkName || contractName}`]);
      worksheet.addRow(['Lokasi', '', `: ${projectData?.location || '-'}`]);
      worksheet.addRow(['Pelaksana', '', `: ${projectData?.pelaksana || '-'}`]);
      
      // Style header rows (like TabRedLine)
      const setHeaderCell = (row: number, col: number, value: string, bold = true, size = 12) => {
        const cell = worksheet.getCell(row, col);
        cell.value = value;
        cell.font = { name: 'Calibri', bold, size };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      };
      
      // Row 1: MATRIX DATA title
      setHeaderCell(1, 1, 'MATRIX DATA', true, 14);
      worksheet.getRow(1).height = 20;
      
      // Row 2: Project name
      setHeaderCell(2, 1, projectData?.name || 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ', true, 12);
      worksheet.getRow(2).height = 18;
      
      // Rows 3-6: Info with labels and values
      const infoRows = [
        { row: 3, label: 'No.Kontrak', value: `: ${projectData?.no_kontrak || '-'} ${projectData?.contract_signed ? `Tanggal ${projectData.contract_signed}` : ''}` },
        { row: 4, label: 'SS / LINK', value: `: ${linkName || contractName}` },
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

      // Get designator columns for Matrix
      const allDesignatorCols = [...designatorColumns, ...dynamicColumns.filter(col => {
        const colId = col.colId as string;
        return !designatorColumns.some(dc => dc.colId === colId);
      })];

      // Calculate total columns for numbering
      const totalColumnsCount = 5 + allDesignatorCols.length + 2 + 3 + 8; // SPAN(4) + DESIGNATOR(1) + designators + FO BOQ(2) + KEBUTUHAN FO(3) + JUMLAH POSISI(8)

      // Add ROW 8: Column numbers (1, 2, 3, 4, ...)
      console.log('📝 Adding column number row...');
      const columnNumberRow = [];
      for (let i = 1; i <= totalColumnsCount; i++) {
        columnNumberRow.push(i);
      }
      worksheet.addRow(columnNumberRow);

      // Add the CORRECT 3-row header structure (rows 9-11, previously 8-10)
      console.log('📝 Creating 3-row header structure...');
      
      // Row 9: Group headers (previously row 8)
      const headerRow9 = [
        'SPAN', '', '', '', // SPAN group header spans 4 columns (NO, A, B, LENGTH)
        'DESIGNATOR', // DESIGNATOR stands alone
        ...allDesignatorCols.map(col => col.headerName || col.colId as string || ''), // Designator names with VERTICAL text
        // FO BOQ group (2 columns)
        'FO BOQ', '',
        // KEBUTUHAN FO group (3 columns)
        'KEBUTUHAN FO', '', '',
        // JUMLAH POSISI group (8 columns)
        'JUMLAH POSISI', '', '', '', '', '', '', ''
      ];
      worksheet.addRow(headerRow9);

      // Row 10: Sub-headers (NO, A, B, LENGTH under SPAN) - previously row 9
      // CRITICAL: Only fill columns 1-4 (SPAN sub-headers), leave columns 5+ empty because they will be merged with row 9
      const headerRow10 = [
        'NO', 'A', 'B', 'LENGTH', // Individual names under SPAN
        '', // DESIGNATOR column - EMPTY because it's merged with row 9
        ...allDesignatorCols.map(() => ''), // All designator columns - EMPTY because they're merged with row 9
        // FO BOQ sub-headers - only SLACK BERBAYAR with line break
        'SLACK\nBERBAYAR', 'FO TOTAL',
        // KEBUTUHAN FO sub-headers - only SLACK TIDAK BERBAYAR with line break
        'SLACK TIDAK\nBERBAYAR', 'TOL 2%', 'PENGADAAN',
        // JUMLAH POSISI sub-headers - no line breaks
        'BM', 'S3', 'DS', 'BSS', 'BTS', 'DA', 'HPS1', 'HPS2'
      ];
      worksheet.addRow(headerRow10);

      // Row 11: Empty spacing row (previously row 10)
      worksheet.addRow([]);

      console.log('📝 Adding data rows...');
      // Group data by spanGroup to add span name rows
      const groupedData: { [key: string]: typeof dataRows } = {};
      dataRows.forEach(item => {
        const spanName = item.spanGroup || 'Unknown';
        if (!groupedData[spanName]) {
          groupedData[spanName] = [];
        }
        groupedData[spanName].push(item);
      });

      console.log('📊 Grouped data by span:', Object.keys(groupedData));

      // Add data rows with span name headers (starting from row 12) - adapted from TabBOQ pattern
      Object.entries(groupedData).forEach(([spanName, items]) => {
        // Add span name row - merge columns A-D (1-4) for longer text
        const totalColumnsCount = 5 + allDesignatorCols.length + 2 + 3 + 8;
        const spanNameRowData = [spanName];
        
        // Fill rest of columns with empty strings
        for (let i = 1; i < totalColumnsCount; i++) {
          spanNameRowData.push('');
        }
        
        worksheet.addRow(spanNameRowData);
        
        // Get the last added row
        const lastRowNumber = worksheet.lastRow?.number || 12;
        const spanHeaderRow = worksheet.getRow(lastRowNumber);
        spanHeaderRow.height = 25;
        
        // Merge columns 1-3 (A-C) - smaller merge to not cover LENGTH column
        worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
        
        // Style the merged cell (columns 1-3)
        const firstCell = spanHeaderRow.getCell(1);
        firstCell.value = spanName;
        
        // Set alignment - should work better with smaller merge area
        firstCell.alignment = { 
          horizontal: 'left',
          vertical: 'middle'
        };
        
        // Set font styling
        firstCell.font = { 
          bold: true, 
          color: { argb: 'FF000000' }, 
          size: 12 
        };
        
        // Set background color for merged cells (1-4)
        firstCell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: 'FFE7E6E6' } 
        };
        
        // Apply borders to ALL cells in the row - but only outer borders to create seamless look
        for (let col = 1; col <= totalColumnsCount; col++) {
          const cell = spanHeaderRow.getCell(col);
          
          // Set same background for all cells
          cell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: 'FFE7E6E6' } 
          };
          
          // Only apply top and bottom borders (no left/right internal borders)
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            // Only add left border for first column
            ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
            // Only add right border for last column
            ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
          };
        }
        
        console.log(`  📌 Added span header: ${spanName} (merged columns A-D, seamless look)`);
        
        // Add data rows for this span
        items.forEach((item, index) => {
          console.log(`  Exporting data row ${index + 1} for span ${spanName}: ${item.designator} - Length: ${item.length}`);
          const row = [
            item.span || (index + 1), // NO
            item.offset_from || '', // A
            item.offset_to || '', // B
            Number(item.length) || '', // LENGTH
            item.designator || '', // DESIGNATOR
          ];
          
          // Add designator column values - adapted from TabBOQ pattern
          allDesignatorCols.forEach(col => {
            const field = col.colId as string || col.field as string;
            const value = item[field];
            row.push(value === 0 || value === null || value === undefined ? '' : Number(value) || '');
          });
          
          // Add FO BOQ columns
          row.push(
            Number(item.slack_berbayar) || '',
            Number(item.fo_total) || ''
          );
          
          // Add KEBUTUHAN FO columns
          row.push(
            Number(item.slack_tidak_berbayar) || '',
            Number(item.tol_2_persen) || '',
            Number(item.pengadaan) || ''
          );
          
          // Add JUMLAH POSISI columns
          row.push(
            Number(item.bm) || '',
            Number(item.s3) || '',
            Number(item.ds) || '',
            Number(item.bss) || '',
            Number(item.bts) || '',
            Number(item.da) || '',
            Number(item.hps1) || '',
            Number(item.hps2) || ''
          );
          
          worksheet.addRow(row);
        });
      });

      // Add summary rows - adapted from TabBOQ pattern (ONLY SUB TOTAL, skip GRAND TOTAL for now)
      console.log('📝 Adding summary rows...');
      summaryRows
        .filter(row => row.isRekapSubTotal) // Only export SUB TOTAL rows, skip GRAND TOTAL and GRAND TOTAL ROUNDED
        .forEach(summaryRow => {
          console.log(`  Exporting summary row: ${summaryRow.rekapLabel}`, {
            length: summaryRow.length,
            slack_berbayar: summaryRow.slack_berbayar,
            fo_total: summaryRow.fo_total,
            designatorFields: allDesignatorCols.map(col => {
              const field = col.colId as string || col.field as string;
              return { field, value: summaryRow[field] };
            })
          });
          
          // Create row data with label in column 2 (like span name in columns 1-2)
          const row = [
            '', // NO (column 1) - empty
            summaryRow.rekapLabel || summaryRow.designator, // Label in column 2 (A)
            '', // B (column 3)
            summaryRow.length !== null && summaryRow.length !== undefined ? (Number(summaryRow.length) || '-') : '-', // LENGTH (column 4) - show "-" for 0
            '', // DESIGNATOR (column 5)
          ];
          
          // Add designator column values for summary - show "-" for 0
          allDesignatorCols.forEach(col => {
            const field = col.colId as string || col.field as string;
            const value = summaryRow[field];
            // Show "-" for 0, null, or undefined
            row.push(value === null || value === undefined || value === 0 ? '-' : Number(value));
          });
          
          // Add FO BOQ columns for summary - show "-" for 0
          row.push(
            summaryRow.slack_berbayar !== null && summaryRow.slack_berbayar !== undefined && summaryRow.slack_berbayar !== 0 ? Number(summaryRow.slack_berbayar) : '-',
            summaryRow.fo_total !== null && summaryRow.fo_total !== undefined && summaryRow.fo_total !== 0 ? Number(summaryRow.fo_total) : '-'
          );
          
          // Add KEBUTUHAN FO columns for summary - show "-" for 0
          row.push(
            summaryRow.slack_tidak_berbayar !== null && summaryRow.slack_tidak_berbayar !== undefined && summaryRow.slack_tidak_berbayar !== 0 ? Number(summaryRow.slack_tidak_berbayar) : '-',
            summaryRow.tol_2_persen !== null && summaryRow.tol_2_persen !== undefined && summaryRow.tol_2_persen !== 0 ? Number(summaryRow.tol_2_persen) : '-',
            summaryRow.pengadaan !== null && summaryRow.pengadaan !== undefined && summaryRow.pengadaan !== 0 ? Number(summaryRow.pengadaan) : '-'
          );
          
          // Add JUMLAH POSISI columns for summary - show "-" for 0
          row.push(
            summaryRow.bm !== null && summaryRow.bm !== undefined && summaryRow.bm !== 0 ? Number(summaryRow.bm) : '-',
            summaryRow.s3 !== null && summaryRow.s3 !== undefined && summaryRow.s3 !== 0 ? Number(summaryRow.s3) : '-',
            summaryRow.ds !== null && summaryRow.ds !== undefined && summaryRow.ds !== 0 ? Number(summaryRow.ds) : '-',
            summaryRow.bss !== null && summaryRow.bss !== undefined && summaryRow.bss !== 0 ? Number(summaryRow.bss) : '-',
            summaryRow.bts !== null && summaryRow.bts !== undefined && summaryRow.bts !== 0 ? Number(summaryRow.bts) : '-',
            summaryRow.da !== null && summaryRow.da !== undefined && summaryRow.da !== 0 ? Number(summaryRow.da) : '-',
            summaryRow.hps1 !== null && summaryRow.hps1 !== undefined && summaryRow.hps1 !== 0 ? Number(summaryRow.hps1) : '-',
            summaryRow.hps2 !== null && summaryRow.hps2 !== undefined && summaryRow.hps2 !== 0 ? Number(summaryRow.hps2) : '-'
          );
          
          worksheet.addRow(row);
          
          // Get the last added row
          const lastRowNumber = worksheet.lastRow?.number || 12;
          const summaryRowObj = worksheet.getRow(lastRowNumber);
          summaryRowObj.height = 25;
          
          // Merge columns 1-3 (A-C) for the label (not covering LENGTH column)
          worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
          
          // Style the merged cell (columns 1-3)
          const firstCell = summaryRowObj.getCell(1);
          const labelValue = summaryRow.rekapLabel || summaryRow.designator;
          firstCell.value = typeof labelValue === 'string' ? labelValue : String(labelValue || '');
          
          // Set alignment
          firstCell.alignment = { 
            horizontal: 'left',
            vertical: 'middle'
          };
          
          // Set font styling - bold for SUB TOTAL
          firstCell.font = { 
            bold: true, 
            color: { argb: 'FF000000' }, 
            size: 11 
          };
          
          // Set background color - lighter gray for SUB TOTAL
          firstCell.fill = { 
            type: 'pattern', 
            pattern: 'solid', 
            fgColor: { argb: 'FFF2F2F2' } // Lighter gray than span name
          };
          
          // Apply seamless styling to ALL cells in the row (same as span name)
          for (let col = 1; col <= totalColumnsCount; col++) {
            const cell = summaryRowObj.getCell(col);
            
            // Set same background for all cells
            cell.fill = { 
              type: 'pattern', 
              pattern: 'solid', 
              fgColor: { argb: 'FFF2F2F2' } // Lighter gray
            };
            
            // For data columns (5 onwards), center align the numbers
            if (col >= 5) {
              cell.alignment = { 
                horizontal: 'center',
                vertical: 'middle'
              };
              cell.font = { 
                bold: false, // Numbers not bold
                color: { argb: 'FF000000' }, 
                size: 10 
              };
            }
            
            // Only apply top and bottom borders (no left/right internal borders)
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              // Only add left border for first column
              ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
              // Only add right border for last column
              ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
            };
          }
          
          console.log(`  ✅ Added SUB TOTAL row: ${summaryRow.rekapLabel} with seamless styling`);
        });

      // Calculate column positions FIRST (before REKAPITULASI section)
      const mainDesignatorStartCol = 6; // First designator column
      const mainDesignatorEndCol = 5 + allDesignatorCols.length; // Last designator column
      const mainFoBOQStartCol = mainDesignatorEndCol + 1; // FO BOQ starts after designators
      const mainKebutuhanFOStartCol = mainFoBOQStartCol + 2; // KEBUTUHAN FO starts after FO BOQ (2 columns)
      const mainJumlahPosisiStartCol = mainKebutuhanFOStartCol + 3; // JUMLAH POSISI starts after KEBUTUHAN FO (3 columns)
      const mainTotalColumns = mainJumlahPosisiStartCol + 7; // Last column
      
      console.log('📊 Column positions:', {
        mainDesignatorStartCol,
        mainDesignatorEndCol,
        mainFoBOQStartCol,
        mainKebutuhanFOStartCol,
        mainJumlahPosisiStartCol,
        mainTotalColumns
      });

      // Add empty row as spacing before REKAPITULASI
      console.log('📝 Adding spacing before REKAPITULASI...');
      worksheet.addRow([]);

      // Add REKAPITULASI section header (like span name)
      console.log('📝 Adding REKAPITULASI header...');
      const rekapHeaderRowData = ['REKAPITULASI'];
      
      // Fill rest of columns with empty strings
      for (let i = 1; i < totalColumnsCount; i++) {
        rekapHeaderRowData.push('');
      }
      
      worksheet.addRow(rekapHeaderRowData);
      
      // Get the last added row
      let lastRowNumber = worksheet.lastRow?.number || 12;
      const rekapHeaderRow = worksheet.getRow(lastRowNumber);
      rekapHeaderRow.height = 25;
      
      // Merge columns 1-4 (A-D) for REKAPITULASI header
      worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 4);
      
      // Style the merged cell (same as span name)
      const rekapFirstCell = rekapHeaderRow.getCell(1);
      rekapFirstCell.value = 'REKAPITULASI';
      rekapFirstCell.alignment = { 
        horizontal: 'left',
        vertical: 'middle'
      };
      rekapFirstCell.font = { 
        bold: true, 
        color: { argb: 'FF000000' }, 
        size: 12 
      };
      rekapFirstCell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FFE7E6E6' } // Same gray as span name
      };
      
      // Apply seamless styling to all cells in REKAPITULASI header row
      for (let col = 1; col <= totalColumnsCount; col++) {
        const cell = rekapHeaderRow.getCell(col);
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: 'FFE7E6E6' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          ...(col === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
          ...(col === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
        };
      }
      
      console.log('✅ Added REKAPITULASI header');

      // Add REKAPITULASI column headers (copy of row 9-10 structure)
      console.log('📝 Adding REKAPITULASI column headers...');
      
      // Row 1: Group headers (SPAN, DESIGNATOR, designators, FO BOQ, KEBUTUHAN FO, JUMLAH POSISI)
      const rekapHeaderRow1 = [
        'SPAN', '', '', '', // SPAN group header spans 4 columns
        'DESIGNATOR', // DESIGNATOR stands alone
        ...allDesignatorCols.map(col => col.headerName || col.colId as string || ''),
        'FO BOQ', '',
        'KEBUTUHAN FO', '', '',
        'JUMLAH POSISI', '', '', '', '', '', '', ''
      ];
      worksheet.addRow(rekapHeaderRow1);
      
      lastRowNumber = worksheet.lastRow?.number || 12;
      const rekapColHeaderRow1 = worksheet.getRow(lastRowNumber);
      rekapColHeaderRow1.height = 30;
      
      // Row 2: Sub-headers (NO, A, B, LENGTH under SPAN)
      const rekapHeaderRow2 = [
        'NO', 'A', 'B', 'LENGTH',
        '',
        ...allDesignatorCols.map(() => ''),
        'SLACK\nBERBAYAR', 'FO TOTAL',
        'SLACK TIDAK\nBERBAYAR', 'TOL 2%', 'PENGADAAN',
        'BM', 'S3', 'DS', 'BSS', 'BTS', 'DA', 'HPS1', 'HPS2'
      ];
      worksheet.addRow(rekapHeaderRow2);
      
      lastRowNumber = worksheet.lastRow?.number || 12;
      const rekapColHeaderRow2 = worksheet.getRow(lastRowNumber);
      rekapColHeaderRow2.height = 80;
      
      // Calculate column positions for merging (reuse from main header)
      const rekapRow1Num = lastRowNumber - 1;
      const rekapRow2Num = lastRowNumber;
      
      // Merge cells for REKAPITULASI headers (reuse column positions from main header)
      worksheet.mergeCells(rekapRow1Num, 1, rekapRow1Num, 4); // SPAN horizontal
      worksheet.mergeCells(rekapRow1Num, 5, rekapRow2Num, 5); // DESIGNATOR vertical
      
      // Merge designator columns vertically
      for (let col = mainDesignatorStartCol; col <= mainDesignatorEndCol; col++) {
        worksheet.mergeCells(rekapRow1Num, col, rekapRow2Num, col);
      }
      
      // Merge group headers horizontally
      worksheet.mergeCells(rekapRow1Num, mainFoBOQStartCol, rekapRow1Num, mainFoBOQStartCol + 1); // FO BOQ
      worksheet.mergeCells(rekapRow1Num, mainKebutuhanFOStartCol, rekapRow1Num, mainKebutuhanFOStartCol + 2); // KEBUTUHAN FO
      worksheet.mergeCells(rekapRow1Num, mainJumlahPosisiStartCol, rekapRow1Num, mainJumlahPosisiStartCol + 7); // JUMLAH POSISI
      
      // Style REKAPITULASI header row 1
      rekapColHeaderRow1.eachCell((cell, colNumber) => {
        cell.font = { bold: false, color: { argb: 'FF000000' }, size: 11 };
        
        if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
        } else if (colNumber >= mainFoBOQStartCol && colNumber <= totalColumnsCount) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      // Style REKAPITULASI header row 2
      rekapColHeaderRow2.eachCell((cell, colNumber) => {
        cell.font = { bold: false, color: { argb: 'FF000000' }, size: 10 };
        
        if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: true };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else if (colNumber >= mainFoBOQStartCol && colNumber <= totalColumnsCount) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: true };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      console.log('✅ Added REKAPITULASI column headers');

      // Add SUB TOTAL rows under REKAPITULASI headers
      console.log('📝 Adding SUB TOTAL rows in REKAPITULASI...');
      summaryRows
        .filter(row => row.isRekapSubTotal)
        .forEach(summaryRow => {
          console.log(`  Exporting REKAPITULASI SUB TOTAL: ${summaryRow.rekapLabel}`, {
            length: summaryRow.length,
            slack_berbayar: summaryRow.slack_berbayar
          });
          
          const row = [
            summaryRow.rekapLabel || summaryRow.designator, // Label in column 1 (will be merged with columns 1-3)
            '', // A (column 2)
            '', // B (column 3)
            summaryRow.length !== null && summaryRow.length !== undefined ? (Number(summaryRow.length) || '-') : '-', // LENGTH (column 4) - show value
            '', // DESIGNATOR (column 5)
          ];
          
          // Add designator column values - show "-" for 0
          allDesignatorCols.forEach(col => {
            const field = col.colId as string || col.field as string;
            const value = summaryRow[field];
            // Show "-" for 0, null, or undefined
            row.push(value === null || value === undefined || value === 0 ? '-' : Number(value));
          });
          
          // Add FO BOQ, KEBUTUHAN FO, JUMLAH POSISI columns - show "-" for 0
          row.push(
            summaryRow.slack_berbayar !== null && summaryRow.slack_berbayar !== undefined && summaryRow.slack_berbayar !== 0 ? Number(summaryRow.slack_berbayar) : '-',
            summaryRow.fo_total !== null && summaryRow.fo_total !== undefined && summaryRow.fo_total !== 0 ? Number(summaryRow.fo_total) : '-',
            summaryRow.slack_tidak_berbayar !== null && summaryRow.slack_tidak_berbayar !== undefined && summaryRow.slack_tidak_berbayar !== 0 ? Number(summaryRow.slack_tidak_berbayar) : '-',
            summaryRow.tol_2_persen !== null && summaryRow.tol_2_persen !== undefined && summaryRow.tol_2_persen !== 0 ? Number(summaryRow.tol_2_persen) : '-',
            summaryRow.pengadaan !== null && summaryRow.pengadaan !== undefined && summaryRow.pengadaan !== 0 ? Number(summaryRow.pengadaan) : '-',
            summaryRow.bm !== null && summaryRow.bm !== undefined && summaryRow.bm !== 0 ? Number(summaryRow.bm) : '-',
            summaryRow.s3 !== null && summaryRow.s3 !== undefined && summaryRow.s3 !== 0 ? Number(summaryRow.s3) : '-',
            summaryRow.ds !== null && summaryRow.ds !== undefined && summaryRow.ds !== 0 ? Number(summaryRow.ds) : '-',
            summaryRow.bss !== null && summaryRow.bss !== undefined && summaryRow.bss !== 0 ? Number(summaryRow.bss) : '-',
            summaryRow.bts !== null && summaryRow.bts !== undefined && summaryRow.bts !== 0 ? Number(summaryRow.bts) : '-',
            summaryRow.da !== null && summaryRow.da !== undefined && summaryRow.da !== 0 ? Number(summaryRow.da) : '-',
            summaryRow.hps1 !== null && summaryRow.hps1 !== undefined && summaryRow.hps1 !== 0 ? Number(summaryRow.hps1) : '-',
            summaryRow.hps2 !== null && summaryRow.hps2 !== undefined && summaryRow.hps2 !== 0 ? Number(summaryRow.hps2) : '-'
          );
          
          worksheet.addRow(row);
          
          lastRowNumber = worksheet.lastRow?.number || 12;
          const subTotalRow = worksheet.getRow(lastRowNumber);
          subTotalRow.height = 22;
          
          // Merge columns 1-3 for SUB TOTAL label (NO, A, B only - not LENGTH)
          worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
          
          // Style the merged cell (columns 1-3)
          const firstCell = subTotalRow.getCell(1);
          const labelValue = summaryRow.rekapLabel || summaryRow.designator;
          firstCell.value = typeof labelValue === 'string' ? labelValue : String(labelValue || '');
          firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
          firstCell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
          firstCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
          
          // Style SUB TOTAL row in REKAPITULASI with seamless look
          subTotalRow.eachCell((cell, colNumber) => {
            // Set same background for all cells
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            
            // For LENGTH column (4) and data columns (5 onwards), center align
            if (colNumber >= 4) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { bold: colNumber === 4 ? true : false, color: { argb: 'FF000000' }, size: 10 };
            }
            
            // Only apply top and bottom borders (no left/right internal borders)
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              ...(colNumber === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
              ...(colNumber === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
            };
          });
        });

      // Add GRAND TOTAL and GRAND TOTAL ROUNDED
      console.log('📝 Adding GRAND TOTAL rows in REKAPITULASI...');
      
      summaryRows
        .filter(row => row.isRekapGrandTotal || row.isRekapGrandTotalRounded)
        .forEach(summaryRow => {
          console.log(`  Exporting REKAPITULASI: ${summaryRow.rekapLabel}`, {
            length: summaryRow.length,
            slack_berbayar: summaryRow.slack_berbayar
          });
          
          const row = [
            summaryRow.rekapLabel || summaryRow.designator, // Label in column 1 (will be merged with columns 1-3)
            '', // A (column 2)
            '', // B (column 3)
            summaryRow.length !== null && summaryRow.length !== undefined ? (Number(summaryRow.length) || '-') : '-', // LENGTH (column 4) - show value
            '', // DESIGNATOR (column 5)
          ];
          
          // Add designator column values - show "-" for 0
          allDesignatorCols.forEach(col => {
            const field = col.colId as string || col.field as string;
            const value = summaryRow[field];
            // Show "-" for 0, null, or undefined
            row.push(value === null || value === undefined || value === 0 ? '-' : Number(value));
          });
          
          // Add FO BOQ, KEBUTUHAN FO, JUMLAH POSISI columns - show "-" for 0
          row.push(
            summaryRow.slack_berbayar !== null && summaryRow.slack_berbayar !== undefined && summaryRow.slack_berbayar !== 0 ? Number(summaryRow.slack_berbayar) : '-',
            summaryRow.fo_total !== null && summaryRow.fo_total !== undefined && summaryRow.fo_total !== 0 ? Number(summaryRow.fo_total) : '-',
            summaryRow.slack_tidak_berbayar !== null && summaryRow.slack_tidak_berbayar !== undefined && summaryRow.slack_tidak_berbayar !== 0 ? Number(summaryRow.slack_tidak_berbayar) : '-',
            summaryRow.tol_2_persen !== null && summaryRow.tol_2_persen !== undefined && summaryRow.tol_2_persen !== 0 ? Number(summaryRow.tol_2_persen) : '-',
            summaryRow.pengadaan !== null && summaryRow.pengadaan !== undefined && summaryRow.pengadaan !== 0 ? Number(summaryRow.pengadaan) : '-',
            summaryRow.bm !== null && summaryRow.bm !== undefined && summaryRow.bm !== 0 ? Number(summaryRow.bm) : '-',
            summaryRow.s3 !== null && summaryRow.s3 !== undefined && summaryRow.s3 !== 0 ? Number(summaryRow.s3) : '-',
            summaryRow.ds !== null && summaryRow.ds !== undefined && summaryRow.ds !== 0 ? Number(summaryRow.ds) : '-',
            summaryRow.bss !== null && summaryRow.bss !== undefined && summaryRow.bss !== 0 ? Number(summaryRow.bss) : '-',
            summaryRow.bts !== null && summaryRow.bts !== undefined && summaryRow.bts !== 0 ? Number(summaryRow.bts) : '-',
            summaryRow.da !== null && summaryRow.da !== undefined && summaryRow.da !== 0 ? Number(summaryRow.da) : '-',
            summaryRow.hps1 !== null && summaryRow.hps1 !== undefined && summaryRow.hps1 !== 0 ? Number(summaryRow.hps1) : '-',
            summaryRow.hps2 !== null && summaryRow.hps2 !== undefined && summaryRow.hps2 !== 0 ? Number(summaryRow.hps2) : '-'
          );
          
          worksheet.addRow(row);
          
          lastRowNumber = worksheet.lastRow?.number || 12;
          const grandTotalRow = worksheet.getRow(lastRowNumber);
          grandTotalRow.height = 22;
          
          // Merge columns 1-3 for GRAND TOTAL label (NO, A, B only - not LENGTH)
          worksheet.mergeCells(lastRowNumber, 1, lastRowNumber, 3);
          
          // Style the merged cell (columns 1-3)
          const firstCell = grandTotalRow.getCell(1);
          const labelValue = summaryRow.rekapLabel || summaryRow.designator;
          firstCell.value = typeof labelValue === 'string' ? labelValue : String(labelValue || '');
          firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
          firstCell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
          firstCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White background
          
          // Style GRAND TOTAL row with seamless look
          grandTotalRow.eachCell((cell, colNumber) => {
            // White background for all cells
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            
            // For LENGTH column (4) and data columns (5 onwards), center align
            if (colNumber >= 4) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 };
            }
            
            // Only apply top and bottom borders (no left/right internal borders)
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              ...(colNumber === 1 ? { left: { style: 'thin', color: { argb: 'FF000000' } } } : {}),
              ...(colNumber === totalColumnsCount ? { right: { style: 'thin', color: { argb: 'FF000000' } } } : {})
            };
          });
          
          console.log(`  ✅ Added ${summaryRow.rekapLabel}`);
        });

      console.log('📝 Setting column widths exactly like TabBOQ...');
      // Set column widths - adapted from TabBOQ pattern
      const columnWidths = [
        { width: 6 },   // NO
        { width: 12 },  // A
        { width: 12 },  // B
        { width: 12 },  // LENGTH
        { width: 18 },  // DESIGNATOR
      ];
      
      // Add widths for designator columns - NARROWER for many columns (width: 8)
      allDesignatorCols.forEach(() => {
        columnWidths.push({ width: 8 }); // Balanced width for designator columns
      });
      
      // Add widths for FO BOQ columns (2 columns)
      columnWidths.push({ width: 15 }); // SLACK BERBAYAR
      columnWidths.push({ width: 12 }); // FO TOTAL
      
      // Add widths for KEBUTUHAN FO columns (3 columns)
      columnWidths.push({ width: 18 }); // SLACK TIDAK BERBAYAR
      columnWidths.push({ width: 10 }); // TOL 2%
      columnWidths.push({ width: 12 }); // PENGADAAN
      
      // Add widths for JUMLAH POSISI columns (8 columns)
      columnWidths.push({ width: 8 });  // BM
      columnWidths.push({ width: 8 });  // S3
      columnWidths.push({ width: 8 });  // DS
      columnWidths.push({ width: 8 });  // BSS
      columnWidths.push({ width: 8 });  // BTS
      columnWidths.push({ width: 8 });  // DA
      columnWidths.push({ width: 8 });  // HPS1
      columnWidths.push({ width: 8 });  // HPS2
      
      worksheet.columns = columnWidths;

      console.log('🔗 Merging cells FIRST (before styling)...');
      
      // CRITICAL: Merge cells BEFORE styling
      try {
        // 1. Merge SPAN horizontally in row 9 (columns 1-4) - previously row 8
        worksheet.mergeCells(9, 1, 9, 4);
        console.log('✅ Merged SPAN header (row 9, columns 1-4)');
        
        // 2. Merge DESIGNATOR vertically (rows 9-10, column 5) - previously rows 8-9
        worksheet.mergeCells(9, 5, 10, 5);
        console.log('✅ Merged DESIGNATOR vertically (rows 9-10, column 5)');
        
        // 3. Merge each designator column vertically (rows 9-10, columns 6+) - previously rows 8-9
        for (let col = mainDesignatorStartCol; col <= mainDesignatorEndCol; col++) {
          worksheet.mergeCells(9, col, 10, col);
        }
        console.log(`✅ Merged ${allDesignatorCols.length} designator columns vertically (rows 9-10)`);
        
        // 4. Merge FO BOQ group header horizontally in row 9 (2 columns) - previously row 8
        worksheet.mergeCells(9, mainFoBOQStartCol, 9, mainFoBOQStartCol + 1);
        console.log(`✅ Merged FO BOQ header (row 9, columns ${mainFoBOQStartCol}-${mainFoBOQStartCol + 1})`);
        
        // 5. Merge KEBUTUHAN FO group header horizontally in row 9 (3 columns) - previously row 8
        worksheet.mergeCells(9, mainKebutuhanFOStartCol, 9, mainKebutuhanFOStartCol + 2);
        console.log(`✅ Merged KEBUTUHAN FO header (row 9, columns ${mainKebutuhanFOStartCol}-${mainKebutuhanFOStartCol + 2})`);
        
        // 6. Merge JUMLAH POSISI group header horizontally in row 9 (8 columns) - previously row 8
        worksheet.mergeCells(9, mainJumlahPosisiStartCol, 9, mainJumlahPosisiStartCol + 7);
        console.log(`✅ Merged JUMLAH POSISI header (row 9, columns ${mainJumlahPosisiStartCol}-${mainJumlahPosisiStartCol + 7})`);
        
      } catch (mergeError) {
        console.error('❌ Error merging cells:', mergeError);
      }

      console.log('🎨 Applying styles AFTER merging...');
      // Style header information (rows 1-6)
      for (let row = 1; row <= 6; row++) {
        const cell = worksheet.getCell(row, 1);
        cell.font = { bold: true, size: row === 1 ? 14 : 11 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' } as any;
      }

      // Style row 8 (Column numbers: 1, 2, 3, 4, ...)
      const styleRow8 = worksheet.getRow(8);
      styleRow8.height = 20; // Standard height for numbers
      styleRow8.eachCell((cell) => {
        cell.font = { bold: false, color: { argb: 'FF000000' }, size: 9 }; // NOT bold
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        // NO background color - removed fill
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style row 9 (Group headers: SPAN, DESIGNATOR, Designator columns, FO BOQ, KEBUTUHAN FO, JUMLAH POSISI) - previously row 8
      const styleRow9 = worksheet.getRow(9);
      styleRow9.height = 30; // Shorter height for cleaner look
      styleRow9.eachCell((cell, colNumber) => {
        cell.font = { bold: false, color: { argb: 'FF000000' }, size: 11 }; // NOT bold
        
        if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
          // Designator columns - VERTICAL text
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            textRotation: 90 // VERTICAL
          };
        } else if (colNumber >= mainFoBOQStartCol && colNumber <= mainTotalColumns) {
          // FO BOQ, KEBUTUHAN FO, JUMLAH POSISI - horizontal text
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          // SPAN and DESIGNATOR
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // NO background color - removed fill
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style row 10 (Sub-headers: NO, A, B, LENGTH, DESIGNATOR merged, Designator columns merged, FO BOQ, KEBUTUHAN FO, JUMLAH POSISI) - previously row 9
      const styleRow10 = worksheet.getRow(10);
      styleRow10.height = 80; // Reduced from 120 to 80 for more compact look
      styleRow10.hidden = false; // CRITICAL: Explicitly unhide
      styleRow10.outlineLevel = 0; // CRITICAL: Ensure not hidden by outline
      styleRow10.eachCell((cell, colNumber) => {
        cell.font = { bold: false, color: { argb: 'FF000000' }, size: 10 }; // NOT bold
        
        if (colNumber >= mainDesignatorStartCol && colNumber <= mainDesignatorEndCol) {
          // Designator columns - VERTICAL text (merged with row 9)
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            textRotation: 90, // VERTICAL
            wrapText: true // Enable text wrapping for line breaks
          };
        } else if (colNumber === 5) {
          // DESIGNATOR (merged with row 9)
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            wrapText: true // Enable text wrapping
          };
        } else if (colNumber >= mainFoBOQStartCol && colNumber <= mainTotalColumns) {
          // FO BOQ, KEBUTUHAN FO, JUMLAH POSISI sub-headers - ALL VERTICAL TEXT like reference
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            textRotation: 90, // VERTICAL - like reference
            wrapText: true // Enable text wrapping for line breaks
          };
        } else {
          // NO, A, B, LENGTH - horizontal text (short labels)
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            wrapText: true // Enable text wrapping
          };
        }
        
        // NO background color - removed fill
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style row 11 (Empty spacing row) - previously row 10
      const spacingRow11 = worksheet.getRow(11);
      spacingRow11.height = 5; // Small spacing

      // Style data rows - starts from row 12 now (after spacing) - previously row 11
      // Note: Data rows now include span name headers and their data, plus SUB TOTAL rows
      // All styling is applied during row creation, so we only need to ensure borders are consistent
      const dataStartRow = 12;
      // Calculate total rows: span groups + their data + SUB TOTAL rows
      const spanGroupCount = Object.keys(groupedData).length;
      const subTotalCount = summaryRows.filter(row => row.isRekapSubTotal).length;
      const dataEndRow = dataStartRow + dataRows.length + spanGroupCount + subTotalCount - 1;
      
      // Apply consistent styling to all data rows (span headers, data, and SUB TOTAL are already styled)
      for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        // Skip if row is already styled (span header or SUB TOTAL)
        // We can identify them by checking if they have background color
        const firstCell = row.getCell(1);
        if (firstCell.fill && (firstCell.fill as any).fgColor) {
          // Already styled (span header or SUB TOTAL), skip
          continue;
        }
        
        // Style regular data rows
        row.height = 20;
        row.eachCell((cell, colNumber) => {
          let alignment: any = { horizontal: 'center', vertical: 'middle' };
          if (colNumber === 5) { // DESIGNATOR - left aligned (like BOQ's URAIAN PEKERJAAN)
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

      console.log('❄️ Setting freeze panes...');
      // Set freeze panes - freeze after row 7 (after project info, before headers)
      worksheet.views = [{
        state: 'frozen',
        xSplit: 5,  // Freeze SPAN section + DESIGNATOR (5 columns)
        ySplit: 7,  // Freeze after row 7 (project info section)
        topLeftCell: 'F8' // Active cell starts at first designator column, row 8
      }];

      console.log('💾 Generating file...');
      // Generate filename with format: MATRIX-ProjectName-LinkName-Date.xlsx
      const projectName = projectData?.name || contractName || 'Project';
      const linkPart = linkName ? `-${linkName}` : '';
      const datePart = new Date().toISOString().split('T')[0];
      const fileName = `MATRIX-${projectName}${linkPart}-${datePart}.xlsx`;

      // Save file - EXACT COPY from TabBOQ
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Professional Matrix Excel exported successfully');
      console.log('✅ Professional Matrix Excel exported successfully:', fileName);
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

  // COMMENTED OUT: Hide edit functionality as per requirement
  /*
  const handleEditRow = (row: MatrixRowData) => {
    setEditingRow(row);
    setSurveyForm({
      span: row.spanGroup,
      designator: row.designator,
      length: String(row.length || ''),
      a: String(row.a || ''),
      b: String(row.b || ''),
      longitudeA: String(row.longitudeA || ''),
      latitudeA: String(row.latitudeA || ''),
      longitudeB: String(row.longitudeB || ''),
      latitudeB: String(row.latitudeB || ''),
      soilType: String(row.soilType || ''),
    });
    // Load existing photos
    const photos = row.evidencePhotos;
    if (Array.isArray(photos)) {
      setExistingPhotos(photos);
    } else {
      setExistingPhotos([]);
    }
    setEvidencePhotos([]);
    setShowAddSurveyModal(true);
  };
  */

  // COMMENTED OUT: Hide delete functionality as per requirement
  /*
  const handleDeleteRow = (row: MatrixRowData) => {
    setRowToDelete(row);
    setShowDeleteConfirm(true);
  };
  */

  // COMMENTED OUT: Hide actions column as per requirement
  /*
  // Actions Cell Renderer
  const ActionsCellRenderer = (params: any) => {
    // Don't show actions for group rows or total rows or REKAPITULASI rows or header rows or SPAN SUB TOTAL rows
    if (params.node.group || params.node.rowPinned || params.node.footer || 
        params.data?.isRekapHeader || params.data?.isRekapSubTotal || 
        params.data?.isRekapGrandTotal || params.data?.isRekapGrandTotalRounded ||
        params.data?.isSpanSubTotal) return null; // Exclude manual SPAN SUB TOTAL rows

    return (
      <div className="flex items-center justify-center gap-1">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEditRow(params.data);
          }}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button
          className="p-1 hover:bg-gray-200 rounded"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteRow(params.data);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };
  */

  // Handler functions for inline editing
  const handleEdit = (data: MatrixRowData) => {
    // Don't allow editing for subtotal or grand total rows
    if (data.isRekapSubTotal || data.isSpanSubTotal || data.isRekapGrandTotal || data.isRekapGrandTotalRounded) {
      toast.warning('Cannot edit summary rows');
      return;
    }
    
    // Close detail panel when starting edit
    setSelectedRow(null);
    
    // Prepare form data with all designator values
    const formData: {[key: string]: any} = {};
    
    // Add all designator columns
    [...designatorColumns, ...dynamicColumns].forEach(col => {
      const field = col.field as string;
      formData[field] = data[field] || 0;
    });
    
    setEditingRow(data);
    setEditFormData(formData);
    setShowEditModal(true);
    console.log('🖊️ Opening edit modal for row:', data);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    
    console.log('💾 Saving edits for row:', editingRow, 'with values:', editFormData);
    
    // Find the row being edited
    const rowIndex = allMatrixData.findIndex(
      row => row.spanGroup === editingRow.spanGroup && row.span === editingRow.span
    );
    
    if (rowIndex === -1) {
      toast.error('Row not found');
      setShowEditModal(false);
      setEditingRow(null);
      return;
    }
    
    // Check if there are any changes
    const hasChanges = Object.keys(editFormData).some(key => {
      return editFormData[key] !== (editingRow[key] || 0);
    });
    
    if (!hasChanges) {
      toast.info('No changes to save');
      setShowEditModal(false);
      setEditingRow(null);
      return;
    }
    
    // NOTE: Matrix data is calculated from Redline entries
    // For now, we'll update local state only
    // TODO: Implement backend API to persist matrix overrides if needed
    
    // Update the row with edited values
    const updatedData = [...allMatrixData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      ...editFormData
    };
    
    setAllMatrixData(updatedData);
    setShowEditModal(false);
    setEditingRow(null);
    setEditFormData({});
    
    toast.success('Matrix row updated (local only - Matrix data is calculated from Redline)');
    console.log('✅ Row updated successfully (local state only)');
    console.log('ℹ️  Note: Matrix data is derived from Redline. Changes are not persisted to backend.');
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingRow(null);
    setEditFormData({});
    console.log('❌ Edit cancelled');
  };

  const handleDelete = (data: MatrixRowData) => {
    // Don't allow deleting summary rows
    if (data.isRekapSubTotal || data.isSpanSubTotal || data.isRekapGrandTotal || data.isRekapGrandTotalRounded) {
      toast.warning('Cannot delete summary rows');
      return;
    }
    
    setRowToDelete(data);
    setShowDeleteConfirm(true);
  };

  // Actions Cell Renderer for modal editing
  const ActionsCellRenderer = (params: any) => {
    // Don't show actions for summary rows or group rows
    if (params.data?.isRekapSubTotal || 
        params.data?.isSpanSubTotal || 
        params.data?.isRekapGrandTotal || 
        params.data?.isRekapGrandTotalRounded ||
        params.node?.group) {
      return null;
    }
    
    // Show Edit and Delete buttons
    return (
      <div className="flex items-center justify-center gap-1">
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(params.data);
          }}
        >
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(params.data);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  // Column definitions - combine static and dynamic columns
  // Wait for designatorColumns to be loaded before creating columnDefs
  const columnDefs: ColDef[] = [
    {
      field: 'spanGroup',
      headerName: 'SPAN',
      width: 150,
      rowGroup: true,
      hide: true,
    },
    { 
      field: 'span', 
      headerName: 'NO', 
      width: 80, 
      cellRenderer: cellValueRenderer,
      pinned: 'left'
    },
    { field: 'offset', headerName: 'OFFSET', width: 100, hide: true }, // Hidden
    { 
      field: 'offset_from', 
      headerName: 'A', 
      width: 100, 
      cellRenderer: cellValueRenderer,
      pinned: 'left'
    },
    { 
      field: 'offset_to', 
      headerName: 'B', 
      width: 100, 
      cellRenderer: cellValueRenderer,
      pinned: 'left'
    },
    { 
      field: 'length', 
      headerName: 'LENGTH', 
      width: 100,
      aggFunc: 'sum',
      valueFormatter: formatCellValue,
      cellRenderer: cellValueRenderer,
      pinned: 'left'
    },
    { field: 'depth', headerName: 'DEPTH', width: 100, hide: true }, // Hidden
    { field: 'location', headerName: 'LOCATION', width: 200, hide: true }, // Hidden - user doesn't want to show location
    { 
      field: 'designator', 
      headerName: 'DESIGNATOR', 
      width: 200, 
      cellRenderer: cellValueRenderer,
      pinned: 'left'
    },
    // Dynamic designator columns from API (replaces hardcoded columns)
    ...designatorColumns,
    // Additional dynamic columns from matrix data (exclude those already in designatorColumns)
    ...dynamicColumns.filter(col => {
      const colId = col.colId as string;
      // Check if this colId is already in designatorColumns
      const alreadyExists = designatorColumns.some(dc => dc.colId === colId);
      if (alreadyExists) {
        console.log(`🔍 Filtering out duplicate column: ${colId}`);
      }
      return !alreadyExists;
    }),
    // FO BOQ Group
    {
      headerName: 'FO BOQ',
      children: [
        { 
          field: 'slack_berbayar', 
          headerName: 'SLACK BERBAYAR', 
          width: 140,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'fo_total', 
          headerName: 'FO TOTAL', 
          width: 120,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        }
      ]
    } as any,
    // KEBUTUHAN FO Group
    {
      headerName: 'KEBUTUHAN FO',
      children: [
        { 
          field: 'slack_tidak_berbayar', 
          headerName: 'SLACK TIDAK BERBAYAR', 
          width: 180,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'tol_2_persen', 
          headerName: 'TOL 2%', 
          width: 100,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'pengadaan', 
          headerName: 'PENGADAAN', 
          width: 120,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        }
      ]
    } as any,
    // JUMLAH POSISI Group
    {
      headerName: 'JUMLAH POSISI',
      children: [
        { 
          field: 'bm', 
          headerName: 'BM', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 's3', 
          headerName: 'S3', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'ds', 
          headerName: 'DS', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'bss', 
          headerName: 'BSS', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'bts', 
          headerName: 'BTS', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'da', 
          headerName: 'DA', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'hps1', 
          headerName: 'HPS1', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        },
        { 
          field: 'hps2', 
          headerName: 'HPS2', 
          width: 80,
          aggFunc: 'sum',
          valueFormatter: formatCellValue,
          cellRenderer: cellValueRenderer
        }
      ]
    } as any,
    // Actions column for inline editing
    {
      field: 'actions',
      headerName: 'ACTIONS',
      width: 120,
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    }
  ];

  // COMMENTED OUT: Hide delete confirmation functionality as per requirement
  
  const confirmDelete = () => {
    if (!rowToDelete) return;

    // NOTE: Matrix data is calculated from Redline entries
    // Deleting from local state only - not persisted to backend
    const updatedData = allMatrixData.filter(
      item => !(item.spanGroup === rowToDelete.spanGroup && item.span === rowToDelete.span)
    );
    setAllMatrixData(updatedData);

    // Close detail panel if deleted row was selected
    if (selectedRow?.spanGroup === rowToDelete.spanGroup && selectedRow?.span === rowToDelete.span) {
      setSelectedRow(null);
    }

    setShowDeleteConfirm(false);
    setRowToDelete(null);
    
    toast.success('Matrix row deleted (local only - Matrix data is calculated from Redline)');
    console.log('✅ Row deleted successfully (local state only)');
    console.log('ℹ️  Note: Matrix data is derived from Redline. Changes are not persisted to backend.');
  };


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setEvidencePhotos([...evidencePhotos, ...files]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📤 File selected:', file.name, file.size, 'bytes', file.type);
      handleProcessAI(file);
    }
  };

  const handleProcessAI = async (file: File) => {
    console.log('🤖 handleProcessAI called with file:', file.name);
    setIsProcessing(true);
    setAiResult(null);

    try {
      const { aiService } = await import('@/services/aiService');
      const { authService } = await import('@/services/authService');
      
      const token = authService.getToken();
      const response = await aiService.analyzeImage(file, token);
      
      if (response.success && response.result) {
        const mappedResult = {
          catatan: response.result.catatan,
          gps_coordinates: response.result.lokasi?.koordinat ? {
            latitude: response.result.lokasi.koordinat.latitude || '',
            longitude: response.result.lokasi.koordinat.longitude || ''
          } : undefined,
          lokasi: response.result.lokasi?.alamat || ''
        };
        setAiResult(mappedResult);
      } else {
        setAiResult({ error: response.error || 'Analysis failed' });
      }
    } catch (error) {
      console.error('❌ Error in handleProcessAI:', error);
      setAiResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSurvey = async () => {
    try {
      // Validasi form
      if (!surveyForm.span || !surveyForm.designator || !surveyForm.length || !surveyForm.a || !surveyForm.b) {
        toast.error('Please fill in all required fields (SPAN, Designator, Length, A, B)');
        return;
      }

      console.log('Starting survey save...', { editingRow, surveyForm });

      // Convert new images to base64 with compression
      const newBase64Images: string[] = [];
      for (const file of evidencePhotos) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              // Compress image to max 800px width
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              let width = img.width;
              let height = img.height;
              const maxWidth = 800;

              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }

              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);

              // Convert to base64 with quality 0.7
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              resolve(compressedBase64);
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
        newBase64Images.push(base64);
      }

      // Combine existing photos with new photos
      const allPhotos = [...existingPhotos, ...newBase64Images];
      console.log('Photos combined:', { existing: existingPhotos.length, new: newBase64Images.length, total: allPhotos.length });

      let updatedData: MatrixRowData[];

      if (editingRow) {
        // Edit mode - update existing row
        console.log('Edit mode - updating row:', editingRow);
        updatedData = allMatrixData.map(row => {
          if (row.spanGroup === editingRow.spanGroup && row.span === editingRow.span) {
            const updated = {
              ...row,
              spanGroup: surveyForm.span,
              a: surveyForm.a,
              b: surveyForm.b,
              length: surveyForm.length,
              designator: surveyForm.designator,
              evidencePhotos: allPhotos,
              longitudeA: surveyForm.longitudeA || undefined,
              latitudeA: surveyForm.latitudeA || undefined,
              longitudeB: surveyForm.longitudeB || undefined,
              latitudeB: surveyForm.latitudeB || undefined,
              soilType: surveyForm.soilType || undefined,
            };
            console.log('Updated row:', updated);
            return updated;
          }
          return row;
        });
        console.log('Survey updated successfully');
      } else {
        // Add mode - create new row
        const rowsInSpan = allMatrixData.filter(row => row.spanGroup === surveyForm.span);
        const nextRowNumber = (rowsInSpan.length + 1).toString();

        const newSurveyRow: MatrixRowData = {
          spanGroup: surveyForm.span,
          span: nextRowNumber,
          offset: '-',
          offset_from: '-',
          offset_to: '-',
          length: surveyForm.length,
          depth: '-',
          location: '-',
          designator: surveyForm.designator,
          a: surveyForm.a,
          b: surveyForm.b,
          bcOfSm: '-',
          bcOfRg: '-',
          bcTrs: '-',
          kab: '-',
          tgb: '-',
          fo: '-',
          fsi: '-',
          pnbl: '-',
          prnl: '-',
          evidencePhotos: allPhotos,
          longitudeA: surveyForm.longitudeA,
          latitudeA: surveyForm.latitudeA,
          longitudeB: surveyForm.longitudeB,
          latitudeB: surveyForm.latitudeB,
          soilType: surveyForm.soilType,
        };

        updatedData = [...allMatrixData, newSurveyRow];
        console.log('Survey added successfully');
      }

      // Update state and localStorage
      console.log('Saving to state and localStorage...');
      setAllMatrixData(updatedData);

      // Save to localStorage with error handling for quota exceeded
      try {
        localStorage.setItem('matrixData', JSON.stringify(updatedData));
        console.log('Saved to localStorage successfully');
      } catch (storageError) {
        console.warn('localStorage quota exceeded, data saved to state only:', storageError);
        // Data still saved to state, just not persisted to localStorage
        toast.warning('Warning: Data saved but may not persist after page refresh due to storage limit. Consider reducing photo sizes.');
      }

      // Close modal and reset form
      setShowAddSurveyModal(false);
      setSurveyForm({ span: '', designator: '', length: '', a: '', b: '', longitudeA: '', latitudeA: '', longitudeB: '', latitudeB: '', soilType: '' });
      setEvidencePhotos([]);
      setExistingPhotos([]);
      setEditingRow(null);
      console.log('Survey save completed successfully');
    } catch (error) {
      console.error('Error saving survey:', error);
      toast.error('Error saving survey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleClose = () => {
    setSurveyForm({
      span: '',
      designator: '',
      length: '',
      a: '',
      b: '',
      longitudeA: '',
      latitudeA: '',
      longitudeB: '',
      latitudeB: '',
      soilType: '',
    });
    setAiResult(null);
    setIsProcessing(false);
    setActiveTab('automatic');
    setEvidencePhotos([]);
    setExistingPhotos([]);
    setEditingRow(null);
    setShowAddSurveyModal(false);
  };

  const handleSubmit = () => {
    handleAddSurvey();
  };

  return (
    <div className="flex flex-col bg-white relative flex-grow h-full" style={{ minHeight: '600px' }}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-medium" style={{ fontWeight: 600 }}>Matrix Data</h3>
          <p className="text-sm text-gray-500 mt-1">
            Contract: <span className="font-medium text-gray-700">{contractName}</span> | Showing {allMatrixData.length} items
            {linkId && <span className="ml-2 text-xs text-blue-600 font-medium">(Filtered by SS/Link)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || allMatrixData.length === 0}
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
              cursor: (loading || allMatrixData.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.37)',
              transition: 'all 0.3s ease',
              opacity: (loading || allMatrixData.length === 0) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && allMatrixData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 1) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && allMatrixData.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(59, 130, 246, 0.37)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)';
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loading || allMatrixData.length === 0}
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
              cursor: (loading || allMatrixData.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.37)',
              transition: 'all 0.3s ease',
              opacity: (loading || allMatrixData.length === 0) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && allMatrixData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(16, 185, 129, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && allMatrixData.length > 0) {
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
            disabled={loading || allMatrixData.length === 0}
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
              cursor: (loading || allMatrixData.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px 0 rgba(220, 38, 38, 0.37)',
              transition: 'all 0.3s ease',
              opacity: (loading || allMatrixData.length === 0) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && allMatrixData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(220, 38, 38, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 1) 0%, rgba(185, 28, 28, 1) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && allMatrixData.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(220, 38, 38, 0.37)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)';
              }
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          {markAsDoneButton}
        </div>
      </div>
      
      <div className="p-4 overflow-auto">
        <div className={`ag-theme-quartz w-full matrix-table-custom ${loading ? 'ag-grid-loading' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-red-600">Error: {error}</p>
              </div>
            </div>
          ) : (
            <>
            <style>{`
            /* Group Row Styling */
            .ag-theme-quartz .ag-row-group {
              background-color: #EFF6FF !important;
              font-weight: 600;
              color: #1E40AF !important;
            }
            .ag-theme-quartz .ag-row-group .ag-cell {
              background-color: #EFF6FF !important;
              color: #1E40AF !important;
            }
            /* Group Row Hover - Apply to ALL cells */
            .ag-theme-quartz .ag-row-group:hover {
              background-color: #DBEAFE !important;
            }
            .ag-theme-quartz .ag-row-group:hover .ag-cell {
              background-color: #DBEAFE !important;
              color: #1E40AF !important;
            }
            /* REKAPITULASI Group Row - SAME styling as other group rows (blue) */
            .ag-theme-quartz .ag-row-group[row-id*="REKAPITULASI"] {
              background-color: #EFF6FF !important;
              font-weight: 600;
              color: #1E40AF !important;
            }
            .ag-theme-quartz .ag-row-group[row-id*="REKAPITULASI"] .ag-cell {
              background-color: #EFF6FF !important;
              color: #1E40AF !important;
            }
            .ag-theme-quartz .ag-row-group[row-id*="REKAPITULASI"]:hover {
              background-color: #DBEAFE !important;
            }
            .ag-theme-quartz .ag-row-group[row-id*="REKAPITULASI"]:hover .ag-cell {
              background-color: #DBEAFE !important;
              color: #1E40AF !important;
            }
            /* REKAPITULASI Header Row - Soft blue to match group rows (not dark gray) */
            .ag-theme-quartz .ag-row-rekap-header {
              background-color: #DBEAFE !important;
            }
            .ag-theme-quartz .ag-row-rekap-header .ag-cell {
              background-color: #DBEAFE !important;
              color: #1E40AF !important;
              font-weight: 700 !important;
              font-size: 12px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
            }
            .ag-theme-quartz .ag-row-rekap-header:hover {
              background-color: #BFDBFE !important;
            }
            .ag-theme-quartz .ag-row-rekap-header:hover .ag-cell {
              background-color: #BFDBFE !important;
              color: #1E40AF !important;
            }
            /* REKAPITULASI Sub Total Rows - SAME as regular rows */
            .ag-theme-quartz .ag-row-rekap-subtotal .ag-cell {
              font-weight: 600 !important;
            }
            /* REKAPITULASI Grand Total Row - slightly darker */
            .ag-theme-quartz .ag-row-rekap-grandtotal {
              background-color: #F3F4F6 !important;
            }
            .ag-theme-quartz .ag-row-rekap-grandtotal .ag-cell {
              background-color: #F3F4F6 !important;
              font-weight: 700 !important;
              color: #1F2937 !important;
            }
            /* REKAPITULASI Grand Total Rounded Row - darker */
            .ag-theme-quartz .ag-row-rekap-grandtotal-rounded {
              background-color: #E5E7EB !important;
            }
            .ag-theme-quartz .ag-row-rekap-grandtotal-rounded .ag-cell {
              background-color: #E5E7EB !important;
              font-weight: 700 !important;
              color: #1F2937 !important;
            }
            /* Regular Row */
            .ag-theme-quartz .ag-row {
              border-bottom: 1px solid #E5E7EB;
            }
            .ag-theme-quartz .ag-row:hover {
              background-color: #F9FAFB !important;
            }
            .ag-theme-quartz .ag-cell {
              font-size: 13px;
              color: #1F2937;
            }
            /* NUCLEAR OPTION: Remove ALL possible outlines and borders on focus */
            .ag-theme-quartz .ag-row:focus,
            .ag-theme-quartz .ag-row:focus-within,
            .ag-theme-quartz .ag-row-group:focus,
            .ag-theme-quartz .ag-row-group:focus-within,
            .ag-theme-quartz .ag-cell:focus,
            .ag-theme-quartz .ag-cell:focus-within,
            .ag-theme-quartz .ag-group-expanded:focus,
            .ag-theme-quartz .ag-group-contracted:focus {
              outline: 0 !important;
              outline-width: 0 !important;
              outline-style: none !important;
              outline-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }
            .ag-theme-quartz .ag-row.ag-row-focus,
            .ag-theme-quartz .ag-row.ag-row-focus .ag-cell,
            .ag-theme-quartz .ag-cell.ag-cell-focus,
            .ag-theme-quartz .ag-row-group.ag-row-focus,
            .ag-theme-quartz .ag-row-group.ag-row-focus .ag-cell {
              outline: 0 !important;
              outline-width: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .ag-theme-quartz *:focus,
            .ag-theme-quartz *:focus-visible,
            .ag-theme-quartz *:focus-within {
              outline: 0 !important;
              outline-width: 0 !important;
              box-shadow: none !important;
            }
            /* Specifically target the row group cell */
            .ag-theme-quartz .ag-row-group .ag-cell,
            .ag-theme-quartz .ag-row-group .ag-cell:focus,
            .ag-theme-quartz .ag-row-group.ag-row-focus .ag-cell {
              outline: 0 !important;
              outline-width: 0 !important;
              border-top: none !important;
              border-left: none !important;
              border-right: none !important;
              box-shadow: none !important;
            }
            /* Group Total Row Styling - MULTIPLE SELECTORS FOR MAXIMUM COVERAGE */
            .ag-theme-quartz .ag-row-total,
            .ag-theme-quartz .ag-row-total-custom,
            .ag-theme-quartz .ag-row[row-id*="rowGroupFooter"],
            .ag-theme-quartz .ag-row[aria-rowindex][role="row"]:has(.ag-cell:first-child:contains("SUB TOTAL")) {
              background-color: #E5E7EB !important;
              font-weight: 700 !important;
              color: #111827 !important;
              border-top: 2px solid #9CA3AF !important;
              border-bottom: 2px solid #9CA3AF !important;
            }
            .ag-theme-quartz .ag-row-total .ag-cell,
            .ag-theme-quartz .ag-row-total-custom .ag-cell,
            .ag-theme-quartz .ag-row[row-id*="rowGroupFooter"] .ag-cell {
              font-weight: 700 !important;
              color: #111827 !important;
              background-color: #E5E7EB !important;
            }
            .ag-theme-quartz .ag-row-total:hover,
            .ag-theme-quartz .ag-row-total-custom:hover,
            .ag-theme-quartz .ag-row[row-id*="rowGroupFooter"]:hover {
              background-color: #D1D5DB !important;
            }
            .ag-theme-quartz .ag-row-total:hover .ag-cell,
            .ag-theme-quartz .ag-row-total-custom:hover .ag-cell,
            .ag-theme-quartz .ag-row[row-id*="rowGroupFooter"]:hover .ag-cell {
              background-color: #D1D5DB !important;
              color: #111827 !important;
            }
            /* Remove focus outline from total row */
            .ag-theme-quartz .ag-row-total:focus,
            .ag-theme-quartz .ag-row-total:focus-within,
            .ag-theme-quartz .ag-row-total .ag-cell:focus,
            .ag-theme-quartz .ag-row-total-custom:focus,
            .ag-theme-quartz .ag-row-total-custom:focus-within,
            .ag-theme-quartz .ag-row-total-custom .ag-cell:focus {
              outline: 0 !important;
              box-shadow: none !important;
            }
            /* Override any conflicting styles - FORCE IT! */
            .ag-theme-quartz .ag-row-total .ag-cell,
            .ag-theme-quartz .ag-row-total-custom .ag-cell,
            .ag-theme-quartz .ag-row[row-id*="rowGroupFooter"] .ag-cell {
              background-color: #E5E7EB !important;
            }

            /* Hide AG Grid overlay when loading */
            .ag-grid-loading .ag-overlay-no-rows-wrapper {
              display: none !important;
            }

            /* Hide AG Grid "No Rows To Show" message when loading */
            .ag-grid-loading .ag-overlay {
              display: none !important;
            }

            /* Modern border radius for table */
            .matrix-table-custom .ag-root-wrapper {
              border-radius: 8px !important;
              overflow: hidden !important;
              border: 1px solid #E9ECEF !important;
            }
          `}</style>
            <AgGridReact
              rowData={allMatrixData}
              columnDefs={columnDefs}
              groupDisplayType="singleColumn"
              groupDefaultExpanded={-1}
              groupTotalRow={(params) => {
                // Disable automatic SUB TOTAL for all groups - we'll add manual rows instead
                return undefined;
              }}
              animateRows={true}
              suppressAggFuncInHeader={true}
              suppressCellFocus={true}
              theme={themeQuartz}
              getRowStyle={(params) => {
                // Subtotal rows (group footer - now disabled)
                if (params.node.footer) {
                  return {
                    backgroundColor: '#E5E7EB',
                    color: '#111827',
                    fontWeight: '700',
                    fontSize: '13px'
                  };
                }
                // CRITICAL: Style manual SPAN SUB TOTAL rows
                if (params.data?.isSpanSubTotal) {
                  return {
                    backgroundColor: '#E5E7EB',
                    color: '#111827',
                    fontWeight: '700',
                    fontSize: '13px'
                  };
                }
                return undefined;
              }}
              getRowClass={(params: any) => {
                if (params.data?.isRekapHeader) {
                  return 'ag-row-rekap-header';
                }
                if (params.data?.isRekapSubTotal) {
                  return 'ag-row-rekap-subtotal';
                }
                if (params.data?.isRekapGrandTotal) {
                  return 'ag-row-rekap-grandtotal';
                }
                if (params.data?.isRekapGrandTotalRounded) {
                  return 'ag-row-rekap-grandtotal-rounded';
                }
                // CRITICAL: Style manual SPAN SUB TOTAL rows like group footers
                if (params.data?.isSpanSubTotal) {
                  return 'ag-row-total-custom';
                }
                if (params.node?.footer) return 'ag-row-total-custom';
                return '';
              }}
              onCellClicked={(event) => {
                // Don't open detail panel if clicking on Actions column
                if (event.column.getColId() === 'actions') {
                  return;
                }
                
                // Only handle clicks on data rows, not group rows or total rows or REKAPITULASI rows or header rows or SPAN SUB TOTAL rows
                if (!event.node.group && !event.node.footer && 
                    !event.data?.isRekapHeader && !event.data?.isRekapSubTotal && 
                    !event.data?.isRekapGrandTotal && !event.data?.isRekapGrandTotalRounded && 
                    !event.data?.isSpanSubTotal && // Exclude manual SPAN SUB TOTAL rows
                    event.data) {
                  setSelectedRow(event.data);
                  event.event?.stopPropagation();
                }
              }}
              onRowClicked={(event) => {
                // Prevent group rows from collapsing when clicking child rows
                if (event.node.group) {
                  event.node.setExpanded(true);
                }
              }}
              onGridReady={(params) => {
                console.log('✅ AG Grid ready');
                console.log(`📊 Total columns in grid: ${params.api.getColumns()?.length || 0}`);
                console.log(`📊 Designator columns available: ${designatorColumns.length}`);
                console.log(`📊 Dynamic columns available: ${dynamicColumns.length}`);
                
                // Check if PU-S9.0-140 column exists
                const puColumn = params.api.getColumn('PU-S9.0-140');
                console.log(`🔍 PU-S9.0-140 column exists in grid: ${!!puColumn}`);
                if (puColumn) {
                  console.log(`📋 PU-S9.0-140 column definition:`, puColumn.getColDef());
                }
                
                // Log untuk debug - cek apakah total row ada
                setTimeout(() => {
                  params.api.forEachNode((node) => {
                    if (node.footer) {
                      console.log('🔢 Total row found:', {
                        group: node.key,
                        data: node.aggData,
                        length: node.aggData?.length,
                        slack_berbayar: node.aggData?.slack_berbayar,
                        fo_total: node.aggData?.fo_total
                      });
                    }
                  });
                }, 500);
              }}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                suppressSizeToFit: true,
              }}
              autoGroupColumnDef={{
                headerName: 'SPAN',
                minWidth: 250,
                pinned: 'left',
                cellStyle: {
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '8px'
                },
                cellRendererParams: {
                  suppressCount: true,
                  innerRenderer: (params: any) => {
                    // For REKAPITULASI rows, show custom label
                    if (params.data?.rekapLabel) {
                      return params.data.rekapLabel;
                    }
                    // For footer rows (SUB TOTAL) - now disabled
                    if (params.node.footer) {
                      return `SUBT TOTAL SPAN ${params.node.key}`;
                    }
                    // For group rows, show group name
                    return params.value;
                  }
                },
              }}
              rowHeight={42}
              headerHeight={44}
              suppressClickEdit={true}
              isGroupOpenByDefault={() => {
                // All groups including REKAPITULASI should be expanded by default
                return true;
              }}
              suppressHorizontalScroll={false}
              domLayout="autoHeight"
              loading={loading}
              overlayLoadingTemplate='<div style="padding: 20px; font-size: 14px; color: #6b7280; display: flex; flex-direction: column; align-items: center; gap: 12px;"><div style="display: flex; gap: 4px; align-items: center;"><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur1 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur2 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur3 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur4 1.2s ease-in-out infinite;"></div><div style="width: 12px; height: 24px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 3px; transform: skewX(-15deg); animation: blinkblur5 1.2s ease-in-out infinite;"></div></div><div style="font-weight: 600; color: #374151;">Loading Matrix Data...</div><div style="font-size: 12px; color: #9ca3af;">Please wait</div></div><style>@keyframes blinkblur1 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur2 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur3 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur4 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } } @keyframes blinkblur5 { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: skewX(-15deg) scale(0.95); } 50% { opacity: 1; filter: blur(0); transform: skewX(-15deg) scale(1); } }</style>'
              overlayNoRowsTemplate='<span style="padding: 20px; font-size: 14px; color: #6b7280;">No Rows To Show</span>'
            />
            </>
          )}
        </div>
      </div>

      {selectedRow && (
        <div className="w-80 bg-white border border-gray-200 shadow-lg flex flex-col rounded-lg" style={{ height: '600px' }}>
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm font-semibold">Row Detail</h3>
                <p className="text-xs text-blue-100 mt-1">Row {selectedRow.span} - {selectedRow.designator}</p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Span Item Information</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Row #:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.span}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offset:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.offset} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offset From:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.offset_from} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offset To:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.offset_to} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Length:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.length} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Depth:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.depth} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Designator:</span>
                  <span className="text-gray-900 font-medium">{selectedRow.designator}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Designator Children */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Designator Children</h4>
              <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
                {Object.keys(selectedRow)
                  .filter(key => !['spanGroup', 'span', 'offset', 'offset_from', 'offset_to', 'length', 'depth', 'location', 'designator'].includes(key))
                  .map(key => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="text-gray-900 font-medium">{selectedRow[key]}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Survey Modal */}
      {showAddSurveyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div
            className="shadow-2xl flex flex-col relative"
            style={{
              width: '600px',
              height: '700px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              background: activeTab === 'automatic' ? '#0a0e27' : '#ffffff',
              backdropFilter: activeTab === 'automatic' ? 'blur(10px)' : 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Space Background Animation for Automatic Tab */}
            {activeTab === 'automatic' && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                <div className="stars"></div>
                <div className="stars2"></div>
                <div className="stars3"></div>
              </div>
            )}

            {/* Modal Header */}
            <div
              className="p-6 flex items-center justify-between relative"
              style={{
                background: activeTab === 'automatic'
                  ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0,
                zIndex: 10
              }}
            >
              <div className="relative">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {activeTab === 'automatic' && <Sparkles className="w-5 h-5" />}
                  Add Survey
                </h3>
                <p className="text-sm text-white mt-1">
                  {activeTab === 'manual' ? 'Add survey item manually' : 'AI-powered span item detection'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-all relative"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body - AI Analysis Only */}
            <div
              className="p-6 relative flex flex-col"
              style={{
                background: 'transparent',
                overflowY: 'auto',
                flexShrink: 1,
                flexGrow: 1,
                zIndex: 5,
                minHeight: '0'
              }}
            >
              {/* AI Analysis - Always shown */}
              <div className="space-y-2 flex flex-col h-full">
                {/* Upload Area - SMALLER */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className="border-2 border-dashed rounded-xl text-center transition-all cursor-pointer flex-shrink-0"
                  style={{
                    background: isDragging
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)',
                    borderColor: isDragging ? '#a855f7' : 'rgba(255, 255, 255, 0.2)',
                    borderWidth: '2px',
                    borderStyle: 'dashed',
                    padding: '16px'
                  }}
                  onClick={() => !isProcessing && document.getElementById('span-image-upload')?.click()}
                >
                  <input
                    id="span-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />

                  <Upload className="w-8 h-8 text-white mx-auto mb-1" />
                  <p className="text-white font-medium text-xs mb-0.5">Upload SPAN Image</p>
                  <p className="text-gray-400 text-xs">Click or drag & drop</p>
                </div>

                {/* AI Analysis Result - LARGER */}
                <div
                  className="border rounded-xl backdrop-blur-sm flex flex-col flex-grow overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: '1px',
                    minHeight: '0'
                  }}
                >
                  <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <h4 className="text-white font-semibold flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-white" />
                      AI Analysis Result
                    </h4>
                  </div>

                  <div className="flex-grow overflow-y-auto p-3">
                    {isProcessing ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <OrbitProgress color="#15396C" size="small" text="" textColor="" />
                        <p className="text-white font-medium text-xs mb-0.5 mt-4">Analyzing Image</p>
                        <p className="text-gray-400 text-xs">Please wait...</p>
                      </div>
                    ) : aiResult ? (
                      aiResult.error ? (
                        <div className="rounded-lg p-3 border" style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}>
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                              background: 'rgba(239, 68, 68, 0.2)'
                            }}>
                              <X className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-xs mb-1" style={{ color: '#ffffff' }}>Analysis Failed</p>
                              <p className="text-xs leading-relaxed" style={{ color: '#fecaca' }}>{aiResult.error}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Success Badge - COMPACT */}
                          <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                            <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-xs truncate">Information extracted successfully</p>
                            </div>
                          </div>

                          {/* Check if we have any data to display */}
                          {!aiResult.catatan?.segmen && !aiResult.catatan?.jarak && !aiResult.catatan?.kode && !aiResult.gps_coordinates && !aiResult.lokasi ? (
                            <div className="rounded-lg p-4 border text-center" style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              borderColor: 'rgba(245, 158, 11, 0.3)'
                            }}>
                              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                              <p className="text-amber-400 font-semibold text-xs mb-1">No Data Extracted</p>
                              <p className="text-gray-400 text-xs">Please try uploading a clearer image.</p>
                            </div>
                          ) : null}

                          {/* Segment Info - COMPACT */}
                          {aiResult.catatan?.segmen && (
                            <div
                              className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <Tag className="w-4 h-4 text-white flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">Segment Name</p>
                                <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.segmen}</p>
                              </div>
                            </div>
                          )}

                          {/* Distance - COMPACT */}
                          {aiResult.catatan?.jarak && (
                            <div
                              className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <Ruler className="w-4 h-4 text-white flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">Distance / Length</p>
                                <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.jarak}</p>
                              </div>
                            </div>
                          )}

                          {/* Code - COMPACT */}
                          {aiResult.catatan?.kode && (
                            <div
                              className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <Tag className="w-4 h-4 text-white flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">Designator Code</p>
                                <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.kode}</p>
                              </div>
                            </div>
                          )}

                          {/* GPS Coordinates - COMPACT */}
                          {aiResult.gps_coordinates && (
                            <div
                              className="rounded-lg p-2 transition-all hover:bg-white/5"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <Navigation className="w-4 h-4 text-white flex-shrink-0" />
                                <p className="text-xs text-gray-400">GPS Coordinates</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pl-6">
                                <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                  <p className="text-xs text-gray-500">Lat</p>
                                  <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.latitude}</p>
                                </div>
                                <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                  <p className="text-xs text-gray-500">Lon</p>
                                  <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.longitude}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Location - COMPACT */}
                          {aiResult.lokasi && (
                            <div
                              className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <MapPin className="w-4 h-4 text-white flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">Location Address</p>
                                <p className="text-white font-semibold text-xs truncate">{aiResult.lokasi}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Sparkles className="w-12 h-12 text-white mb-3 opacity-50" />
                        <p className="text-white font-medium text-xs mb-1">Ready to Analyze</p>
                        <p className="text-gray-400 text-xs text-center max-w-xs">
                          Upload a SPAN image above
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* )} */}

            {/* Modal Footer */}
            <div
              className="p-6 flex gap-3 border-t border-gray-700"
              style={{
                flexShrink: 0,
                background: 'rgba(17, 24, 39, 0.5)',
                position: 'relative',
                zIndex: 30
              }}
            >
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 relative z-30"
                style={{ color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 relative z-30"
                style={{ color: '#374151' }}
              >
                Add SPAN
              </button>
            </div>
          </div>

          {/* CSS for Space Animation */}
          <style>{`
                        @keyframes animStar {
                          from { transform: translateY(0px); }
                          to { transform: translateY(-2000px); }
                        }
                
                        .stars {
                          width: 1px;
                          height: 1px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 700 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                          animation: animStar 50s linear infinite;
                        }
                
                        .stars:after {
                          content: " ";
                          position: absolute;
                          top: 2000px;
                          width: 1px;
                          height: 1px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 700 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                        }
                
                        .stars2 {
                          width: 2px;
                          height: 2px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 200 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                          animation: animStar 100s linear infinite;
                        }
                
                        .stars2:after {
                          content: " ";
                          position: absolute;
                          top: 2000px;
                          width: 2px;
                          height: 2px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 200 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                        }
                
                        .stars3 {
                          width: 3px;
                          height: 3px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 100 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                          animation: animStar 150s linear infinite;
                        }
                
                        .stars3:after {
                          content: " ";
                          position: absolute;
                          top: 2000px;
                          width: 3px;
                          height: 3px;
                          background: transparent;
                          box-shadow: ${Array.from({ length: 100 }, () =>
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
                        }
                      `}</style>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Matrix Row</h3>
                <p className="text-sm text-gray-500 mt-1">
                  SPAN: {editingRow.spanGroup} | Row: {editingRow.span} | Designator: {editingRow.designator}
                </p>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Matrix data is calculated from Redline entries. 
                    Changes made here are local only and will not be persisted to the backend.
                  </p>
                </div>

                {/* Read-only fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NO</label>
                    <input
                      type="text"
                      value={editingRow.span}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">A (Offset From)</label>
                    <input
                      type="text"
                      value={editingRow.offset_from}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">B (Offset To)</label>
                    <input
                      type="text"
                      value={editingRow.offset_to}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LENGTH</label>
                    <input
                      type="text"
                      value={editingRow.length}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">DESIGNATOR</label>
                    <input
                      type="text"
                      value={editingRow.designator}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                {/* Editable Designator Fields */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 mt-6">Designator Values (Editable)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[...designatorColumns, ...dynamicColumns].map((col) => {
                      const field = col.field as string;
                      const value = editFormData[field] || 0;
                      
                      return (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {col.headerName || field}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              setEditFormData(prev => ({
                                ...prev,
                                [field]: newValue
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && rowToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl" style={{ width: '420px' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Survey</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 mb-2">Are you sure you want to delete this survey?</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div><span className="font-medium">SPAN:</span> {rowToDelete.spanGroup}</div>
                  <div><span className="font-medium">Row:</span> {rowToDelete.span}</div>
                  <div><span className="font-medium">Designator:</span> {rowToDelete.designator}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setRowToDelete(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#DC2626',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
