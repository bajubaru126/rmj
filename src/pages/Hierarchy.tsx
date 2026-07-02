import { useState, useEffect } from 'react';
import { Search, Upload } from 'lucide-react';
import { hierarchyService, HierarchyResponse } from '@/services/hierarchyService';
import { UploadHierarchyModal } from '@/components/modals/hierarchy/UploadHierarchyModal';
import { ViewHierarchyModal } from '@/components/modals/hierarchy/ViewHierarchyModal';
import { EditHierarchyModal } from '@/components/modals/hierarchy/EditHierarchyModal';
import { HierarchyTable } from '@/components/hierarchy/HierarchyTable';
import { toast } from 'sonner';
import { OrbitProgress } from 'react-loading-indicators';

export function Hierarchy() {
  const [hierarchies, setHierarchies] = useState<HierarchyResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHierarchy, setSelectedHierarchy] = useState<HierarchyResponse | null>(null);

  useEffect(() => {
    fetchHierarchies();
  }, []);

  const fetchHierarchies = async () => {
    try {
      setLoading(true);
      console.log('Fetching hierarchies from API...');
      
      try {
        const data = await hierarchyService.getAllHierarchies();
        console.log('Hierarchies fetched:', data);
        console.log('Number of records:', data.length);
        if (data.length > 0) {
          console.log('First record keys:', Object.keys(data[0]));
          console.log('Number of fields in first record:', Object.keys(data[0]).length);
        }
        setHierarchies(data);
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        
        // Check if it's a network/connection error
        if (apiError.message?.includes('fetch') || apiError.message?.includes('Failed')) {
          console.log('Backend not available, using mock data...');
          toast.info('Backend not available - Using sample data for preview');
        } else {
          toast.error('Failed to load hierarchies from server');
        }
        
        // Use mock data if API fails (for development)
        const mockData: HierarchyResponse[] = [{
          id: { tb: 'hierarchy', id: { String: 'mock-id-1' } },
          project_id: 'PRJ-2024-001',
          project_name: 'Project Alpha - FTTH Jakarta',
          po_number: 'PO-2024-001',
          actual_site_id: 'SITE-001',
          actual_site_name: 'Site Jakarta Pusat',
          customer: 'PT Telkom Indonesia',
          status_project: 'On Progress',
          po_value_idr: 5000000000,
          current_position: 'Installation Phase',
          survey_actual_progress: 100,
          po_customer: 'PT Telkom Indonesia',
          segment: 'Enterprise',
          portfolio: 'FO',
          product: 'FTTH',
        }];
        
        setHierarchies(mockData);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
      setHierarchies([]); // Set empty array on unexpected error
    } finally {
      setLoading(false);
    }
  };

  const handleView = (hierarchy: HierarchyResponse) => {
    setSelectedHierarchy(hierarchy);
    setShowViewModal(true);
  };

  const handleEdit = (hierarchy: HierarchyResponse) => {
    setSelectedHierarchy(hierarchy);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hierarchy record?')) {
      return;
    }

    try {
      await hierarchyService.deleteHierarchy(id);
      toast.success('Hierarchy deleted successfully');
      fetchHierarchies();
    } catch (error) {
      console.error('Error deleting hierarchy:', error);
      toast.error('Failed to delete hierarchy');
    }
  };

  const getHierarchyId = (id: any): string => {
    if (typeof id === 'string') return id;
    if (typeof id.id === 'string') return id.id;
    return id.id.String || '';
  };



  const filteredHierarchies = hierarchies.filter(h => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      h.project_name?.toLowerCase().includes(query) ||
      h.wpid?.toLowerCase().includes(query) ||
      h.po_number?.toLowerCase().includes(query) ||
      h.actual_site_name?.toLowerCase().includes(query) ||
      h.actual_site_id?.toLowerCase().includes(query) ||
      h.customer?.toLowerCase().includes(query) ||
      h.mitra?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center">
          <OrbitProgress color="#005EB8" size="medium" text="" textColor="" />
          <p className="text-sm text-gray-600 mt-4">Loading hierarchies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by project name, ID, PO number, or site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#005EB8] text-white rounded-lg text-sm hover:bg-[#004a94] flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload KKP
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <HierarchyTable
          hierarchies={filteredHierarchies}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getHierarchyId={getHierarchyId}
        />
      </div>

      <UploadHierarchyModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchHierarchies}
      />

      <ViewHierarchyModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        hierarchy={selectedHierarchy}
      />

      <EditHierarchyModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={fetchHierarchies}
        hierarchyId={selectedHierarchy ? getHierarchyId(selectedHierarchy.id) : ''}
        initialData={selectedHierarchy}
      />
    </div>
  );
}
