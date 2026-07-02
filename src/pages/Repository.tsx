import { useState, useEffect } from 'react';
import { 
  FileText, Download, Search, ChevronDown, ChevronRight,
  Folder, FolderOpen, Link2, File, FileSpreadsheet,
  Image, FileCode, Eye, AlertCircle, Loader2
} from 'lucide-react';
import { getAllProjects, ProjectResponse, extractId } from '@/services/contractService';
import { evidenceService, type EvidenceDocument } from '@/services/evidenceService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProjectWithDocuments {
  id: string;
  name: string;
  // regional is now per-link, not per-project
  ssLinks: SSLinkWithDocuments[];
  contractDocuments: EvidenceDocument[];
  otherDocuments: EvidenceDocument[];
}

interface SSLinkWithDocuments {
  id: string;
  name: string;
  documents: EvidenceDocument[];
}

const FileIcon = ({ fileType }: { fileType: string }) => {
  const iconClass = "w-6 h-6";
  switch (fileType) {
    case 'pdf': return <FileText className={`${iconClass} text-red-500`} />;
    case 'docx': return <FileText className={`${iconClass} text-blue-500`} />;
    case 'xlsx': return <FileSpreadsheet className={`${iconClass} text-green-500`} />;
    case 'dwg': return <FileCode className={`${iconClass} text-purple-500`} />;
    case 'kml': return <FileCode className={`${iconClass} text-orange-500`} />;
    case 'jpg':
    case 'png': return <Image className={`${iconClass} text-pink-500`} />;
    default: return <File className={`${iconClass} text-gray-500`} />;
  }
};

const DocumentCard = ({ document }: { document: EvidenceDocument }) => {
  const fileInfo = evidenceService.getFileTypeInfo(document.file_type, document.file_category);
  const formattedSize = evidenceService.formatFileSize(document.file_size);
  const formattedDate = evidenceService.formatDate(document.created_at);
  const categoryName = evidenceService.getCategoryDisplayName(document.file_category);

  const handleDownload = () => {
    evidenceService.downloadDocument(document.file_path);
    toast.success(`Downloading ${document.file_name}`);
  };

  return (
    <div className="group bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-lg p-2 transition-all duration-200 hover:shadow-md flex items-center gap-2 min-h-[60px]">
      <div className="flex-shrink-0 p-2 bg-gray-50 group-hover:bg-blue-100 rounded-md transition-colors">
        <FileIcon fileType={fileInfo.type} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
          {document.file_name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{categoryName}</span>
          <span className="text-[10px] text-gray-500">{formattedSize}</span>
          <span className="text-[10px] text-gray-400">{formattedDate}</span>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleDownload} className="p-1.5 hover:bg-blue-100 rounded transition-colors" title="Preview">
          <Eye className="w-3.5 h-3.5 text-blue-600" />
        </button>
        <button onClick={handleDownload} className="p-1.5 hover:bg-green-100 rounded transition-colors" title="Download">
          <Download className="w-3.5 h-3.5 text-green-600" />
        </button>
      </div>
    </div>
  );
};

export function Repository() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectsWithDocs, setProjectsWithDocs] = useState<ProjectWithDocuments[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedLinkIds, setExpandedLinkIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await getAllProjects(token);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDocuments = async (projectId: string) => {
    try {
      setIsLoadingDocs(true);
      console.log('Fetching documents for project:', projectId);
      
      const project = projects.find(p => extractId(p.id) === projectId);
      if (!project) {
        console.error('Project not found:', projectId);
        return;
      }

      // Fetch grouped documents by links
      let ssLinks: SSLinkWithDocuments[] = [];
      let contractDocs: EvidenceDocument[] = [];
      let otherDocs: EvidenceDocument[] = [];
      
      try {
        const groupedDocs = await evidenceService.getDocumentsGroupedByLinks(projectId, token);
        console.log('Grouped docs response:', groupedDocs);
        
        // Process each link
        groupedDocs.links.forEach(link => {
          const linkDocs: EvidenceDocument[] = [];
          
          link.documents.forEach(doc => {
            // Separate by category
            if (doc.file_category === 'contract_document') {
              contractDocs.push(doc);
            } else if (doc.file_category === 'other_document_project' || doc.file_category === 'other_document_kom') {
              otherDocs.push(doc);
            } else {
              // All other categories go to SS Link documents
              linkDocs.push(doc);
            }
          });

          // Only add link if it has documents
          if (linkDocs.length > 0) {
            ssLinks.push({
              id: link.link_id,
              name: link.link_id.replace(/_/g, ' ').toUpperCase(),
              documents: linkDocs
            });
          }
        });

        console.log('Processed:', {
          contractDocs: contractDocs.length,
          otherDocs: otherDocs.length,
          ssLinks: ssLinks.length
        });

      } catch (err) {
        console.error('Error fetching grouped docs:', err);
        toast.error('Failed to load documents');
      }

      const projectWithDocs: ProjectWithDocuments = {
        id: projectId,
        name: project.name,
        // regional is now per-link, not per-project
        contractDocuments: contractDocs,
        otherDocuments: otherDocs,
        ssLinks
      };

      console.log('Project with docs:', projectWithDocs);

      setProjectsWithDocs(prev => {
        const filtered = prev.filter(p => p.id !== projectId);
        return [...filtered, projectWithDocs];
      });
    } catch (error) {
      console.error('Error fetching project documents:', error);
      toast.error(`Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
    // regional is now per-link, not per-project
  );

  const toggleProject = (projectId: string) => {
    const cleanId = extractId(projectId);
    if (expandedProjectId === cleanId) {
      setExpandedProjectId(null);
      setExpandedLinkIds(new Set());
    } else {
      setExpandedProjectId(cleanId);
      setExpandedLinkIds(new Set());
      fetchProjectDocuments(cleanId);
    }
  };

  const toggleLink = (linkId: string) => {
    const newExpandedLinks = new Set(expandedLinkIds);
    if (newExpandedLinks.has(linkId)) {
      newExpandedLinks.delete(linkId);
    } else {
      newExpandedLinks.add(linkId);
    }
    setExpandedLinkIds(newExpandedLinks);
  };

  const getProjectWithDocs = (projectId: string): ProjectWithDocuments | undefined => {
    return projectsWithDocs.find(p => p.id === projectId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Document Repository</h1>
              <p className="text-sm text-gray-500">Centralized storage for all project documentation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search projects by name or region..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-0">
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500 text-lg">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No projects found</p>
            </div>
          ) : (
            filteredProjects.map((project, projectIdx) => {
              const projectId = extractId(project.id);
              const isExpanded = expandedProjectId === projectId;
              const projectWithDocs = getProjectWithDocs(projectId);
              
              return (
                <div key={`project-${projectId}-${projectIdx}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button onClick={() => toggleProject(project.id)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-blue-50/50 transition-colors">
                    <div className="flex-shrink-0">
                      {isExpanded ? <FolderOpen className="w-6 h-6 text-blue-600" fill="currentColor" /> : <Folder className="w-6 h-6 text-gray-600" fill="currentColor" />}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-bold text-gray-800">{project.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {projectWithDocs && <>{projectWithDocs.ssLinks.length} SS Links</>}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {isLoadingDocs ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                      ) : projectWithDocs ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <h4 className="text-sm font-bold text-blue-900">Contract Documents</h4>
                                <span className="ml-auto text-xs text-blue-600 font-medium">{projectWithDocs.contractDocuments.length} files</span>
                              </div>
                              {projectWithDocs.contractDocuments.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {projectWithDocs.contractDocuments.map((doc, idx) => <DocumentCard key={`${doc.id}-contract-${idx}`} document={doc} />)}
                                </div>
                              ) : <div className="text-center py-4 text-gray-400 text-sm">No documents</div>}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                                <FileText className="w-4 h-4 text-purple-600" />
                                <h4 className="text-sm font-bold text-purple-900">Other Documents</h4>
                                <span className="ml-auto text-xs text-purple-600 font-medium">{projectWithDocs.otherDocuments.length} files</span>
                              </div>
                              {projectWithDocs.otherDocuments.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {projectWithDocs.otherDocuments.map((doc, idx) => <DocumentCard key={`${doc.id}-other-${idx}`} document={doc} />)}
                                </div>
                              ) : <div className="text-center py-4 text-gray-400 text-sm">No documents</div>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                              <Link2 className="w-4 h-4 text-green-600" />
                              <h4 className="text-sm font-bold text-green-900">SS Links</h4>
                              <span className="ml-auto text-xs text-green-600 font-medium">{projectWithDocs.ssLinks.length} links</span>
                            </div>
                            {projectWithDocs.ssLinks.length > 0 ? (
                              <div className="pl-6 space-y-2">
                                {projectWithDocs.ssLinks.map((link, linkIdx) => {
                                  const isLinkExpanded = expandedLinkIds.has(link.id);
                                  return (
                                    <div key={`link-${projectId}-${link.id}-${linkIdx}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                      <button onClick={() => toggleLink(link.id)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-shrink-0">
                                          {isLinkExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                        </div>
                                        <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <div className="flex-1 text-left">
                                          <p className="text-sm font-semibold text-gray-800">{link.name}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">{link.documents.length} documents</p>
                                        </div>
                                      </button>
                                      {isLinkExpanded && (
                                        <div className="px-4 pb-3 bg-gray-50/50">
                                          {link.documents.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                              {link.documents.map((doc, idx) => <DocumentCard key={`${doc.id}-link-${link.id}-${idx}`} document={doc} />)}
                                            </div>
                                          ) : <div className="text-center py-4 text-gray-400 text-sm">No documents</div>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <div className="text-center py-4 text-gray-400 text-sm">No SS Links</div>}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Failed to load documents</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
