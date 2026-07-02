import { AlertTriangle, X, CheckCircle2, FileText, Upload, BarChart2, Layers, Network } from 'lucide-react';

export interface FinalizeProgress {
  project: 'idle' | 'loading' | 'done' | 'error';
  pow: 'idle' | 'loading' | 'done' | 'error';
  boq: 'idle' | 'loading' | 'done' | 'error';
  matrix: 'idle' | 'loading' | 'done' | 'error';
  redline: 'idle' | 'loading' | 'done' | 'error';
}

interface ConfirmFinalizeInstallationModalProps {
  linkName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: FinalizeProgress;
}

export function ConfirmFinalizeInstallationModal({
  linkName,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
}: ConfirmFinalizeInstallationModalProps) {
  const steps = [
    { key: 'project', label: 'Create Installation Project', icon: FileText, color: 'text-blue-500' },
    { key: 'pow', label: 'Finalize POW', icon: Network, color: 'text-indigo-500' },
    { key: 'boq', label: 'Upload BOQ ke Installasi', icon: Upload, color: 'text-emerald-500' },
    { key: 'matrix', label: 'Upload Matrix ke Installasi', icon: BarChart2, color: 'text-purple-500' },
    { key: 'redline', label: 'Upload Redline ke Installasi', icon: Layers, color: 'text-pink-500' },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Konfirmasi Finalize ke Installation</h2>
              <p className="text-xs text-gray-500 mt-0.5">Link: <span className="font-semibold text-gray-700">{linkName}</span></p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Aksi ini akan <strong>memfinalisasi data DRM</strong> untuk link ini secara permanen dan menyalin data ke menu <strong>Installation</strong>. Proses berikut akan dijalankan sekaligus:
          </p>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map(({ key, label, icon: Icon, color }) => {
              const state = progress[key as keyof FinalizeProgress];
              return (
                <div key={key} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  state === 'done'    ? 'bg-green-50 border-green-200' :
                  state === 'loading' ? 'bg-blue-50 border-blue-200' :
                  state === 'error'   ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-100'
                }`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                  <span className="text-xs font-semibold text-gray-700 flex-1">{label}</span>
                  {state === 'loading' && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                  {state === 'done'    && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {state === 'error'   && <X className="w-4 h-4 text-red-500" />}
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚠️ Setelah di-finalize, data akan tersalin ke Installation dan siap untuk diproses lebih lanjut.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Ya, Finalize Sekarang</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
