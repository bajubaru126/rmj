import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { installationService, Installation } from '@/services/installationService';
import { authService } from '@/services/authService';

interface DeleteInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallationDeleted: () => void;
  installation: Installation;
  projectName?: string;
  linkName?: string;
}

export function DeleteInstallationModal({ 
  isOpen, 
  onClose, 
  onInstallationDeleted, 
  installation,
  projectName,
  linkName
}: DeleteInstallationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = authService.getToken();
      await installationService.deleteInstallation(installation.id, token);
      
      alert('Installation deleted successfully!');
      onInstallationDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting installation:', error);
      alert('Failed to delete installation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
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
            <h3 className="text-lg font-semibold text-gray-900">Delete Installation</h3>
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
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete this installation?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Project:</span>
                <p className="text-sm font-semibold text-gray-900">{projectName || 'Unknown Project'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Link / Ruas:</span>
                <p className="text-sm font-medium text-gray-900">{linkName || 'Unknown Link'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Installation Step:</span>
                <p className="text-sm font-medium text-gray-900">{installation.installation_step}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Progress:</span>
                <p className="text-sm font-medium text-gray-900">{installation.progress}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Materials:</span>
                <p className="text-sm font-medium text-gray-900">{installation.material_id.length} material(s)</p>
              </div>
              {installation.documents && installation.documents.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Documents:</span>
                  <p className="text-sm font-medium text-gray-900">{installation.documents.length} file(s)</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-red-600 font-medium">
            This action cannot be undone. All data associated with this installation will be permanently deleted.
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
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Installation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
