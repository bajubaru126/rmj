import { useState, useEffect } from 'react';
import { OrbitProgress } from 'react-loading-indicators';
import { Plus } from 'lucide-react';
import { MaterialData, materialService } from '@/services/materialService';
import { MaterialDetailModal } from '@/components/modals/material/MaterialDetailModal';
import { CreateMaterialModal } from '@/components/modals/material/CreateMaterialModal';
import { authService } from '@/services/authService';
import { projectService, Project } from '@/services/projectService';
import { linkService } from '@/services/linkService';

export function Material() {
    const [materialData, setMaterialData] = useState<MaterialData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchMaterialData();
    }, []);

    const fetchMaterialData = async () => {
        setIsLoading(true);
        try {
            const token = authService.getToken();

            // Fetch all projects first
            const projects = await projectService.getAllProjects(token);
            console.log('📦 Projects fetched:', projects);

            // Create a map of projects for quick lookup
            const projectMap = new Map<string, Project>();
            projects.forEach(project => {
                let projectId = '';
                if (typeof project.id === 'string') {
                    projectId = project.id;
                } else if (project.id && typeof project.id === 'object') {
                    if ('id' in project.id) {
                        const nestedId = (project.id as any).id;
                        projectId = typeof nestedId === 'string' ? nestedId : nestedId?.String || '';
                    }
                }
                if (projectId) {
                    projectMap.set(projectId, project);
                }
            });

            // Fetch all links for all projects
            const allMaterialData: MaterialData[] = [];
            
            for (const project of projects) {
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
                    // Fetch links for this project
                    const links = await linkService.getLinksByProjectId(projectId, token);
                    console.log(`🔗 Links for project ${project.name}:`, links);

                    // For each link, fetch material summary
                    for (const link of links) {
                        const linkId = typeof link.id.id === 'string' ? link.id.id : link.id.id.String;
                        
                        try {
                            const summary = await materialService.getMaterialSummaryByLink(linkId, token);
                            console.log(`📊 Summary for link ${link.link_name}:`, summary);

                            // Extract regional name from link
                            const regionalName = link.regional 
                              ? (typeof link.regional === 'string' ? link.regional : (link.regional as any).name || 'Unknown')
                              : '-';

                            allMaterialData.push({
                                id: `${projectId}_${linkId}`,
                                project_id: projectId,
                                project_name: project.name,
                                no_kontrak: project.no_kontrak || '-',
                                link_id: linkId,
                                link_name: link.link_name,
                                regional: regionalName, // NEW: From link.regional
                                witel: link.witel || '-', // NEW: From link.witel
                                total_material: summary.total_materials
                            });
                        } catch (error) {
                            console.error(`Error fetching summary for link ${linkId}:`, error);
                            // Skip this link if summary fetch fails
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching links for project ${projectId}:`, error);
                    // Skip this project if links fetch fails
                }
            }

            console.log('✅ Final material data:', allMaterialData);
            setMaterialData(allMaterialData);
        } catch (error) {
            console.error('Error fetching material data:', error);
            // Fallback to empty array on error
            setMaterialData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRowClick = (item: MaterialData) => {
        setSelectedMaterial(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMaterial(null);
    };

    return (
        <div className="flex flex-col h-full gap-4 p-6 overflow-hidden min-w-0">{/* Add overflow-hidden and min-w-0 */}
            {/* Material Table */}
            <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden min-w-0" style={{ minHeight: '500px' }}>{/* Add min-w-0 */}
                <div className="p-4 border-b border-gray-100/50 bg-white/40 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-[#15396C] text-lg">Material Data</h3>
                        <p className="text-xs text-gray-500">
                            View material data grouped by project and link
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-white"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)',
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Create Material
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 min-w-0">{/* Change to overflow-y-auto and add min-w-0 */}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
                        </div>
                    ) : (
                        <div className="relative border border-gray-200 rounded-lg overflow-hidden min-w-0">{/* Change to overflow-hidden and add min-w-0 */}
                            <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>{/* Add wrapper with explicit width */}
                            <table className="w-full text-left text-sm border-collapse" style={{ minWidth: '1200px', width: '1200px' }}>{/* Set explicit width */}
                                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 min-w-[300px]">Project Name</th>
                                        <th className="p-4 min-w-[180px]">No. Kontrak</th>
                                        <th className="p-4 min-w-[250px]">Link / Ruas</th>
                                        <th className="p-4 min-w-[150px]">Region</th>
                                        <th className="p-4 min-w-[150px]">Location</th>
                                        <th className="p-4 min-w-[150px]">Total Material</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {materialData.map((item, index) => {
                                        // Check if this is the first row of a project group
                                        const currentProjectId = item.project_id;
                                        const previousRow = index > 0 ? materialData[index - 1] : null;
                                        const isFirstInGroup = !previousRow || previousRow.project_id !== currentProjectId;

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => handleRowClick(item)}
                                                className="hover:bg-blue-50 group transition border-b border-gray-100 last:border-b-0 cursor-pointer"
                                            >
                                                <td className={`p-4 ${isFirstInGroup ? 'font-bold text-[#15396C]' : 'text-gray-400 pl-8'}`}>
                                                    {isFirstInGroup ? item.project_name : ''}
                                                </td>
                                                <td className={`p-4 ${isFirstInGroup ? 'font-semibold text-gray-700' : ''}`}>
                                                    {isFirstInGroup ? item.no_kontrak : ''}
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-semibold text-[#15396C]">{item.link_name}</span>
                                                </td>
                                                <td className="p-4 text-gray-600">{item.region}</td>
                                                <td className="p-4 text-gray-600">{item.location}</td>
                                                <td className="p-4 font-mono font-semibold text-[#15396C]">
                                                    {item.total_material.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {materialData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                                                No material data found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>{/* Close overflow-x-auto wrapper */}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>

            {/* Material Detail Modal */}
            {selectedMaterial && (
                <MaterialDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    linkName={selectedMaterial.link_name}
                    projectName={selectedMaterial.project_name}
                    projectId={selectedMaterial.project_id}
                    linkId={selectedMaterial.link_id}
                    onMaterialChanged={fetchMaterialData}
                />
            )}

            {/* Create Material Modal */}
            <CreateMaterialModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onMaterialCreated={fetchMaterialData}
            />
        </div>
    );
}
