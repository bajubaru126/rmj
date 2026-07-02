import { useState, useRef, useEffect } from 'react';
import { X, PenTool, Check, Trash2, FileText } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { BASurveyResponse, baSurveyService } from '@/services/baSurveyService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface BASurveySignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baSurvey: BASurveyResponse | null;
  onApprovalSuccess: () => void;
}

type SignerRole = 'MITRA' | 'TELKOM_WASPANG';

export function BASurveySignatureModal({
  open,
  onOpenChange,
  baSurvey,
  onApprovalSuccess,
}: BASurveySignatureModalProps) {
  const { token, user } = useAuth();
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SignerRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jabatan, setJabatan] = useState('');
  
  const signatureCanvasRef = useRef<SignatureCanvas>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setShowSignaturePad(false);
      setSelectedRole(null);
      setJabatan('');
      if (signatureCanvasRef.current) {
        signatureCanvasRef.current.clear();
      }
    }
  }, [open]);

  if (!open || !baSurvey) return null;

  // Helper to extract ID
  const extractId = (thing: any): string => {
    if (typeof thing === 'string') return thing;
    if (typeof thing.id === 'string') return thing.id;
    return thing.id?.String || thing.id || '';
  };

  const baSurveyId = extractId(baSurvey.id);

  const handleClearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  const handleSignatureAreaClick = (role: SignerRole) => {
    // Administrator tidak dapat menandatangani
    if (user?.role === 'admin') {
      toast.error('Administrator tidak dapat menandatangani dokumen. Hanya PM MITRA atau PM TELKOM WASPANG yang berwenang.');
      return;
    }
    setSelectedRole(role);
    setShowSignaturePad(true);
    setJabatan('');
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  const handleSubmitSignature = async () => {
    if (!selectedRole) {
      toast.error('Please select a signature area');
      return;
    }

    if (signatureCanvasRef.current?.isEmpty()) {
      toast.error('Please provide a signature');
      return;
    }

    if (!jabatan.trim()) {
      toast.error('Please enter your Jabatan');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Determine which approval field to update based on role
      const approvalData = selectedRole === 'MITRA' 
        ? { approved_by_user1: true, approved_by_user1_jabatan: jabatan }
        : { approved_by_user2: true, approved_by_user2_jabatan: jabatan };

      // Call backend API to update approval
      await baSurveyService.updateApproval(baSurveyId, approvalData, token);

      toast.success(`Approved as ${selectedRole === 'MITRA' ? 'MITRA' : 'TELKOM WASPANG'}`);
      onApprovalSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Failed to submit approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              BA Survey Approval & Signature
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Click on signature area to approve and sign
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Preview with Signature Areas */}
          <div className="flex-1 bg-gray-100 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
              {/* Document Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">BERITA ACARA</h1>
                <h2 className="text-xl font-bold text-gray-900">SURVEY</h2>
              </div>

              {/* Project Details */}
              <div className="space-y-3 mb-8 text-sm">
                <div className="flex">
                  <span className="w-48 text-gray-600">Nama Proyek</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.nama_proyek}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-gray-600">Nomor Kontrak</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.nomor_kontrak}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-gray-600">No. BA DRM Ke-*</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.no_ba_drm}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-gray-600">No. Amandemen Ke-*</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.no_amandemen}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-gray-600">Pelaksana / Mitra Kerja</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.pelaksana}</span>
                </div>
                <div className="flex">
                  <span className="w-48 text-gray-600">Lokasi Proyek</span>
                  <span className="mr-4">:</span>
                  <span className="font-medium text-gray-900">{baSurvey.lokasi}</span>
                </div>
              </div>

              {/* Content */}
              <div className="mb-8 text-sm text-gray-700 leading-relaxed space-y-3">
                {baSurvey.content ? (
                  baSurvey.content.split('\n').map((line, idx) => (
                    <p key={idx}>{idx + 1}. {line}</p>
                  ))
                ) : (
                  <>
                    <p>1. Berdasarkan hasil pelaksanaan survey lapangan yang dilaksanakan...</p>
                    <p>2. Survey Lapangan telah dilakukan, hasil survey akan dievaluasi...</p>
                    <p>3. Hal-hal yang masih perlu disempurnakan akan diselesaikan dengan segera...</p>
                  </>
                )}
              </div>

              {/* Signature Section */}
              <div className="mt-12 pt-8 border-t-2 border-gray-200">
                <div className="grid grid-cols-2 gap-12">
                  {/* MITRA Signature Area */}
                  <div className="text-center">
                    <p className="font-bold text-gray-900 mb-2">MITRA</p>
                    <button
                      onClick={() => handleSignatureAreaClick('MITRA')}
                      disabled={baSurvey.approved_by_user1 || (user?.role !== 'pm_mitra')}
                      className={`w-full h-32 border-2 border-dashed rounded-lg transition-all ${
                        baSurvey.approved_by_user1
                          ? 'bg-green-50 border-green-300 cursor-not-allowed'
                          : user?.role === 'pm_mitra'
                            ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                            : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {baSurvey.approved_by_user1 ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Check className="w-8 h-8 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Approved</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PenTool className={`w-6 h-6 ${user?.role === 'pm_mitra' ? 'text-blue-400' : 'text-gray-400'}`} />
                          <span className={`text-xs ${user?.role === 'pm_mitra' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {user?.role === 'pm_mitra' ? 'Click to sign' : 'Not authorized'}
                          </span>
                        </div>
                      )}
                    </button>
                    <div className="mt-4 pt-2 border-t border-gray-300">
                      <p className="text-sm font-medium text-gray-900">{baSurvey.approved_by_user1_name || 'PM MITRA'}</p>
                      <p className="text-xs text-gray-600">{baSurvey.approved_by_user1_jabatan || 'JABATAN'}</p>
                    </div>
                  </div>

                  {/* TELKOM WASPANG Signature Area */}
                  <div className="text-center">
                    <p className="font-bold text-gray-900 mb-2">TELKOM WASPANG</p>
                    <button
                      onClick={() => handleSignatureAreaClick('TELKOM_WASPANG')}
                      disabled={baSurvey.approved_by_user2 || (user?.role !== 'pm_waspang')}
                      className={`w-full h-32 border-2 border-dashed rounded-lg transition-all ${
                        baSurvey.approved_by_user2
                          ? 'bg-green-50 border-green-300 cursor-not-allowed'
                          : user?.role === 'pm_waspang'
                            ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                            : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {baSurvey.approved_by_user2 ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Check className="w-8 h-8 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Approved</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PenTool className={`w-6 h-6 ${user?.role === 'pm_waspang' ? 'text-blue-400' : 'text-gray-400'}`} />
                          <span className={`text-xs ${user?.role === 'pm_waspang' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {user?.role === 'pm_waspang' ? 'Click to sign' : 'Not authorized'}
                          </span>
                        </div>
                      )}
                    </button>
                    <div className="mt-4 pt-2 border-t border-gray-300">
                      <p className="text-sm font-medium text-gray-900">{baSurvey.approved_by_user2_name || 'PM WASPANG'}</p>
                      <p className="text-xs text-gray-600">{baSurvey.approved_by_user2_jabatan || 'JABATAN'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && selectedRole && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Sign as {selectedRole === 'MITRA' ? 'MITRA' : 'TELKOM WASPANG'}
                </h3>
                <p className="text-xs text-blue-100 mt-1">
                  Draw your signature below
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSignaturePad(false);
                  setSelectedRole(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Signature Canvas */}
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jabatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Masukkan jabatan Anda..."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                  required
                />
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                <SignatureCanvas
                  ref={signatureCanvasRef}
                  canvasProps={{
                    className: 'w-full h-48 cursor-default',
                    style: { touchAction: 'none', cursor: 'default' }
                  }}
                  backgroundColor="rgb(255, 255, 255)"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Draw your signature above using mouse or touch
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={handleClearSignature}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleSubmitSignature}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Submit & Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
