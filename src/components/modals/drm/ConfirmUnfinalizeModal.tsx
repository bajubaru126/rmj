import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmUnfinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  linkName: string;
  isProcessing: boolean;
}

export function ConfirmUnfinalizeModal({
  isOpen,
  onClose,
  onConfirm,
  linkName,
  isProcessing
}: ConfirmUnfinalizeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Konfirmasi Unfinalize Installation</h2>
              <p className="text-xs text-gray-500 mt-0.5">Link: <span className="font-semibold text-gray-700">{linkName}</span></p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Apakah Anda yakin ingin membatalkan finalisasi ke Installation untuk link ini?
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-red-700 leading-relaxed">
              ⚠️ Aksi ini akan <strong>menghapus semua data installation</strong> secara permanen. Data yang ada di DRM tidak akan terhapus.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</>
            ) : (
              <>Ya, Unfinalize</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
