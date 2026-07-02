import { useState } from 'react';
import { X, Save, Upload, FileText, Trash2 } from 'lucide-react';
import { MaterialDetail, materialService } from '@/services/materialService';
import { authService } from '@/services/authService';

interface EditMaterialModalProps {
  material: MaterialDetail;
  onClose: () => void;
  onSave: (data: Partial<MaterialDetail>) => Promise<void>;
}

export function EditMaterialModal({ material, onClose, onSave }: EditMaterialModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>(material.documents || []);
  
  // Helper function to clean date string (remove d' prefix and trailing ')
  const cleanDateString = (dateStr: string | null): string => {
    if (!dateStr) return '';
    // Remove d' prefix and trailing ' if present
    const cleaned = dateStr.replace(/^d'/, '').replace(/'$/, '');
    // Extract just the date part (YYYY-MM-DD)
    return cleaned.split('T')[0];
  };
  
  const [formData, setFormData] = useState({
    plan_start_date: cleanDateString(material.plan_start_date),
    plan_end_date: cleanDateString(material.plan_end_date),
    plan_quantity: material.plan_quantity || 0,
    unit: material.unit || '',
    plan_progress: material.plan_progress || '',
    keterangan: material.keterangan || '',
    actual_start_date: cleanDateString(material.actual_start_date),
    actual_end_date: cleanDateString(material.actual_end_date),
    actual_value: material.actual_value || 0,
    actual_progress: material.actual_progress || 0
  });

  // Convert material step to snake_case for file_category
  const getFileCategory = () => {
    return material.material_step.toLowerCase().replace(/ /g, '_');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Add selected files to the list
    const newFiles = Array.from(files);
    setFilesToUpload([...filesToUpload, ...newFiles]);
    
    // Reset input
    e.target.value = '';
  };

  const handleRemoveNewFile = (index: number) => {
    setFilesToUpload(filesToUpload.filter((_, i) => i !== index));
  };

  const handleRemoveExistingDocument = (index: number) => {
    setExistingDocuments(existingDocuments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const token = authService.getToken();
      
      // Prepare update data
      const updateData: any = {
        plan_start_date: formData.plan_start_date ? `${formData.plan_start_date}T00:00:00Z` : undefined,
        plan_end_date: formData.plan_end_date ? `${formData.plan_end_date}T00:00:00Z` : undefined,
        plan_quantity: formData.plan_quantity,
        unit: formData.unit,
        plan_progress: formData.plan_progress,
        material_step: material.material_step, // Include material_step in update
        keterangan: formData.keterangan || undefined,
        actual_start_date: formData.actual_start_date ? `${formData.actual_start_date}T00:00:00Z` : undefined,
        actual_end_date: formData.actual_end_date ? `${formData.actual_end_date}T00:00:00Z` : undefined,
        actual_value: formData.actual_value,
        actual_progress: formData.actual_progress
      };

      // Upload new files if any
      const uploadedDocuments: any[] = [];
      if (filesToUpload.length > 0) {
        const fileCategory = getFileCategory();
        
        for (const file of filesToUpload) {
          try {
            const uploadResult = await materialService.uploadFile(file, fileCategory, token);
            
            uploadedDocuments.push({
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
            setIsSaving(false);
            return;
          }
        }
      }

      // Combine existing documents (that weren't deleted) with newly uploaded documents
      const allDocuments = [...existingDocuments, ...uploadedDocuments];

      // Handle documents update
      if (uploadedDocuments.length > 0 || existingDocuments.length !== (material.documents || []).length) {
        // Documents have changed (added or removed)
        const hasOriginalDocuments = material.documents && material.documents.length > 0;
        
        if (hasOriginalDocuments) {
          // Use PATCH with documents array
          updateData.documents = allDocuments;
        } else {
          // Use POST to add documents
          for (const doc of uploadedDocuments) {
            await materialService.addDocument(material.id, doc, token);
          }
        }
      }

      await onSave(updateData);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9100] p-6" onClick={onClose}>
      <div
        className="bg-white shadow-2xl flex flex-col relative"
        style={{
          width: '700px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#15396C] to-[#0078D7] text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Edit Material</h3>
              <p className="text-sm opacity-90 mt-1">{material.material_step}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Plan Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Plan Data</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plan Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.plan_start_date}
                      onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plan End Date
                    </label>
                    <input
                      type="date"
                      value={formData.plan_end_date}
                      onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plan Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.plan_quantity}
                      onChange={(e) => setFormData({ ...formData, plan_quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Plan Progress
                  </label>
                  <input
                    type="text"
                    value={formData.plan_progress}
                    onChange={(e) => setFormData({ ...formData, plan_progress: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="e.g., On Schedule, Delayed, Pending"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Actual Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Actual Data</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.actual_start_date}
                      onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      value={formData.actual_end_date}
                      onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual Value
                    </label>
                    <input
                      type="number"
                      value={formData.actual_value}
                      onChange={(e) => setFormData({ ...formData, actual_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual Progress (%)
                    </label>
                    <input
                      type="number"
                      value={formData.actual_progress}
                      onChange={(e) => setFormData({ ...formData, actual_progress: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSaving}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Keterangan Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keterangan (Opsional)
              </label>
              <textarea
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                placeholder="Masukkan keterangan tambahan (opsional)"
                disabled={isSaving}
                rows={3}
              />
            </div>

            {/* Documents Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Documents</h4>
              
              {/* Existing Documents */}
              {existingDocuments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Existing Documents:</p>
                  <div className="space-y-2">
                    {existingDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{doc.file_name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{(doc.file_size / 1024).toFixed(2)} KB</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingDocument(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0"
                          disabled={isSaving}
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Documents */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload New Documents
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Choose File
                    </span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isSaving}
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
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Files to be uploaded:</p>
                  <div className="space-y-2">
                    {filesToUpload.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{(file.size / 1024).toFixed(2)} KB</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-all flex-shrink-0"
                          disabled={isSaving}
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
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50 flex-shrink-0" style={{ borderRadius: '0 0 16px 16px' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
            }}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
