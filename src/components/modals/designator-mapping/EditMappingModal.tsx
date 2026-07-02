import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { designatorMappingService } from '@/services/designatorMappingService';

interface EditMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mappingId: string;
  currentName: string;
}

export function EditMappingModal({
  isOpen,
  onClose,
  onSuccess,
  mappingId,
  currentName,
}: EditMappingModalProps) {
  const [mappingName, setMappingName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMappingName(currentName);
    }
  }, [isOpen, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mappingName.trim()) {
      toast.error('Please enter mapping name');
      return;
    }

    if (mappingName.trim() === currentName) {
      toast.info('No changes made');
      onClose();
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      await designatorMappingService.updateMapping(
        mappingId,
        {
          name: mappingName.trim(),
        },
        token
      );

      toast.success('Mapping updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update mapping');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Mapping</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update mapping name
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mapping Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
              placeholder="e.g., BC-TR-C-1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Mapping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
