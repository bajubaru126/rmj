import { useState, useRef, useEffect } from 'react';
import { X, FileText, CheckCircle, PenTool, Download, Check, Upload, Activity } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { BASurveyResponse, baSurveyService } from '@/services/baSurveyService';
import { generateBASurveyPDFBlob } from '@/utils/baSurveyPdfGenerator';
import { API_CONFIG } from '@/config/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface BASurveyApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  baSurvey: BASurveyResponse;
  onApprove: (userType: 'user1' | 'user2', nama: string, jabatan: string) => Promise<void>;
  onStateChange?: () => void;
}

type UserType = 'user1' | 'user2';

// ── Warning Modal Component ───────────────────────────────────────────────────
function WarningModal({
  isOpen,
  onClose,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full h-auto max-w-sm overflow-hidden p-6 m-4 border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
            <svg
              className="w-6 h-6 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-bold text-gray-900">Perhatian</h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs transition shadow-sm active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Reject Dialog Component
function RejectDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }
    await onConfirm(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 m-4 border border-gray-200 animate-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-[#15396C] mb-2">Tolak Berita Acara Survey</h3>
        <p className="text-xs text-gray-500 mb-4 font-semibold">Masukkan alasan penolakan dokumen ini agar pihak pembuat survey dapat merevisinya.</p>
        
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          placeholder="Contoh: Lampiran foto kurang jelas / koordinat tidak sesuai."
          rows={4}
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none mb-3 font-semibold"
        />
        {error && <p className="text-[10px] text-red-500 font-bold mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-bold text-xs transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-xs transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : 'Tolak'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Signature Pad Modal Component (separate modal for signing)
function SignaturePadModal({
  isOpen,
  onClose,
  userType,
  onSave,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
  onSave: (signatureData: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setWarning('Silakan buat tanda tangan terlebih dahulu');
      return;
    }

    const signatureData = sigCanvasRef.current.toDataURL();
    await onSave(signatureData);
  };

  if (!isOpen) return null;

  const title = userType === 'user1' ? 'Tanda Tangan MITRA' : 'Tanda Tangan TELKOM WASPANG';

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">Gambar tanda tangan Anda di area di bawah ini</p>
            </div>
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Signature Canvas */}
          <div className="p-6 space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'w-full h-60 cursor-default',
                  style: { touchAction: 'none', cursor: 'default' }
                }}
                backgroundColor="white"
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              Gunakan mouse atau touchscreen untuk menggambar tanda tangan
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={handleClear}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition"
            >
              Hapus
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Simpan & Setujui
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <WarningModal
        isOpen={warning !== null}
        onClose={() => setWarning(null)}
        message={warning || ''}
      />
    </>
  );
}

export function BASurveyApprovalModal({ 
  isOpen, 
  onClose, 
  baSurvey,
  onApprove,
  onStateChange
}: BASurveyApprovalModalProps) {
  const { user } = useAuth();
  // Administrator tidak bisa mengakses signature pad — hanya PM MITRA/WASPANG yang sesuai
  const isMitraAuthorized = user?.role === 'pm_mitra' && 
    (!baSurvey?.approved_by_user1_id || !user?.id || 
     baSurvey.approved_by_user1_id.replace('users:', '') === user.id.replace('users:', ''));

  const isWaspangAuthorized = user?.role === 'pm_waspang' && 
    (!baSurvey?.approved_by_user2_id || !user?.id || 
     baSurvey.approved_by_user2_id.replace('users:', '') === user.id.replace('users:', ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentUserType, setCurrentUserType] = useState<UserType>('user1');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleConfirmReject = async (reason: string) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      // ✅ Mengirim action 'reject' sesuai dokumentasi state machine
      await baSurveyService.transitionState(baSurveyIdStr, 'reject', reason, token);
      toast.success('BA Survey berhasil ditolak');
      setShowRejectDialog(false);
      if (onStateChange) onStateChange();
    } catch (err: any) {
      setWarning(err.message || 'Gagal menolak dokumen');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Load existing signatures from localStorage
  const [user1Signature, setUser1Signature] = useState<string>('');
  const [user2Signature, setUser2Signature] = useState<string>('');

  const baSurveyIdStr = baSurvey ? baSurveyService.extractId(baSurvey.id) : '';

  // Nama dan Jabatan READONLY dari data baSurvey (backend)
  // Tidak perlu state — ambil langsung dari baSurvey
  const namaUser1 = baSurvey?.approved_by_user1_name || '';
  const jabatanUser1 = baSurvey?.approved_by_user1_jabatan || '';
  const namaUser2 = baSurvey?.approved_by_user2_name || '';
  const jabatanUser2 = baSurvey?.approved_by_user2_jabatan || '';

  // Load signatures once when modal opens or survey changes
  useEffect(() => {
    if (isOpen && baSurvey) {
      loadExistingSignatures();
    }
  }, [isOpen, baSurveyIdStr, baSurvey?.approved_by_user1, baSurvey?.approved_by_user2, baSurvey?.documents]);

  // Generate PDF preview when modal is open, or signatures change
  useEffect(() => {
    if (isOpen && baSurvey) {
      generatePDFPreview();
    }
    
    return () => {
      // Cleanup PDF URL when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, baSurveyIdStr, user1Signature, user2Signature, baSurvey]);

  // Helper to fetch image as base64 data URL
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching image as base64:', error);
      throw error;
    }
  };

  const loadExistingSignatures = async () => {
    if (!baSurvey) return;
    const baSurveyId = baSurveyService.extractId(baSurvey.id);
    console.log('🔍 loadExistingSignatures: loading for survey ID:', baSurveyId);
    
    // MITRA signature
    if (baSurvey.approved_by_user1) {
      const doc = baSurvey.documents?.find(d => d.keterangan === 'Tanda Tangan MITRA');
      if (doc) {
        try {
          const fileUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${doc.file_path.replace('uploads/', '')}`;
          console.log('🔍 loadExistingSignatures: fetching MITRA signature from backend:', fileUrl);
          const base64 = await fetchImageAsBase64(fileUrl);
          setUser1Signature(base64);
        } catch (err) {
          console.error('Failed to load MITRA signature from backend, falling back to localStorage:', err);
          const sig1 = localStorage.getItem(`ba_survey_sig_user1_${baSurveyId}`);
          if (sig1) setUser1Signature(sig1);
        }
      } else {
        const sig1 = localStorage.getItem(`ba_survey_sig_user1_${baSurveyId}`);
        if (sig1) setUser1Signature(sig1);
      }
    } else {
      setUser1Signature('');
      // Jangan hapus cache lokal secara paksa agar tidak hilang saat transisi state
      // localStorage.removeItem(`ba_survey_sig_user1_${baSurveyId}`);
    }

    // TELKOM WASPANG signature
    if (baSurvey.approved_by_user2) {
      const doc = baSurvey.documents?.find(d => d.keterangan === 'Tanda Tangan TELKOM WASPANG');
      if (doc) {
        try {
          const fileUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/files/${doc.file_path.replace('uploads/', '')}`;
          console.log('🔍 loadExistingSignatures: fetching WASPANG signature from backend:', fileUrl);
          const base64 = await fetchImageAsBase64(fileUrl);
          setUser2Signature(base64);
        } catch (err) {
          console.error('Failed to load WASPANG signature from backend, falling back to localStorage:', err);
          const sig2 = localStorage.getItem(`ba_survey_sig_user2_${baSurveyId}`);
          if (sig2) setUser2Signature(sig2);
        }
      } else {
        const sig2 = localStorage.getItem(`ba_survey_sig_user2_${baSurveyId}`);
        if (sig2) setUser2Signature(sig2);
      }
    } else {
      setUser2Signature('');
      // Jangan hapus cache lokal secara paksa agar tidak hilang saat transisi state
      // localStorage.removeItem(`ba_survey_sig_user2_${baSurveyId}`);
    }
  };

  const generatePDFPreview = async () => {
    setIsGeneratingPDF(true);
    try {
      // Gunakan data langsung dari baSurvey (readonly)
      const updatedBaSurvey = {
        ...baSurvey,
        approved_by_user1_name: baSurvey.approved_by_user1_name || '',
        approved_by_user1_jabatan: baSurvey.approved_by_user1_jabatan || '',
        approved_by_user2_name: baSurvey.approved_by_user2_name || '',
        approved_by_user2_jabatan: baSurvey.approved_by_user2_jabatan || '',
      };

      // Pass signatures to PDF generator
      const blob = await generateBASurveyPDFBlob(updatedBaSurvey, user1Signature, user2Signature);
      
      // Revoke old URL if exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log('✅ PDF generated with signatures');
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSignatureBoxClick = (userType: UserType) => {
    // Administrator tidak diizinkan mengakses signature pad
    if (user?.role === 'admin') {
      setWarning('Administrator tidak dapat menandatangani dokumen. Hanya PM MITRA atau PM TELKOM WASPANG yang berwenang.');
      return;
    }

    if (userType === 'user1') {
      // MITRA tanda tangan — state harus 'waspang_signed'
      if (user?.role !== 'pm_mitra') {
        setWarning('Hanya pengguna dengan peran PM MITRA yang dapat menandatangani dokumen ini.');
        return;
      }
      if (baSurvey.approved_by_user1_id && user?.id) {
        const selectedId = baSurvey.approved_by_user1_id.replace('users:', '');
        const currentId = user.id.replace('users:', '');
        if (selectedId !== currentId) {
          setWarning(`Hanya PM MITRA yang dipilih (${namaUser1}) yang dapat menandatangani dokumen ini.`);
          return;
        }
      }
      if (baSurvey.approved_by_user1) return;
      // ✅ State gate: MITRA hanya bisa tanda tangan setelah WASPANG
      if (baSurvey.state !== 'waspang_signed') {
        setWarning(
          baSurvey.state === 'draft' || baSurvey.state === 'submitted'
            ? 'Tunggu TELKOM WASPANG menandatangani dokumen terlebih dahulu.'
            : 'Dokumen belum berada di state yang tepat untuk tanda tangan MITRA.'
        );
        return;
      }
      if (!namaUser1.trim() || !jabatanUser1.trim()) {
        setWarning('PM MITRA belum dipilih untuk dokumen ini. Silakan edit dokumen untuk memilih PM MITRA terlebih dahulu.');
        return;
      }
    } else {
      // WASPANG tanda tangan — state harus 'submitted'
      if (user?.role !== 'pm_waspang') {
        setWarning('Hanya pengguna dengan peran PM TELKOM WASPANG yang dapat menandatangani dokumen ini.');
        return;
      }
      if (baSurvey.approved_by_user2_id && user?.id) {
        const selectedId = baSurvey.approved_by_user2_id.replace('users:', '');
        const currentId = user.id.replace('users:', '');
        if (selectedId !== currentId) {
          setWarning(`Hanya PM TELKOM WASPANG yang dipilih (${namaUser2}) yang dapat menandatangani dokumen ini.`);
          return;
        }
      }
      if (baSurvey.approved_by_user2) return;
      // ✅ State gate: WASPANG hanya bisa tanda tangan setelah submitted
      if (baSurvey.state !== 'submitted') {
        setWarning(
          baSurvey.state === 'draft'
            ? 'BA Survey harus di-submit terlebih dahulu sebelum dapat ditandatangani.'
            : 'Dokumen belum berada di state yang tepat untuk tanda tangan WASPANG.'
        );
        return;
      }
      if (!namaUser2.trim() || !jabatanUser2.trim()) {
        setWarning('PM TELKOM WASPANG belum dipilih untuk dokumen ini. Silakan edit dokumen untuk memilih PM TELKOM WASPANG terlebih dahulu.');
        return;
      }
    }
    
    setCurrentUserType(userType);
    setShowSignaturePad(true);
  };

  const handleSaveSignature = async (signatureData: string) => {
    setIsSubmitting(true);
    try {
      const baSurveyId = baSurveyService.extractId(baSurvey.id);
      
      // Ambil nama dan jabatan langsung dari baSurvey (readonly dari BE)
      const nama = currentUserType === 'user1' ? namaUser1.trim() : namaUser2.trim();
      const jabatan = currentUserType === 'user1' ? jabatanUser1.trim() : jabatanUser2.trim();

      // ✅ signatureType sesuai konvensi backend
      const signatureType = currentUserType === 'user1' ? 'signature_mitra' : 'signature_waspang';

      // ✅ action yang sesuai dengan state machine
      const stateAction = currentUserType === 'user1' ? 'mitra_sign' : 'waspang_sign';
      
      console.log('🔄 Starting approval flow:', { baSurveyId, signatureType, stateAction, nama, jabatan });
      
      // Step 1: Convert base64 signature to Blob
      const base64Data = signatureData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const signatureBlob = new Blob([byteArray], { type: 'image/png' });
      
      console.log('✅ Signature converted to Blob:', signatureBlob.size, 'bytes');
      
      // Step 2: Upload signature ke backend (endpoint validated)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      console.log('📤 Uploading signature...');
      
      const uploadResult = await baSurveyService.uploadSignature(
        baSurveyId,
        signatureBlob,
        signatureType,
        token
      );
      
      console.log('✅ Signature uploaded successfully:', uploadResult);
      
      // Step 3: Save signature to localStorage (untuk display di PDF)
      const storageKey = `ba_survey_sig_${currentUserType}_${baSurveyId}`;
      localStorage.setItem(storageKey, signatureData);
      
      // Update local state (ini akan trigger PDF regeneration)
      if (currentUserType === 'user1') {
        setUser1Signature(signatureData);
      } else {
        setUser2Signature(signatureData);
      }
      
      console.log('✅ Signature saved to localStorage');
      
      // Step 4: Update approval metadata (nama, jabatan)
      console.log('📤 Updating approval metadata...');
      await onApprove(currentUserType, nama, jabatan);

      // Step 5: ✅ Trigger state transition sesuai state machine
      console.log('📤 Triggering state transition:', stateAction);
      try {
        await baSurveyService.transitionState(baSurveyId, stateAction, undefined, token);
        console.log('✅ State transitioned to:', stateAction === 'waspang_sign' ? 'waspang_signed' : 'mitra_signed');
        toast.success(
          stateAction === 'waspang_sign'
            ? 'WASPANG berhasil menandatangani. State: waspang_signed'
            : 'MITRA berhasil menandatangani. State: mitra_signed'
        );
      } catch (stateErr: any) {
        // Signature sudah terupload, tapi state transition gagal — tampilkan warning tapi jangan block
        console.error('⚠️ State transition failed (signature still saved):', stateErr);
        toast.warning('Tanda tangan disimpan, namun gagal memperbarui state: ' + stateErr.message);
      }
      
      console.log('✅ Approval flow completed successfully');
      
      // Close signature pad
      setShowSignaturePad(false);
      
      // ✅ Regenerate PDF with new signature
      setTimeout(() => {
        generatePDFPreview();
      }, 500);

      // Refresh data
      if (onStateChange) onStateChange();
    } catch (error) {
      console.error('❌ Error in approval flow:', error);
      setWarning(`Gagal menyimpan tanda tangan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `BA_Survey_${baSurvey.lokasi}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col m-4">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Berita Acara Survey</h3>
                <p className="text-sm text-gray-500">{baSurvey.lokasi}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex">
            {/* PDF Preview */}
            <div className="flex-1 bg-gray-100 relative">
              {isGeneratingPDF ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Memuat dokumen...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="BA Survey PDF Preview"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Gagal memuat dokumen</p>
                </div>
              )}
            </div>

            {/* Sidebar - Signature Area */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              {/* Sidebar Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <h4 className="font-semibold text-gray-900">Persetujuan</h4>
                <p className="text-xs text-gray-500 mt-1">Alur persetujuan dokumen BA Survey</p>
              </div>

              {/* Timeline Stepper — 5 state sesuai state machine */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between relative">
                  {/* Connection Line Background */}
                  <div className="absolute left-2 right-2 top-3 h-[2px] bg-gray-200 -z-0" />
                  {/* Active Connection Line */}
                  <div 
                    className="absolute left-2 top-3 h-[2px] bg-blue-600 transition-all duration-300 -z-0"
                    style={{
                      width: 
                        baSurvey.state === 'approved'       ? '100%' :
                        baSurvey.state === 'mitra_signed'   ? '75%'  :
                        baSurvey.state === 'waspang_signed' ? '50%'  :
                        baSurvey.state === 'submitted'      ? '25%'  : '0%'
                    }}
                  />
                  
                  {/* Steps — mencerminkan semua 5 state */}
                  {[
                    { label: 'Draft',    activeStates: ['draft', 'submitted', 'waspang_signed', 'mitra_signed', 'approved', 'rejected'] },
                    { label: 'Submit',   activeStates: ['submitted', 'waspang_signed', 'mitra_signed', 'approved'] },
                    { label: 'Waspang', activeStates: ['waspang_signed', 'mitra_signed', 'approved'] },
                    { label: 'Mitra',   activeStates: ['mitra_signed', 'approved'] },
                    { label: 'Final',   activeStates: ['approved'] },
                  ].map((step, idx) => {
                    const stateOrder: Record<string, number> = {
                      draft: 0, submitted: 1, waspang_signed: 2, mitra_signed: 3, approved: 4
                    };
                    const currentState = baSurvey.state || 'draft';
                    const currentOrder = stateOrder[currentState] ?? 0;
                    const isCompleted = idx < currentOrder;
                    const isActive    = idx === currentOrder;
                    const isRejected  = baSurvey.state === 'rejected' && idx === 1;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center z-10 relative">
                        <div 
                          className={`rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                            isRejected
                              ? 'bg-red-600 text-white shadow-md'
                              : isCompleted
                              ? 'bg-blue-600 text-white shadow-md'
                              : isActive
                              ? 'bg-blue-50 border-2 border-blue-600 text-blue-600 font-extrabold'
                              : 'bg-white border-2 border-gray-200 text-gray-400'
                          }`}
                          style={{ width: '24px', height: '24px' }}
                        >
                          {isRejected ? '✗' : idx + 1}
                        </div>
                        <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Signature / Actions Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Rejection Banner */}
                {baSurvey.state === 'rejected' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top duration-300 space-y-1">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Dokumen Ditolak</p>
                    <p className="text-xs font-semibold text-red-800 leading-relaxed bg-red-100/30 p-2 rounded border border-red-100/50">
                      "{baSurvey.rejection_reason || 'Tidak ada alasan penolakan yang dicantumkan'}"
                    </p>
                  </div>
                )}

                {/* ✅ Panduan Langkah Selanjutnya — dinamis berdasarkan state */}
                {(() => {
                  const stateGuide: Record<string, { color: string; bg: string; border: string; text: string }> = {
                    draft:          { color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', text: '' },
                    submitted:      { color: 'text-blue-800',  bg: 'bg-blue-50',  border: 'border-blue-200',  text: '✍️ Menunggu PM WASPANG menandatangani. Klik area tanda tangan WASPANG di bawah.' },
                    waspang_signed: { color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200', text: '✍️ WASPANG sudah tanda tangan. Menunggu PM MITRA menandatangani di bawah.' },
                    mitra_signed:   { color: 'text-cyan-800',  bg: 'bg-cyan-50',  border: 'border-cyan-200',  text: '⏳ Semua tanda tangan selesai. Klik "Final Approve" di bawah untuk menyelesaikan.' },
                    approved:       { color: 'text-green-800', bg: 'bg-green-50', border: 'border-green-200', text: '✅ Dokumen telah disetujui sepenuhnya.' },
                    rejected:       { color: 'text-red-800',   bg: 'bg-red-50',   border: 'border-red-200',   text: '❌ Dokumen ditolak. Kembali ke tabel dan klik "Submit" untuk mengirim ulang setelah direvisi.' },
                  };
                  const guide = stateGuide[baSurvey.state || 'draft'] ?? stateGuide['draft'];
                  if (!guide.text) return null;
                  return (
                    <div className={`p-2.5 rounded-lg border text-xs font-medium leading-relaxed ${guide.bg} ${guide.border} ${guide.color}`}>
                      {guide.text}
                    </div>
                  );
                })()}

                {/* MITRA Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">MITRA</label>
                    {baSurvey.approved_by_user1 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Disetujui
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleSignatureBoxClick('user1')}
                    disabled={baSurvey.approved_by_user1 || !isMitraAuthorized}
                    className={`w-full h-32 rounded-lg border-2 transition-all ${
                      baSurvey.approved_by_user1
                        ? 'border-green-200 bg-green-50 cursor-not-allowed'
                        : isMitraAuthorized
                          ? 'border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer bg-blue-50/30'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {user1Signature ? (
                      <img 
                        src={user1Signature} 
                        alt="MITRA Signature" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        {baSurvey.approved_by_user1 ? (
                          <>
                            <CheckCircle className="w-6 h-6 mb-1 text-green-500" />
                            <span className="text-xs font-semibold text-green-600">Sudah Ditandatangani</span>
                          </>
                        ) : isMitraAuthorized ? (
                          <>
                            <PenTool className="w-6 h-6 mb-1 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-600">Klik untuk Tanda Tangan</span>
                            <span className="text-[10px] text-blue-400 mt-0.5">Anda: {user?.username}</span>
                          </>
                        ) : (
                          <>
                            <PenTool className="w-6 h-6 mb-1 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-400">Hanya untuk PM MITRA</span>
                            {user?.role !== 'pm_mitra' && (
                              <span className="text-[10px] text-orange-400 mt-0.5 font-medium">Anda adalah: {user?.role}</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </button>
                  {/* Info Readonly dari Backend */}
                  <div className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-semibold text-gray-700">Nama:</span>
                      <span className={namaUser1 ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}>
                        {namaUser1 || '(Belum dipilih)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700">Jabatan:</span>
                      <span className={jabatanUser1 ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}>
                        {jabatanUser1 || '(Belum dipilih)'}
                      </span>
                    </div>
                    {!namaUser1 && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium">
                        ⚠ Edit BA Survey untuk memilih PM MITRA
                      </p>
                    )}
                  </div>
                </div>

                {/* TELKOM WASPANG Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">TELKOM WASPANG</label>
                    {baSurvey.approved_by_user2 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Disetujui
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleSignatureBoxClick('user2')}
                    disabled={baSurvey.approved_by_user2 || !isWaspangAuthorized}
                    className={`w-full h-32 rounded-lg border-2 transition-all ${
                      baSurvey.approved_by_user2
                        ? 'border-green-200 bg-green-50 cursor-not-allowed'
                        : isWaspangAuthorized
                          ? 'border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50 cursor-pointer bg-teal-50/30'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {user2Signature ? (
                      <img 
                        src={user2Signature} 
                        alt="TELKOM WASPANG Signature" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        {baSurvey.approved_by_user2 ? (
                          <>
                            <CheckCircle className="w-6 h-6 mb-1 text-green-500" />
                            <span className="text-xs font-semibold text-green-600">Sudah Ditandatangani</span>
                          </>
                        ) : isWaspangAuthorized ? (
                          <>
                            <PenTool className="w-6 h-6 mb-1 text-teal-500" />
                            <span className="text-xs font-semibold text-teal-600">Klik untuk Tanda Tangan</span>
                            <span className="text-[10px] text-teal-400 mt-0.5">Anda: {user?.username}</span>
                          </>
                        ) : (
                          <>
                            <PenTool className="w-6 h-6 mb-1 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-400">Hanya untuk PM WASPANG</span>
                            {user?.role !== 'pm_waspang' && (
                              <span className="text-[10px] text-orange-400 mt-0.5 font-medium">Role Anda: {user?.role}</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </button>
                  {/* Info Readonly dari Backend */}
                  <div className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-semibold text-gray-700">Nama:</span>
                      <span className={namaUser2 ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}>
                        {namaUser2 || '(Belum dipilih)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700">Jabatan:</span>
                      <span className={jabatanUser2 ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}>
                        {jabatanUser2 || '(Belum dipilih)'}
                      </span>
                    </div>
                    {!namaUser2 && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium">
                        ⚠ Edit BA Survey untuk memilih PM WASPANG
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Info */}
                {baSurvey.approved_by_user1 && baSurvey.approved_by_user2 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Dokumen Lengkap</p>
                        <p className="text-xs text-green-700 mt-1">
                          Semua pihak telah menyetujui dokumen ini
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="px-6 py-4 border-t border-gray-200 space-y-3 bg-white shrink-0">
                {/* ✅ Tombol Submit BA Survey (draft → submitted) */}
                {(!baSurvey.state || baSurvey.state === 'draft') && (
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                        await baSurveyService.transitionState(baSurveyIdStr, 'submit', undefined, token);
                        toast.success('BA Survey berhasil di-submit!');
                        if (onStateChange) onStateChange();
                      } catch (err: any) {
                        setWarning(err.message || 'Gagal men-submit BA Survey');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Submit BA Survey
                  </button>
                )}

                {/* ✅ Tombol Final Approve (mitra_signed → approved) */}
                {baSurvey.state === 'mitra_signed' &&
                 (user?.role === 'pm_waspang' || user?.role === 'admin') && (
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                        await baSurveyService.transitionState(baSurveyIdStr, 'approve', undefined, token);
                        toast.success('BA Survey berhasil di-approve!');
                        if (onStateChange) onStateChange();
                      } catch (err: any) {
                        setWarning(err.message || 'Gagal meng-approve BA Survey');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Final Approve
                  </button>
                )}

                {/* Tolak Dokumen button when in a signed/submitted state */}
                {(baSurvey.state === 'submitted' || baSurvey.state === 'waspang_signed' || baSurvey.state === 'mitra_signed') &&
                 (user?.role === 'pm_mitra' || user?.role === 'pm_waspang' || user?.role === 'admin') && (
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition font-bold text-xs"
                  >
                    Tolak Dokumen
                  </button>
                )}

                <button
                  onClick={handleDownloadPDF}
                  disabled={!pdfUrl}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen
                </button>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        userType={currentUserType}
        onSave={handleSaveSignature}
        isSubmitting={isSubmitting}
      />

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleConfirmReject}
        isSubmitting={isSubmitting}
      />

      <WarningModal
        isOpen={warning !== null}
        onClose={() => setWarning(null)}
        message={warning || ''}
      />
    </>
  );
}
