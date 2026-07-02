import { useState, useEffect, ReactElement, cloneElement } from 'react';
import { CheckCircle2, AlertTriangle, Layers, BarChart2, FileText, X, Map, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { kmlFinalizeService } from '@/services/kmlFinalizeService';
import { authService } from '@/services/authService';
import { drmService } from '@/services/drmService';
import { API_CONFIG } from '@/config/api';
import {
  uploadBOQToDRM,
  uploadMatrixToDRM,
  uploadRedlineToDRM
} from '@/utils/drmUploadHelpers';

interface TabWithMarkDoneProps {
  children: 
    | ReactElement 
    | ((props: { markAsDoneButton: React.ReactNode; isDone: boolean; handleUnfinalize: () => void }) => ReactElement);
  tabName: 'redline' | 'matrix' | 'boq' | 'kml';
  linkId: string;
  projectId: string;
  redlineData?: any;
  matrixData?: any;
  boqData?: any;
  kmlData?: any;
  linkName?: string;
  projectData?: any;
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmFinalizeModal({
  linkName,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
}: {
  linkName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: { 
    drm: 'idle' | 'loading' | 'done' | 'error';
    boq: 'idle' | 'loading' | 'done' | 'error';
    matrix: 'idle' | 'loading' | 'done' | 'error'; 
    redline: 'idle' | 'loading' | 'done' | 'error'; 
    kml: 'idle' | 'loading' | 'done' | 'error';
  };
}) {
  const steps = [
    { key: 'drm',     label: 'Create DRM Record',       icon: FileText,    color: 'text-blue-500' },
    { key: 'boq',     label: 'Upload BOQ ke DRM',       icon: Upload,      color: 'text-emerald-500' },
    { key: 'matrix',  label: 'Upload Matrix ke DRM',    icon: BarChart2,   color: 'text-purple-500' },
    { key: 'redline', label: 'Upload Redline ke DRM',   icon: Layers,      color: 'text-pink-500' },
    { key: 'kml',     label: 'Finalize KML',            icon: Map,         color: 'text-orange-500' },
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
              <h2 className="text-sm font-bold text-gray-900">Konfirmasi Mark as Done</h2>
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
            Aksi ini akan <strong>memfinalisasi data survey</strong> untuk link ini secara permanen dan mengirimkannya ke menu <strong>DRM</strong>. Proses berikut akan dijalankan sekaligus:
          </p>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map(({ key, label, icon: Icon, color }) => {
              const state = progress[key];
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
              ⚠️ Setelah di-finalize, data akan tersimpan ke DRM dan tidak dapat dibatalkan melalui tombol ini.
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

// ── Main Component ────────────────────────────────────────────────────────────
export function TabWithMarkDone({ children, tabName, linkId, projectId, redlineData, matrixData, boqData, kmlData, linkName, projectData }: TabWithMarkDoneProps) {
  const [isDone, setIsDone]         = useState(false);
  const [isMarking, setIsMarking]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress]     = useState<{
    drm:     'idle' | 'loading' | 'done' | 'error';
    boq:     'idle' | 'loading' | 'done' | 'error';
    matrix:  'idle' | 'loading' | 'done' | 'error';
    redline: 'idle' | 'loading' | 'done' | 'error';
    kml:     'idle' | 'loading' | 'done' | 'error';
  }>({ drm: 'idle', boq: 'idle', matrix: 'idle', redline: 'idle', kml: 'idle' });

  useEffect(() => {
    // Check isDone via API — check if DRM record exists for this project-link combination
    if (tabName !== 'boq') return;
    drmService.listAllDRMs()
      .then(drms => {
        const matchedDrm = drms.find((drm: any) => {
          const pId = typeof drm.project_id === 'string' ? drm.project_id :
                      (drm.project_id?.id?.String || drm.project_id?.String || '');
          const lId = typeof drm.link_id === 'string' ? drm.link_id :
                      (drm.link_id?.id?.String || drm.link_id?.String || '');
          
          const cleanPId = pId.includes(':') ? pId.split(':')[1] : pId;
          const cleanLId = lId.includes(':') ? lId.split(':')[1] : lId;
          const targetPId = projectId.includes(':') ? projectId.split(':')[1] : projectId;
          const targetLId = linkId.includes(':') ? linkId.split(':')[1] : linkId;
          
          return cleanPId === targetPId && cleanLId === targetLId;
        });
        setIsDone(!!matchedDrm);
      })
      .catch(() => setIsDone(false));
  }, [linkId, projectId, tabName]);

  // ── Step 1: Create DRM Record ─────────────────────────────────────────────
  const createDrmRecord = async () => {
    setProgress(p => ({ ...p, drm: 'loading' }));
    try {
      console.log('📡 [Finalize] Step 1: Creating DRM record...');
      const token = authService.getToken();
      await drmService.createDRM({
        project_id: projectId,
        link_id: linkId,
        status: 'on_going',
        progress: 0,
        notes: `Auto-populated from survey finalization for link: ${linkName || linkId}`
      }, token);
      console.log('✅ [Finalize] DRM record created successfully');
      setProgress(p => ({ ...p, drm: 'done' }));
    } catch (err: any) {
      // If DRM already exists, treat as success and continue
      if (err.message && (err.message.includes('already has a DRM') || err.message.includes('already exists'))) {
        console.log('ℹ️ [Finalize] DRM record already exists. Continuing...');
        setProgress(p => ({ ...p, drm: 'done' }));
      } else {
        setProgress(p => ({ ...p, drm: 'error' }));
        throw err;
      }
    }
  };

  // ── Step 2: Upload BOQ data to DRM ────────────────────────────────────────
  const uploadBoq = async () => {
    setProgress(p => ({ ...p, boq: 'loading' }));
    try {
      console.log('📡 [Finalize] Step 2: Uploading BOQ data to DRM...');
      await uploadBOQToDRM(projectId, linkId, linkName || linkId, projectData?.name);
      setProgress(p => ({ ...p, boq: 'done' }));
    } catch (err) {
      setProgress(p => ({ ...p, boq: 'error' }));
      throw err;
    }
  };

  // ── Step 3: Upload Matrix data to DRM ─────────────────────────────────────
  const uploadMatrix = async () => {
    setProgress(p => ({ ...p, matrix: 'loading' }));
    try {
      console.log('📡 [Finalize] Step 3: Uploading Matrix data to DRM...');
      await uploadMatrixToDRM(projectId, linkId, linkName || linkId, projectData?.name);
      setProgress(p => ({ ...p, matrix: 'done' }));
    } catch (err) {
      setProgress(p => ({ ...p, matrix: 'error' }));
      throw err;
    }
  };

  // ── Step 4: Upload Redline data to DRM ────────────────────────────────────
  const uploadRedline = async () => {
    setProgress(p => ({ ...p, redline: 'loading' }));
    try {
      console.log('📡 [Finalize] Step 4: Uploading Redline data to DRM...');
      await uploadRedlineToDRM(projectId, linkId, linkName || linkId, projectData?.name);
      setProgress(p => ({ ...p, redline: 'done' }));
    } catch (err) {
      setProgress(p => ({ ...p, redline: 'error' }));
      throw err;
    }
  };

  // ── Step 5: Finalize KML ──────────────────────────────────────────────────
  const finalizeKml = async () => {
    setProgress(p => ({ ...p, kml: 'loading' }));
    try {
      let currentKmlData = kmlData;
      if (!currentKmlData || (!currentKmlData.kml_project?.length && !currentKmlData.kml_survey?.length)) {
        console.log('📡 [Finalize] Step 5: Fetching KML data dynamically...');
        const { getProjectKMLFiles } = await import('@/services/contractService');
        currentKmlData = await getProjectKMLFiles(projectId);
      }

      console.log('📊 [Finalize] Finalizing KML data:', currentKmlData);

      const req = {
        project_id: projectId,
        force_refinalize: true,
        kml_project: currentKmlData?.kml_project || [],
        kml_survey: currentKmlData?.kml_survey || [],
        survey_record: currentKmlData?.survey_record || [],
        survey_kml_tracking: currentKmlData?.survey_kml_tracking || [],
        kml_span: currentKmlData?.kml_span || [],
      };

      await kmlFinalizeService.finalizeKml(req);
      setProgress(p => ({ ...p, kml: 'done' }));
    } catch (err) {
      console.error('KML finalize error:', err);
      setProgress(p => ({ ...p, kml: 'error' }));
      throw err;
    }
  };

  // ── Handle confirm (runs all 5 steps sequentially) ────────────────────────
  const handleConfirm = async () => {
    setIsMarking(true);
    let hasError = false;

    // Step 1: Create DRM record
    try {
      await createDrmRecord();
    } catch (err) {
      console.error('DRM creation error:', err);
      hasError = true;
    }

    // Step 2: Parse & upload BOQ data to DRM
    try {
      await uploadBoq();
    } catch (err) {
      console.error('BOQ upload error:', err);
      hasError = true;
    }

    // Step 3: Parse & upload Matrix data to DRM
    try {
      await uploadMatrix();
    } catch (err) {
      console.error('Matrix upload error:', err);
      hasError = true;
    }

    // Step 4: Parse & upload Redline data to DRM
    try {
      await uploadRedline();
    } catch (err) {
      console.error('Redline upload error:', err);
      hasError = true;
    }

    // Step 5: Finalize KML
    try {
      await finalizeKml();
    } catch (err) {
      console.error('KML finalize error:', err);
      hasError = true;
    }

    // Dispatch update event & finalize UI
    window.dispatchEvent(new Event('doneSurveysUpdated'));

    setIsDone(true);
    setIsMarking(false);

    if (hasError) {
      toast.warning('Sebagian proses berhasil, sebagian gagal. Cek console untuk detail.');
    } else {
      toast.success('Survey berhasil di-finalize! Data tersedia di menu DRM.');
      // Close modal after short delay so user can see all green
      setTimeout(() => setShowConfirm(false), 1200);
    }
  };

  const handleUnfinalize = async () => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan finalisasi (unfinalize) untuk link "${linkName || linkId}"?`)) {
      return;
    }
    
    setIsMarking(true);
    try {
      const token = authService.getToken();
      
      // 1. Delete DRM record if exists
      console.log('🗑️ Searching and deleting DRM record...');
      try {
        const drms = await drmService.listAllDRMs();
        const matchedDrm = drms.find((drm: any) => {
          const pId = typeof drm.project_id === 'string' ? drm.project_id :
                      (drm.project_id?.id?.String || drm.project_id?.String || '');
          const lId = typeof drm.link_id === 'string' ? drm.link_id :
                      (drm.link_id?.id?.String || drm.link_id?.String || '');
          
          const cleanPId = pId.includes(':') ? pId.split(':')[1] : pId;
          const cleanLId = lId.includes(':') ? lId.split(':')[1] : lId;
          const targetPId = projectId.includes(':') ? projectId.split(':')[1] : projectId;
          const targetLId = linkId.includes(':') ? linkId.split(':')[1] : linkId;
          
          return cleanPId === targetPId && cleanLId === targetLId;
        });
        
        if (matchedDrm) {
          let drmId = '';
          if (typeof matchedDrm.id === 'string') {
            drmId = matchedDrm.id;
          } else {
            drmId = matchedDrm.id?.id?.String || matchedDrm.id?.id || '';
          }
          
          if (drmId) {
            const cleanDrmId = drmId.includes(':') ? drmId.split(':')[1] : drmId;
            await drmService.deleteDRM(cleanDrmId, token);
            console.log('✅ DRM record deleted successfully');
          }
        }
      } catch (drmErr) {
        console.error('Failed to delete DRM record (non-blocking):', drmErr);
      }

      // Also clean up matrix_drm, boq_drm, and redline_drm if needed
      try {
        await fetch(`${API_CONFIG.BASE_URL}/boq-drm/link/${linkId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        await fetch(`${API_CONFIG.BASE_URL}/matrix-drm/link/${linkId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        await fetch(`${API_CONFIG.BASE_URL}/redline-drm/link/${linkId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (delErr) {
        console.error('Failed to delete link documents (non-blocking):', delErr);
      }

      // 3. Dispatch update event
      window.dispatchEvent(new Event('doneSurveysUpdated'));
      
      setIsDone(false);
      toast.success('Finalisasi berhasil dibatalkan (Unfinalized)!');
    } catch (err: any) {
      console.error('Unfinalize error:', err);
      toast.error(err.message || 'Gagal membatalkan finalisasi');
    } finally {
      setIsMarking(false);
    }
  };

  const handleOpenConfirm = () => {
    setProgress({ drm: 'idle', boq: 'idle', matrix: 'idle', redline: 'idle', kml: 'idle' });
    setShowConfirm(true);
  };


  // ── Mark as Done button ───────────────────────────────────────────────────
  const markAsDoneButton = tabName === 'boq' ? (
    <div className="flex items-center gap-2">
      <button
        onClick={handleOpenConfirm}
        disabled={isMarking || isDone}
        className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: (isMarking || isDone) ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        }}
        title={isDone ? 'Already marked as done' : 'Mark as Done (Finalize Redline + Matrix + BOQ)'}
      >
        <CheckCircle2 className="w-4 h-4" />
        {isDone ? 'Marked as Done' : 'Mark as Done'}
      </button>

      {isDone && (
        <button
          onClick={handleUnfinalize}
          disabled={isMarking}
          className="px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          title="Buka kembali finalisasi (Unfinalize) untuk link ini"
        >
          <X className="w-4 h-4" />
          Unfinalize
        </button>
      )}
    </div>
  ) : null; // Only BOQ tab shows the button now

  return (
    <>
      {typeof children === 'function'
        ? (children as Function)({ markAsDoneButton, isDone, handleUnfinalize })
        : cloneElement(children as ReactElement, { markAsDoneButton, isDone } as any)}

      {showConfirm && (
        <ConfirmFinalizeModal
          linkName={linkName || linkId}
          onConfirm={handleConfirm}
          onCancel={() => { if (!isMarking) setShowConfirm(false); }}
          isProcessing={isMarking}
          progress={progress}
        />
      )}
    </>
  );
}
