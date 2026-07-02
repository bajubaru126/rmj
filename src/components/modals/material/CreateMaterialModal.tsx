import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { materialService } from '@/services/materialService';
import { authService } from '@/services/authService';
import { projectService, Project } from '@/services/projectService';
import { linkService, LinkResponse } from '@/services/linkService';

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMaterialCreated: () => void;
}

export function CreateMaterialModal({ isOpen, onClose, onMaterialCreated }: CreateMaterialModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<LinkResponse[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    project_id: '',
    link_id: '',
    item_name: '',
    unit: '',
    plan_start_date: '',
    plan_end_date: '',
    plan_quantity: 0,
    keterangan: ''
  });

  const unitOptions = ['Unit', 'Meter', 'Roll', 'Pcs', 'Set', 'Titik', 'Core'];

  // Fetch projects when modal opens
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isOpen) return;
      
      setIsLoadingProjects(true);
      try {
        const token = authService.getToken();
        const data = await projectService.getAllProjects(token);
        console.log('📦 Projects fetched:', data);
        setProjects(data);
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
        return;
      }
      
      console.log('🔗 Fetching links for project ID:', formData.project_id);
      setIsLoadingLinks(true);
      try {
        const token = authService.getToken();
        const data = await linkService.getLinksByProjectId(formData.project_id, token);
        console.log('🔗 Links fetched:', data);
        setLinks(data);
      } catch (error) {
        console.error('Error fetching links:', error);
        setLinks([]);
      } finally {
        setIsLoadingLinks(false);
      }
    };

    fetchLinks();
  }, [formData.project_id]);

  const handleSubmit = async () => {
    if (!formData.project_id || !formData.link_id) {
      alert('Please select project and link');
      return;
    }

    if (!formData.item_name.trim()) {
      alert('Please enter item name');
      return;
    }

    if (!formData.unit) {
      alert('Please select unit');
      return;
    }

    if (!formData.plan_start_date) {
      alert('Please select plan start date');
      return;
    }

    if (!formData.plan_end_date) {
      alert('Please select plan end date');
      return;
    }

    if (formData.plan_quantity <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    setIsCreating(true);
    try {
      const token = authService.getToken();
      
      // Create all 6 material steps with the same quantity and dates
      await materialService.createAllMaterialSteps(
        formData.project_id,
        formData.link_id,
        formData.item_name,
        formData.unit,
        formData.plan_start_date,
        formData.plan_end_date,
        formData.plan_quantity,
        formData.keterangan,
        token
      );
      
      alert('Material created successfully!');
      onMaterialCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating material:', error);
      alert('Failed to create material. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      project_id: '',
      link_id: '',
      item_name: '',
      unit: '',
      plan_start_date: '',
      plan_end_date: '',
      plan_quantity: 0,
      keterangan: ''
    });
    setLinks([]);
    setProjects([]);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9000 }} onClick={handleClose}>
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '600px',
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
              Create New Material
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Add material data for a project link
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
                console.log('🎯 Selected project ID:', e.target.value);
                setFormData({ ...formData, project_id: e.target.value, link_id: '' });
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              disabled={isCreating || isLoadingProjects}
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => {
                // Extract project ID properly - handle both string and object formats
                let projectId = '';
                if (typeof project.id === 'string') {
                  projectId = project.id;
                } else if (project.id && typeof project.id === 'object') {
                  // Handle nested id structure like { tb: "...", id: { String: "..." } }
                  if ('id' in project.id) {
                    const nestedId = (project.id as any).id;
                    projectId = typeof nestedId === 'string' ? nestedId : nestedId?.String || '';
                  }
                }
                
                console.log('📋 Project:', project.name, 'Extracted ID:', projectId);
                
                return (
                  <option key={projectId || project.name} value={projectId}>
                    {project.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Link Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Link / Ruas *
            </label>
            <select
              value={formData.link_id}
              onChange={(e) => {
                console.log('🎯 Selected link ID:', e.target.value);
                setFormData({ ...formData, link_id: e.target.value });
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
                      ? '-- No Links Available --'
                      : '-- Select Link --'
                }
              </option>
              {links.map((link) => {
                const linkId = typeof link.id.id === 'string' ? link.id.id : link.id.id.String;
                console.log('🔗 Link:', link.link_name, 'ID:', linkId);
                return (
                  <option key={linkId} value={linkId}>
                    {link.link_name}
                  </option>
                );
              })}
            </select>
            {!formData.project_id && (
              <p className="text-xs text-gray-500 mt-1">
                Please select a project first to load available links
              </p>
            )}
            {formData.project_id && isLoadingLinks && (
              <p className="text-xs text-blue-600 mt-1">
                Loading links for selected project...
              </p>
            )}
            {formData.project_id && !isLoadingLinks && links.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No links found for this project
              </p>
            )}
          </div>

          {/* Item Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nama Barang *
            </label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Masukkan nama barang"
              disabled={isCreating}
            />
          </div>

          {/* Plan Start Date and End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plan Start Date *
              </label>
              <input
                type="date"
                value={formData.plan_start_date}
                onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plan End Date *
              </label>
              <input
                type="date"
                value={formData.plan_end_date}
                onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                disabled={isCreating}
                min={formData.plan_start_date}
              />
            </div>
          </div>

          {/* Satuan and Quantity in one row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Unit Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Satuan *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                disabled={isCreating}
              >
                <option value="">Pilih satuan</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Quantity Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Material Order *
              </label>
              <input
                type="number"
                value={formData.plan_quantity}
                onChange={(e) => setFormData({ ...formData, plan_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Masukkan quantity"
                disabled={isCreating}
                min="1"
              />
            </div>
          </div>

          {/* Keterangan Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Keterangan (Opsional)
            </label>
            <textarea
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              placeholder="Masukkan keterangan tambahan (opsional)"
              disabled={isCreating}
              rows={3}
            />
          </div>

          {/* Helper text */}
          {/* <p className="text-xs text-gray-500 -mt-2">
            Quantity ini akan digunakan untuk semua 6 material steps
          </p> */}
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
            disabled={isCreating || !formData.project_id || !formData.link_id || !formData.item_name.trim() || !formData.unit || !formData.plan_start_date || !formData.plan_end_date || formData.plan_quantity <= 0}
          >
            {isCreating ? 'Creating...' : 'Create Material'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
