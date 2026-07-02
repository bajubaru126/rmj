import { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, RefreshCw, X, Download,
  CheckCircle, Clock, XCircle, Calendar, HardDrive
} from 'lucide-react';
import { asBuiltDrawingService, AsBuiltDrawingRecord } from '@/services/asBuiltDrawingService';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { Toast } from '@/components/ui/Toast';

interface TabAsBuiltDrawingProps {
  contractId: string;
  linkId: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  Icon: Clock,         cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', Icon: CheckCircle,   cls: 'text-green-600  bg-green-50  border-green-200'  },
  rejected: { label: 'Rejected', Icon: XCircle,       cls: 'text-red-600    bg-red-50    border-red-200'    },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Derive a public URL from the stored file_path
function getFileUrl(filePath: string): string {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api')
    .replace('/api', '');
  // file_path looks like: ./uploads/as_built_drawings/as_built_xxx.dwg
  const clean = filePath.replace(/^\.\//, '/');
  return `${base}${clean}`;
}

export function TabAsBuiltDrawing({ contractId, linkId }: TabAsBuiltDrawingProps) {
  const { token: contextToken } = useAuth();
  const getToken = () => contextToken || authService.getToken();

  const [records, setRecords]           = useState<AsBuiltDrawingRecord[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keterangan, setKeterangan]     = useState('');
  const [status, setStatus]             = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [fileError, setFileError]       = useState('');
  const [isDragging, setIsDragging]     = useState(false);

  // Toast
  const [showToast, setShowToast]   = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType]   = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, type: typeof toastType) => {
    setToastMessage(msg); setToastType(type); setShowToast(true);
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await asBuiltDrawingService.getByLinkId(contractId, linkId, getToken());
      setRecords(data);
    } catch (err) {
      console.error('Error fetching as-built drawings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (linkId) fetchRecords(); }, [linkId, contractId]);

  // ── file validation ──────────────────────────────────────────────────────
  const validateAndSetFile = (file: File | undefined | null) => {
    setFileError('');
    if (!file) return;
    if (file.name.split('.').pop()?.toLowerCase() !== 'dwg') {
      setFileError('Hanya file berformat .dwg yang diperbolehkan');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  // ── upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) { setFileError('Pilih file .dwg terlebih dahulu'); return; }
    if (!keterangan.trim()) { notify('Keterangan tidak boleh kosong', 'warning'); return; }
    setIsUploading(true);
    try {
      await asBuiltDrawingService.upload({ file: selectedFile, projectId: contractId, linkId, keterangan, status, token: getToken() });
      notify('As-Built Drawing berhasil diupload', 'success');
      setShowUploadModal(false);
      resetForm();
      fetchRecords();
    } catch (err: any) {
      notify(err.message || 'Gagal mengupload file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null); setKeterangan(''); setStatus('pending');
    setFileError(''); setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50/40">

      {/* ── Header ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">As Built Drawing</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">File .dwg — klik untuk preview detail</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRecords} disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowUploadModal(true)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition flex items-center gap-1.5 shadow-sm">
            <Upload className="w-3.5 h-3.5" /> Upload Drawing
          </button>
        </div>
      </div>

      {/* ── File List ── */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Memuat file...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-medium">Belum ada file As-Built Drawing</p>
            <p className="text-xs mt-1 text-gray-300">Klik "Upload Drawing" untuk menambahkan file .dwg</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {records.map((rec) => {
              const statusCfg = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const { Icon: StatusIcon } = statusCfg;
              const fileUrl = getFileUrl(rec.file_path);
              return (
                <a
                  key={rec.id || rec.evidence_id}
                  href={fileUrl}
                  download={rec.file_name}
                  className="group relative text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all p-4 flex flex-col gap-3 no-underline"
                >
                  {/* Download overlay on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-violet-600/0 group-hover:bg-violet-600/5 transition-all flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 bg-violet-600 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold shadow-lg">
                      <Download className="w-3.5 h-3.5" /> Download
                    </div>
                  </div>

                  {/* Icon + status */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                      <FileText className="w-6 h-6 text-violet-500" />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.cls}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* File name */}
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate leading-tight" title={rec.file_name}>
                      {rec.file_name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                      {rec.keterangan || '-'}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-auto pt-2 border-t border-gray-50">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> {formatFileSize(rec.file_size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(rec.created_at)}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Upload As-Built Drawing</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Hanya file .dwg yang diterima</p>
              </div>
              <button onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Drop zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  File DWG <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-violet-500 bg-violet-50 scale-[1.01]'
                    : fileError ? 'border-red-300 bg-red-50'
                    : selectedFile ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                >
                  <input ref={fileInputRef} type="file" accept=".dwg" className="hidden"
                    onChange={e => validateAndSetFile(e.target.files?.[0])} />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2 text-violet-700">
                      <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-violet-600" />
                      </div>
                      <span className="text-sm font-semibold truncate max-w-[280px]">{selectedFile.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
                      <span className="text-xs text-violet-400 underline">Klik untuk ganti file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <Upload className={`w-7 h-7 transition-colors ${isDragging ? 'text-violet-500' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-sm font-medium text-gray-600">
                        {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file .dwg'}
                      </p>
                      <p className="text-xs text-gray-400">atau <span className="text-violet-500 font-semibold underline">klik untuk browse</span></p>
                    </div>
                  )}
                </div>
                {fileError && <p className="text-xs text-red-500 mt-1.5">⚠ {fileError}</p>}
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Keterangan <span className="text-red-500">*</span>
                </label>
                <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)}
                  rows={3} placeholder="Deskripsi gambar as-built..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => { setShowUploadModal(false); resetForm(); }} disabled={isUploading}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
                Batal
              </button>
              <button onClick={handleUpload} disabled={isUploading || !selectedFile}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Mengupload...</> : <><Upload className="w-4 h-4" /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />}
    </div>
  );
}
