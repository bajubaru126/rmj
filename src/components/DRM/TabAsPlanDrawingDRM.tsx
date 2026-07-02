import { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, Download, CheckCircle, Clock, XCircle,
  Calendar, HardDrive, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { asPlanDrawingDrmService, AsPlanDrawingDrmRecord } from '@/services/asPlanDrawingDrmService';
import { drmService } from '@/services/drmService';
import { extractId } from '@/services/contractService';
import { toast } from 'sonner';

interface TabAsPlanDrawingDRMProps {
  projectId: string;
  /** Optional: pass drmId directly. If omitted, it will be resolved from projectId. */
  drmId?: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  Icon: Clock,       cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', Icon: CheckCircle, cls: 'text-green-600  bg-green-50  border-green-200'  },
  rejected: { label: 'Rejected', Icon: XCircle,     cls: 'text-red-600    bg-red-50    border-red-200'    },
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.png', '.jpg', '.jpeg'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getEvidenceId(rec: AsPlanDrawingDrmRecord): string {
  // API returns either evidence_id (metadata endpoint) or id (list endpoint)
  if (rec.evidence_id) return rec.evidence_id;
  if (rec.id) {
    // Strip "evidence:" prefix if present
    return rec.id.replace(/^evidence:/, '');
  }
  return '';
}

export function TabAsPlanDrawingDRM({ projectId, drmId: drmIdProp }: TabAsPlanDrawingDRMProps) {
  const { token } = useAuth();
  const [resolvedDrmId, setResolvedDrmId] = useState<string | null>(drmIdProp ?? null);
  const [records, setRecords] = useState<AsPlanDrawingDrmRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Resolve drmId from projectId if not provided
  useEffect(() => {
    if (drmIdProp) {
      setResolvedDrmId(drmIdProp);
      return;
    }
    if (!projectId) return;

    drmService.getDRMByProjectId(projectId)
      .then(drm => {
        if (!drm) { setResolvedDrmId(null); return; }
        const id = typeof drm.id === 'string'
          ? drm.id
          : extractId(drm.id as any);
        setResolvedDrmId(id);
      })
      .catch(err => {
        console.error('❌ Failed to resolve DRM ID:', err);
        setResolvedDrmId(null);
      });
  }, [projectId, drmIdProp]);

  const fetchRecords = useCallback(async () => {
    if (!resolvedDrmId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await asPlanDrawingDrmService.getByDrmId(resolvedDrmId, token);
      setRecords(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      setError(msg);
      console.error('❌ Error fetching as-plan drawing DRM:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedDrmId, token]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const validateAndSetFile = (file: File | undefined | null) => {
    setFileError('');
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError(`Format tidak didukung. Gunakan: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setKeterangan('');
    setStatus('pending');
    setFileError('');
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) { setFileError('Pilih file terlebih dahulu'); return; }
    if (!keterangan.trim()) { toast.error('Keterangan wajib diisi'); return; }
    if (!resolvedDrmId) { toast.error('DRM ID tidak ditemukan untuk project ini'); return; }

    setIsUploading(true);
    try {
      await asPlanDrawingDrmService.upload({
        file: selectedFile,
        projectId,
        drmId: resolvedDrmId,
        keterangan: keterangan.trim(),
        status,
        token,
      });
      toast.success('As-plan drawing berhasil diupload');
      setShowUploadModal(false);
      resetForm();
      fetchRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload gagal';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (rec: AsPlanDrawingDrmRecord) => {
    const id = getEvidenceId(rec);
    if (!id) { toast.error('Evidence ID tidak ditemukan'); return; }
    const url = asPlanDrawingDrmService.getDownloadUrl(id);
    const a = document.createElement('a');
    a.href = url;
    if (token) {
      // Open in new tab with auth header via fetch + blob
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = rec.file_name;
          link.click();
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => toast.error('Gagal mendownload file'));
    } else {
      a.download = rec.file_name;
      a.click();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/40">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">As Plan Drawing DRM</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Dokumen as-plan drawing untuk proses DRM &nbsp;
            {resolvedDrmId && (
              <span className="text-[10px] text-gray-400">DRM: {resolvedDrmId}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Drawing
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Memuat data...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-red-400 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={fetchRecords} className="text-xs text-violet-600 hover:underline mt-1">
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Belum ada as-plan drawing</p>
            <p className="text-xs text-gray-400">Upload drawing pertama untuk DRM ini</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-1 px-4 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Drawing
            </button>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {records.map((rec) => {
              const statusKey = (rec.status || 'pending') as keyof typeof STATUS_CONFIG;
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
              const { Icon: StatusIcon } = statusCfg;
              const evidenceId = getEvidenceId(rec);

              return (
                <button
                  key={evidenceId || rec.file_name}
                  onClick={() => handleDownload(rec)}
                  title={`Download ${rec.file_name}`}
                  className="group relative text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all p-4 flex flex-col gap-3"
                >
                  {/* Hover overlay */}
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

                  {/* Name + keterangan */}
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate" title={rec.file_name}>
                      {rec.file_name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
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
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Upload As-Plan Drawing DRM</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Format: {ACCEPTED_EXTENSIONS.join(', ')}
                </p>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Drop zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  File <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging      ? 'border-violet-500 bg-violet-50' :
                    fileError       ? 'border-red-300 bg-red-50' :
                    selectedFile    ? 'border-violet-400 bg-violet-50' :
                    'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => document.getElementById('as-plan-drm-input')?.click()}
                >
                  <input
                    id="as-plan-drm-input"
                    type="file"
                    accept={ACCEPTED_EXTENSIONS.join(',')}
                    className="hidden"
                    onChange={e => validateAndSetFile(e.target.files?.[0])}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2 text-violet-700">
                      <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-violet-600" />
                      </div>
                      <span className="text-sm font-semibold truncate max-w-[280px]">{selectedFile.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDragging ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <Upload className={`w-7 h-7 ${isDragging ? 'text-violet-500' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-sm font-medium text-gray-600">
                        {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file'}
                      </p>
                      <p className="text-xs text-gray-400">
                        atau <span className="text-violet-500 font-semibold underline">klik untuk browse</span>
                      </p>
                    </div>
                  )}
                </div>
                {fileError && <p className="text-xs text-red-500 mt-1.5">⚠ {fileError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Keterangan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi gambar as-plan drawing..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as typeof status)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => { setShowUploadModal(false); resetForm(); }}
                disabled={isUploading}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Mengupload...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
