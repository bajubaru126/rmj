import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Upload } from 'lucide-react';
import { materialService, MaterialDetail } from '@/services/materialService';
import { authService } from '@/services/authService';
import { EditMaterialModal } from './EditMaterialModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface MaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkName: string;
  projectName: string;
  projectId: string;
  linkId: string;
  onMaterialChanged?: () => void; // Callback to refresh parent data
}

type TabType = 'Material Order' | 'Material Shipment' | 'Material On WH' | 'Material Delivery' | 'Material Delivery to Site' | 'Material On Site';

export function MaterialDetailModal({ isOpen, onClose, linkName, projectName, projectId, linkId, onMaterialChanged }: MaterialDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Material Order');
  const [allMaterials, setAllMaterials] = useState<MaterialDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDetail | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialDetail | null>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'Material Order', label: 'Material Order' },
    { id: 'Material Shipment', label: 'Material Shipment' },
    { id: 'Material On WH', label: 'Material On WH' },
    { id: 'Material Delivery', label: 'Material Delivery' },
    { id: 'Material Delivery to Site', label: 'Material Delivery to Site' },
    { id: 'Material On Site', label: 'Material on Site' }
  ];

  useEffect(() => {
    if (isOpen && projectId && linkId) {
      fetchMaterialDetails();
    }
  }, [isOpen, projectId, linkId]);

  const fetchMaterialDetails = async () => {
    setIsLoading(true);
    try {
      const token = authService.getToken();
      const materials = await materialService.getMaterialsByProjectAndLink(projectId, linkId, token);
      console.log('📋 Materials fetched:', materials);
      setAllMaterials(materials);
    } catch (error) {
      console.error('Error fetching material details:', error);
      setAllMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to clean date string (remove d' prefix and trailing ')
  const cleanDateString = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    // Remove d' prefix and trailing ' if present
    return dateStr.replace(/^d'/, '').replace(/'$/, '');
  };

  // Filter materials by active tab (material_step)
  const filteredMaterials = allMaterials.filter(m => m.material_step === activeTab);

  const handleEdit = (material: MaterialDetail) => {
    setEditingMaterial(material);
    setIsEditModalOpen(true);
  };

  const handleDelete = (material: MaterialDetail) => {
    setMaterialToDelete(material);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;

    setIsDeleting(true);
    try {
      const token = authService.getToken();
      await materialService.deleteMaterial(materialToDelete.id, token);
      alert('Material deleted successfully!');
      setDeleteConfirmOpen(false);
      setMaterialToDelete(null);
      fetchMaterialDetails(); // Refresh modal data
      if (onMaterialChanged) {
        onMaterialChanged(); // Refresh parent table data
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (updatedData: Partial<MaterialDetail>) => {
    if (!editingMaterial) return;

    try {
      const token = authService.getToken();
      // Filter out null values and convert to the correct type
      const cleanData: any = {};
      Object.entries(updatedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      await materialService.updateMaterial(editingMaterial.id, cleanData, token);
      alert('Material updated successfully!');
      setIsEditModalOpen(false);
      setEditingMaterial(null);
      fetchMaterialDetails(); // Refresh modal data
      if (onMaterialChanged) {
        onMaterialChanged(); // Refresh parent table data
      }
    } catch (error) {
      console.error('Error updating material:', error);
      alert('Failed to update material');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9000] p-6" onClick={onClose}>
      <div
        className="bg-white shadow-2xl flex flex-col relative"
        style={{
          width: '1200px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#15396C] to-[#0078D7] text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">Material Details</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm opacity-90">
            <p className="font-semibold">{projectName}</p>
            <p className="text-xs mt-1">{linkName}</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                    <tr>
                      <th className="p-4 min-w-[180px]">Nama Barang</th>
                      <th className="p-4 min-w-[150px]">Plan Start Date</th>
                      <th className="p-4 min-w-[150px]">Plan End Date</th>
                      <th className="p-4 min-w-[120px] text-right">Plan Qty</th>
                      <th className="p-4 min-w-[80px]">Satuan</th>
                      <th className="p-4 min-w-[140px]">Plan Progress</th>
                      <th className="p-4 min-w-[200px]">Keterangan</th>
                      <th className="p-4 min-w-[150px]">Actual Start Date</th>
                      <th className="p-4 min-w-[150px]">Actual End Date</th>
                      <th className="p-4 min-w-[120px] text-right">Actual Value</th>
                      <th className="p-4 min-w-[120px] text-right">Actual Progress</th>
                      <th className="p-4 min-w-[100px] text-center">Documents</th>
                      <th className="p-4 min-w-[120px] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredMaterials.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0"
                      >
                        <td className="p-4 font-semibold text-gray-900">
                          {item.item_name || '-'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {item.plan_start_date ? new Date(cleanDateString(item.plan_start_date) || '').toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {item.plan_end_date ? new Date(cleanDateString(item.plan_end_date) || '').toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-600">
                          {item.plan_quantity?.toLocaleString() || '-'}
                        </td>
                        <td className="p-4 text-gray-600">{item.unit || '-'}</td>
                        <td className="p-4 text-gray-600">{item.plan_progress || '-'}</td>
                        <td className="p-4 text-gray-600">
                          <div className="max-w-[200px] truncate" title={item.keterangan || '-'}>
                            {item.keterangan || '-'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">
                          {item.actual_start_date ? new Date(cleanDateString(item.actual_start_date) || '').toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {item.actual_end_date ? new Date(cleanDateString(item.actual_end_date) || '').toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-600">
                          {item.actual_value?.toLocaleString() || '-'}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-600">
                          {item.actual_progress ? `${item.actual_progress}%` : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                            <Upload className="w-3 h-3" />
                            {item.documents?.length || 0} file(s)
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit"
                              disabled={isDeleting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMaterials.length === 0 && (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-gray-400 italic">
                          No data available for {tabs.find(t => t.id === activeTab)?.label}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Custom Scrollbar Styles */}
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            height: 8px;
          }
          .overflow-x-auto::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .overflow-x-auto::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 10px;
          }
          .overflow-x-auto::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>
      </div>

      {/* Edit Material Modal */}
      {isEditModalOpen && editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMaterial(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setMaterialToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Material"
        message={`Are you sure you want to delete this material (${materialToDelete?.material_step})? This action cannot be undone and will also delete all associated documents.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
