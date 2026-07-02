import { useState, useEffect } from 'react';
import { X, Trash2, Calendar, FileText, UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { drmUploadService, DrmUploadRecord } from '@/services/drmUploadService';
import { ConfirmModal } from './ConfirmModal';

type DrmType = 'boq' | 'matrix' | 'redline';

interface ManageFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
  drmType: DrmType;
  linkId: string;
  linkName?: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export function ManageFilesModal({
  isOpen,
  onClose,
  onDeleteSuccess,
  drmType,
  linkId,
  linkName,
}: ManageFilesModalProps) {
  const [versions, setVersions] = useState<DrmUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const typeLabel = drmType === 'boq' ? 'BOQ' : drmType === 'matrix' ? 'Matrix' : 'Redline';

  const fetchVersions = async () => {
    if (!linkId) return;
    setIsLoading(true);
    try {
      const data = await drmUploadService.getAllByLink(drmType, linkId);
      setVersions(data);
    } catch (error) {
      console.error(`❌ Error fetching ${drmType} versions:`, error);
      toast.error(`Gagal mengambil daftar versi ${typeLabel}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && linkId) {
      fetchVersions();
    }
  }, [isOpen, linkId, drmType]);

  const handleDelete = (recordId: string) => {
    setConfirmDeleteId(recordId);
  };

  const executeDelete = async (recordId: string) => {
    setDeletingId(recordId);
    try {
      await drmUploadService.deleteById(drmType, recordId);
      toast.success(`Berhasil menghapus file ${typeLabel}`);
      onDeleteSuccess();
      await fetchVersions();
    } catch (error: any) {
      console.error(`❌ Error deleting ${drmType} version:`, error);
      toast.error(error.message || `Gagal menghapus file ${typeLabel}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden m-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInScale 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Kelola File {typeLabel}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {linkName || 'Daftar riwayat file yang telah diunggah'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Peringatan:</strong> Menghapus file versi tertentu akan menghapus data tersebut secara permanen dari database.
              Jika Anda menghapus versi yang saat ini aktif, sistem otomatis akan memilih versi lain (jika ada) sebagai versi aktif.
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Memuat berkas...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400 font-medium">Tidak ada file yang diunggah untuk link ini</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="px-4 py-3">Nama/Label Berkas</th>
                    <th className="px-4 py-3">Sumber</th>
                    <th className="px-4 py-3">Tanggal Unggah</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {versions.map((v) => {
                    const vId = drmUploadService.formatRecordId(v.id);
                    const isDeleting = deletingId === vId;
                    const label = v.source === 'finalize' 
                      ? `${v.link_name} - ${v.project_name}` 
                      : v.label || `Manual Upload`;

                    return (
                      <tr key={vId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-medium min-w-[200px]">
                          <div className="flex items-center gap-2">
                            {v.source === 'finalize' ? (
                              <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <UploadCloud className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[240px]" title={label}>{label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.source === 'finalize' 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'bg-purple-50 text-purple-600'
                          }`}>
                            {v.source === 'finalize' ? 'Finalisasi' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            {formatDate(v.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(vId)}
                            disabled={deletingId !== null}
                            className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Hapus file ini"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) executeDelete(confirmDeleteId);
        }}
        title={`Hapus File ${typeLabel}`}
        message={`Apakah Anda yakin ingin menghapus file ${typeLabel} ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
