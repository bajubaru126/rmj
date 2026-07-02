import { Plus, Loader2 } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { CreateIssueRequest } from '@/types';

interface AddNewIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateIssueRequest;
  onFormDataChange: (data: CreateIssueRequest) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddNewIssueModal({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddNewIssueModalProps) {
  const isFormValid = formData.title && formData.description;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-4xl w-full max-h-[90vh]">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <CustomDialogHeader 
          style={{
            background: 'linear-gradient(to right, #003A70, #005EB8)',
            padding: '32px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
            <Plus className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Tambah Issue Baru</h2>
          </CustomDialogTitle>
        </CustomDialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-8">
          <div className="flex flex-col gap-6">
          {/* Issue Details */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Issue Details</h3>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
                  placeholder="Brief issue title"
                  className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] hover:border-blue-300 hover:shadow-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue in detail...&#10;&#10;Include:&#10;• What happened?&#10;• When did it occur?&#10;• Impact assessment"
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none resize-none bg-white transition-all duration-200 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)] hover:border-green-300 hover:shadow-sm"
                  required
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{formData.description.length} characters</p>
                  {formData.description.length > 500 && (
                    <p className="text-xs text-amber-600">⚠️ Consider keeping it concise</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="priority" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Priority <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => onFormDataChange({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none bg-white transition-all duration-200 cursor-pointer focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] hover:border-blue-300 hover:shadow-sm"
                  >
                    <option value="Low">🟢 Low - Minor</option>
                    <option value="Medium">🟡 Medium - Normal</option>
                    <option value="High">🔴 High - Urgent</option>
                    <option value="Critical">🔴 Critical - Emergency</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="assigned_to" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Assign To <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={(e) => onFormDataChange({ ...formData, assigned_to: e.target.value || undefined })}
                    placeholder="User ID"
                    className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.1)] hover:border-purple-300 hover:shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Footer with Actions */}
        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: '#F9FAFB',
          padding: '24px'
        }}>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              Fields marked with <span className="text-red-500 font-semibold">*</span> are required
            </p>
            <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!isFormValid || isSubmitting}
                className="bg-[#005EB8] hover:bg-[#004a94] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: .5;
              }
            }
          `}</style>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}