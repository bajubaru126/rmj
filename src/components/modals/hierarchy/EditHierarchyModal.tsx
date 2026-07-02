import { useState, useEffect } from 'react';
import { X, Save, Search, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { sortFieldsByTableOrder } from '@/utils/hierarchyFieldOrder';

interface EditHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hierarchyId: string;
  initialData: any;
}

export function EditHierarchyModal({ isOpen, onClose, onSuccess, hierarchyId, initialData }: EditHierarchyModalProps) {
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialData || {});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/hierarchies/${hierarchyId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update KKP OSP');
      }

      toast.success('KKP OSP updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating KKP OSP:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update KKP OSP');
    } finally {
      setSaving(false);
    }
  };

  const formatLabel = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAllFields = (): Array<{ key: string; value: any }> => {
    if (!formData) return [];
    const fields = Object.entries(formData)
      .filter(([key]) => key !== 'id')
      .map(([key, value]) => ({ key, value }));
    return sortFieldsByTableOrder(fields);
  };

  const filteredFields = getAllFields().filter(({ key }) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const label = formatLabel(key).toLowerCase();
    const valueStr = String(formData[key] || '').toLowerCase();
    return label.includes(query) || valueStr.includes(query);
  });

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const getInputValue = (key: string, value: any): any => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && value === '1900-01-01T00:00:00.000Z') return '';
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      // Convert to date input format (YYYY-MM-DD)
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    }
    return value;
  };

  const getInputType = (key: string, value: any): string => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) return 'date';
    return 'text';
  };

  const handleInputChange = (key: string, inputValue: string, originalValue: any) => {
    let finalValue: any = inputValue;
    
    // Convert back to appropriate type
    if (typeof originalValue === 'number') {
      finalValue = inputValue === '' ? null : parseFloat(inputValue);
    } else if (typeof originalValue === 'string' && originalValue.includes('T') && originalValue.includes('Z')) {
      // Convert date back to ISO string
      if (inputValue === '') {
        finalValue = '1900-01-01T00:00:00.000Z'; // Dummy date
      } else {
        finalValue = new Date(inputValue).toISOString();
      }
    } else if (inputValue === '') {
      finalValue = null;
    }
    
    handleFieldChange(key, finalValue);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Hierarchy</h2>
                <p className="text-sm text-gray-500">
                  {formData?.project_name || 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search fields by name or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {formData ? (
            <>
              {filteredFields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredFields.map(({ key, value }) => (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                        {formatLabel(key)}
                      </label>
                      <input
                        type={getInputType(key, value)}
                        value={getInputValue(key, formData[key])}
                        onChange={(e) => handleInputChange(key, e.target.value, value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder={`Enter ${formatLabel(key).toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No fields match your search</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {filteredFields.length} of {getAllFields().length} fields
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
