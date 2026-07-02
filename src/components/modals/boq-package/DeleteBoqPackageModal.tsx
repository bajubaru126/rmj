import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { BoqPackageResponse } from '@/services/boqPackageService';

interface DeleteBoqPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  package: BoqPackageResponse | null;
  loading?: boolean;
}

export function DeleteBoqPackageModal({
  isOpen,
  onClose,
  onConfirm,
  package: pkg,
  loading = false,
}: DeleteBoqPackageModalProps) {
  if (!isOpen || !pkg) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Delete BOQ Package</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this BOQ package?
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Designator:</span>
              <span className="text-sm font-medium text-gray-800">
                {pkg.designator_name || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Paket:</span>
              <span className="text-sm font-medium text-gray-800">
                {pkg.region || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Material:</span>
              <span className="text-sm font-medium text-gray-800">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(pkg.material)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Jasa:</span>
              <span className="text-sm font-medium text-gray-800">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(pkg.jasa)}
              </span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. The package will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Package'}
          </button>
        </div>
      </div>
    </div>
  );
}
