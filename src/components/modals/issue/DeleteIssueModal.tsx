import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Issue } from '@/types';

interface DeleteIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue | null;
  onConfirm: () => void;
  onCancel: () => void;
  getPriorityColor: (priority: string) => string;
  isSubmitting?: boolean;
}

export function DeleteIssueModal({
  open,
  onOpenChange,
  issue,
  onConfirm,
  onCancel,
  getPriorityColor,
  isSubmitting = false,
}: DeleteIssueModalProps) {
  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-lg w-full">
      <div className="flex flex-col">
        {/* Header */}
        <CustomDialogHeader
          style={{
            background: 'linear-gradient(to right, #003A70, #005EB8)',
            padding: '24px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
            <Trash2 className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Hapus Issue</h2>
          </CustomDialogTitle>
        </CustomDialogHeader>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-900 font-medium mb-1">
                Apakah Anda yakin ingin menghapus issue ini?
              </p>
              <p className="text-sm text-gray-500">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          {issue && (
            <div className="p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <span className={getPriorityColor(issue.priority) + " px-3 py-1.5 rounded-lg text-xs font-semibold"}>
                  {issue.priority}
                </span>
                <span className="text-base font-bold text-gray-900">{issue.id}</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Title:</span>
                  <span className="text-sm text-gray-900">{issue.title}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Project:</span>
                  <span className="text-sm text-gray-900">{issue.project_id}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Description:</span>
                  <span className="text-sm text-gray-500 overflow-hidden line-clamp-2">{issue.description}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: '#F9FAFB',
          padding: '24px'
        }}>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{
                background: '#ff0000',
                hoverBackground: '#b81414'
              }}
              className="btn-danger text-white flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
