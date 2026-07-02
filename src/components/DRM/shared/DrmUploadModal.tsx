import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { drmUploadService, DrmUploadRequest } from '@/services/drmUploadService';
import * as XLSX from 'xlsx';

// ── Types ──────────────────────────────────────────────────────────────────────

type DrmType = 'boq' | 'matrix' | 'redline';

interface DrmUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drmType: DrmType;
  projectId: string;
  linkId: string;
  projectName?: string;
  linkName?: string;
}

// ── Helper Parsers ─────────────────────────────────────────────────────────────

function parseBoqExcel(rawData: any[][]): any[] {
  const parsedItems: any[] = [];
  // Data starts at row index 9 (row 10 in 1-based index)
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
  return parsedItems;
}

function parseMatrixExcel(rawData: any[][]): any[] {
  const subHeaderRow = rawData[9] || [];
  const groupHeaderRow = rawData[8] || [];
  
  let slackBerbayarColIdx = -1;
  for (let idx = 5; idx < subHeaderRow.length; idx++) {
    const val = subHeaderRow[idx]?.toString().toUpperCase().replace(/\s+/g, ' ');
    if (val && (val.includes('SLACK BERBAYAR') || val.includes('SLACK\nBERBAYAR') || val.includes('FO BOQ'))) {
      slackBerbayarColIdx = idx;
      break;
    }
  }
  
  if (slackBerbayarColIdx === -1) {
    for (let idx = 5; idx < groupHeaderRow.length; idx++) {
      const val = groupHeaderRow[idx]?.toString().toUpperCase();
      if (val && val.includes('FO BOQ')) {
        slackBerbayarColIdx = idx;
        break;
      }
    }
  }

  // Fallback if not found
  if (slackBerbayarColIdx === -1) {
    slackBerbayarColIdx = 10;
  }
  
  const excelDesignatorNames: string[] = [];
  for (let idx = 5; idx < slackBerbayarColIdx; idx++) {
    const name = groupHeaderRow[idx]?.toString() || '';
    excelDesignatorNames.push(name);
  }

  const parsedSpans: any[] = [];
  let currentSpanName = '';
  let currentSpanItems: any[] = [];

  for (let i = 11; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;
    
    const cellAVal = row[0]?.toString() || '';
    if (cellAVal.includes('REKAPITULASI') || cellAVal.includes('GRAND TOTAL')) {
      break;
    }

    const offsetFrom = row[1]?.toString() || '';
    const offsetTo = row[2]?.toString() || '';
    const lengthVal = row[3];
    const designator = row[4]?.toString() || '';

    if (cellAVal && !offsetFrom && !offsetTo && !designator) {
      if (currentSpanName && currentSpanItems.length > 0) {
        parsedSpans.push({
          span_name: currentSpanName,
          span_items: currentSpanItems
        });
      }
      currentSpanName = cellAVal;
      currentSpanItems = [];
      continue;
    }

    if (cellAVal.includes('SUB TOTAL') || cellAVal.includes('SUBT TOTAL') || (!cellAVal && !offsetFrom && !offsetTo && !designator)) {
      continue;
    }

    const getVal = (colOffset: number) => {
      const v = row[slackBerbayarColIdx + colOffset];
      return v !== undefined && v !== null && v !== '' ? parseFloat(v) : 0;
    };

    const designatorMapping: any = {};
    excelDesignatorNames.forEach((name, idx) => {
      const val = row[5 + idx];
      if (val !== undefined && val !== null && val !== '' && name) {
        designatorMapping[name] = parseFloat(val) || 0;
      }
    });

    currentSpanItems.push({
      offset: cellAVal || '',
      offset_from: offsetFrom,
      offset_to: offsetTo,
      length: parseFloat(lengthVal) || 0,
      depth: row[5]?.toString() || '0', 
      bm: getVal(5),
      s3: getVal(6),
      ds: getVal(7),
      bss: getVal(8),
      bts: getVal(9),
      da: getVal(10),
      hps1: getVal(11),
      hps2: getVal(12),
      slack_berbayar: getVal(0),
      fo_total: getVal(1),
      slack_tidak_berbayar: getVal(2),
      tol_2_persen: getVal(3),
      pengadaan: getVal(4),
      designator: designator,
      designator_mapping: designatorMapping
    });
  }

  if (currentSpanName && currentSpanItems.length > 0) {
    parsedSpans.push({
      span_name: currentSpanName,
      span_items: currentSpanItems
    });
  }

  return parsedSpans;
}

function parseRedlineExcel(rawData: any[][]): any[] {
  const parsedSpans: any[] = [];
  
  let i = 9;
  while (i < rawData.length) {
    const rowCum = rawData[i];       // row 1 of block
    const rowDes = rawData[i + 1];   // row 2 of block
    const rowLen = rawData[i + 2];   // row 3 of block
    
    if (!rowCum || !rowDes || !rowLen) {
      break;
    }
    
    const spanLabel = rowCum[0]?.toString() || ''; // e.g. "SPAN 1"
    const spanName = rowCum[1]?.toString() || '';  // e.g. "STO SUMENEP"
    
    if (spanLabel.toUpperCase().startsWith('SPAN') && spanName) {
      const spanItems: any[] = [];
      
      // Column C (index 2) onwards is the span items
      let colIdx = 2;
      while (colIdx < rowCum.length) {
        const redlineVal = rowCum[colIdx];
        const itemName = rowDes[colIdx]?.toString() || '';
        const lengthVal = rowLen[colIdx];
        
        // Stop if column is empty or we hit "Total" or invalid
        if (!itemName || itemName.toUpperCase() === 'TOTAL' || itemName.trim() === '') {
          break;
        }
        
        spanItems.push({
          item_name: itemName,
          designator: itemName,
          length: parseFloat(lengthVal) || 0,
          redline: parseFloat(redlineVal) || 0,
        });
        
        colIdx++;
      }
      
      parsedSpans.push({
        span_name: spanName,
        span_items: spanItems
      });
      
      i += 4; // Move to next span block (3 rows of data + 1 empty spacing row)
    } else {
      i++;
    }
  }
  
  return parsedSpans;
}

const TYPE_LABELS: Record<DrmType, string> = {
  boq: 'BOQ',
  matrix: 'Matrix',
  redline: 'Redline',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function DrmUploadModal({
  isOpen,
  onClose,
  onSuccess,
  drmType,
  projectId,
  linkId,
  projectName,
  linkName,
}: DrmUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [label, setLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabel = TYPE_LABELS[drmType];

  const resetState = useCallback(() => {
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setLabel('');
  }, []);

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  // ── File handling ──

  const acceptedTypes = [
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];

  const validateFile = (f: File): boolean => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['json', 'xlsx', 'xls', 'csv'];
    if (!validExts.includes(ext)) {
      toast.error(`Format file tidak didukung. Gunakan: ${validExts.join(', ')}`);
      return false;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File terlalu besar (max 50MB)');
      return false;
    }
    return true;
  };

  const handleFileSelect = (f: File) => {
    if (validateFile(f)) {
      setFile(f);
      if (!label) {
        setLabel(f.name);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  // ── Upload ──

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setIsUploading(true);

    try {
      let docData: any[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (ext === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        docData = Array.isArray(parsed) ? parsed : [parsed];
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse into raw JSON rows (array of arrays)
        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (drmType === 'boq') {
          docData = parseBoqExcel(rawData);
        } else if (drmType === 'matrix') {
          docData = parseMatrixExcel(rawData);
        } else if (drmType === 'redline') {
          docData = parseRedlineExcel(rawData);
        }

        if (docData.length === 0) {
          throw new Error('Tidak ada data baris yang valid ditemukan di file Excel/CSV ini.');
        }
      } else {
        toast.error('Format file tidak didukung.');
        setIsUploading(false);
        return;
      }

      const uploadRequest: DrmUploadRequest = {
        project_id: projectId,
        project_name: projectName,
        link_id: linkId,
        link_name: linkName,
        doc: docData,
        source: 'manual',
        label: label.trim() || file.name,
      };

      await drmUploadService.upload(drmType, uploadRequest);
      toast.success(`${typeLabel} berhasil diupload!`);
      resetState();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(`Gagal upload ${typeLabel}: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render ──

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden m-4"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInScale 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload {typeLabel}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload file {typeLabel} manual untuk link ini
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Label input */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Label <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Contoh: ${typeLabel} Revisi 2, ${typeLabel} Final, dll.`}
              disabled={isUploading}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition disabled:opacity-50"
            />
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragging
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/20'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx,.xls,.csv"
              onChange={handleInputChange}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition">
                  <Upload className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Drag & drop file di sini
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    atau klik untuk pilih file · JSON
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Data yang sudah ada <strong>tidak akan dihapus</strong>. File yang diupload akan menjadi
              versi baru dan bisa dipilih via dropdown di tabel.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload {typeLabel}
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
