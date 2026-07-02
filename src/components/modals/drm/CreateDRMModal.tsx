import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, Calendar } from 'lucide-react';
import { projectService, type Project } from '@/services/projectService';
import { useAuth } from '@/context/AuthContext';

export interface DRMFormData {
  projectId: string;
  projectName: string;
  drmStartDate: string;
  drmEndDate: string;
  drmMomFile: File | null;
  boqFinalDocsFile: File | null;
  redlineFinalDocsFile: File | null;
  matrixFinalDocsFile: File | null;
  otherDocsFiles: File[];
  remarks: string;
}

interface CreateDRMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DRMFormData) => Promise<void>;
}

export function CreateDRMModal({ open, onOpenChange, onSubmit }: CreateDRMModalProps) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<DRMFormData>({
    projectId: '',
    projectName: '',
    drmStartDate: '',
    drmEndDate: '',
    drmMomFile: null,
    boqFinalDocsFile: null,
    redlineFinalDocsFile: null,
    matrixFinalDocsFile: null,
    otherDocsFiles: [],
    remarks: '',
  });

  // Load projects when modal opens
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await projectService.getAllProjects(token);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find(p => {
      const id = typeof p.id === 'string' ? p.id : (p.id as any)?.id?.String || (p.id as any)?.id;
      return id === projectId;
    });

    setFormData({
      ...formData,
      projectId,
      projectName: selectedProject?.name || '',
    });
  };

  const handleFileChange = (field: keyof DRMFormData, file: File | null) => {
    setFormData({
      ...formData,
      [field]: file,
    });
  };

  const handleOtherDocsChange = (files: FileList | null) => {
    if (files) {
      setFormData({
        ...formData,
        otherDocsFiles: Array.from(files),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.projectId) {
      alert('Please select a project');
      return;
    }
    if (!formData.drmStartDate || !formData.drmEndDate) {
      alert('Please select DRM start and end dates');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to create DRM:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      projectId: '',
      projectName: '',
      drmStartDate: '',
      drmEndDate: '',
      drmMomFile: null,
      boqFinalDocsFile: null,
      redlineFinalDocsFile: null,
      matrixFinalDocsFile: null,
      otherDocsFiles: [],
      remarks: '',
    });
    onOpenChange(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#005EB8] to-[#0078D7]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Tambah DRM</h2>
              <p className="text-sm text-blue-100 mt-1">Create new Design Review Meeting</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Project Name <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loadingProjects}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#005EB8] focus:ring-4 focus:ring-blue-100 transition-all"
                required
              >
                <option value="">-- Select Project --</option>
                {projects.map((project) => {
                  const id = typeof project.id === 'string' ? project.id : (project.id as any)?.id?.String || (project.id as any)?.id;
                  return (
                    <option key={id} value={id}>
                      {project.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* DRM Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  DRM Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.drmStartDate}
                    onChange={(e) => setFormData({ ...formData, drmStartDate: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#005EB8] focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  DRM End Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.drmEndDate}
                    onChange={(e) => setFormData({ ...formData, drmEndDate: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#005EB8] focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* File Uploads - Grid 2x2 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* DRM MoM */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload DRM MoM
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30 min-h-[120px]">
                    <Upload className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm text-orange-700 font-medium truncate max-w-full px-2 text-center">
                      {formData.drmMomFile ? formData.drmMomFile.name : 'Choose file'}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('drmMomFile', e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                </div>

                {/* BOQ Final Docs */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload BoQ Final Docs
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30 min-h-[120px]">
                    <Upload className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm text-orange-700 font-medium truncate max-w-full px-2 text-center">
                      {formData.boqFinalDocsFile ? formData.boqFinalDocsFile.name : 'Choose file'}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('boqFinalDocsFile', e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.xls,.xlsx"
                    />
                  </label>
                </div>

                {/* Redline Final Docs */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Redline Final Docs
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30 min-h-[120px]">
                    <Upload className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm text-orange-700 font-medium truncate max-w-full px-2 text-center">
                      {formData.redlineFinalDocsFile ? formData.redlineFinalDocsFile.name : 'Choose file'}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('redlineFinalDocsFile', e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.xls,.xlsx"
                    />
                  </label>
                </div>

                {/* Matrix Final Docs */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Matrix Final Docs
                  </label>
                  <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30 min-h-[120px]">
                    <Upload className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm text-orange-700 font-medium truncate max-w-full px-2 text-center">
                      {formData.matrixFinalDocsFile ? formData.matrixFinalDocsFile.name : 'Choose file'}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange('matrixFinalDocsFile', e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.xls,.xlsx"
                    />
                  </label>
                </div>
              </div>

              {/* Other Docs - Full Width */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Other Docs
                </label>
                <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors bg-orange-50/30 min-h-[120px]">
                  <Upload className="w-6 h-6 text-orange-600 mb-2" />
                  <span className="text-sm text-orange-700 font-medium">
                    {formData.otherDocsFiles.length > 0 
                      ? `${formData.otherDocsFiles.length} file(s) selected` 
                      : 'Choose files (multiple)'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => handleOtherDocsChange(e.target.files)}
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Buatkan opsi lebih dari 1 document untuk upload other Docs yang bisa diupload dan ditambahkan remarks nama dokumennya
                </p>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#005EB8] focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                placeholder="Add any additional notes or remarks..."
              />
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Catatan:</strong> Create New DRM dilakukan setelah Survey selesai. 
                Satu project 1 DRM artinya sebuah project hanya bisa melakukan 1 DRM. 
                Jika sebuah project sudah create DRM, maka project tersebut tidak bisa create DRM lagi.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#005EB8] text-white rounded-lg text-sm font-medium hover:bg-[#004a94] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Create DRM
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
