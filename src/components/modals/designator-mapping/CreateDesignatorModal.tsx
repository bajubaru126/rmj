import { useState, useEffect } from 'react';
import { X, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { designatorV2Service } from '@/services/designatorV2Service';
import { designatorMappingService } from '@/services/designatorMappingService';

interface CreateDesignatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DesignatorOption {
  id: string;
  name: string;
  description: string;
}

export function CreateDesignatorModal({ isOpen, onClose, onSuccess }: CreateDesignatorModalProps) {
  const [designatorPackageName, setDesignatorPackageName] = useState('');
  const [mappingNames, setMappingNames] = useState<string[]>([]);
  const [allDesignators, setAllDesignators] = useState<DesignatorOption[]>([]);
  const [availablePackages, setAvailablePackages] = useState<DesignatorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Autocomplete states
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [showMappingDropdown, setShowMappingDropdown] = useState(false);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');
  const [mappingSearchQuery, setMappingSearchQuery] = useState('');

  // Fetch all designators and existing packages
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all designators
      const designators = await designatorV2Service.getAllDesignators();
      const formattedDesignators: DesignatorOption[] = designators.map((d: any) => ({
        id: d.id?.id?.String || d.id,
        name: d.name,
        description: d.description || ''
      }));
      setAllDesignators(formattedDesignators);

      // Fetch existing packages to filter out
      const existingPackages = await designatorMappingService.getGroupedMappings();
      const existingPackageIds = new Set(
        existingPackages.map((pkg: any) => pkg.designator_id.id.String)
      );

      // Filter available packages (exclude existing ones)
      const available = formattedDesignators.filter(d => !existingPackageIds.has(d.id));
      setAvailablePackages(available);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load designators');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDesignatorPackageName('');
    setMappingNames([]);
    setPackageSearchQuery('');
    setMappingSearchQuery('');
    setShowPackageDropdown(false);
    setShowMappingDropdown(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!designatorPackageName) {
      toast.error('Please select a Designator Package Name');
      return;
    }

    if (mappingNames.length === 0) {
      toast.error('Please select at least one Mapping Name');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('auth_token');

      // Find the selected package ID
      const selectedPackage = availablePackages.find(p => p.name === designatorPackageName);
      if (!selectedPackage) {
        toast.error('Invalid designator package selected');
        return;
      }

      // Create mappings one by one
      let successCount = 0;
      for (const mappingName of mappingNames) {
        try {
          await designatorMappingService.createMapping(
            {
              name: mappingName,
              designator_id: selectedPackage.id
            },
            token
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to create mapping for ${mappingName}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} mapping(s)`);
        
        // Small delay to ensure backend has processed the data
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 300);
      } else {
        toast.error('Failed to create any mappings');
      }

    } catch (error) {
      console.error('Error creating designator:', error);
      toast.error('Failed to create designator package');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter packages based on search
  const filteredPackages = availablePackages.filter(p =>
    p.name.toLowerCase().includes(packageSearchQuery.toLowerCase())
  );

  // Filter mappings based on search
  const filteredMappings = allDesignators.filter(d =>
    d.name.toLowerCase().includes(mappingSearchQuery.toLowerCase())
  );

  // Handle package selection
  const handlePackageSelect = (name: string) => {
    setDesignatorPackageName(name);
    setPackageSearchQuery(name);
    setShowPackageDropdown(false);
  };

  // Handle mapping selection
  const handleMappingSelect = (name: string) => {
    if (!mappingNames.includes(name)) {
      setMappingNames([...mappingNames, name]);
    }
    setMappingSearchQuery('');
  };

  // Remove mapping
  const handleRemoveMapping = (name: string) => {
    setMappingNames(mappingNames.filter(m => m !== name));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[75vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Designator Package</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a new designator package with mappings</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Designator Package Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Designator Package Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={packageSearchQuery}
                    onChange={(e) => {
                      setPackageSearchQuery(e.target.value);
                      setDesignatorPackageName('');
                      setShowPackageDropdown(true);
                    }}
                    onFocus={() => setShowPackageDropdown(true)}
                    placeholder="Search and select designator package..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  
                  {/* Dropdown */}
                  {showPackageDropdown && filteredPackages.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredPackages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => handlePackageSelect(pkg.name)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-sm text-gray-500 mt-0.5">{pkg.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {designatorPackageName && (
                  <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Selected: {designatorPackageName}</span>
                  </div>
                )}
              </div>

              {/* Mapping Names */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mapping Names <span className="text-red-500">*</span>
                </label>
                
                {/* Selected mappings */}
                {mappingNames.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {mappingNames.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                      >
                        <span>{name}</span>
                        <button
                          onClick={() => handleRemoveMapping(name)}
                          disabled={submitting}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={mappingSearchQuery}
                    onChange={(e) => {
                      setMappingSearchQuery(e.target.value);
                      setShowMappingDropdown(true);
                    }}
                    onFocus={() => setShowMappingDropdown(true)}
                    placeholder="Search and select mapping names..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  
                  {/* Dropdown */}
                  {showMappingDropdown && filteredMappings.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredMappings.map((mapping) => (
                        <button
                          key={mapping.id}
                          onClick={() => handleMappingSelect(mapping.name)}
                          disabled={mappingNames.includes(mapping.name)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{mapping.name}</div>
                              {mapping.description && (
                                <div className="text-sm text-gray-500 mt-0.5">{mapping.description}</div>
                              )}
                            </div>
                            {mappingNames.includes(mapping.name) && (
                              <span className="text-xs text-green-600 font-medium">Selected</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Select multiple mapping names. Each will create a separate mapping.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !designatorPackageName || mappingNames.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Designator</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
