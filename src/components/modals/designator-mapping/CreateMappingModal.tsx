import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { designatorMappingService } from '@/services/designatorMappingService';
import { designatorV2Service, DesignatorV2 } from '@/services/designatorV2Service';

interface CreateMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  designatorId: string;
  designatorName: string;
}

export function CreateMappingModal({
  isOpen,
  onClose,
  onSuccess,
  designatorId,
  designatorName,
}: CreateMappingModalProps) {
  const [selectedMappings, setSelectedMappings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [designatorsV2, setDesignatorsV2] = useState<DesignatorV2[]>([]);
  const [isLoadingDesignators, setIsLoadingDesignators] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch designators v2 when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDesignatorsV2();
      setSelectedMappings([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchDesignatorsV2 = async () => {
    setIsLoadingDesignators(true);
    try {
      const data = await designatorV2Service.getAllDesignators();
      setDesignatorsV2(data);
      console.log('✅ Loaded', data.length, 'designators v2 for autocomplete');
    } catch (error) {
      console.error('Error fetching designators v2:', error);
      toast.error('Failed to load designators');
    } finally {
      setIsLoadingDesignators(false);
    }
  };

  // Filter designators based on search query
  const filteredDesignators = designatorsV2.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMapping = (name: string) => {
    if (!selectedMappings.includes(name)) {
      setSelectedMappings([...selectedMappings, name]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleRemoveMapping = (name: string) => {
    setSelectedMappings(selectedMappings.filter(m => m !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      // Add manual entry
      if (!selectedMappings.includes(searchQuery.trim())) {
        setSelectedMappings([...selectedMappings, searchQuery.trim()]);
      }
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMappings.length === 0) {
      toast.error('Please select or enter at least one mapping name');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      // Create multiple mappings - one API call per mapping
      const promises = selectedMappings.map(mappingName =>
        designatorMappingService.createMapping(
          {
            name: mappingName,
            designator_id: designatorId,
          },
          token
        )
      );

      await Promise.all(promises);

      const count = selectedMappings.length;
      toast.success(`${count} mapping${count > 1 ? 's' : ''} created successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating mappings:', error);
      toast.error('Failed to create mappings');
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
            <h2 className="text-xl font-bold text-gray-900">Add Mapping</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add mapping to {designatorName}
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
              Mapping Names <span className="text-red-500">*</span>
            </label>
            
            {/* Selected Mappings */}
            {selectedMappings.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedMappings.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(name)}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Autocomplete Input */}
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search or type mapping name..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={loading}
              />
              
              {/* Dropdown */}
              {showDropdown && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isLoadingDesignators ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Loading designators...
                    </div>
                  ) : filteredDesignators.length > 0 ? (
                    <>
                      {filteredDesignators.map((designator) => (
                        <button
                          key={designator.id.id.String}
                          type="button"
                          onClick={() => handleAddMapping(designator.name)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{designator.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{designator.description}</div>
                        </button>
                      ))}
                      {/* Manual entry option */}
                      <button
                        type="button"
                        onClick={() => handleAddMapping(searchQuery.trim())}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-t-2 border-blue-200"
                      >
                        <div className="font-medium text-blue-600">+ Add "{searchQuery}"</div>
                        <div className="text-xs text-gray-500 mt-0.5">Create custom mapping</div>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddMapping(searchQuery.trim())}
                      className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-blue-600">+ Add "{searchQuery}"</div>
                      <div className="text-xs text-gray-500 mt-0.5">Create custom mapping</div>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Press Enter or click to add. You can add multiple mappings.
            </p>
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
              disabled={loading || selectedMappings.length === 0}
            >
              {loading ? 'Creating...' : `Create ${selectedMappings.length > 0 ? `(${selectedMappings.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
