import { useState, useEffect } from 'react';
import { X, Upload, FileText, ChevronDown } from 'lucide-react';
import { projectService, Project } from '@/services/projectService';
import { komService, type KOM } from '@/services/komService';
import { toast } from 'sonner';

interface EditKOMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: KOMFormData) => void;
  komData: KOM | null;
}

export interface KOMFormData {
  projectId: string;
  projectName: string;
  komStartDate: string;
  komEndDate: string;
  komVenue: string;
  komMomFile: File | null;
  otherDocsFiles: File[];
  remarks: string;
}

export function EditKOMModal({ open, onOpenChange, onSubmit, komData }: EditKOMModalProps) {
  const [formData, setFormData] = useState<KOMFormData>({
    projectId: '',
    projectName: '',
    komStartDate: '',
    komEndDate: '',
    komVenue: '',
    komMomFile: null,
    otherDocsFiles: [],
    remarks: ''
  });

  const [komMomFileName, setKomMomFileName] = useState<string>('');
  const [otherDocsFileNames, setOtherDocsFileNames] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Fetch projects when modal opens
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const projectList = await projectService.getAllProjects(token);
      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
    project.no_kontrak?.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  useEffect(() => {
    if (komData && open) {
      // Helper to extract project ID
      const extractProjectId = (projectId: any): string => {
        if (!projectId) return '';
        if (typeof projectId === 'string') {
          return projectId.includes(':') ? projectId.split(':')[1] : projectId;
        }
        if (typeof projectId === 'object' && 'id' in projectId) {
          const idValue = (projectId as any).id;
          if (typeof idValue === 'string') return idValue;
          if (typeof idValue === 'object' && 'String' in idValue) {
            return String(idValue.String);
          }
          return String(idValue);
        }
        return String(projectId);
      };

      // Convert ISO datetime to date input format (YYYY-MM-DD)
      const formatDateForInput = (isoDate: string): string => {
        if (!isoDate) return '';
        try {
          const date = new Date(isoDate);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        projectId: extractProjectId(komData.project_id),
        projectName: komData.project_name || '',
        komStartDate: formatDateForInput(komData.kom_start_date),
        komEndDate: formatDateForInput(komData.kom_end_date),
        komVenue: komData.kom_venue || '',
        komMomFile: null, // Don't set existing file, user can upload new one
        otherDocsFiles: [], // Don't set existing files, user can upload new ones
        remarks: komData.remarks || ''
      });
      setProjectSearchQuery(komData.project_name || '');
      setKomMomFileName(''); // Clear file name for new upload
      setOtherDocsFileNames([]); // Clear file names for new upload
    }
  }, [komData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (komData) {
      // Extract clean ID from komData
      const extractId = (id: any): string => {
        if (!id) return '';
        if (typeof id === 'string') return id;
        if (typeof id === 'object' && 'id' in id) {
          const idValue = (id as any).id;
          if (typeof idValue === 'string') return idValue;
          if (typeof idValue === 'object' && 'String' in idValue) {
            return String(idValue.String);
          }
          return String(idValue);
        }
        return String(id);
      };

      onSubmit(extractId(komData.id), formData);
      onOpenChange(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setFormData({ 
      ...formData, 
      projectId: project.id || '',
      projectName: project.name 
    });
    setProjectSearchQuery(project.name);
    setShowProjectDropdown(false);
  };

  const handleKomMomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, komMomFile: file });
      setKomMomFileName(file.name);
    }
  };

  const handleOtherDocsFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData({ ...formData, otherDocsFiles: [...formData.otherDocsFiles, ...files] });
      setOtherDocsFileNames([...otherDocsFileNames, ...files.map(f => f.name)]);
    }
  };

  const removeOtherDoc = (index: number) => {
    const newFiles = formData.otherDocsFiles.filter((_, i) => i !== index);
    const newFileNames = otherDocsFileNames.filter((_, i) => i !== index);
    setFormData({ ...formData, otherDocsFiles: newFiles });
    setOtherDocsFileNames(newFileNames);
  };

  if (!open || !komData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white shadow-2xl w-full flex flex-col" style={{ 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
        maxHeight: '85vh',
        maxWidth: '900px',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between" style={{ 
          backgroundColor: '#003A70',
          flexShrink: 0
        }}>
          <div>
            <h3 className="text-white text-lg font-semibold">Edit KOM</h3>
            <p className="text-xs text-blue-200 mt-1">Update KOM details and documents</p>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-white/10 rounded transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1" style={{ 
            background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)'
          }}>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Project Name - Dropdown with Search */}
              <div className="col-span-2 relative">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Project Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isLoadingProjects ? "Loading projects..." : "Search project by name or contract number..."}
                    value={projectSearchQuery}
                    onChange={(e) => {
                      setProjectSearchQuery(e.target.value);
                      setShowProjectDropdown(true);
                    }}
                    onFocus={() => setShowProjectDropdown(true)}
                    required
                    disabled={isLoadingProjects}
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  
                  {/* Project Dropdown */}
                  {showProjectDropdown && filteredProjects.length > 0 && (
                    <>
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleProjectSelect(project)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            {project.no_kontrak && (
                              <p className="text-xs text-gray-500 mt-1">{project.no_kontrak}</p>
                            )}
                          </button>
                        ))}
                      </div>
                      {/* Close dropdown on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowProjectDropdown(false)}
                      />
                    </>
                  )}
                </div>
                {projectSearchQuery && filteredProjects.length === 0 && !isLoadingProjects && (
                  <p className="text-xs text-gray-500 mt-1">No projects found</p>
                )}
              </div>

              {/* KOM Start Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  KOM Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.komStartDate}
                  onChange={(e) => setFormData({ ...formData, komStartDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* KOM End Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  KOM End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.komEndDate}
                  onChange={(e) => setFormData({ ...formData, komEndDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* KOM Venue */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                KOM Venue (Tempat KOM)
              </label>
              <input
                type="text"
                placeholder="e.g., Ruang Meeting Lt. 2, Hotel Santika, dll"
                value={formData.komVenue}
                onChange={(e) => setFormData({ ...formData, komVenue: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Upload Areas - Side by Side */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Upload KOM MoM */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3">
                  Upload KOM MoM <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-orange-300 rounded-xl py-6 px-4 bg-orange-50/30">
                  <input
                    type="file"
                    id="edit-kom-mom-upload"
                    accept="*/*"
                    onChange={handleKomMomFileChange}
                    className="hidden"
                  />
                  <label htmlFor="edit-kom-mom-upload" className="cursor-pointer block">
                    {komMomFileName ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <FileText className="w-6 h-6 text-orange-500" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-900 font-medium truncate px-2">{komMomFileName}</p>
                          <p className="text-xs text-gray-500 mt-1">File uploaded</p>
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData({ ...formData, komMomFile: null });
                              setKomMomFileName('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Upload className="w-6 h-6 text-orange-500" />
                        </div>
                        <p className="text-sm text-gray-900 font-semibold mb-2">Upload KOM MoM Document</p>
                        <p className="text-xs text-gray-500 mb-3 px-2">
                          Click to browse or drag & drop your file here
                        </p>
                        <span className="inline-block px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                          Choose File
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Upload Other Docs */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3">
                  Upload Other Docs
                </label>
                <div className="border-2 border-dashed border-orange-300 rounded-xl py-6 px-4 bg-orange-50/30">
                  <input
                    type="file"
                    id="edit-other-docs-upload"
                    accept="*/*"
                    multiple
                    onChange={handleOtherDocsFilesChange}
                    className="hidden"
                  />
                  
                  {otherDocsFileNames.length > 0 ? (
                    <div className="space-y-2">
                      <div className="max-h-32 overflow-y-auto space-y-1.5">
                        {otherDocsFileNames.map((fileName, index) => (
                          <div key={index} className="flex items-center justify-between bg-white rounded-lg px-2 py-2 shadow-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="text-xs text-gray-700 truncate">{fileName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOtherDoc(index)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label htmlFor="edit-other-docs-upload" className="cursor-pointer block">
                        <div className="text-center pt-2 border-t border-orange-200">
                          <span className="inline-block px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                            Add More Files
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="edit-other-docs-upload" className="cursor-pointer block">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Upload className="w-6 h-6 text-orange-500" />
                        </div>
                        <p className="text-sm text-gray-900 font-semibold mb-2">Upload Additional Documents</p>
                        <p className="text-xs text-gray-500 mb-3 px-2">
                          You can upload multiple documents with remarks
                        </p>
                        <span className="inline-block px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                          Add More Files
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                placeholder="Add notes or additional information..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white" style={{ 
            flexShrink: 0
          }}>
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 bg-gray-50 text-gray-600 rounded-md text-sm hover:bg-gray-100 transition-colors font-medium border border-gray-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-[#15396C] to-[#0078D7] text-white rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium"
            >
              Update KOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
