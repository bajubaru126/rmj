import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Search, Users, Link as LinkIcon, AlertCircle, FolderOpen, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { surveyorAssignmentService, SurveyorAssignment } from '@/services/surveyorAssignmentService';
import { userService } from '@/services/userService';
import { getAllProjects, ProjectResponse, extractId } from '@/services/contractService';
import { linkService, LinkResponse } from '@/services/linkService';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function AssignSurveyor() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [links, setLinks] = useState<LinkResponse[]>([]);
  const [surveyors, setSurveyors] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedLink, setSelectedLink] = useState<string>('');
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>(''); // NEW: Expiry date
  const [assignments, setAssignments] = useState<SurveyorAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // Fetch projects and surveyors on mount
  useEffect(() => {
    fetchProjects();
    fetchSurveyors();
  }, []);

  // Fetch links when project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchLinks(selectedProject);
    } else {
      setLinks([]);
      setSelectedLink('');
    }
  }, [selectedProject]);

  // Fetch assignments when link is selected
  useEffect(() => {
    if (selectedLink) {
      fetchLinkAssignments(selectedLink);
    }
  }, [selectedLink]);

  const fetchProjects = async () => {
    try {
      const data = await getAllProjects(token);
      console.log('📦 Fetched projects:', data);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchLinks = async (projectId: string) => {
    try {
      setIsLoadingLinks(true);
      const data = await linkService.getLinksByProjectId(projectId, token);
      console.log('📦 Fetched links:', data);
      setLinks(data);
    } catch (error) {
      console.error('Error fetching links:', error);
      toast.error('Failed to load links');
      setLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const fetchSurveyors = async () => {
    try {
      const users = await userService.getAllUsers();
      // Filter only surveyors
      const surveyorUsers = users.filter(
        (u: User) => u.role === 'surveyor' || u.role === 'teknisi_lapangan'
      );
      setSurveyors(surveyorUsers);
    } catch (error) {
      console.error('Error fetching surveyors:', error);
      toast.error('Failed to load surveyors');
    }
  };

  const fetchLinkAssignments = async (linkId: string) => {
    try {
      setIsLoading(true);
      const data = await surveyorAssignmentService.getLinkSurveyors(linkId);
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedLink || !selectedSurveyor) {
      toast.error('Please select both link and surveyor');
      return;
    }

    if (!expiryDate) {
      toast.error('Please select expiry date');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert date to ISO 8601 format with time
      const expiryDateTime = new Date(expiryDate);
      expiryDateTime.setHours(23, 59, 59, 999); // Set to end of day
      const expiresAt = expiryDateTime.toISOString();
      
      await surveyorAssignmentService.assignSurveyorToLink(
        selectedLink, 
        selectedSurveyor,
        expiresAt
      );
      toast.success('Surveyor assigned successfully');
      
      // Reset form
      setSelectedSurveyor('');
      setExpiryDate('');
      
      // Note: We skip fetching assignments because we removed the "Assigned Surveyors" card
      // and there's a backend serialization issue with getLinkSurveyors
    } catch (error) {
      console.error('Error assigning surveyor:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign surveyor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async (linkId: string, surveyorId: string) => {
    if (!confirm('Are you sure you want to unassign this surveyor?')) {
      return;
    }

    try {
      setIsLoading(true);
      await surveyorAssignmentService.unassignSurveyorFromLink(linkId, surveyorId);
      toast.success('Surveyor unassigned successfully');
      
      // Refresh assignments
      await fetchLinkAssignments(linkId);
    } catch (error) {
      console.error('Error unassigning surveyor:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unassign surveyor');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSurveyors = surveyors.filter(
    (s) =>
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSurveyorName = (surveyorId: string) => {
    const surveyor = surveyors.find((s) => s.id === surveyorId);
    return surveyor ? surveyor.username : surveyorId;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Assign Surveyor to Link</h1>
              <p className="text-sm text-gray-500">Kelola assignment surveyor ke link project</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Assignment Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Surveyor</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Project Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  Select Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setSelectedLink(''); // Reset link when project changes
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => {
                    const projectId = extractId(project.id);
                    return (
                      <option key={projectId} value={projectId}>
                        {project.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Link Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  Select Link
                </label>
                <select
                  value={selectedLink}
                  onChange={(e) => setSelectedLink(e.target.value)}
                  disabled={!selectedProject || isLoadingLinks}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {isLoadingLinks ? 'Loading links...' : 'Choose a link...'}
                  </option>
                  {links.map((link) => {
                    const linkId = extractId(link.id);
                    return (
                      <option key={linkId} value={linkId}>
                        {link.link_name || linkId}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Surveyor Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Select Surveyor
                </label>
                <select
                  value={selectedSurveyor}
                  onChange={(e) => setSelectedSurveyor(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!selectedLink}
                >
                  <option value="">Choose a surveyor...</option>
                  {filteredSurveyors.map((surveyor) => (
                    <option key={surveyor.id} value={surveyor.id}>
                      {surveyor.username} ({surveyor.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Assign Button - Full Width Below */}
            <div className="mt-4">
              <button
                onClick={handleAssign}
                disabled={!selectedLink || !selectedSurveyor || !expiryDate || isLoading}
                style={{
                  background: !selectedLink || !selectedSurveyor || !expiryDate || isLoading 
                    ? '#9CA3AF' 
                    : 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: !selectedLink || !selectedSurveyor || !expiryDate || isLoading 
                    ? 'none' 
                    : '0 4px 15px rgba(0, 94, 184, 0.3)'
                }}
                className="w-full px-4 py-2 text-white rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onMouseEnter={(e) => {
                  if (!(!selectedLink || !selectedSurveyor || !expiryDate || isLoading)) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 94, 184, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!selectedLink || !selectedSurveyor || !expiryDate || isLoading)) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 94, 184, 0.3)';
                  }
                }}
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Assigning...' : 'Assign Surveyor'}
              </button>
            </div>
      </div>

          {/* Search Surveyors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Surveyors</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search surveyors by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Available Surveyors List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Surveyors ({filteredSurveyors.length})
            </h2>

            {filteredSurveyors.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No surveyors found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSurveyors.map((surveyor) => (
                  <div
                    key={surveyor.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {surveyor.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{surveyor.username}</p>
                        <p className="text-xs text-gray-500 truncate">{surveyor.email}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          ID: {surveyor.id}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
