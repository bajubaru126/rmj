import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Upload, FileText, Trash2 } from 'lucide-react';
import { installationService, INSTALLATION_STEPS } from '@/services/installationService';
import { authService } from '@/services/authService';
import { projectService, Project } from '@/services/projectService';
import { linkService, LinkResponse } from '@/services/linkService';
import { materialService, MaterialDetail } from '@/services/materialService';

interface CreateInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallationCreated: () => void;
}

export function CreateInstallationModal({ isOpen, onClose, onInstallationCreated }: CreateInstallationModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<LinkResponse[]>([]);
  const [materials, setMaterials] = useState<MaterialDetail[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    project_id: '',
    link_id: '',
    material_id: [] as string[],
    progress: '',
    installation_step: '',
    keterangan: ''
  });

  // Fetch projects when modal opens
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isOpen) return;
      
      setIsLoadingProjects(true);
      try {
        const token = authService.getToken();
        const allProjects = await projectService.getAllProjects(token);
        console.log('📦 All projects fetched:', allProjects);
        
        // Filter projects that have Material Order materials
        const projectsWithMaterialOrder: Project[] = [];
        
        for (const project of allProjects) {
          let projectId = '';
          if (typeof project.id === 'string') {
            projectId = project.id;
          } else if (project.id && typeof project.id === 'object') {
            if ('id' in project.id) {
              const nestedId = (project.id as any).id;
              projectId = typeof nestedId === 'string' ? nestedId : nestedId?.String || '';
            }
          }
          
          if (!projectId) continue;
          
          try {
            // Get all materials for this project
            const materials = await materialService.getMaterialsByProjectId(projectId, token);
            
            // Check if project has any Material Order materials
            const hasMaterialOrder = materials.some(material => material.material_step === 'Material Order');
            
            if (hasMaterialOrder) {
              projectsWithMaterialOrder.push(project);
            }
          } catch (error) {
            console.error(`Error checking materials for project ${projectId}:`, error);
          }
        }
        
        console.log('📦 Projects with Material Order:', projectsWithMaterialOrder);
        setProjects(projectsWithMaterialOrder);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isOpen]);

  // Fetch links when project is selected
  useEffect(() => {
    const fetchLinks = async () => {
      if (!formData.project_id) {
        setLinks([]);
        setMaterials([]);
        return;
      }
      
      console.log('🔗 Fetching links for project ID:', formData.project_id);
      setIsLoadingLinks(true);
      try {
        const token = authService.getToken();
        const allLinks = await linkService.getLinksByProjectId(formData.project_id, token);
        console.log('🔗 All links fetched:', allLinks);
        
        // Filter links that have Material Order materials
        const linksWithMaterialOrder: LinkResponse[] = [];
        
        for (const link of allLinks) {
          const linkId = typeof link.id.id === 'string' ? link.id.id : link.id.id.String;
          
          try {
            // Get materials for this link
            const materials = await materialService.getMaterialsByProjectAndLink(
              formData.project_id,
              linkId,
              token
            );
            
            // Check if link has any Material Order materials
            const hasMaterialOrder = materials.some(material => material.material_step === 'Material Order');
            
            if (hasMaterialOrder) {
              linksWithMaterialOrder.push(link);
              console.log(`✅ Link ${link.link_name} has Material Order materials`);
            } else {
              console.log(`❌ Link ${link.link_name} has NO Material Order materials (total materials: ${materials.length})`);
            }
          } catch (error) {
            console.error(`Error checking materials for link ${linkId}:`, error);
          }
        }
        
        console.log('🔗 Links with Material Order:', linksWithMaterialOrder);
        setLinks(linksWithMaterialOrder);
      } catch (error) {
        console.error('Error fetching links:', error);
        setLinks([]);
      } finally {
        setIsLoadingLinks(false);
      }
    };

    fetchLinks();
  }, [formData.project_id]);

  // Fetch materials when link is selected
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!formData.project_id || !formData.link_id) {
        setMaterials([]);
        return;
      }
      
      console.log('📦 Fetching materials for project and link');
      setIsLoadingMaterials(true);
      try {
        const token = authService.getToken();
        const data = await materialService.getMaterialsByProjectAndLink(
          formData.project_id,
          formData.link_id,
          token
        );
        console.log('📦 Materials fetched:', data);
        
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
  }, [formData.project_id, formData.link_id]);

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
    if (!formData.project_id || !formData.link_id) {
      alert('Please select project and link');
      return;
    }

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

    setIsCreating(true);
    try {
      const token = authService.getToken();
      
      // Upload files if any
      const uploadedDocuments: any[] = [];
      if (filesToUpload.length > 0) {
        const fileCategory = getFileCategory();
        
        for (const file of filesToUpload) {
          try {
            const uploadResult = await installationService.uploadFile(file, fileCategory, token);
            
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
            setIsCreating(false);
            return;
          }
        }
      }

      // Create installation
      const installationData: any = {
        project_id: formData.project_id,
        link_id: formData.link_id,
        material_id: formData.material_id,
        progress: formData.progress,
        installation_step: formData.installation_step
      };

      if (formData.keterangan.trim()) {
        installationData.keterangan = formData.keterangan;
      }

      if (uploadedDocuments.length > 0) {
        installationData.documents = uploadedDocuments;
      }

      await installationService.createInstallation(installationData, token);
      
      alert('Installation created successfully!');
      onInstallationCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating installation:', error);
      alert('Failed to create installation. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      project_id: '',
      link_id: '',
      material_id: [],
      progress: '',
      installation_step: '',
      keterangan: ''
    });
    setFilesToUpload([]);
    setLinks([]);
    setMaterials([]);
    setProjects([]);
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
              <Plus className="w-5 h-5" />
              Create New Installation
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Add installation data for a project link
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            disabled={isCreating}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {/* Project Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => {
                setFormData({ ...formData, project_id: e.target.value, link_id: '', material_id: [] });
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isCreating || isLoadingProjects}
            >
              <option value="">
                {isLoadingProjects ? '-- Loading Projects... --' : '-- Select Project --'}
              </option>
              {projects.map((project) => {
                let projectId = '';
                if (typeof project.id === 'string') {
                  projectId = project.id;
                } else if (project.id && typeof project.id === 'object') {
                  if ('id' in project.id) {
                    const nestedId = (project.id as any).id;
                    projectId = typeof nestedId === 'string' ? nestedId : nestedId?.String || '';
                  }
                }
                
                return (
                  <option key={projectId || project.name} value={projectId}>
                    {project.name}
                  </option>
                );
              })}
            </select>
            {isLoadingProjects && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                Filtering projects with Material...
              </p>
            )}
          </div>

          {/* Link Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Link / Ruas *
            </label>
            <select
              value={formData.link_id}
              onChange={(e) => {
                setFormData({ ...formData, link_id: e.target.value, material_id: [] });
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isCreating || isLoadingLinks || !formData.project_id}
            >
              <option value="">
                {!formData.project_id 
                  ? '-- Select Project First --' 
                  : isLoadingLinks 
                    ? '-- Loading Links... --'
                    : links.length === 0
                      ? '-- No Links with Material Order Available --'
                      : '-- Select Link --'
                }
              </option>
              {links.map((link) => {
                const linkId = typeof link.id.id === 'string' ? link.id.id : link.id.id.String;
                return (
                  <option key={linkId} value={linkId}>
                    {link.link_name}
                  </option>
                );
              })}
            </select>
            {isLoadingLinks && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                Filtering links with Material Order...
              </p>
            )}
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
              disabled={isCreating}
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
              disabled={isCreating}
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
                <p className="text-sm text-gray-500">
                  {!formData.link_id ? 'Select a link first' : 'No materials available for this link'}
                </p>
              ) : (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <label key={material.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.material_id.includes(material.id)}
                        onChange={() => handleMaterialToggle(material.id)}
                        className="w-4 h-4 text-blue-600"
                        disabled={isCreating}
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
              disabled={isCreating}
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Documents (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Choose Files</span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isCreating}
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
                      disabled={isCreating}
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
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
            }}
            disabled={isCreating || !formData.project_id || !formData.link_id || formData.material_id.length === 0 || !formData.installation_step || !formData.progress.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Installation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
