import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2 } from 'lucide-react';
import { CreateKOMModal, KOMFormData } from '@/components/modals/kom/CreateKOMModal';
import { EditKOMModal } from '@/components/modals/kom/EditKOMModal';
import { DeleteKOMModal } from '@/components/modals/kom/DeleteKOMModal';
import { toast } from 'sonner';

interface KOMData extends KOMFormData {
  id: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'in-progress';
}

const KOM_STORAGE_KEY = 'kom_data';

export function KOM() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [komList, setKomList] = useState<KOMData[]>([]);
  const [selectedKOM, setSelectedKOM] = useState<KOMData | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(KOM_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setKomList(parsed);
      } catch (error) {
        console.error('Error loading KOM data:', error);
        toast.error('Failed to load KOM data');
      }
    }
  }, []);

  // Save to localStorage whenever komList changes
  useEffect(() => {
    if (komList.length > 0) {
      localStorage.setItem(KOM_STORAGE_KEY, JSON.stringify(komList));
    }
  }, [komList]);

  const handleCreateKOM = (data: KOMFormData) => {
    const newKOM: KOMData = {
      ...data,
      id: `kom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };
    setKomList([...komList, newKOM]);
    toast.success('KOM created successfully!');
  };

  const handleEditKOM = (id: string, data: KOMFormData) => {
    setKomList(komList.map(kom => 
      kom.id === id 
        ? { ...kom, ...data }
        : kom
    ));
    toast.success('KOM updated successfully!');
  };

  const handleDeleteKOM = () => {
    if (selectedKOM) {
      setKomList(komList.filter(kom => kom.id !== selectedKOM.id));
      localStorage.setItem(KOM_STORAGE_KEY, JSON.stringify(komList.filter(kom => kom.id !== selectedKOM.id)));
      toast.success('KOM deleted successfully!');
      setSelectedKOM(null);
    }
  };

  const handleViewKOM = (kom: KOMData) => {
    toast.info(`Viewing KOM: ${kom.projectName}`);
    // TODO: Implement view modal
  };

  const getStatusBadge = (status: KOMData['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      'in-progress': 'bg-blue-100 text-blue-700'
    };
    const labels = {
      completed: 'Completed',
      pending: 'Pending',
      'in-progress': 'In Progress'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter KOM list based on search query
  const filteredKomList = komList.filter(kom => 
    kom.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kom.remarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kom.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">KOM (Kick Off Meeting)</h1>
            <p className="text-sm text-gray-500 mt-1">Manage Kick Off Meeting documents and data</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Import</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#005EB8] text-white rounded-lg hover:bg-[#004a94] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Tambah KOM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari KOM berdasarkan nama project, tanggal, atau status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005EB8] focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredKomList.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No KOM Found' : 'Belum Ada Data KOM'}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-md">
                {searchQuery 
                  ? 'Try adjusting your search query to find what you\'re looking for.'
                  : 'Mulai tambahkan data Kick Off Meeting untuk project Anda. Klik tombol "Tambah KOM" untuk memulai.'
                }
              </p>
            </div>
          ) : (
            /* Table with Data */
            <>
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Project Name</div>
                  <div className="col-span-2">KOM Start Date</div>
                  <div className="col-span-2">KOM End Date</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Documents</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {filteredKomList.map((kom) => (
                  <div key={kom.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-900">{kom.projectName}</p>
                      {kom.remarks && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{kom.remarks}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">{formatDate(kom.komStartDate)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">{formatDate(kom.komEndDate)}</p>
                    </div>
                    <div className="col-span-2">
                      {getStatusBadge(kom.status)}
                    </div>
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        {kom.komMomFile && (
                          <p className="text-xs text-gray-600">
                            📄 KOM MoM
                          </p>
                        )}
                        {kom.otherDocsFiles.length > 0 && (
                          <p className="text-xs text-gray-600">
                            📎 {kom.otherDocsFiles.length} Other Doc(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleViewKOM(kom)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedKOM(kom);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors" 
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedKOM(kom);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateKOMModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateKOM}
      />

      <EditKOMModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditKOM}
        komData={selectedKOM}
      />

      <DeleteKOMModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteKOM}
        komName={selectedKOM?.projectName || ''}
      />
    </div>
  );
}
