import { Trash2, AlertCircle } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';

interface DeleteRuasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: any | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteRuasModal({
  open,
  onOpenChange,
  rowData,
  onConfirm,
  onCancel,
}: DeleteRuasModalProps) {
  if (!rowData) return null;

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0:
        return 'Kontrak';
      case 1:
        return 'Lokasi / Witel';
      case 2:
        return 'Ruas Kontrak';
      default:
        return 'Unknown';
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-lg w-full">
      <div className="flex flex-col">
        {/* Header */}
        <CustomDialogHeader
          style={{
            background: 'linear-gradient(to right, #003A70, #005EB8)',
            padding: '24px',
            borderBottom: '1px solid #E5E7EB'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
            <Trash2 className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Hapus Data</h2>
          </CustomDialogTitle>
        </CustomDialogHeader>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-900 font-medium mb-1">
                Apakah Anda yakin ingin menghapus data ini?
              </p>
              <p className="text-sm text-gray-500">
                Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
                {getLevelLabel(rowData.level)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {rowData.kontrak && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">No Kontrak:</span>
                  <span className="text-sm text-gray-900">{rowData.kontrak}</span>
                </div>
              )}
              {rowData.treg && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">TREG:</span>
                  <span className="text-sm text-gray-900">{rowData.treg}</span>
                </div>
              )}
              {rowData.lokasi && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Lokasi:</span>
                  <span className="text-sm text-gray-900">{rowData.lokasi}</span>
                </div>
              )}
              {rowData.ruasKontrak && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Ruas Kontrak:</span>
                  <span className="text-sm text-gray-900">{rowData.ruasKontrak}</span>
                </div>
              )}
              {rowData.owner && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Owner:</span>
                  <span className="text-sm text-gray-900">{rowData.owner}</span>
                </div>
              )}
            </div>
          </div>
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
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Hapus
            </Button>
          </div>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
