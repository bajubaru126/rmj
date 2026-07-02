import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RuasData } from '@/types';

interface DeleteRuasModalPropsNew {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ruasData: RuasData | null;
}

export function DeleteRuasModalNew({ isOpen, onClose, onConfirm, ruasData }: DeleteRuasModalPropsNew) {
  if (!isOpen || !ruasData) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
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
            <h2 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h2>
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
            Apakah Anda yakin ingin menghapus ruas berikut?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Site Name:</span>
                <p className="text-sm font-semibold text-gray-900">{ruasData.siteName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">PROJECT_SITELIST:</span>
                <p className="text-sm font-medium text-gray-900">{ruasData.projectSitelist}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Regional:</span>
                <p className="text-sm font-medium text-gray-900">{ruasData.regional}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">MITRA:</span>
                <p className="text-sm font-medium text-gray-900">{ruasData.mitra}</p>
              </div>
            </div>
          </div>

          {ruasData.segmentasi && ruasData.segmentasi.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium">Peringatan:</p>
                  <p className="mt-1">
                    Ruas ini memiliki <strong>{ruasData.segmentasi.length} segmentasi</strong> dan{' '}
                    <strong>
                      {ruasData.segmentasi.reduce((acc, seg) => acc + seg.cells.length, 0)} cell
                    </strong>
                    . Semua data terkait akan ikut terhapus.
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
            variant="outline"
            type="button" 
            className='cursor-pointer '
          >
            Ya, Hapus Ruas
          </Button>
        </div>
      </div>
    </div>
  );
}
