import { X, MapPin, Calendar, User, Building2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RuasData } from '@/types';

interface DetailRuasModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruasData: RuasData | null;
}

export function DetailRuasModal({ isOpen, onClose, ruasData }: DetailRuasModalProps) {
  if (!isOpen || !ruasData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Implementation': return 'bg-blue-500 text-white';
      case 'Survey': return 'bg-purple-500 text-white';
      case 'Testing': return 'bg-yellow-500 text-white';
      case 'Completed': return 'bg-green-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[75vw] max-w-5xl max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
          <div>
            <h2 className="text-lg font-semibold text-white">Detail Ruas</h2>
            <p className="text-sm text-blue-100 mt-1">{ruasData.siteName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(75vh-140px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="glass-card rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Informasi Dasar
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Tahun Project</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.tahunProject}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Program</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.program}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">PROJECT_SITELIST / UNXID</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.projectSitelist}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Site Name</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.siteName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Regional</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.regional}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Project</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.project}</p>
                  </div>
                </div>
              </div>

              {/* Mitra & Owner */}
              <div className="glass-card rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Mitra & Penanggung Jawab
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">MITRA</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.mitra}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Owner</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.owner}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Timeline & Status */}
              <div className="glass-card rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Timeline & Status
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">S.P Curr. Milestone</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(ruasData.spCurrMilestone)}`}>
                        {ruasData.spCurrMilestone}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">M-0S Installation</label>
                    <div className="mt-1 flex items-center gap-2">
                      {ruasData.m0sInstallation ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">No</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Plan RFS</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.planRFS}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Plan End Date</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.planEndDate}</p>
                  </div>
                  {ruasData.actualEndDate && (
                    <div>
                      <label className="text-xs text-gray-500">Actual End Date</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{ruasData.actualEndDate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Segmentasi Summary */}
              {ruasData.segmentasi && ruasData.segmentasi.length > 0 && (
                <div className="glass-card rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Segmentasi Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-blue-600">{ruasData.segmentasi.length}</p>
                        <p className="text-xs text-gray-600 mt-1">Segmentasi</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-green-600">
                          {ruasData.segmentasi.reduce((acc, seg) => acc + seg.cells.length, 0)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Cell</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-purple-600">
                          {ruasData.segmentasi.filter(seg => seg.status === 'OK').length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Completed</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-600 mb-2">Segmentasi List:</p>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {ruasData.segmentasi.map(seg => (
                          <span
                            key={seg.id}
                            className={`px-2 py-1 rounded text-xs ${
                              seg.status === 'OK' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {seg.segName} ({seg.cells.length})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
