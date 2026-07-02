import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Toast } from '../../ui/Toast';
import { useToast } from '@/hooks/useToast';

interface DeleteSpanModalProps {
  isOpen: boolean;
  onClose: () => void;
  spanId: string;
  spanName: string;
  onSpanDeleted: () => void;
}

export function DeleteSpanModal({ isOpen, onClose, spanId, spanName, onSpanDeleted }: DeleteSpanModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const { spanService } = await import('@/services/spanService');
      const { authService } = await import('@/services/authService');
      
      const token = authService.getToken();
      
      console.log('🗑️ Deleting span:', spanId);
      await spanService.deleteSpan(spanId, token);
      
      console.log('✅ Span deleted successfully');
      showToast('Span deleted successfully!', 'success');
      
      onSpanDeleted();
      onClose();
    } catch (error) {
      console.error('❌ Error deleting span:', error);
      showToast(
        `Failed to delete span: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" 
      style={{ zIndex: 9999 }} 
      onClick={handleClose}
    >
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '450px',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(239, 68, 68, 0.95) 100%)',
            borderRadius: '16px 16px 0 0'
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Span
            </h3>
            <p className="text-sm text-white mt-1">
              This action cannot be undone
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            disabled={isDeleting}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Warning Box */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Warning: Permanent Deletion
                </p>
                <p className="text-sm text-red-700">
                  You are about to delete this span and all its associated data. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Span Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Span to be deleted:</p>
            <p className="text-base font-semibold text-gray-900">{spanName}</p>
            {/* <p className="text-xs text-gray-500 mt-1">ID: {spanId}</p> */}
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-gray-600 text-center">
            Are you sure you want to delete this span?
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 1) 0%, rgba(239, 68, 68, 1) 100%)',
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-3 bg-white rounded-sm"
                      style={{
                        animation: 'pulse 1s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`
                      }}
                    />
                  ))}
                </div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Span
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
    </div>,
    document.body
  );
}
