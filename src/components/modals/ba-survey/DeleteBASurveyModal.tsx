import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { BASurveyResponse } from '@/services/baSurveyService';

interface DeleteBASurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  baSurvey: BASurveyResponse | null;
}

export function DeleteBASurveyModal({ open, onOpenChange, onConfirm, baSurvey }: DeleteBASurveyModalProps) {
  const [deleting, setDeleting] = useState(false);

  // Helper function to parse date from backend format
  const parseBackendDate = (dateStr: string): Date => {
    // Remove d' prefix and trailing ' if present
    // Format from backend: d'2026-02-11T00:00:00Z'
    let cleanDate = dateStr;
    if (typeof dateStr === 'string') {
      cleanDate = dateStr.replace(/^d'/, '').replace(/'$/, '');
    }
    return new Date(cleanDate);
  };

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete BA Survey:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !baSurvey) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6" onClick={() => onOpenChange(false)}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete BA Survey</h2>
                <p className="text-sm text-red-100 mt-1">This action cannot be undone</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this BA Survey? This will permanently remove:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-700 list-disc list-inside">
              <li>BA Survey record</li>
              <li>Associated documents</li>
              <li>All related metadata</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Location:</span>
              <span className="text-sm text-gray-900">{baSurvey.lokasi}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Date:</span>
              <span className="text-sm text-gray-900">
                {parseBackendDate(baSurvey.tanggal).toLocaleDateString('id-ID', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            {baSurvey.documents && baSurvey.documents.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Document:</span>
                <span className="text-sm text-gray-900">{baSurvey.documents[0].file_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete BA Survey
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
