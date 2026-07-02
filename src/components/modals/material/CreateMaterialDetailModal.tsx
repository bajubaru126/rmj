import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface CreateMaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MaterialDetailFormData) => void;
  category: string;
  linkName: string;
}

export interface MaterialDetailFormData {
  plan_start_date: string;
  plan_end_date: string;
  plan_qty: number;
  unit: string;
  plan_progress: number;
  actual_start_date: string;
  actual_end_date: string;
  actual_value: number;
}

export function CreateMaterialDetailModal({ 
  isOpen, 
  onClose, 
  onSave, 
  category,
  linkName 
}: CreateMaterialDetailModalProps) {
  const [formData, setFormData] = useState<MaterialDetailFormData>({
    plan_start_date: '',
    plan_end_date: '',
    plan_qty: 0,
    unit: '',
    plan_progress: 0,
    actual_start_date: '',
    actual_end_date: '',
    actual_value: 0
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate required fields
      if (!formData.plan_start_date || !formData.plan_end_date || formData.plan_qty <= 0) {
        alert('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      // Call onSave callback
      onSave(formData);
      
      // Reset form
      setFormData({
        plan_start_date: '',
        plan_end_date: '',
        plan_qty: 0,
        unit: '',
        plan_progress: 0,
        actual_start_date: '',
        actual_end_date: '',
        actual_value: 0
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving material detail:', error);
      alert('Failed to save material detail');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Get category display name
  const getCategoryName = () => {
    const categoryMap: Record<string, string> = {
      'order': 'Material Order',
      'shipment': 'Material Shipment',
      'on_wh': 'Material On WH',
      'delivery': 'Material Delivery',
      'delivery_to_site': 'Material Delivery to Site',
      'on_site': 'Material on Site'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9100] p-6" onClick={handleClose}>
      <div
        className="bg-white shadow-2xl flex flex-col relative"
        style={{
          width: '800px',
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
            <h3 className="text-xl font-bold">Add {getCategoryName()}</h3>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 hover:bg-white/20 rounded-lg transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm opacity-90">{linkName}</p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {/* Plan Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-bold text-blue-800 mb-3">Plan Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Plan Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.plan_start_date}
                    onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Plan End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.plan_end_date}
                    onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Plan Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.plan_qty || ''}
                    onChange={(e) => setFormData({ ...formData, plan_qty: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Pilih satuan</option>
                    <option value="Unit">Unit</option>
                    <option value="Meter">Meter</option>
                    <option value="Roll">Roll</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Set">Set</option>
                    <option value="Titik">Titik</option>
                    <option value="Core">Core</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Plan Progress (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      value={formData.plan_progress}
                      onChange={(e) => setFormData({ ...formData, plan_progress: parseFloat(e.target.value) })}
                      className="flex-1"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <input
                      type="number"
                      value={formData.plan_progress}
                      onChange={(e) => setFormData({ ...formData, plan_progress: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actual Section */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <h4 className="text-sm font-bold text-green-800 mb-3">Actual Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Actual Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.actual_start_date}
                    onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Actual End Date
                  </label>
                  <input
                    type="date"
                    value={formData.actual_end_date}
                    onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Actual Value
                  </label>
                  <input
                    type="number"
                    value={formData.actual_value || ''}
                    onChange={(e) => setFormData({ ...formData, actual_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
