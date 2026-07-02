import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BOQData } from '@/types';

interface DeleteBOQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  boqData: BOQData | null;
}

export function DeleteBOQModal({ isOpen, onClose, onConfirm, boqData }: DeleteBOQModalProps) {
  if (!isOpen || !boqData) return null;

  const handleConfirm = () => {
    onConfirm();
    // onClose akan dipanggil dari parent setelah delete berhasil
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[50vw] max-w-2xl max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus BOQ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(75vh-180px)]">
          <p className="text-sm text-gray-700 mb-4">
            Apakah Anda yakin ingin menghapus BOQ berikut?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">BOQ ID:</span>
                <p className="text-sm font-semibold text-gray-900">{boqData.id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Ruas:</span>
                <p className="text-sm font-medium text-gray-900">{boqData.ruas}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Kategori:</span>
                <p className="text-sm font-medium text-gray-900">{boqData.kategori}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Uraian:</span>
                <p className="text-sm font-medium text-gray-900">{boqData.uraian}</p>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Total Nilai:</span>
                <p className="text-base font-bold text-gray-900">
                  Rp {boqData.total.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {boqData.items && boqData.items.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium">Peringatan:</p>
                  <p className="mt-1">
                    BOQ ini memiliki <strong>{boqData.items.length} item breakdown</strong>. 
                    Semua data breakdown akan ikut terhapus.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-red-600 font-medium mt-4">
            Tindakan ini tidak dapat dibatalkan!
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            type='button'
            variant="outline"
            className="bg-red-600 hover:bg-red-700 "
          >
            Ya, Hapus BOQ
          </Button>
        </div>
      </div>
    </div>
  );
}
