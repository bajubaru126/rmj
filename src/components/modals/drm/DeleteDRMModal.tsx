import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteDRMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  drmName: string;
}

export function DeleteDRMModal({ open, onOpenChange, onConfirm, drmName }: DeleteDRMModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete DRM:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete DRM</h2>
                <p className="text-sm text-red-100 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={deleting}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> You are about to delete the DRM for project:
            </p>
            <p className="text-sm font-semibold text-red-900 mt-2">
              "{drmName}"
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Deleting this DRM will permanently remove all associated data including:
          </p>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-500 mt-0.5">•</span>
              <span>All uploaded documents (MoM, BOQ, Redline, Matrix, and other files)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Meeting dates and remarks</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Status and approval history</span>
            </li>
          </ul>

          <p className="text-sm text-gray-700 font-medium">
            Are you sure you want to continue?
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Delete DRM
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
