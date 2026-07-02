import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Toast } from '../../ui/Toast';
import { useToast } from '@/hooks/useToast';
import { API_CONFIG } from '@/config/api';
import { authService } from '@/services/authService';

interface DeleteSpanInstalasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  spanId: string;
  spanName: string;
  onSpanDeleted: () => void;
}

export function DeleteSpanInstalasiModal({ isOpen, onClose, spanId, spanName, onSpanDeleted }: DeleteSpanInstalasiModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_CONFIG.BASE_URL}/span-installasi/${spanId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      showToast('Span deleted successfully!', 'success');
      onSpanDeleted();
      onClose();
    } catch (err) {
      showToast(`Failed to delete span: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9999 }} onClick={() => !isDeleting && onClose()}>
      <div
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ width: '450px', borderRadius: '16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(239, 68, 68, 0.95) 100%)', borderRadius: '16px 16px 0 0' }}
        >
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Span
            </h3>
            <p className="text-sm text-white/80 mt-1">This action cannot be undone</p>
          </div>
          <button onClick={() => !isDeleting && onClose()} className="p-2 hover:bg-white/20 rounded-lg" disabled={isDeleting}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">Warning: Permanent Deletion</p>
                <p className="text-sm text-red-700">This span and all its data will be permanently deleted.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Span to be deleted:</p>
            <p className="text-base font-semibold text-gray-900">{spanName}</p>
          </div>

          <p className="text-sm text-gray-600 text-center">Are you sure you want to delete this span?</p>
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button onClick={() => !isDeleting && onClose()} className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700" disabled={isDeleting}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 1) 0%, rgba(239, 68, 68, 1) 100%)' }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-3 bg-white rounded-sm animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span>Deleting...</span>
              </>
            ) : (
              <><Trash2 className="w-4 h-4" /> Delete Span</>
            )}
          </button>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={hideToast} />
    </div>,
    document.body
  );
}
