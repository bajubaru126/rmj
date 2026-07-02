import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, X, Search } from 'lucide-react';
import { riskService, type Risk, type CreateRiskRequest, type UpdateRiskRequest } from '@/services/riskService';
import { projectService, type Project } from '@/services/projectService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function Risks() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const { token } = useAuth();

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [risksData, projectsData] = await Promise.all([
        riskService.getAllRisks(token),
        projectService.getAllProjects(token),
      ]);
      setRisks(risksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRisks = async () => {
    try {
      const data = await riskService.getAllRisks(token);
      setRisks(data);
    } catch (error) {
      console.error('Failed to load risks:', error);
      toast.error('Failed to load risks');
    }
  };

  // Helper to extract string ID from any Thing object or string
  const extractId = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    
    // Handle Thing object: {tb: "table", id: "abc123"} or {tb: "table", id: {String: "abc123"}}
    if (typeof id === 'object') {
      if ('id' in id) {
        const idValue = (id as any).id;
        if (typeof idValue === 'string') return idValue;
        if (typeof idValue === 'object' && 'String' in idValue) {
          return String(idValue.String);
        }
        // Try JSON extraction
        const str = JSON.stringify(idValue);
        const match = str.match(/"String":"([^"]+)"/);
        if (match) return match[1];
        return String(idValue);
      }
    }
    
    return String(id);
  };

  // Helper to extract project ID - ensure it returns a string
  const getProjectId = (project: Project): string => {
    if (!project.id) return '';
    
    // If id is already a simple string
    if (typeof project.id === 'string') {
      const parts = project.id.split(':');
      return parts.length > 1 ? parts[1] : project.id;
    }
    
    // If id is an object (Thing from SurrealDB)
    if (typeof project.id === 'object') {
      // Try to access id property
      if ('id' in project.id) {
        const idValue = (project.id as any).id;
        if (typeof idValue === 'string') return idValue;
        if (typeof idValue === 'object' && 'String' in idValue) {
          return String((idValue as any).String);
        }
        return String(idValue);
      }
      // Fallback: stringify and extract
      const str = JSON.stringify(project.id);
      const match = str.match(/"id":"([^"]+)"/);
      if (match) return match[1];
    }
    
    return String(project.id);
  };

  const getProjectName = (projectId: any) => {
    // Extract string ID from projectId (could be string or nested object Thing)
    let idString = '';
    
    if (!projectId) return 'Unknown Project';
    
    if (typeof projectId === 'string') {
      // Handle "project:abc123" format
      idString = projectId.includes(':') ? projectId.split(':')[1] : projectId;
    } else if (typeof projectId === 'object' && projectId) {
      // Handle Thing object from SurrealDB: {tb: "project", id: "abc123"} or {tb: "project", id: {String: "abc123"}}
      if ('tb' in projectId && 'id' in projectId) {
        const idValue = (projectId as any).id;
        
        // Check if id is string
        if (typeof idValue === 'string') {
          idString = idValue;
        } 
        // Check if id is object with String property
        else if (typeof idValue === 'object' && idValue) {
          if ('String' in idValue) {
            idString = String(idValue.String);
          } else {
            // Try to extract from nested object
            const str = JSON.stringify(idValue);
            const match = str.match(/"String":"([^"]+)"/);
            idString = match ? match[1] : String(idValue);
          }
        } else {
          idString = String(idValue);
        }
      } else if ('id' in projectId) {
        const idValue = projectId.id;
        idString = typeof idValue === 'string' ? idValue : String(idValue);
      } else {
        // Last resort
        const str = JSON.stringify(projectId);
        const match = str.match(/"String":"([^"]+)"/);
        if (match) {
          idString = match[1];
        } else {
          const match2 = str.match(/"id":"([^"]+)"/);
          idString = match2 ? match2[1] : str;
        }
      }
    } else {
      idString = String(projectId);
    }
    
    console.log('Extracted ID string:', idString, 'from', projectId);
    
    // Try to find project by matching ID
    const project = projects.find(p => {
      if (!p.id) return false;
      
      const pId = getProjectId(p);
      
      // Match with or without "project:" prefix
      return pId === idString || 
             pId === `project:${idString}` ||
             `project:${pId}` === idString ||
             p.id === `project:${idString}`;
    });
    
    const result = project ? project.name : idString;
    console.log('Project name result:', result);
    return result;
  };

  const handleCreate = () => {
    setEditingRisk(null);
    setIsModalOpen(true);
  };

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    try {
      // Extract string ID if it's an object
      const idString = typeof id === 'string' ? id : 
                      (typeof id === 'object' && 'id' in id) ? String((id as any).id) : 
                      String(id);
      
      await riskService.deleteRisk(idString, token);
      toast.success('Risk deleted successfully');
      loadData(); // Reload all data instead of just risks
    } catch (error) {
      console.error('Failed to delete risk:', error);
      toast.error('Failed to delete risk');
    }
  };

  const handleSave = async (data: CreateRiskRequest | UpdateRiskRequest) => {
    try {
      if (editingRisk?.id) {
        // Extract string ID from risk.id using helper function
        const riskId = extractId(editingRisk.id);
        
        console.log('Updating risk with ID:', riskId, 'from', editingRisk.id);
        
        await riskService.updateRisk(riskId, data as UpdateRiskRequest, token);
        toast.success('Risk updated successfully');
      } else {
        await riskService.createRisk(data as CreateRiskRequest, token);
        toast.success('Risk created successfully');
      }
      setIsModalOpen(false);
      loadData(); // Reload all data
    } catch (error: any) {
      console.error('Failed to save risk:', error);
      toast.error(error.message || 'Failed to save risk');
    }
  };

  // Filter risks
  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || risk.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'monitoring': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Risk Management</h2>
            <p className="text-gray-500 text-sm">Track and manage project risks</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#15396C] text-white rounded-lg hover:bg-[#0f2847] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Risk
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search risks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Risk List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#15396C]"></div>
          <p className="mt-2 text-gray-500">Loading risks...</p>
        </div>
      ) : filteredRisks.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No risks found</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRisks.map((risk, index) => {
                  const riskKey = risk.id ? extractId(risk.id) : `risk-${index}`;
                  
                  return (
                    <tr key={riskKey} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{risk.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getProjectName(risk.project_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{risk.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getSeverityColor(risk.severity)}`}>
                          {risk.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(risk.status)}`}>
                          {risk.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{risk.location || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {risk.created_at ? new Date(risk.created_at).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(risk)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => risk.id && handleDelete(extractId(risk.id))}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <RiskModal
          risk={editingRisk}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Risk Modal Component
interface RiskModalProps {
  risk: Risk | null;
  onClose: () => void;
  onSave: (data: CreateRiskRequest | UpdateRiskRequest) => void;
}

function RiskModal({ risk, onClose, onSave }: RiskModalProps) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Helper to extract string ID from any Thing object or string
  const extractProjectId = (projectId: any): string => {
    if (!projectId) return '';
    
    if (typeof projectId === 'string') {
      // Handle "project:abc123" format - extract just the ID part
      return projectId.includes(':') ? projectId.split(':')[1] : projectId;
    }
    
    if (typeof projectId === 'object') {
      // Handle Thing object: {tb: "project", id: "abc123"} or {tb: "project", id: {String: "abc123"}}
      if ('id' in projectId) {
        const idValue = (projectId as any).id;
        if (typeof idValue === 'string') return idValue;
        if (typeof idValue === 'object' && 'String' in idValue) {
          return String(idValue.String);
        }
        // Try JSON extraction
        const str = JSON.stringify(idValue);
        const match = str.match(/"String":"([^"]+)"/);
        if (match) return match[1];
        return String(idValue);
      }
    }
    
    return String(projectId);
  };
  
  const [formData, setFormData] = useState({
    project_id: extractProjectId(risk?.project_id) || '',
    title: risk?.title || '',
    description: risk?.description || '',
    severity: risk?.severity || 'medium',
    category: risk?.category || 'other',
    status: risk?.status || 'active',
    location: risk?.location || '',
    resolution: risk?.resolution || '',
  });

  useEffect(() => {
    loadProjects();
  }, [token]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await projectService.getAllProjects(token);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    
    // Ensure project_id is a clean string ID (extract if needed)
    const cleanProjectId = extractProjectId(formData.project_id);
    
    if (!cleanProjectId) {
      toast.error('Invalid project ID');
      return;
    }
    
    const cleanData = {
      ...formData,
      project_id: cleanProjectId,
    };
    
    console.log('Submitting risk data:', cleanData);
    onSave(cleanData);
  };

  // Helper to extract project ID - ensure it returns a string
  const getProjectId = (project: Project): string => {
    if (!project.id) return '';
    
    // If id is already a simple string
    if (typeof project.id === 'string') {
      const parts = project.id.split(':');
      return parts.length > 1 ? parts[1] : project.id;
    }
    
    // If id is an object (Thing from SurrealDB)
    if (typeof project.id === 'object') {
      // Try to access id property
      if ('id' in project.id) {
        const idValue = (project.id as any).id;
        if (typeof idValue === 'string') return idValue;
        if (typeof idValue === 'object' && 'String' in idValue) {
          return String((idValue as any).String);
        }
        return String(idValue);
      }
      // Fallback: stringify and extract
      const str = JSON.stringify(project.id);
      const match = str.match(/"id":"([^"]+)"/);
      if (match) return match[1];
    }
    
    return String(project.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {risk ? 'Edit Risk' : 'Create New Risk'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!risk && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              {loadingProjects ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading projects...
                </div>
              ) : (
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
                >
                  <option value="">Select a project</option>
                  {projects.map((project, index) => {
                    const projectId = getProjectId(project);
                    return (
                      <option key={`${projectId}-${index}`} value={projectId}>
                        {project.name}
                      </option>
                    );
                  })}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Select the project this risk is associated with
              </p>
            </div>
          )}

          {risk && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                {(() => {
                  // Extract clean project ID
                  const projectId = extractProjectId(risk.project_id);
                  
                  // Find matching project
                  const project = projects.find(p => {
                    const pId = getProjectId(p);
                    return pId === projectId || 
                           `project:${pId}` === projectId ||
                           pId === `project:${projectId}`;
                  });
                  
                  return project ? project.name : projectId || 'Unknown Project';
                })()}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Project cannot be changed after creation
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              placeholder="Enter risk title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              placeholder="Describe the risk"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              >
                <option value="survey">Survey</option>
                <option value="drm">DRM</option>
                <option value="installation">Installation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {risk && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              >
                <option value="active">Active</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
              placeholder="e.g., Sector 4, Area B"
            />
          </div>

          {risk && formData.status === 'resolved' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution
              </label>
              <textarea
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15396C]"
                placeholder="Describe how the risk was resolved"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#15396C] text-white rounded-lg hover:bg-[#0f2847] transition-colors"
            >
              {risk ? 'Update' : 'Create'} Risk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
