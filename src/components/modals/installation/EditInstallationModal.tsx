import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Upload, FileText, Trash2 } from 'lucide-react';
import { installationService, INSTALLATION_STEPS, Installation, InstallationDocument } from '@/services/installationService';
import { authService } from '@/services/authService';
import { materialService, MaterialDetail } from '@/services/materialService';

interface EditInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallationUpdated: () => void;
  installation: Installation;
  projectName?: string;
  linkName?: string;
}

export function EditInstallationModal({ 
  isOpen, 
  onClose, 
  onInstallationUpdated, 
  installation,
  projectName,
  linkName
}: EditInstallationModalProps) {
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<InstallationDocument[]>([]);

  const [formData, setFormData] = useState({
    material_id: installation.material_id || [],
    progress: installation.progress || '',
    installation_step: installation.installation_step || '',
    keterangan: installation.keterangan || ''
  });

  // Initialize existing documents when modal opens
  useEffect(() => {
    if (isOpen) {
      setExistingDocuments(installation.documents || []);
    }
  }, [isOpen, installation.documents]);

  // Fetch materials when modal opens
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
        
        // Filter only "Material Order" step
        const filteredMaterials = data.filter(material => material.material_step === 'Material Order');
        console.log('📦 Filtered materials (Material Order only):', filteredMaterials);
        setMaterials(filteredMaterials);
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterials([]);
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [isOpen, installation.project_id, installation.link_id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setFilesToUpload([...filesToUpload, ...newFiles]);
    
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFilesToUpload(filesToUpload.filter((_, i) => i !== index));
  };

  const handleRemoveExistingDocument = (index: number) => {
    if (confirm(`Are you sure you want to remove "${existingDocuments[index].file_name}"?`)) {
      setExistingDocuments(existingDocuments.filter((_, i) => i !== index));
    }
  };

  const handleMaterialToggle = (materialId: string) => {
    if (formData.material_id.includes(materialId)) {
      setFormData({
        ...formData,
        material_id: formData.material_id.filter(id => id !== materialId)
      });
    } else {
      setFormData({
        ...formData,
        material_id: [...formData.material_id, materialId]
      });
    }
  };

  const getFileCategory = () => {
    return `installation_${formData.installation_step.toLowerCase().replace(/ /g, '_').replace(/dan/g, '')}`.replace(/__/g, '_');
  };

  const handleSubmit = async () => {
    if (formData.material_id.length === 0) {
      alert('Please select at least one material');
      return;
    }

    if (!formData.installation_step) {
      alert('Please select installation step');
      return;
    }

    if (!formData.progress.trim()) {
      alert('Please enter progress status');
      return;
    }

    setIsUpdating(true);
    try {
      const token = authService.getToken();
      
      // Upload new files if any
      const newDocuments: any[] = [];
      if (filesToUpload.length > 0) {
        const fileCategory = getFileCategory();
        
        for (const file of filesToUpload) {
          try {
            const uploadResult = await installationService.uploadFile(file, fileCategory, token);
            
            newDocuments.push({
              file_path: uploadResult.file_path,
              file_name: uploadResult.file_name,
              file_type: file.name.split('.').pop() || 'unknown',
              file_size: uploadResult.file_size,
              keterangan: '',
              status: 'approved'
            });
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            alert(`Failed to upload file: ${file.name}`);
            setIsUpdating(false);
            return;
          }
        }
      }

      // Combine existing documents (that weren't deleted) with new documents
      const allDocuments = [...existingDocuments, ...newDocuments];

      // Update installation
      const updateData: any = {
        material_id: formData.material_id,
        progress: formData.progress,
        installation_step: formData.installation_step,
        documents: allDocuments // Send all documents (existing + new)
      };

      if (formData.keterangan.trim()) {
        updateData.keterangan = formData.keterangan;
      }

      await installationService.updateInstallation(installation.id, updateData, token);
      
      alert('Installation updated successfully!');
      onInstallationUpdated();
      handleClose();
    } catch (error) {
      console.error('Error updating installation:', error);
      alert('Failed to update installation. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      material_id: installation.material_id || [],
      progress: installation.progress || '',
      installation_step: installation.installation_step || '',
      keterangan: installation.keterangan || ''
    });
    setFilesToUpload([]);
    setExistingDocuments(installation.documents || []);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9000 }} onClick={handleClose}>
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '700px',
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
              <Edit className="w-5 h-5" />
              Edit Installation
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Update installation data
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            disabled={isUpdating}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {/* Project (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project
            </label>
            <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
              {projectName || 'Unknown Project'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Project cannot be changed</p>
          </div>

          {/* Link (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Link / Ruas
            </label>
            <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
              {linkName || 'Unknown Link'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Link cannot be changed</p>
          </div>

          {/* Installation Step Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Installation Step *
            </label>
            <select
              value={formData.installation_step}
              onChange={(e) => setFormData({ ...formData, installation_step: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              disabled={isUpdating}
            >
              <option value="">-- Select Installation Step --</option>
              {INSTALLATION_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}
                </option>
              ))}
            </select>
          </div>

          {/* Progress Status Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Progress Status *
            </label>
            <select
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              disabled={isUpdating}
            >
              <option value="">-- Select Progress Status --</option>
              {/* <option value="Scheduled">Scheduled</option> */}
              <option value="In Progress">In Progress</option>
              {/* <option value="On Hold">On Hold</option> */}
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Materials Multi-Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Materials * (Select one or more)
            </label>
            <div className="border-2 border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {isLoadingMaterials ? (
                <p className="text-sm text-gray-500">Loading materials...</p>
              ) : materials.length === 0 ? (
                <p className="text-sm text-gray-500">No materials available</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <label key={material.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.material_id.includes(material.id)}
                        onChange={() => handleMaterialToggle(material.id)}
                        className="w-4 h-4 text-blue-600"
                        disabled={isUpdating}
                      />
                      <span className="text-sm text-gray-700">
                        {material.item_name || 'Material'} - {material.material_step} ({material.unit})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formData.material_id.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {formData.material_id.length} material(s) selected
              </p>
            )}
          </div>

          {/* Keterangan Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Keterangan (Optional)
            </label>
            <textarea
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              placeholder="Enter additional notes or description"
              disabled={isUpdating}
              rows={3}
            />
          </div>

          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Existing Documents ({existingDocuments.length})
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {existingDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{doc.file_name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {doc.file_size ? (doc.file_size / 1024).toFixed(2) + ' KB' : '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingDocument(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0"
                      disabled={isUpdating}
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Removed documents will be deleted when you update the installation
              </p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add New Documents (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Choose Files</span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUpdating}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  multiple
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, JPG, PNG, DOC, DOCX
            </p>
          </div>

          {/* Files to Upload List */}
          {filesToUpload.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Files to be uploaded:</p>
              <div className="space-y-2">
                {filesToUpload.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{(file.size / 1024).toFixed(2)} KB</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0"
                      disabled={isUpdating}
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
            }}
            disabled={isUpdating || formData.material_id.length === 0 || !formData.installation_step || !formData.progress.trim()}
          >
            {isUpdating ? 'Updating...' : 'Update Installation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
