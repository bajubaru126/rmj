import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
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

  const cleanValue = (value: any, type: 'string' | 'number' = 'string'): any => {
    if (value === undefined || value === null || value === '') return undefined;
    
    if (type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    
    return String(value);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);

      if (!workbook.SheetNames.includes('KKP OSP')) {
        toast.error('Sheet "KKP OSP" not found in Excel file');
        setUploading(false);
        return;
      }

      const worksheet = workbook.Sheets['KKP OSP'];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      console.clear();
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   EXCEL PARSING - ANALYSIS ONLY    ║');
      console.log('╚════════════════════════════════════════╝\n');
      console.log(`📄 File: ${selectedFile.name}`);
      console.log(`📊 Rows: ${range.e.r + 1} | Columns: ${range.e.c + 1}\n`);

      // Phase mapping
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

      // Detect phases from Row 3
      const phaseColumns: { [key: number]: string } = {};
      let currentPhase = '';
      
      for (let c = 0; c <= range.e.c; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 2, c })];
        if (cell && cell.v) {
          const phaseCode = phaseMapping[String(cell.v).trim()];
          if (phaseCode) {
            currentPhase = phaseCode;
            phaseColumns[c] = phaseCode;
          }
        } else if (currentPhase) {
          phaseColumns[c] = currentPhase;
        }
      }

      // Build field mapping
      const fieldMapping: { [key: number]: { field: string; isDate: boolean; isNumber: boolean } } = {};
      
      // Parse data rows
      const jsonData: any[] = [];
      
      for (let r = 4; r <= range.e.r; r++) {
        const rowData: any = {};
        
        for (let c = 0; c <= range.e.c; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            // Add your field mapping logic here
            rowData[`col_${c}`] = cell.v;
          }
        }

        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData);
        }
      }

      console.log(`✅ Parsed ${jsonData.length} rows\n`);
      
      jsonData.forEach((row, index) => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 ROW ${index + 1}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(JSON.stringify(row, null, 2));
        console.log(`\n📊 Total fields: ${Object.keys(row).length}`);
      });

      console.log('\n\n╔════════════════════════════════════════╗');
      console.log('║         PARSING COMPLETE           ║');
      console.log('╚════════════════════════════════════════╝\n');

      toast.success(`Parsing complete! ${jsonData.length} rows. Check console.`);

    } catch (error) {
      console.error('❌ Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse Excel');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
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
              <h2 className="text-lg font-semibold text-gray-900">Parse Excel (Analysis Mode)</h2>
              <p className="text-sm text-gray-500">Parse only - no upload to API</p>
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
                  <FileSpreadsheet className="w-16 h-16 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Ready to parse</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <FileSpreadsheet className="w-16 h-16 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    Drag and drop your Excel file here
                  </p>
                </div>
                <p className="text-xs text-gray-500">Supported: .xlsx, .xls</p>
              </div>
            )}
          </div>
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
            {uploading ? 'Parsing...' : 'Parse Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
