import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { boqPackageService, CreateBoqPackageRequest } from '@/services/boqPackageService';
import { getAllDesignators } from '@/services/designatorService';
import { getAllRegionals, type Regional } from '@/services/regionalService';
import { toast } from 'sonner';

interface CreateBoqPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DesignatorOption {
  id: string;
  name: string;
}

interface RegionalOption {
  id: string;
  region: string;
}

export function CreateBoqPackageModal({ isOpen, onClose, onSuccess }: CreateBoqPackageModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [designators, setDesignators] = useState<DesignatorOption[]>([]);
  const [regionals, setRegionals] = useState<RegionalOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateBoqPackageRequest>({
    designator_id: '',
    regional_id: '',
    material: 0,
    jasa: 0,
  });

  // Fetch designators and regionals
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, token]);

  const fetchData = async () => {
    if (!token) return;

    setLoadingData(true);
    try {
      // Fetch designators
      const designatorsData = await getAllDesignators();
      const mappedDesignators = designatorsData.map((d: any) => ({
        id: typeof d.id === 'string' ? d.id : d.id?.id?.String || d.id?.id || '',
        name: d.name || 'Unknown',
      }));
      setDesignators(mappedDesignators);

      // Fetch regionals
      const regionalsData = await getAllRegionals();
      const mappedRegionals = regionalsData.map((r: any) => ({
        id: typeof r.id === 'string' ? r.id : r.id?.id?.String || r.id?.id || '',
        region: r.region || 'Unknown',
      }));
      setRegionals(mappedRegionals);

      console.log('✅ Designators:', mappedDesignators);
      console.log('✅ Regionals:', mappedRegionals);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.designator_id || !formData.regional_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      await boqPackageService.createBoqPackage(formData, token);
      toast.success('BOQ package created successfully');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating BOQ package:', error);
      toast.error('Failed to create BOQ package');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      designator_id: '',
      regional_id: '',
      material: 0,
      jasa: 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Create BOQ Package</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loadingData ? (
            <div className="text-center py-8 text-gray-500">Loading form data...</div>
          ) : (
            <>
              {/* Designator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designator <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.designator_id}
                  onChange={(e) => setFormData({ ...formData, designator_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Designator</option>
                  {designators.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Regional (Paket) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paket <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.regional_id}
                  onChange={(e) => setFormData({ ...formData, regional_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Paket</option>
                  {regionals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.region}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Jasa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jasa (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.jasa}
                  onChange={(e) => setFormData({ ...formData, jasa: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Total Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">Total:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(formData.material + formData.jasa)}
                  </span>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
}
