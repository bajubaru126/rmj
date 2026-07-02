import { Trash2, AlertCircle } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Attribute } from '@/types';

interface DeleteAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: Attribute | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAttributeModal({
  open,
  onOpenChange,
  attribute,
  onConfirm,
  onCancel,
}: DeleteAttributeModalProps) {
  if (!attribute) return null;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-lg w-full">
      <div className="flex flex-col">
        {/* Header */}
        <CustomDialogHeader 
          style={{
            background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 50%, #F43F5E 100%)',
            padding: '32px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', paddingRight: '48px' }}>
            <Trash2 className="w-8 h-8 text-white" />
            <div>
              <div className="text-2xl font-bold tracking-tight">Delete Attribute</div>
              <div className="text-sm font-normal text-red-200 mt-1.5 tracking-wide">This action cannot be undone</div>
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>

        <div className="p-8">
          <div className="flex items-start gap-4 mb-6 p-5 rounded-2xl border-2"
            style={{
              background: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
              borderColor: '#FCA5A5'
            }}
          >
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-900 mb-2">
                Warning: Permanent Deletion
              </div>
              <div className="text-xs text-red-800 leading-relaxed">
                Deleting this attribute will remove it from all records and cannot be recovered.
                Any data stored in this field will be permanently lost.
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border-2 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Attribute Information
            </h4>

            <div className="grid gap-3">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">ID:</span>
                <span className="text-xs font-semibold text-gray-900">{attribute.id}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Field Name:</span>
                <code className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {attribute.name}
                </code>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Display Label:</span>
                <span className="text-xs font-semibold text-gray-900">{attribute.label}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Type:</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {attribute.type}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Category:</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                  {attribute.category}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Level:</span>
                <span className="text-xs font-semibold text-gray-900">
                  Level {attribute.level}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Required:</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  attribute.required ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {attribute.required ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Created by:</span>
                <span className="text-xs font-semibold text-gray-900">{attribute.createdBy}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-yellow-300">
            <div className="flex gap-3 items-start">
              <div className="text-xl leading-none">⚠️</div>
              <div>
                <div className="text-xs font-semibold text-amber-900 mb-1">
                  Impact Assessment
                </div>
                <div className="text-xs text-amber-800 leading-relaxed space-y-0.5">
                  <div>• All data in this field will be permanently deleted</div>
                  <div>• This column will be removed from all related tables</div>
                  <div>• Any filters or formulas using this field will break</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: 'linear-gradient(90deg, #FEF2F2 0%, #FEE2E2 100%)',
          padding: '24px 32px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <div className="flex gap-3 w-full">
            <Button 
              type="button"
              variant="outline" 
              onClick={onCancel}
              className="flex-1 px-6 h-12 rounded-xl border-2 border-gray-300 bg-white font-semibold transition-all hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 px-6 h-12 rounded-xl text-white font-semibold border-none flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 50%, #F43F5E 100%)',
                boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.4)'
              }}
            >
              <Trash2 className="w-5 h-5" />
              Delete 
            </Button>
          </div>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
