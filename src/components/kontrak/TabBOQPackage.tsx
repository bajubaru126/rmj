import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  boqPackageService, 
  BoqPackageResponse, 
  extractId 
} from '@/services/boqPackageService';
import { CreateBoqPackageModal } from '@/components/modals/boq-package/CreateBoqPackageModal';
import { EditBoqPackageModal } from '@/components/modals/boq-package/EditBoqPackageModal';
import { DeleteBoqPackageModal } from '@/components/modals/boq-package/DeleteBoqPackageModal';
import { toast } from 'sonner';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';

interface TabBOQPackageProps {
  projectId?: string;
  linkId?: string;
}

interface GroupedPackages {
  regionalId: string;
  regionalName: string;
  packages: BoqPackageResponse[];
}

export function TabBOQPackage({ projectId, linkId }: TabBOQPackageProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allPackages, setAllPackages] = useState<BoqPackageResponse[]>([]);
  const [groupedPackages, setGroupedPackages] = useState<GroupedPackages[]>([]);
  const [activePackageTab, setActivePackageTab] = useState<string>('');
  const [activePackages, setActivePackages] = useState<BoqPackageResponse[]>([]);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<BoqPackageResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all BOQ packages to get regional list
  useEffect(() => {
    console.log('🔄 Component mounted, fetching packages...');
    console.log('Token available:', !!token);
    fetchBoqPackages();
  }, [token]);

  // Fetch packages by regional when tab changes
  useEffect(() => {
    if (activePackageTab && token) {
      console.log('🔄 Active tab changed, fetching packages for regional:', activePackageTab);
      fetchPackagesByRegional(activePackageTab);
    }
  }, [activePackageTab, token]);

  const fetchBoqPackages = async () => {
    if (!token) {
      console.warn('⚠️ No token available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Fetching all BOQ packages to get regional list...');
      const data = await boqPackageService.getAllBoqPackages(undefined, token);
      console.log('✅ BOQ packages fetched:', data);
      
      // Handle empty or null data
      if (!data || !Array.isArray(data)) {
        console.warn('⚠️ No data or invalid data format');
        setAllPackages([]);
        setGroupedPackages([]);
        setLoading(false);
        return;
      }
      
      setAllPackages(data);
      
      // Group by regional to get the list of regionals
      const grouped = groupPackagesByRegional(data);
      console.log('📊 Grouped packages:', grouped);
      setGroupedPackages(grouped);
      
      // Set first tab as active
      if (grouped.length > 0 && !activePackageTab) {
        setActivePackageTab(grouped[0].regionalId);
        console.log('✅ Active tab set to:', grouped[0].regionalId);
      }
    } catch (error) {
      console.error('❌ Error fetching BOQ packages:', error);
      
      // Show error details
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast.error('Failed to load BOQ packages. Please check if backend is running.');
      setAllPackages([]);
      setGroupedPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackagesByRegional = async (regionalId: string) => {
    if (!token) {
      console.warn('⚠️ No token available');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Fetching BOQ packages for regional:', regionalId);
      const data = await boqPackageService.getAllBoqPackages(regionalId, token);
      console.log('✅ BOQ packages fetched for regional:', data);
      
      // Handle empty or null data
      if (!data || !Array.isArray(data)) {
        console.warn('⚠️ No data or invalid data format');
        setActivePackages([]);
        setLoading(false);
        return;
      }
      
      setActivePackages(data);
    } catch (error) {
      console.error('❌ Error fetching BOQ packages for regional:', error);
      
      // Show error details
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast.error('Failed to load BOQ packages for this regional.');
      setActivePackages([]);
    } finally {
      setLoading(false);
    }
  };

  const groupPackagesByRegional = (packages: BoqPackageResponse[]): GroupedPackages[] => {
    const grouped = new Map<string, BoqPackageResponse[]>();

    packages.forEach(pkg => {
      const regionalId = extractId(pkg.regional_id);
      const regionalName = pkg.region || `Paket ${regionalId}`;

      if (!grouped.has(regionalId)) {
        grouped.set(regionalId, []);
      }

      grouped.get(regionalId)!.push(pkg);
    });

    // Convert to array
    const result: GroupedPackages[] = [];
    let index = 1;
    grouped.forEach((packages, regionalId) => {
      const regionalName = packages[0]?.region || `Paket ${index}`;
      result.push({
        regionalId,
        regionalName,
        packages,
      });
      index++;
    });

    return result;
  };

  const handleEdit = (pkg: BoqPackageResponse) => {
    setSelectedPackage(pkg);
    setIsEditModalOpen(true);
  };

  const handleDelete = (pkg: BoqPackageResponse) => {
    setSelectedPackage(pkg);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPackage || !token) return;

    setIsDeleting(true);
    try {
      const pkgId = extractId(selectedPackage.id);
      await boqPackageService.deleteBoqPackage(pkgId, token);
      toast.success('BOQ package deleted successfully');
      
      // Refresh both the regional list and current tab data
      await fetchBoqPackages();
      if (activePackageTab) {
        await fetchPackagesByRegional(activePackageTab);
      }
      
      setIsDeleteModalOpen(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error deleting BOQ package:', error);
      toast.error('Failed to delete BOQ package');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuccess = async () => {
    // Refresh both the regional list and current tab data
    await fetchBoqPackages();
    if (activePackageTab) {
      await fetchPackagesByRegional(activePackageTab);
    }
  };

  // AG Grid columns
  const columnDefs: ColDef[] = [
    {
      headerName: 'No',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      pinned: 'left',
    },
    {
      headerName: 'Designator',
      field: 'designator_name',
      flex: 1,
      minWidth: 200,
    },
    {
      headerName: 'Material (Rp)',
      field: 'material',
      flex: 1,
      minWidth: 150,
      type: 'rightAligned',
      valueFormatter: (params) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(params.value || 0);
      },
    },
    {
      headerName: 'Jasa (Rp)',
      field: 'jasa',
      flex: 1,
      minWidth: 150,
      type: 'rightAligned',
      valueFormatter: (params) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(params.value || 0);
      },
    },
    {
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-center gap-2 h-full">
            <button
              onClick={() => handleEdit(params.data)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(params.data)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // Debug logging
  console.log('🔍 Active Package Tab:', activePackageTab);
  console.log('🔍 Active Packages:', activePackages);
  console.log('🔍 Active Packages Length:', activePackages.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Loading BOQ packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">BOQ Package</h3>
            <p className="text-xs text-gray-500">Manage BOQ packages by regional</p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Package
        </button>
      </div>

      {/* Package Tabs (Sub-tabs) */}
      {groupedPackages.length > 0 ? (
        <>
          <div className="flex gap-2 px-6 pt-4 pb-2 bg-gray-50/50">
            {groupedPackages.map((group, index) => (
              <button
                key={group.regionalId}
                onClick={() => setActivePackageTab(group.regionalId)}
                disabled={loading}
                className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition ${
                  activePackageTab === group.regionalId
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-500 hover:bg-white/50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Paket {index + 1}</span>
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activePackageTab === group.regionalId
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {group.packages.length}
                </span>
              </button>
            ))}
          </div>

          {/* AG Grid Table */}
          <div className="flex-1 px-6 pb-4 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-500">Loading packages...</p>
                </div>
              </div>
            ) : (
              <div className="h-full ag-theme-quartz" style={{ width: '100%' }}>
                <AgGridReact
                  rowData={activePackages}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                  }}
                  domLayout="normal"
                  pagination={true}
                  paginationPageSize={20}
                  paginationPageSizeSelector={[10, 20, 50, 100]}
                  suppressCellFocus={true}
                  rowHeight={48}
                  headerHeight={48}
                  animateRows={true}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">No BOQ packages yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add Package" to create your first package</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Package
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateBoqPackageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <EditBoqPackageModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPackage(null);
        }}
        onSuccess={handleSuccess}
        package={selectedPackage}
      />

      <DeleteBoqPackageModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPackage(null);
        }}
        onConfirm={confirmDelete}
        package={selectedPackage}
        loading={isDeleting}
      />
    </div>
  );
}
