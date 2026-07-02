import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { designatorMappingService, DesignatorPackage } from '@/services/designatorMappingService';
import { CreateMappingModal } from '@/components/modals/designator-mapping/CreateMappingModal';
import { DeleteMappingModal } from '@/components/modals/designator-mapping/DeleteMappingModal';
import { CreateDesignatorModal } from '@/components/modals/designator-mapping/CreateDesignatorModal';

interface DesignatorPackageProps {
  contractId?: string;
}

export function TabDesignatorPackage({ contractId: _contractId }: DesignatorPackageProps) {
  const [packages, setPackages] = useState<DesignatorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDesignatorModalOpen, setCreateDesignatorModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editMappingsModalOpen, setEditMappingsModalOpen] = useState(false);
  
  // Confirmation modal states
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [pendingSaveDesignatorId, setPendingSaveDesignatorId] = useState<string | null>(null);
  const [pendingDeletePackage, setPendingDeletePackage] = useState<{ designatorId: string; mappings: any[] } | null>(null);
  
  // Edit mode state
  const [editedMappings, setEditedMappings] = useState<Record<string, string>>({}); // mapping ID -> new name
  const [currentEditPackage, setCurrentEditPackage] = useState<DesignatorPackage | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Selected items
  const [selectedDesignatorId, setSelectedDesignatorId] = useState('');
  const [selectedDesignatorName, setSelectedDesignatorName] = useState('');
  const [selectedMappingId, setSelectedMappingId] = useState('');
  const [selectedMappingName, setSelectedMappingName] = useState('');

  // Fetch grouped designator mappings
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const data = await designatorMappingService.getGroupedMappings();
      
      // Sort by latest mapping creation time
      const sortedData = [...data].sort((a, b) => {
        // Get the most recent mapping from each package
        const aLatestMapping = a.mappings.length > 0 
          ? a.mappings.reduce((latest, current) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            )
          : null;
        
        const bLatestMapping = b.mappings.length > 0
          ? b.mappings.reduce((latest, current) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            )
          : null;
        
        // Compare latest mapping times
        if (aLatestMapping && bLatestMapping) {
          return new Date(bLatestMapping.created_at).getTime() - new Date(aLatestMapping.created_at).getTime();
        }
        
        // If one has no mappings, put it at the end
        if (!aLatestMapping) return 1;
        if (!bLatestMapping) return -1;
        
        // Fallback: sort by designator name
        return a.designator_info.name.localeCompare(b.designator_info.name);
      });
      
      console.log('📊 Sorted packages by latest mapping:', sortedData.map(p => ({
        name: p.designator_info.name,
        latestMapping: p.mappings.length > 0 ? p.mappings[0].created_at : 'no mappings'
      })));
      
      setPackages(sortedData);
    } catch (error) {
      console.error('Error fetching designator packages:', error);
      toast.error('Failed to load designator packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleAddDesignator = () => {
    setCreateDesignatorModalOpen(true);
  };

  const handleAddMapping = (designatorId: string, designatorName: string) => {
    setSelectedDesignatorId(designatorId);
    setSelectedDesignatorName(designatorName);
    setCreateModalOpen(true);
  };

  const handleEditPackage = (designatorId: string, mappings: any[]) => {
    const pkg = packages.find(p => p.designator_id.id.String === designatorId);
    if (!pkg) return;

    // Set current package for editing
    setCurrentEditPackage(pkg);
    
    // Initialize edited mappings with current names
    const initialMappings: Record<string, string> = {};
    mappings.forEach(m => {
      initialMappings[m.id.id.String] = m.name;
    });
    setEditedMappings(initialMappings);
    
    // Open edit modal
    setEditMappingsModalOpen(true);
  };

  const handleSaveEdits = async (designatorId: string) => {
    // Show confirmation modal
    setPendingSaveDesignatorId(designatorId);
    setShowSaveConfirmation(true);
  };

  const confirmSaveEdits = async () => {
    if (!pendingSaveDesignatorId && !currentEditPackage) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      
      // Get original mappings from current edit package
      const pkg = currentEditPackage || packages.find(p => p.designator_id.id.String === pendingSaveDesignatorId);
      if (!pkg) return;

      // Find changed mappings
      const updates = pkg.mappings
        .filter(m => editedMappings[m.id.id.String] !== m.name)
        .map(m => ({
          id: m.id.id.String,
          oldName: m.name,
          newName: editedMappings[m.id.id.String]
        }));

      if (updates.length === 0) {
        toast.info('No changes to save');
        setEditedMappings({});
        setShowSaveConfirmation(false);
        setPendingSaveDesignatorId(null);
        setEditMappingsModalOpen(false);
        setCurrentEditPackage(null);
        return;
      }

      // Update all changed mappings
      await Promise.all(
        updates.map(update =>
          designatorMappingService.updateMapping(
            update.id,
            { name: update.newName },
            token
          )
        )
      );

      toast.success(`Successfully updated ${updates.length} mapping(s)`);
      setEditedMappings({});
      setShowSaveConfirmation(false);
      setPendingSaveDesignatorId(null);
      setEditMappingsModalOpen(false);
      setCurrentEditPackage(null);
      fetchPackages();
    } catch (error) {
      console.error('Error saving edits:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = (mappingId: string, mappingName: string) => {
    setSelectedMappingId(mappingId);
    setSelectedMappingName(mappingName);
    setDeleteModalOpen(true);
  };

  const handleDeletePackage = async (_designatorId: string, mappings: any[]) => {
    if (mappings.length === 0) {
      toast.info('No mappings to delete');
      return;
    }

    // Show confirmation modal
    setPendingDeletePackage({ designatorId: _designatorId, mappings });
    setShowDeleteAllConfirmation(true);
  };

  const confirmDeletePackage = async () => {
    if (!pendingDeletePackage) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');

      // Delete all mappings
      await Promise.all(
        pendingDeletePackage.mappings.map(m =>
          designatorMappingService.deleteMapping(m.id.id.String, token)
        )
      );

      toast.success(`Successfully deleted ${pendingDeletePackage.mappings.length} mapping(s)`);
      setShowDeleteAllConfirmation(false);
      setPendingDeletePackage(null);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting mappings:', error);
      toast.error('Failed to delete mappings');
    } finally {
      setSaving(false);
    }
  };

  // Filter packages based on search query
  const filteredPackages = Array.isArray(packages) ? packages.filter(pkg => 
    pkg.designator_info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.designator_info.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.mappings.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-slate-200/60 backdrop-blur-sm bg-white/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Designator Package
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Manage designator packages and their mappings
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search designator packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-72 bg-white shadow-sm transition-all placeholder:text-slate-400"
              />
            </div>
            
            <button
              onClick={handleAddDesignator}
              className="group flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>Add Designator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Table View */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-64">
                      Designator
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-80">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mappings
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPackages.map((pkg, index) => (
                    <tr 
                      key={pkg.designator_id.id.String}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Designator Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                            style={{ 
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                            }}
                          >
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {pkg.designator_info.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {index + 1} of {filteredPackages.length}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 line-clamp-2">
                          {pkg.designator_info.description || '-'}
                        </div>
                      </td>

                      {/* Mappings */}
                      <td className="px-6 py-4">
                        {pkg.mappings.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.mappings.map((mapping) => (
                              <span
                                key={mapping.id.id.String}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {mapping.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No mappings</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAddMapping(pkg.designator_id.id.String, pkg.designator_info.name)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Add Mapping"
                            disabled={saving}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditPackage(pkg.designator_id.id.String, pkg.mappings)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Package"
                            disabled={saving || pkg.mappings.length === 0}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.designator_id.id.String, pkg.mappings)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete All Mappings"
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPackages.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">No designator packages found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Click "Add Designator" to create one'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #CBD5E1 0%, #94A3B8 100%);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #94A3B8 0%, #64748B 100%);
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%);
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #94A3B8 0%, #64748B 100%);
        }
      `}</style>

      {/* Modals */}
      <CreateDesignatorModal
        isOpen={createDesignatorModalOpen}
        onClose={() => setCreateDesignatorModalOpen(false)}
        onSuccess={fetchPackages}
      />

      <CreateMappingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchPackages}
        designatorId={selectedDesignatorId}
        designatorName={selectedDesignatorName}
      />

      <DeleteMappingModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={fetchPackages}
        mappingId={selectedMappingId}
        mappingName={selectedMappingName}
      />

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Save Changes?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to save all changes to the mappings?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveConfirmation(false);
                    setPendingSaveDesignatorId(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveEdits}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirmation && pendingDeletePackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete All Mappings?</h3>
              <p className="text-gray-600 text-sm mb-2">
                Are you sure you want to delete all <span className="font-semibold text-gray-900">{pendingDeletePackage.mappings.length} mapping(s)</span> from this package?
              </p>
              <p className="text-red-600 text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAllConfirmation(false);
                    setPendingDeletePackage(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePackage}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mappings Modal */}
      {editMappingsModalOpen && currentEditPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Mappings - {currentEditPackage.designator_info.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Edit the names of mappings below</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {currentEditPackage.mappings.map((mapping) => (
                  <div key={mapping.id.id.String} className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      {mapping.name}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editedMappings[mapping.id.id.String] || ''}
                        onChange={(e) => setEditedMappings(prev => ({
                          ...prev,
                          [mapping.id.id.String]: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        disabled={saving}
                        placeholder="Enter mapping name"
                      />
                      <button
                        onClick={() => handleDeleteMapping(mapping.id.id.String, mapping.name)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Mapping"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setEditMappingsModalOpen(false);
                  setCurrentEditPackage(null);
                  setEditedMappings({});
                }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdits(currentEditPackage.designator_id.id.String)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
