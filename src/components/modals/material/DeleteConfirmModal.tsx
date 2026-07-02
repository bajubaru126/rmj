import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemDetails?: { label: string; value: string }[];
  isDeleting?: boolean;
}

export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Material",
  message = "Are you sure you want to delete this material?",
  itemDetails,
  isDeleting = false
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-100 rounded transition-all"
            disabled={isDeleting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          
          {itemDetails && itemDetails.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
              <div className="space-y-2">
                {itemDetails.map((detail, index) => (
                  <div key={index}>
                    <span className="text-xs text-gray-500">{detail.label}:</span>
                    <p className="text-sm font-medium text-gray-900">{detail.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-red-600 font-medium">
            This action cannot be undone. All data will be permanently deleted.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium border border-gray-300"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
