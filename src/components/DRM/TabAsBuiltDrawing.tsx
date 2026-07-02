import { useState } from 'react';
import {
  Upload, FileText, Download, CheckCircle, Clock, XCircle,
  Calendar, HardDrive, RefreshCw, X
} from 'lucide-react';

interface AsBuiltDrawingRecord {
  evidence_id: string;
  process_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_category: string;
  keterangan: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface TabAsBuiltDrawingDRMProps {
  contractId: string;
  linkId: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  Icon: Clock,       cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', Icon: CheckCircle, cls: 'text-green-600  bg-green-50  border-green-200'  },
  rejected: { label: 'Rejected', Icon: XCircle,     cls: 'text-red-600    bg-red-50    border-red-200'    },
};

// ── Dummy data ────────────────────────────────────────────────────────────────
const DUMMY_RECORDS: AsBuiltDrawingRecord[] = [
  {
    evidence_id: 'dummy-001',
    process_id: 'as_built_drawing_link_001',
    project_id: 'project_dummy',
    file_path: './uploads/as_built_drawings/as_built_dummy_001.dwg',
    file_name: 'as_built_dummy_001.dwg',
    file_size: 2048576,
    file_type: 'dwg',
    file_category: 'as_built_drawing',
    keterangan: 'As-Plan Drawing Section A - Jalur Utama',
    status: 'approved',
    created_at: '2026-04-10T08:30:00Z',
  },
  {
    evidence_id: 'dummy-002',
    process_id: 'as_built_drawing_link_001',
    project_id: 'project_dummy',
    file_path: './uploads/as_built_drawings/as_built_dummy_002.dwg',
    file_name: 'as_built_dummy_002.dwg',
    file_size: 1536000,
    file_type: 'dwg',
    file_category: 'as_built_drawing',
    keterangan: 'As-Plan Drawing Section B - Percabangan',
    status: 'pending',
    created_at: '2026-04-15T10:00:00Z',
  },
  {
    evidence_id: 'dummy-003',
    process_id: 'as_built_drawing_link_001',
    project_id: 'project_dummy',
    file_path: './uploads/as_built_drawings/as_built_dummy_003.dwg',
    file_name: 'as_built_dummy_003.dwg',
    file_size: 3145728,
    file_type: 'dwg',
    file_category: 'as_built_drawing',
    keterangan: 'As-Plan Drawing Section C - Detail Manhole',
    status: 'rejected',
    created_at: '2026-04-18T14:20:00Z',
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TabAsBuiltDrawingDRM({ contractId, linkId }: TabAsBuiltDrawingDRMProps) {
  const [records] = useState<AsBuiltDrawingRecord[]>(DUMMY_RECORDS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSetFile = (file: File | undefined | null) => {
    setFileError('');
    if (!file) return;
    if (file.name.split('.').pop()?.toLowerCase() !== 'dwg') {
      setFileError('Hanya file berformat .dwg yang diperbolehkan');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const resetForm = () => {
    setSelectedFile(null); setKeterangan(''); setStatus('pending'); setFileError(''); setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/40">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">As Plan Drawing DRM</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            File .dwg — klik card untuk download &nbsp;
            <span className="bg-amber-100 text-amber-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
              Data Dummy
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition flex items-center gap-1.5 shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Drawing
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {records.map((rec) => {
            const statusCfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
            const { Icon: StatusIcon } = statusCfg;
            return (
              <a
                key={rec.evidence_id}
                href="#"
                onClick={e => e.preventDefault()}
                title="Download (dummy — API belum tersedia)"
                className="group relative text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all p-4 flex flex-col gap-3 no-underline"
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
                  <p className="text-xs font-bold text-gray-800 truncate" title={rec.file_name}>{rec.file_name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{rec.keterangan || '-'}</p>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-auto pt-2 border-t border-gray-50">
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatFileSize(rec.file_size)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(rec.created_at)}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Upload Modal (UI only — dummy) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Upload As-Plan Drawing</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Hanya file .dwg &nbsp;
                  <span className="bg-amber-100 text-amber-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">API belum tersedia</span>
                </p>
              </div>
              <button onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
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
                    isDragging ? 'border-violet-500 bg-violet-50' :
                    fileError  ? 'border-red-300 bg-red-50' :
                    selectedFile ? 'border-violet-400 bg-violet-50' :
                    'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => document.getElementById('drm-dwg-input')?.click()}
                >
                  <input id="drm-dwg-input" type="file" accept=".dwg" className="hidden"
                    onChange={e => validateAndSetFile(e.target.files?.[0])} />
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
                      <p className="text-sm font-medium text-gray-600">{isDragging ? 'Lepaskan file di sini' : 'Drag & drop file .dwg'}</p>
                      <p className="text-xs text-gray-400">atau <span className="text-violet-500 font-semibold underline">klik untuk browse</span></p>
                    </div>
                  )}
                </div>
                {fileError && <p className="text-xs text-red-500 mt-1.5">⚠ {fileError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Keterangan <span className="text-red-500">*</span></label>
                <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)}
                  rows={3} placeholder="Deskripsi gambar as-plan..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>

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
              <button onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
                Batal
              </button>
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-violet-400 rounded-xl cursor-not-allowed opacity-60"
                title="API belum tersedia"
              >
                <Upload className="w-4 h-4" /> Upload (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
