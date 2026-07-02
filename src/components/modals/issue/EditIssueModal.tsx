import { Edit2, Loader2 } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { CreateIssueRequest, Issue } from '@/types';

interface EditIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateIssueRequest;
  onFormDataChange: (data: CreateIssueRequest) => void;
  onSubmit: () => void;
  onCancel: () => void;
  issueId?: string;
  selectedIssue?: Issue | null;
  isSubmitting?: boolean;
  onStatusChange?: (issueId: string, newStatus: string) => void;
}

export function EditIssueModal({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  issueId,
  selectedIssue,
  isSubmitting = false,
  onStatusChange,
}: EditIssueModalProps) {
  const isFormValid = formData.title && formData.description;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-4xl w-full max-h-[90vh]">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header with Gradient */}
        <CustomDialogHeader 
          style={{
            background: 'linear-gradient(90deg, #003A70 0%, #005EB8 100%)',
            padding: '32px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', paddingRight: '48px' }}>
            <div 
              className="w-16 h-16 flex items-center justify-center rounded-3xl shadow-xl transition-transform hover:scale-105"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(255, 255, 255, 0.3)'
              }}
            >
              <Edit2 className="w-8 h-8 text-white" style={{ filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.04))' }} />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">Edit Issue{issueId ? ` - ${issueId}` : ''}</div>
              <div className="text-sm font-normal text-blue-200 mt-1.5 tracking-wide">Update issue information and status</div>
            </div>
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
                <Label htmlFor="edit-title" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
                  placeholder="Brief issue title"
                  className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] hover:border-blue-300 hover:shadow-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="edit-description"
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
                  <Label htmlFor="edit-priority" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Priority <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="edit-priority"
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
                  <Label htmlFor="edit-status" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="edit-status"
                    value={formData.status}
                    onChange={(e) => onFormDataChange({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none bg-white transition-all duration-200 cursor-pointer focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)] hover:border-green-300 hover:shadow-sm"
                  >
                    <option value="Open">🔴 Open</option>
                    <option value="In Progress">🟡 In Progress</option>
                    <option value="Resolved">🟢 Resolved</option>
                    <option value="Closed">⚫ Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="edit-assigned-to" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Assign To <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="edit-assigned-to"
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

        {/* Footer with Actions */}
        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: 'linear-gradient(90deg, #F9FAFB 0%, #F1F5F9 100%)',
          padding: '20px 32px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500">
              Editing issue <span className="font-semibold text-gray-700">{issueId}</span>
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onCancel} 
                disabled={isSubmitting}
                className="px-6 h-11 rounded-xl border-2 border-gray-300 bg-white font-medium transition-all duration-200 hover:bg-gray-100 hover:scale-105"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!isFormValid || isSubmitting}
                className={`px-8 h-11 rounded-xl font-semibold transition-all duration-200 border-none flex items-center gap-2 ${
                  isFormValid && !isSubmitting
                    ? 'text-white shadow-lg hover:scale-105' 
                    : 'bg-gray-400 opacity-50 cursor-not-allowed'
                }`}
                style={isFormValid && !isSubmitting ? {
                  background: 'linear-gradient(90deg, #003A70 0%, #005EB8 100%)',
                  boxShadow: '0 10px 15px -3px rgba(0, 58, 112, 0.4)'
                } : undefined}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Updating...' : 'Update Issue'}
              </Button>
            </div>
          </div>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
