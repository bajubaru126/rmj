import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, FileText, Download, Calendar, Package } from 'lucide-react';
import { Installation } from '@/services/installationService';
import { materialService, MaterialDetail } from '@/services/materialService';
import { authService } from '@/services/authService';

interface ViewInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  installation: Installation;
  projectName?: string;
  linkName?: string;
  region?: string;
}

export function ViewInstallationModal({ 
  isOpen, 
  onClose, 
  installation,
  projectName,
  linkName,
  region
}: ViewInstallationModalProps) {
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  // Fetch materials to get names
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!isOpen || !installation.project_id || !installation.link_id) return;
      
      setIsLoadingMaterials(true);
      try {
        const token = authService.getToken();
        const data = await materialService.getMaterialsByProjectAndLink(
          installation.project_id,
          installation.link_id,
          token
        );
        setMaterials(data);
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterials([]);
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [isOpen, installation.project_id, installation.link_id]);

  const getMaterialName = (materialId: string): string => {
    const material = materials.find(m => m.id === materialId);
    return material ? `${material.item_name || 'Material'} - ${material.material_step}` : materialId;
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('completed') || lowerStatus.includes('selesai')) {
      return 'bg-green-500 text-white';
    } else if (lowerStatus.includes('progress') || lowerStatus.includes('proses')) {
      return 'bg-orange-500 text-white';
    } else if (lowerStatus.includes('scheduled') || lowerStatus.includes('dijadwalkan')) {
      return 'bg-blue-500 text-white';
    } else if (lowerStatus.includes('hold') || lowerStatus.includes('tunda')) {
      return 'bg-red-500 text-white';
    }
    return 'bg-gray-500 text-white';
  };

  if (!isOpen) return null;

  const cleanDateString = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const cleaned = dateStr.replace(/^d'/, '').replace(/'$/, '');
    try {
      return new Date(cleaned).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return cleaned;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9000 }} onClick={onClose}>
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '800px',
          maxHeight: '90vh',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
            borderRadius: '16px 16px 0 0'
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Installation Details
            </h3>
            <p className="text-sm text-white/90 mt-1">
              View complete installation information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {/* Project & Link Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="text-xs font-semibold text-blue-700 uppercase mb-1 block">Project Name</label>
              <p className="text-sm text-gray-900 font-semibold">{projectName || 'Unknown Project'}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="text-xs font-semibold text-blue-700 uppercase mb-1 block">Link / Ruas</label>
              <p className="text-sm text-gray-900 font-semibold">{linkName || 'Unknown Link'}</p>
            </div>
          </div>

          {/* Installation Information */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Installation Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Installation Step</label>
                <p className="text-sm text-gray-900 mt-1">
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    {installation.installation_step}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Progress Status</label>
                <p className="text-sm text-gray-900 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(installation.progress)}`}>
                    {installation.progress}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Region</label>
                <p className="text-sm text-gray-900 mt-1">{region || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created Date
                </label>
                <p className="text-sm text-gray-900 mt-1">{cleanDateString(installation.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3">Materials ({installation.material_id.length})</h4>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              {isLoadingMaterials ? (
                <p className="text-sm text-gray-500 italic">Loading materials...</p>
              ) : installation.material_id.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {installation.material_id.map((materialId, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-white border border-gray-300 rounded-lg">
                      <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium truncate">
                        {getMaterialName(materialId)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No materials assigned</p>
              )}
            </div>
          </div>

          {/* Keterangan */}
          {installation.keterangan && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3">Keterangan / Notes</h4>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{installation.keterangan}</p>
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents ({installation.documents.length})
            </h4>
            {installation.documents.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {installation.documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {doc.file_size ? (doc.file_size / 1024).toFixed(2) + ' KB' : '-'}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 uppercase">{doc.file_type}</span>
                        {doc.status && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className={`text-xs font-medium ${
                              doc.status === 'approved' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {doc.status}
                            </span>
                          </>
                        )}
                      </div>
                      {doc.keterangan && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{doc.keterangan}</p>
                      )}
                    </div>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 italic">No documents uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
