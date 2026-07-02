import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { hierarchyService } from '@/services/hierarchyService';
// import { createProject } from '@/services/contractService';
// import { surveyService } from '@/services/surveyService';
// import { komService } from '@/services/komService';
// import { spanService } from '@/services/spanService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface UploadHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadHierarchyModal({ isOpen, onClose, onSuccess }: UploadHierarchyModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isExcelFile(file)) {
        setSelectedFile(file);
      } else {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isExcelFile(file)) {
        setSelectedFile(file);
      } else {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const isExcelFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    return validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  };

  // Dummy date untuk field yang null/undefined (tahun 1900 sebagai penanda "tidak ada data")
  const DUMMY_DATE = '1900-01-01T00:00:00.000Z';

  // Helper to parse Excel date
  const parseExcelDate = (value: any): string | undefined => {
    if (!value) return undefined;
    
    if (typeof value === 'string' && value.includes('T')) {
      return value;
    }
    
    if (typeof value === 'number') {
      try {
        const date = XLSX.SSF.parse_date_code(value);
        return new Date(date.y, date.m - 1, date.d, 8, 0, 0).toISOString();
      } catch (e) {
        return undefined;
      }
    }
    
    try {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch (e) {
      // Ignore
    }
    
    return undefined;
  };

  // Helper to replace null/undefined dates with dummy date
  const replaceDateNulls = (row: any): any => {
    const cleaned = { ...row };
    
    // List of all date fields in hierarchy
    const dateFields = [
      'po_release_date', 'po_end_date',
      'kom_plan_start_date', 'kom_plan_end_date', 'kom_actual_start_date', 'kom_actual_end_date',
      'survey_plan_start_date', 'survey_plan_end_date', 'survey_actual_start_date', 'survey_actual_end_date',
      'drm_plan_start_date', 'drm_plan_end_date', 'drm_actual_start_date', 'drm_actual_end_date',
      'mo_plan_start_date', 'mo_plan_end_date', 'mo_actual_start_date', 'mo_actual_end_date',
      'ms_plan_start_date', 'ms_plan_end_date', 'ms_actual_start_date', 'ms_actual_end_date',
      'mwh_plan_start_date', 'mwh_plan_end_date', 'mwh_actual_start_date', 'mwh_actual_end_date',
      'md_plan_start_date', 'md_plan_end_date', 'md_actual_start_date', 'md_actual_end_date',
      'mdts_plan_start_date', 'mdts_plan_end_date', 'mdts_actual_start_date', 'mdts_actual_end_date',
      'mos_plan_start_date', 'mos_plan_end_date', 'mos_actual_start_date', 'mos_actual_end_date',
      'pik_plan_start_date', 'pik_plan_end_date', 'pik_actual_start_date', 'pik_actual_end_date',
      'pth_plan_start_date', 'pth_plan_end_date', 'pth_actual_start_date', 'pth_actual_end_date',
      'ij_plan_start_date', 'ij_plan_end_date', 'ij_actual_start_date', 'ij_actual_end_date',
      'pk_plan_start_date', 'pk_plan_end_date', 'pk_actual_start_date', 'pk_actual_end_date',
      'jt_plan_start_date', 'jt_plan_end_date', 'jt_actual_start_date', 'jt_actual_end_date',
      'tc_plan_start_date', 'tc_plan_end_date', 'tc_actual_start_date', 'tc_actual_end_date',
      'baut_plan_start_date', 'baut_plan_end_date', 'baut_actual_start_date', 'baut_actual_end_date',
      'baut1_plan_start_date', 'baut1_plan_end_date', 'baut1_actual_start_date', 'baut1_actual_end_date',
      'bast_plan_start_date', 'bast_plan_end_date', 'bast_actual_start_date', 'bast_actual_end_date',
    ];

    // Replace null/undefined dates with dummy date
    dateFields.forEach(field => {
      if (cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = DUMMY_DATE;
      }
    });

    return cleaned;
  };

  // Helper to clean value
  const cleanValue = (value: any, type: 'string' | 'number' = 'string'): any => {
    if (value === undefined || value === null || value === '') return undefined;
    
    if (type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    
    // For string type, always convert to string
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    
    // Convert numbers to strings for string fields
    return String(value);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: 0 });

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);

      console.log('📋 Available sheet names:', workbook.SheetNames);

      if (!workbook.SheetNames.includes('KKP OSP')) {
        toast.error('Sheet "KKP OSP" not found in Excel file');
        setUploading(false);
        return;
      }

      const worksheet = workbook.Sheets['KKP OSP'];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      // Basic field mapping (Row 2 - index 1)
      const basicFieldMapping: { [key: string]: string } = {
        'No': 'no',
        'WPID': 'wpid',
        'Portfolio': 'portfolio',
        'LOP': 'lop',
        'Project Name': 'project_name',
        'SID': 'sid',
        'IO': 'io',
        'Customer': 'customer',
        'Segment': 'segment',
        'Product': 'product',
        'Regional TI': 'regional_ti',
        'Regional Cust': 'regional_cust',
        'PIC EGM': 'pic_egm',
        'PIC SPM HQ': 'pic_spm_hq',
        'PIC PM HQ': 'pic_pm_hq',
        'PIC PM Regional': 'pic_pm_regional',
        'PO Number': 'po_number',
        'PO Customer': 'po_customer',
        'PO Year': 'po_year',
        'PO Release Date': 'po_release_date',
        'PO End Date': 'po_end_date',
        'PO / Program Description': 'po_description',
        'PO Value (IDR)': 'po_value_idr',
        'PO Site/Unit/SN ID': 'po_site_id',
        'PO Site/Unit/SN Name': 'po_site_name',
        'Actual Site ID': 'actual_site_id',
        'Actual Site/Unit Name': 'actual_site_name',
        'Installation Tools': 'installation_tools',
        'HSE Tools / APD': 'hse_tools',
        'Target Qty': 'target_qty',
        'Unit': 'target_unit',
        'Mitra': 'mitra',
        'Current Position': 'current_position',
        'Bast Total (IDR)': 'bast_total_idr',
        'Remaining PO': 'remaining_po',
        'Invoice (IDR)': 'invoice_idr',
        'Status Project': 'status_project'
      };
      
      // Special mapping for Final Rekon fields (Row 3 - index 2)
      const finalRekonMapping: { [key: string]: string } = {
        'Amount (IDR)': 'final_rekon_amount_idr',
        'Reason': 'final_rekon_reason'
      };

      // Phase name mapping (Row 3 - index 2)
      const phaseMapping: { [key: string]: string } = {
        'Kick Of Meeting': 'kom',
        'Survey': 'survey',
        'Design Review Meeting': 'drm',
        'Material Order': 'mo',
        'Material Shipment': 'ms',
        'Material On WH': 'mwh',
        'Material Delivery': 'md',
        'Material Delivery to Site': 'mdts',
        'Material on Site': 'mos',
        'Pengurusan Izin Kerja': 'pik',
        'Penggalian Tanah dan Penanaman HDPE': 'pth',
        'Instalasi Jembatan': 'ij',
        'Penarikan Kabel': 'pk',
        'Joint dan Terminasi': 'jt',
        'Test Commisioning': 'tc',
        'BAUT': 'baut',
        'BAUT 1': 'baut1',
        'BAST': 'bast'
      };

      // Read Row 3 (index 2) to get phase names and their column positions
      // Note: Excel has merged cells, so phase names span multiple columns
      const phaseColumns: { [key: number]: string } = {};
      let currentPhase = '';
      const detectedPhases: string[] = [];
      
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 2, c });
        const cell = worksheet[cellAddr];
        
        // If cell has a value, it's a new phase header
        if (cell && cell.v) {
          const phaseName = String(cell.v).trim();
          const phaseCode = phaseMapping[phaseName];
          
          if (phaseCode) {
            currentPhase = phaseCode;
            phaseColumns[c] = phaseCode;
            if (!detectedPhases.includes(phaseCode)) {
              detectedPhases.push(phaseCode);
            }
          } else {
            // Check if it's a Final Rekon field
            const finalRekonCode = finalRekonMapping[phaseName];
            if (finalRekonCode) {
              phaseColumns[c] = 'final_rekon';
            }
          }
        } else if (currentPhase) {
          // Empty cell means it's part of the merged cell from previous phase
          phaseColumns[c] = currentPhase;
        }
      }

      // Read Row 4 (index 3) to get sub-field names
      // Backend expects: plan_start_date, plan_end_date, plan_qty, unit, plan_progress,
      //                  actual_start_date, actual_end_date, actual_value, actual_progress
      const subFieldMapping: { [key: string]: string } = {
        'Plat Start Date': 'plan_start_date',
        'Plant Start Date': 'plan_start_date',
        'Plan Start Date': 'plan_start_date',
        'Plant End Date': 'plan_end_date',
        'Plan End Date': 'plan_end_date',
        'Plan Qty': 'plan_qty',
        'Unit': 'unit',
        'Plan Progress (%)': 'plan_progress',
        'Actual Start Date': 'actual_start_date',
        'Actual End Date': 'actual_end_date',
        'Actual Value': 'actual_value',
        'Actual Progress (%)': 'actual_progress'
      };

      // Build complete field mapping: column -> field_name
      const fieldMapping: { [key: number]: { field: string; isDate: boolean; isNumber: boolean } } = {};
      
      // First, map basic fields from Row 2 (index 1)
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 1, c });
        const cell = worksheet[cellAddr];
        
        if (cell && cell.v) {
          const fieldName = String(cell.v).trim();
          const fieldCode = basicFieldMapping[fieldName];
          
          if (fieldCode) {
            const isDate = fieldCode.includes('date');
            // po_site_id should be string, not number
            const isNumber = (fieldCode.includes('qty') || fieldCode.includes('value') || fieldCode.includes('idr') || fieldCode.includes('year') || fieldCode.includes('remaining')) && fieldCode !== 'po_site_id';
            
            fieldMapping[c] = {
              field: fieldCode,
              isDate,
              isNumber
            };
          }
        }
      }
      
      // Special handling for Final Rekon fields (columns 198-199)
      // These don't have Row 4 sub-fields, so we map directly from Row 3
      for (let c = 198; c <= 199; c++) {
        const row3CellAddr = XLSX.utils.encode_cell({ r: 2, c });
        const row3Cell = worksheet[row3CellAddr];
        
        if (row3Cell && row3Cell.v) {
          const row3Value = String(row3Cell.v).trim();
          const finalRekonField = finalRekonMapping[row3Value];
          
          if (finalRekonField) {
            const isNumber = finalRekonField.includes('amount');
            fieldMapping[c] = {
              field: finalRekonField,
              isDate: false,
              isNumber
            };
          }
        }
      }
      
      // Map phase fields from Row 4 (index 3)
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 3, c });
        const cell = worksheet[cellAddr];
        
        if (cell && cell.v) {
          const subFieldName = String(cell.v).trim();
          const subFieldCode = subFieldMapping[subFieldName];
          
          if (subFieldCode) {
            // Get the phase for this column
            const phaseCode = phaseColumns[c];
            
            if (phaseCode && phaseCode !== 'final_rekon') {
              const fullFieldName = `${phaseCode}_${subFieldCode}`;
              const isDate = subFieldCode.includes('date');
              const isNumber = subFieldCode.includes('qty') || subFieldCode.includes('value') || subFieldCode.includes('progress');
              
              fieldMapping[c] = {
                field: fullFieldName,
                isDate,
                isNumber
              };
            }
          }
        }
      }

      // Parse data rows (starting from row 5, index 4)
      const jsonData: any[] = [];
      
      for (let r = 4; r <= range.e.r; r++) {
        const rowData: any = {};
        let hasData = false;

        for (let c = 0; c <= range.e.c; c++) {
          const cellAddr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddr];
          
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            const mapping = fieldMapping[c];
            
            if (mapping) {
              let value = cell.v;
              
              // Skip "No" field
              if (mapping.field === 'no') continue;
              
              if (mapping.isDate) {
                value = parseExcelDate(value);
              } else if (mapping.isNumber) {
                value = cleanValue(value, 'number');
              } else {
                value = cleanValue(value);
              }
              
              // Only add if value is not undefined
              if (value !== undefined) {
                rowData[mapping.field] = value;
                hasData = true;
              }
            }
          }
        }

        if (hasData && Object.keys(rowData).length > 0) {
          // Generate project_id from wpid if not exists
          if (!rowData.project_id && rowData.wpid) {
            // Use wpid as project_id or generate from it
            rowData.project_id = rowData.wpid;
          }
          
          // Calculate remaining_final if we have the required fields
          if (rowData.final_rekon_amount_idr !== undefined && rowData.bast_total_idr !== undefined) {
            rowData.remaining_final = rowData.final_rekon_amount_idr - rowData.bast_total_idr;
          } else {
            rowData.remaining_final = 0;
          }
          
          // Validate and clean phase data
          // Database requires ALL 9 fields for each phase to exist
          const phases = ['kom', 'survey', 'drm', 'mo', 'ms', 'mwh', 'md', 'mdts', 'mos', 'pik', 'pth', 'ij', 'pk', 'jt', 'tc', 'baut', 'baut1', 'bast'];
          phases.forEach(phase => {
            // Define ALL 9 required fields for each phase
            const requiredFields = {
              [`${phase}_plan_start_date`]: null,
              [`${phase}_plan_end_date`]: null,
              [`${phase}_plan_qty`]: 0,
              [`${phase}_unit`]: 'unit',
              [`${phase}_plan_progress`]: 0,
              [`${phase}_actual_start_date`]: null,
              [`${phase}_actual_end_date`]: null,  // ← THIS WAS MISSING!
              [`${phase}_actual_value`]: 0,
              [`${phase}_actual_progress`]: 0
            };
            
            // Add missing fields with defaults
            Object.keys(requiredFields).forEach(field => {
              if (rowData[field] === undefined || rowData[field] === null) {
                rowData[field] = requiredFields[field];
              }
            });
          });
          
          // Don't remove null date fields - backend accepts Option<datetime>
          // Only remove truly undefined fields (not set at all)
          Object.keys(rowData).forEach(key => {
            if (rowData[key] === undefined) {
              delete rowData[key];
            }
          });
          
          jsonData.push(rowData);
        }
      }

      if (jsonData.length === 0) {
        toast.error('No data found in Excel');
        setUploading(false);
        return;
      }

      // UPLOAD TO BACKEND
      setProgress({ current: 0, total: jsonData.length });
      
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setProgress({ current: i + 1, total: jsonData.length });
        
        try {
          const cleanedRow = replaceDateNulls(row);
          await hierarchyService.createHierarchy(cleanedRow);
          
          successCount++;
        } catch (error) {
          failCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${i + 1} (${row.project_id || 'N/A'}): ${errorMsg}`);
          console.error(`❌ Row ${i + 1} failed:`, errorMsg);
        }
      }

      if (errors.length > 0) {
        console.log('\n❌ ERRORS:');
        errors.forEach(err => console.log(`  - ${err}`));
      }

      // ============================================
      // MAINTENANCE: Auto-create features disabled
      // TODO: Re-enable after maintenance is complete
      // ============================================
      /*
      // Process other sheets (Project, Links, KOM, Span, Survey)
      const otherSheetsErrors: string[] = [];
      let createdProjectId: string | null = null;
      let createdLinkIds: string[] = [];

      // Get auth token
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast.error('Authentication required. Please login first.');
        setUploading(false);
        return;
      }

      // Read Links sheet FIRST (before creating project)
      let linksToCreate: any[] = [];
      if (workbook.SheetNames.includes('Links')) {
        try {
          const linksSheet = workbook.Sheets['Links'];
          const linksRange = XLSX.utils.decode_range(linksSheet['!ref'] || 'A1');
          
          // Process each link row (skip header rows - start from row 2)
          for (let r = 2; r <= linksRange.e.r; r++) {
            const getCell = (col: number) => {
              const cellAddr = XLSX.utils.encode_cell({ r, c: col });
              const cell = linksSheet[cellAddr];
              return cell && cell.v !== undefined && cell.v !== null && cell.v !== '' ? String(cell.v).trim() : undefined;
            };
            
            const linkName = getCell(2); // Column C (index 2)
            
            if (!linkName) continue;
            
            const linkData = {
              link_name: linkName,
              sub_pelaksana: getCell(3),
              ss_contract_value: getCell(4),
            };
            
            linksToCreate.push(linkData);
          }
          
        } catch (error) {
          console.error('❌ Error reading Links sheet:', error);
        }
      }

      // Process Project sheet (with links included)
      if (workbook.SheetNames.includes('Project')) {
        try {
          const projectSheet = workbook.Sheets['Project'];
          const projectRange = XLSX.utils.decode_range(projectSheet['!ref'] || 'A1');
          
          if (projectRange.e.r >= 2) {
            const row = 2;
            
            const getCell = (col: number) => {
              const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = projectSheet[cellAddr];
              return cell && cell.v !== undefined && cell.v !== null && cell.v !== '' ? String(cell.v).trim() : undefined;
            };
            
            const getCellDate = (col: number): string | undefined => {
              const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = projectSheet[cellAddr];
              if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return undefined;
              
              // If it's already a date string
              if (typeof cell.v === 'string' && cell.v.includes('T')) {
                return cell.v;
              }
              
              // If it's an Excel date number
              if (typeof cell.v === 'number') {
                try {
                  const date = XLSX.SSF.parse_date_code(cell.v);
                  return new Date(date.y, date.m - 1, date.d, 8, 0, 0).toISOString();
                } catch (e) {
                  return undefined;
                }
              }
              
              // Try to parse as date
              try {
                const parsed = new Date(cell.v);
                if (!isNaN(parsed.getTime())) {
                  return parsed.toISOString();
                }
              } catch (e) {
                // Ignore
              }
              
              return undefined;
            };
            
            const projectData: any = {
              name: getCell(1) || 'Unnamed Project', // Column B (index 1)
              no_kontrak: getCell(2) || '', // Column C (index 2)
              status: getCell(3) || 'on_going', // Column D (index 3)
              region: getCell(4) || '', // Column E (index 4)
            };
            
            // Only add optional fields if they have values
            const location = getCell(5); // Column F (index 5)
            if (location) projectData.location = location;
            
            const mainVendor = getCell(6); // Column G (index 6)
            if (mainVendor) projectData.main_vendor = mainVendor;
            
            const employeer = getCell(7); // Column H (index 7)
            if (employeer) projectData.employeer = employeer;
            
            const contractSigned = getCellDate(8); // Column I (index 8)
            if (contractSigned) projectData.contract_signed = contractSigned;
            
            const startDatePlan = getCellDate(9); // Column J (index 9)
            if (startDatePlan) projectData.start_date_plan = startDatePlan;
            
            const endDatePlan = getCellDate(10);
            if (endDatePlan) projectData.end_date_plan = endDatePlan;
            
            const contractDuration = getCell(11);
            if (contractDuration) projectData.contract_duration = contractDuration;
            
            const contractDocument = getCell(12); // Column M (index 12)
            if (contractDocument) projectData.contract_document = contractDocument;
            
            const otherDocuments = getCell(13);
            if (otherDocuments) projectData.other_documents = otherDocuments;
            
            if (linksToCreate.length > 0) {
              projectData.links = linksToCreate;
            }
            
            const projectResponse = await createProject(projectData, token);
            
            console.log('📦 Project creation response:', projectResponse);
            
            // Extract project ID
            if (projectResponse.id) {
              if (typeof projectResponse.id === 'object' && 'id' in projectResponse.id) {
                const innerId = projectResponse.id.id;
                createdProjectId = typeof innerId === 'string' ? innerId : (innerId as any).String;
              } else {
                createdProjectId = String(projectResponse.id);
              }
              
              console.log('🔍 Extracted project ID (before cleanup):', createdProjectId);
              
              // Remove prefix if exists
              if (createdProjectId && createdProjectId.includes(':')) {
                createdProjectId = createdProjectId.split(':')[1];
              }
              
              console.log('✅ Final project ID (after cleanup):', createdProjectId);
              
              toast.success(`Project "${projectData.name}" created successfully!`);
              
              if (linksToCreate.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const fetchResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/projects/${createdProjectId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                
                if (fetchResponse.ok) {
                  const fetchedProject = await fetchResponse.json();
                  
                  if (fetchedProject.links && fetchedProject.links.length > 0) {
                    fetchedProject.links.forEach((link: any) => {
                      let linkId = '';
                      if (link.id) {
                        if (typeof link.id === 'object' && 'id' in link.id) {
                          const innerId = link.id.id;
                          linkId = typeof innerId === 'string' ? innerId : (innerId as any).String;
                        } else {
                          linkId = String(link.id);
                        }
                        
                        if (linkId.includes(':')) {
                          linkId = linkId.split(':')[1];
                        }
                        
                        createdLinkIds.push(linkId);
                      }
                    });
                    
                    toast.success(`${createdLinkIds.length} link(s) created with project!`);
                  }
                }
              }
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          otherSheetsErrors.push(`Project creation failed: ${errorMsg}`);
          console.error('❌ Project creation error:', errorMsg);
          toast.error(`Failed to create project: ${errorMsg}`);
        }
      }


      // Process KOM sheet (case-insensitive check)
      const komSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'kom');
      if (createdProjectId && komSheetName) {
        console.log('\n========================================');
        console.log('📅 PROCESSING KOM SHEET');
        console.log('========================================');
        console.log('✅ Using project_id:', createdProjectId);
        console.log('✅ Sheet name found:', komSheetName);
        
        try {
          const komSheet = workbook.Sheets[komSheetName];
          const komRange = XLSX.utils.decode_range(komSheet['!ref'] || 'A1');
          
          // Debug: Print header rows to understand structure
          console.log('\n=== KOM SHEET STRUCTURE ===');
          console.log('Row 1 (Field names):');
          for (let c = 0; c <= Math.min(10, komRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
            const cell = komSheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          
          console.log('\nRow 2 (Field descriptions):');
          for (let c = 0; c <= Math.min(10, komRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 1, c });
            const cell = komSheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          
          console.log('\nRow 3 (First data):');
          for (let c = 0; c <= Math.min(10, komRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 2, c });
            const cell = komSheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          console.log('===========================\n');
          
          console.log(`📊 Found ${komRange.e.r - 2} KOM rows to process (rows 3-${komRange.e.r + 1})`);
          
          let komCount = 0;
          let skippedEmptyRows = 0;
          let consecutiveEmptyRows = 0;
          const MAX_CONSECUTIVE_EMPTY = 10; // Stop after 10 consecutive empty rows
          
          // Process each KOM row - start from row 3 (index 2) to skip header rows
          for (let r = 2; r <= komRange.e.r; r++) {
            const getCell = (col: number) => {
              const cellAddr = XLSX.utils.encode_cell({ r, c: col });
              const cell = komSheet[cellAddr];
              return cell && cell.v !== undefined && cell.v !== null && cell.v !== '' ? String(cell.v).trim() : undefined;
            };
            
            // Column mapping - data starts from Column B (index 1), Column A is empty/index
            // B=project_name, C=status, D=kom_venue, E=kom_start_date, F=kom_end_date, G=kom_mom_file, H=other_docs_files, I=remarks
            const projectName = getCell(1);  // Column B
            const status = getCell(2);       // Column C
            const komVenue = getCell(3);     // Column D
            const startDate = getCell(4);    // Column E
            let endDate = getCell(5);        // Column F
            const komMomFile = getCell(6);   // Column G
            const otherDocs = getCell(7);    // Column H
            const remarks = getCell(8);      // Column I
            
            // Skip empty rows (check if ALL key fields are empty)
            if (!projectName && !startDate && !endDate && !komVenue && !status) {
              skippedEmptyRows++;
              consecutiveEmptyRows++;
              
              // Stop processing if we hit too many consecutive empty rows
              if (consecutiveEmptyRows >= MAX_CONSECUTIVE_EMPTY) {
                console.log(`⏹️ Stopped processing at row ${r + 1} after ${MAX_CONSECUTIVE_EMPTY} consecutive empty rows`);
                break;
              }
              continue;
            }
            
            // Reset consecutive empty counter when we find data
            consecutiveEmptyRows = 0;
            
            // If end_date is placeholder text or empty, use start_date
            if (!endDate || endDate === 'YYYY-MM-DD' || endDate === 'yyyy-mm-dd') {
              console.log(`⚠️ Row ${r + 1}: end_date is placeholder or empty, using start_date`);
              endDate = startDate;
            }
            
            // Validate required fields
            if (!projectName || !startDate || !endDate) {
              console.log(`⚠️ Row ${r + 1}: Skipping - missing required fields (projectName: ${projectName}, startDate: ${startDate}, endDate: ${endDate})`);
              continue;
            }
            
            // Validate and convert dates to RFC3339 format (ISO 8601 with timezone)
            let formattedStartDate: string;
            let formattedEndDate: string;
            
            try {
              // Convert start date
              const startDateNum = parseFloat(startDate);
              if (!isNaN(startDateNum) && startDateNum > 40000 && startDateNum < 60000) {
                const excelDate = new Date((startDateNum - 25569) * 86400 * 1000);
                formattedStartDate = excelDate.toISOString(); // RFC3339 format
              } else if (startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Convert YYYY-MM-DD to RFC3339
                formattedStartDate = new Date(startDate + 'T00:00:00Z').toISOString();
              } else {
                const parsedDate = new Date(startDate);
                if (isNaN(parsedDate.getTime())) {
                  throw new Error(`Invalid start date format: ${startDate}`);
                }
                formattedStartDate = parsedDate.toISOString();
              }
              
              // Convert end date (now guaranteed to be defined)
              const endDateNum = parseFloat(endDate);
              if (!isNaN(endDateNum) && endDateNum > 40000 && endDateNum < 60000) {
                const excelDate = new Date((endDateNum - 25569) * 86400 * 1000);
                formattedEndDate = excelDate.toISOString(); // RFC3339 format
              } else if (endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Convert YYYY-MM-DD to RFC3339
                formattedEndDate = new Date(endDate + 'T00:00:00Z').toISOString();
              } else {
                const parsedDate = new Date(endDate);
                if (isNaN(parsedDate.getTime())) {
                  throw new Error(`Invalid end date format: ${endDate}`);
                }
                formattedEndDate = parsedDate.toISOString();
              }
            } catch (dateError) {
              console.error(`❌ Row ${r + 1}: Invalid date:`, dateError);
              otherSheetsErrors.push(`KOM at row ${r + 1}: Invalid date format`);
              continue;
            }
            
            const komData = {
              project_id: createdProjectId,
              project_name: projectName,
              kom_start_date: formattedStartDate,
              kom_end_date: formattedEndDate,
              kom_venue: komVenue || null,
              kom_mom_file: komMomFile || null,
              other_docs_files: otherDocs ? [otherDocs] : [],
              remarks: remarks || '',
              status: status || 'completed',
            };
            
            console.log(`\n📤 Creating KOM for row ${r + 1}:`, {
              project_id: komData.project_id,
              project_name: komData.project_name,
              kom_start_date: komData.kom_start_date,
              kom_end_date: komData.kom_end_date,
              kom_venue: komData.kom_venue,
              status: komData.status,
              remarks: komData.remarks,
            });
            
            try {
              const result = await komService.createKOM(komData, token);
              console.log(`✅ KOM created successfully for ${projectName}:`, result);
              komCount++;
            } catch (komError) {
              const komErrorMsg = komError instanceof Error ? komError.message : 'Unknown error';
              console.error(`❌ Failed to create KOM for ${projectName}:`, komErrorMsg);
              otherSheetsErrors.push(`KOM "${projectName}" creation failed: ${komErrorMsg}`);
            }
          }
          
          if (komCount > 0) {
            console.log(`✅ KOM sheet processing complete: ${komCount} KOM records created (${skippedEmptyRows} empty rows skipped)`);
            toast.success(`${komCount} KOM record(s) created successfully!`);
          } else {
            console.log(`⚠️ No KOM records were created (${skippedEmptyRows} empty rows skipped)`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          otherSheetsErrors.push(`KOM creation failed: ${errorMsg}`);
          console.error('❌ KOM creation error:', errorMsg);
          toast.error(`Failed to create KOM: ${errorMsg}`);
        }
      } else if (createdProjectId && !komSheetName) {
        console.log('⚠️ KOM sheet not found in workbook. Available sheets:', workbook.SheetNames);
        toast.warning('KOM sheet not found in Excel file - skipping KOM creation');
      }

      // Process Span sheet (case-insensitive check)
      const spanSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'span');
      if (createdProjectId && createdLinkIds.length > 0 && spanSheetName) {
        try {
          const spanSheet = workbook.Sheets[spanSheetName];
          const spanRange = XLSX.utils.decode_range(spanSheet['!ref'] || 'A1');
          
          for (let r = 2; r <= spanRange.e.r; r++) {
            const getCell = (col: number) => {
              const cellAddr = XLSX.utils.encode_cell({ r, c: col });
              const cell = spanSheet[cellAddr];
              return cell && cell.v !== undefined && cell.v !== null && cell.v !== '' ? String(cell.v).trim() : undefined;
            };
            
            const spanName = getCell(1);
            
            if (!spanName) continue;
            
            const spanData = {
              project_id: createdProjectId,
              link_id: createdLinkIds[0],
              span_name: spanName,
              auto_assign_surveys: false,
            };
            
            try {
              await spanService.createSpan(spanData, token);
            } catch (spanError) {
              const spanErrorMsg = spanError instanceof Error ? spanError.message : 'Unknown error';
              otherSheetsErrors.push(`Span "${spanName}" creation failed: ${spanErrorMsg}`);
            }
          }
          
          toast.success('Span records created successfully!');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          otherSheetsErrors.push(`Span creation failed: ${errorMsg}`);
          console.error('❌ Span creation error:', errorMsg);
          toast.error(`Failed to create spans: ${errorMsg}`);
        }
      }

      // Process Survey sheet (case-insensitive check)
      const surveySheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'survey');
      if (createdProjectId && surveySheetName) {
        console.log('\n========================================');
        console.log('📋 PROCESSING SURVEY SHEET');
        console.log('========================================');
        console.log('✅ Sheet name found:', surveySheetName);
        
        try {
          if (createdLinkIds.length === 0) {
            throw new Error('No links were created. Please ensure Links sheet is processed first.');
          }
          
          const surveyLinkId = createdLinkIds[0];
          console.log('✅ Using link_id:', surveyLinkId);
          
          const surveySheet = workbook.Sheets[surveySheetName];
          const surveyRange = XLSX.utils.decode_range(surveySheet['!ref'] || 'A1');
          
          // Debug: Print header structure
          console.log('\n=== SURVEY SHEET STRUCTURE ===');
          console.log('Row 1 (Header):');
          for (let c = 0; c <= Math.min(10, surveyRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
            const cell = surveySheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          
          console.log('\nRow 2 (Field descriptions):');
          for (let c = 0; c <= Math.min(10, surveyRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 1, c });
            const cell = surveySheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          
          console.log('\nRow 3 (First data):');
          for (let c = 0; c <= Math.min(10, surveyRange.e.c); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 2, c });
            const cell = surveySheet[cellAddr];
            console.log(`  Column ${c} (${String.fromCharCode(65 + c)}): ${cell?.v || 'empty'}`);
          }
          console.log('===========================\n');
          
          let surveyCount = 0;
          let skippedEmptySurveyRows = 0;
          let consecutiveEmptySurveyRows = 0;
          const MAX_CONSECUTIVE_EMPTY_SURVEY = 10; // Stop after 10 consecutive empty rows
          
          // Start from row 3 (index 2) - skip header and field description rows
          for (let r = 2; r <= surveyRange.e.r; r++) {
            const getCell = (col: number) => {
              const cellAddr = XLSX.utils.encode_cell({ r, c: col });
              const cell = surveySheet[cellAddr];
              return cell && cell.v !== undefined && cell.v !== null && cell.v !== '' ? String(cell.v).trim() : undefined;
            };
            
            const getCellNumber = (col: number): number | undefined => {
              const cellAddr = XLSX.utils.encode_cell({ r, c: col });
              const cell = surveySheet[cellAddr];
              if (cell && cell.v !== undefined && cell.v !== null) {
                const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v));
                return isNaN(num) ? undefined : num;
              }
              return undefined;
            };
            
            // Survey sheet columns - data starts from Column B (index 1), Column A is empty/index
            // B=project_name, C=span_name, D=link_name, E=date, F=location, G=latitude, H=longitude, I=evidence_file, J=item_name_1, K=item_name_2
            const projectNameSurvey = getCell(1);  // Column B (not used in API call)
            // const spanName = getCell(2);      // Column C (not used in API call)
            // const linkName = getCell(3);      // Column D (not used in API call)
            const date = getCell(4);          // Column E
            const location = getCell(5);      // Column F
            const latitude = getCellNumber(6);  // Column G
            const longitude = getCellNumber(7); // Column H
            
            // Skip empty rows (check if ALL key fields are empty)
            if (!projectNameSurvey && !date && !location && !latitude && !longitude) {
              skippedEmptySurveyRows++;
              consecutiveEmptySurveyRows++;
              
              // Stop processing if we hit too many consecutive empty rows
              if (consecutiveEmptySurveyRows >= MAX_CONSECUTIVE_EMPTY_SURVEY) {
                console.log(`⏹️ Stopped processing survey at row ${r + 1} after ${MAX_CONSECUTIVE_EMPTY_SURVEY} consecutive empty rows`);
                break;
              }
              continue;
            }
            
            // Reset consecutive empty counter when we find data
            consecutiveEmptySurveyRows = 0;
            
            // Validate required fields
            if (!date || !location) {
              console.log(`⚠️ Row ${r + 1}: Skipping - missing required fields (date: ${date}, location: ${location})`);
              continue;
            }
            
            // Validate and convert date to RFC3339 format
            let formattedDate: string;
            try {
              // Check if date is an Excel serial number
              const dateNum = parseFloat(date);
              if (!isNaN(dateNum) && dateNum > 40000 && dateNum < 60000) {
                // Convert Excel date serial to JS Date
                const excelDate = new Date((dateNum - 25569) * 86400 * 1000);
                formattedDate = excelDate.toISOString(); // RFC3339 format
              } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Convert YYYY-MM-DD to RFC3339
                formattedDate = new Date(date + 'T00:00:00Z').toISOString();
              } else {
                // Try to parse as date
                const parsedDate = new Date(date);
                if (isNaN(parsedDate.getTime())) {
                  throw new Error(`Invalid date format: ${date}`);
                }
                formattedDate = parsedDate.toISOString();
              }
            } catch (dateError) {
              console.error(`❌ Row ${r + 1}: Invalid date "${date}":`, dateError);
              otherSheetsErrors.push(`Survey at row ${r + 1}: Invalid date format "${date}"`);
              continue;
            }
            
            const surveyData = {
              date: formattedDate,
              location: location,
              latitude: latitude,
              longitude: longitude,
              ss_link: surveyLinkId,
              project_id: createdProjectId,
            };
            
            console.log(`\n📤 Creating survey for row ${r + 1}:`, surveyData);
            
            try {
              await surveyService.createSurvey(surveyData, token);
              surveyCount++;
              console.log(`✅ Survey created successfully for ${location}`);
            } catch (surveyError) {
              const surveyErrorMsg = surveyError instanceof Error ? surveyError.message : 'Unknown error';
              console.error(`❌ Failed to create survey for ${location}:`, surveyErrorMsg);
              
              // Check if error is due to missing KML
              if (surveyErrorMsg.includes('No KML planned found') || surveyErrorMsg.includes('404')) {
                console.log(`⚠️ Skipping survey "${location}" - KML file required for link. Upload KML first.`);
                otherSheetsErrors.push(`Survey "${location}" skipped: KML file required for link (upload KML first)`);
              } else {
                otherSheetsErrors.push(`Survey at "${location}" creation failed: ${surveyErrorMsg}`);
              }
            }
          }
          
          if (surveyCount > 0) {
            console.log(`✅ Survey sheet processing complete: ${surveyCount} surveys created (${skippedEmptySurveyRows} empty rows skipped)`);
            toast.success(`${surveyCount} survey record(s) created successfully!`);
          } else {
            console.log(`⚠️ No surveys were created (${skippedEmptySurveyRows} empty rows skipped)`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          otherSheetsErrors.push(`Survey creation failed: ${errorMsg}`);
          console.error('❌ Survey creation error:', errorMsg);
          toast.error(`Failed to create surveys: ${errorMsg}`);
        }
      } else if (createdProjectId && !surveySheetName) {
        console.log('⚠️ Survey sheet not found in workbook. Available sheets:', workbook.SheetNames);
        toast.warning('Survey sheet not found in Excel file - skipping Survey creation');
      }

      // Show summary of other sheets processing
      if (otherSheetsErrors.length > 0) {
        console.log('\n========================================');
        console.log('⚠️ OTHER SHEETS ERRORS/WARNINGS:');
        console.log('========================================');
        otherSheetsErrors.forEach(err => {
          if (err.includes('KML file required')) {
            console.log(`  ℹ️ ${err}`);
          } else {
            console.log(`  ❌ ${err}`);
          }
        });
        console.log('========================================\n');
        
        // Show toast for KML-related warnings
        const kmlWarnings = otherSheetsErrors.filter(err => err.includes('KML file required'));
        if (kmlWarnings.length > 0) {
          toast.warning(`${kmlWarnings.length} survey(s) skipped - KML file required. Upload KML for the link first.`);
        }
      }
      */
      // ============================================
      // END OF MAINTENANCE SECTION
      // ============================================

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} of ${jsonData.length} KKP OSP rows!`);
        onSuccess(); // Refresh the hierarchy list
      }
      
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} rows. Check console for details.`);
      }
      
      setUploading(false);
      
      // Close modal after successful upload
      if (successCount > 0 && failCount === 0) {
        setTimeout(() => {
          handleClose();
        }, 1500);
      }

    } catch (error) {
      console.error('Error uploading Excel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload Excel file');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setDragActive(false);
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upload KKP Excel</h2>
              <p className="text-sm text-gray-500">Parse and upload Excel data to backend</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={uploading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatFileSize(selectedFile.size)}</p>
                  <div className="mt-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800 font-medium">
                      📊 Will read sheet: <span className="font-bold">"KKP OSP"</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={uploading}
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    Drag and drop your Excel file here, or click to browse
                  </p>
                </div>
                <p className="text-xs text-gray-500">Supported formats: .xlsx, .xls</p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-700">
                    {progress.total > 0 
                      ? `Uploading ${progress.current} of ${progress.total} rows...`
                      : 'Parsing Excel file...'
                    }
                  </span>
                </div>
                {progress.total > 0 && (
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-blue-600">
                  Check console (F12) for detailed progress
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {progress.total > 0 ? `Uploading (${progress.current}/${progress.total})` : 'Parsing...'}
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Upload Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
