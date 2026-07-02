import { AlertTriangle, X } from 'lucide-react';

interface DeleteKOMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  komName: string;
}

export function DeleteKOMModal({ open, onOpenChange, onConfirm, komName }: DeleteKOMModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 flex items-center justify-between bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Delete KOM</h3>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-red-100 rounded transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete this KOM?
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-900">{komName}</p>
          </div>
          <p className="text-xs text-red-600">
            This action cannot be undone. All data associated with this KOM will be permanently deleted.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium border border-gray-300"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors font-medium"
          >
            Delete KOM
          </button>
        </div>
      </div>
    </div>
  );
}
