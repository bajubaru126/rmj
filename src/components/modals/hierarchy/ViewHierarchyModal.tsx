import { X, Eye, Search } from 'lucide-react';
import { HierarchyResponse } from '@/services/hierarchyService';
import { useState } from 'react';
import { sortFieldsByTableOrder } from '@/utils/hierarchyFieldOrder';

interface ViewHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hierarchy: HierarchyResponse | null;
}

export function ViewHierarchyModal({ isOpen, onClose, hierarchy }: ViewHierarchyModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    
    // Check for dummy date (1900-01-01)
    if (typeof value === 'string' && value === '1900-01-01T00:00:00.000Z') {
      return '-';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('id-ID');
    }
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      return new Date(value).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatLabel = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAllFields = (): Array<{ key: string; value: any }> => {
    if (!hierarchy) return [];
    const fields = Object.entries(hierarchy)
      .filter(([key]) => key !== 'id')
      .map(([key, value]) => ({ key, value }));
    return sortFieldsByTableOrder(fields);
  };

  const filteredFields = getAllFields().filter(({ key, value }) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const label = formatLabel(key).toLowerCase();
    const valueStr = formatValue(value).toLowerCase();
    return label.includes(query) || valueStr.includes(query);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Hierarchy Details</h2>
                <p className="text-sm text-gray-500">
                  {hierarchy?.project_name || 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
          {hierarchy ? (
            <>
              {filteredFields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredFields.map(({ key, value }) => (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                        {formatLabel(key)}
                      </label>
                      <div className="text-sm text-black font-medium break-words">
                        {formatValue(value)}
                      </div>
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
