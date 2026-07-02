import { useState, useRef, useEffect } from 'react';
import { X, FileText, CheckCircle, PenTool, Download, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { BADrmResponse, baDrmService } from '@/services/baDrmService';
import { generateBADrmPDFBlob } from '@/utils/baDrmPdfGenerator';
import { useAuth } from '@/hooks/useAuth';

interface BADrmApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  baDrm: BADrmResponse;
  onApprove: (userType: 'user1' | 'user2', nama: string, jabatan: string) => Promise<void>;
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

// ── Signature Pad Modal Component ────────────────────────────────────────────
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

// ── Main Approval Modal ──────────────────────────────────────────────────────
export function BADrmApprovalModal({ 
  isOpen, 
  onClose, 
  baDrm,
  onApprove 
}: BADrmApprovalModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentUserType, setCurrentUserType] = useState<UserType>('user1');
  
  // Load existing signatures from localStorage
  const [user1Signature, setUser1Signature] = useState<string>('');
  const [user2Signature, setUser2Signature] = useState<string>('');

  // Name and Jabatan state in the sidebar
  const [namaUser1, setNamaUser1] = useState('');
  const [jabatanUser1, setJabatanUser1] = useState('');
  const [namaUser2, setNamaUser2] = useState('');
  const [jabatanUser2, setJabatanUser2] = useState('');

  const baDrmIdStr = baDrm ? baDrmService.extractId(baDrm.id) : '';

  // Load signatures once when modal opens or survey changes
  useEffect(() => {
    if (isOpen && baDrm) {
      loadExistingSignatures();
    }
  }, [isOpen, baDrmIdStr]);

  // Initialize input fields once when modal opens or survey ID changes
  useEffect(() => {
    if (isOpen && baDrm) {
      const n1 = baDrm.approved_by_user1_name || '';
      const j1 = baDrm.approved_by_user1_jabatan || '';
      const n2 = baDrm.approved_by_user2_name || '';
      const j2 = baDrm.approved_by_user2_jabatan || '';

      setNamaUser1(n1);
      setJabatanUser1(j1);
      setNamaUser2(n2);
      setJabatanUser2(j2);
    }
  }, [isOpen, baDrmIdStr]);

  // Generate PDF preview when modal is open, or signatures / inputs change
  useEffect(() => {
    if (isOpen && baDrm) {
      const finalN1 = namaUser1 || baDrm.approved_by_user1_name || '';
      const finalJ1 = jabatanUser1 || baDrm.approved_by_user1_jabatan || '';
      const finalN2 = namaUser2 || baDrm.approved_by_user2_name || '';
      const finalJ2 = jabatanUser2 || baDrm.approved_by_user2_jabatan || '';

      generatePDFPreview(finalN1, finalJ1, finalN2, finalJ2);
    }
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, baDrmIdStr, user1Signature, user2Signature, namaUser1, jabatanUser1, namaUser2, jabatanUser2]);

  const loadExistingSignatures = () => {
    const baDrmId = baDrmService.extractId(baDrm.id);
    
    const sig1 = localStorage.getItem(`ba_drm_sig_user1_${baDrmId}`);
    const sig2 = localStorage.getItem(`ba_drm_sig_user2_${baDrmId}`);
    
    if (sig1) setUser1Signature(sig1);
    if (sig2) setUser2Signature(sig2);
  };

  const generatePDFPreview = async (
    customNama1?: string,
    customJab1?: string,
    customNama2?: string,
    customJab2?: string
  ) => {
    setIsGeneratingPDF(true);
    try {
      const finalNama1 = customNama1 !== undefined ? customNama1 : namaUser1;
      const finalJab1 = customJab1 !== undefined ? customJab1 : jabatanUser1;
      const finalNama2 = customNama2 !== undefined ? customNama2 : namaUser2;
      const finalJab2 = customJab2 !== undefined ? customJab2 : jabatanUser2;

      const updatedBaDrm = {
        ...baDrm,
        approved_by_user1_name: finalNama1,
        approved_by_user1_jabatan: finalJab1,
        approved_by_user2_name: finalNama2,
        approved_by_user2_jabatan: finalJab2,
      };

      const blob = await generateBADrmPDFBlob(updatedBaDrm, user1Signature, user2Signature);
      
      // Revoke old URL if exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log('✅ BA DRM PDF generated with signatures');
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSignatureBoxClick = (userType: UserType) => {
    if (userType === 'user1') {
      if (user?.role !== 'pm_mitra' && user?.role !== 'admin') {
        setWarning('Hanya pengguna dengan peran PM MITRA yang dapat menandatangani dokumen ini.');
        return;
      }
      if (baDrm.approved_by_user1) return;
      if (!namaUser1.trim() || !jabatanUser1.trim()) {
        setWarning('Silakan isi Nama Lengkap dan Jabatan MITRA di bawah kartu terlebih dahulu');
        return;
      }
    } else {
      if (user?.role !== 'pm_waspang' && user?.role !== 'admin') {
        setWarning('Hanya pengguna dengan peran PM TELKOM WASPANG yang dapat menandatangani dokumen ini.');
        return;
      }
      if (baDrm.approved_by_user2) return;
      if (!namaUser2.trim() || !jabatanUser2.trim()) {
        setWarning('Silakan isi Nama Lengkap dan Jabatan TELKOM WASPANG di bawah kartu terlebih dahulu');
        return;
      }
    }
    
    setCurrentUserType(userType);
    setShowSignaturePad(true);
  };

  const handleSaveSignature = async (signatureData: string) => {
    setIsSubmitting(true);
    try {
      const baDrmId = baDrmService.extractId(baDrm.id);
      
      const nama = currentUserType === 'user1' ? namaUser1.trim() : namaUser2.trim();
      const jabatan = currentUserType === 'user1' ? jabatanUser1.trim() : jabatanUser2.trim();

      console.log('🔄 Starting BA DRM approval flow:', { baDrmId, userType: currentUserType, nama, jabatan });
      
      // Save signature to localStorage
      const storageKey = `ba_drm_sig_${currentUserType}_${baDrmId}`;
      localStorage.setItem(storageKey, signatureData);
      
      // Update local state (triggers PDF regeneration)
      if (currentUserType === 'user1') {
        setUser1Signature(signatureData);
      } else {
        setUser2Signature(signatureData);
      }
      
      console.log('✅ Signature saved to localStorage');
      
      // Call backend API to update approval status
      console.log('📤 Updating approval status...');
      await onApprove(currentUserType, nama, jabatan);
      
      console.log('✅ BA DRM Approval flow completed successfully');
      
      // Close signature pad
      setShowSignaturePad(false);
      
      // Regenerate PDF with new signature
      setTimeout(() => {
        generatePDFPreview();
      }, 500);
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
      link.download = `BA_DRM_${baDrm.lokasi}_${new Date().toISOString().split('T')[0]}.pdf`;
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
                <h3 className="font-bold text-lg text-gray-900">Berita Acara DRM</h3>
                <p className="text-sm text-gray-500">{baDrm.lokasi}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area - Side by Side Layout */}
          <div className="flex-1 overflow-hidden flex">
            {/* PDF Preview (Left Side) */}
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
                  title="BA DRM PDF Preview"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Gagal memuat dokumen</p>
                </div>
              )}
            </div>

            {/* Sidebar - Signature Area (Right Side) */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              {/* Sidebar Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Persetujuan</h4>
                <p className="text-xs text-gray-500 mt-1">Klik area tanda tangan untuk menyetujui dokumen</p>
              </div>

              {/* Signature Boxes */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* MITRA Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">MITRA</label>
                    {baDrm.approved_by_user1 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Disetujui
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleSignatureBoxClick('user1')}
                    disabled={baDrm.approved_by_user1}
                    className={`w-full h-32 rounded-lg border-2 transition-all ${
                      baDrm.approved_by_user1
                        ? 'border-green-200 bg-green-50 cursor-not-allowed'
                        : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    {user1Signature ? (
                      <img 
                        src={user1Signature} 
                        alt="MITRA Signature" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <PenTool className="w-6 h-6 mb-2" />
                        <span className="text-xs font-medium">
                          {baDrm.approved_by_user1 ? 'Sudah Disetujui' : 'Klik untuk Tanda Tangan'}
                        </span>
                      </div>
                    )}
                  </button>
                  {baDrm.approved_by_user1 ? (
                    <div className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-0.5 animate-in fade-in duration-200">
                      <div><span className="font-semibold text-gray-700">Nama:</span> {baDrm.approved_by_user1_name || '-'}</div>
                      <div><span className="font-semibold text-gray-700">Jabatan:</span> {baDrm.approved_by_user1_jabatan || '-'}</div>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Nama Lengkap <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={namaUser1}
                          onChange={(e) => setNamaUser1(e.target.value)}
                          onBlur={() => generatePDFPreview()}
                          placeholder="Nama MITRA"
                          disabled={user?.role !== 'pm_mitra' && user?.role !== 'admin'}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Jabatan <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={jabatanUser1}
                          onChange={(e) => setJabatanUser1(e.target.value)}
                          onBlur={() => generatePDFPreview()}
                          placeholder="Jabatan MITRA"
                          disabled={user?.role !== 'pm_mitra' && user?.role !== 'admin'}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* TELKOM WASPANG Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">TELKOM WASPANG</label>
                    {baDrm.approved_by_user2 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Disetujui
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleSignatureBoxClick('user2')}
                    disabled={baDrm.approved_by_user2}
                    className={`w-full h-32 rounded-lg border-2 transition-all ${
                      baDrm.approved_by_user2
                        ? 'border-green-200 bg-green-50 cursor-not-allowed'
                        : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    {user2Signature ? (
                      <img 
                        src={user2Signature} 
                        alt="TELKOM WASPANG Signature" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <PenTool className="w-6 h-6 mb-2" />
                        <span className="text-xs font-medium">
                          {baDrm.approved_by_user2 ? 'Sudah Disetujui' : 'Klik untuk Tanda Tangan'}
                        </span>
                      </div>
                    )}
                  </button>
                  {baDrm.approved_by_user2 ? (
                    <div className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-0.5 animate-in fade-in duration-200">
                      <div><span className="font-semibold text-gray-700">Nama:</span> {baDrm.approved_by_user2_name || '-'}</div>
                      <div><span className="font-semibold text-gray-700">Jabatan:</span> {baDrm.approved_by_user2_jabatan || '-'}</div>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Nama Lengkap <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={namaUser2}
                          onChange={(e) => setNamaUser2(e.target.value)}
                          onBlur={() => generatePDFPreview()}
                          placeholder="Nama TELKOM WASPANG"
                          disabled={user?.role !== 'pm_waspang' && user?.role !== 'admin'}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Jabatan <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={jabatanUser2}
                          onChange={(e) => setJabatanUser2(e.target.value)}
                          onBlur={() => generatePDFPreview()}
                          placeholder="Jabatan TELKOM WASPANG"
                          disabled={user?.role !== 'pm_waspang' && user?.role !== 'admin'}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Info */}
                {baDrm.approved_by_user1 && baDrm.approved_by_user2 && (
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
              <div className="px-6 py-4 border-t border-gray-200 space-y-3">
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

      <WarningModal
        isOpen={warning !== null}
        onClose={() => setWarning(null)}
        message={warning || ''}
      />
    </>
  );
}
