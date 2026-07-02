import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2 } from 'lucide-react';
import { CreateKOMModal, KOMFormData } from '@/components/modals/kom/CreateKOMModal';
import { EditKOMModal } from '@/components/modals/kom/EditKOMModal';
import { DeleteKOMModal } from '@/components/modals/kom/DeleteKOMModal';
import { ViewKOMModal } from '@/components/modals/kom/ViewKOMModal';
import { komService, type KOM, type CreateKOMRequest, type UpdateKOMRequest } from '@/services/komService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function KOM() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [komList, setKomList] = useState<KOM[]>([]);
  const [selectedKOM, setSelectedKOM] = useState<KOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    loadKOMs();
  }, [token]);

  const loadKOMs = async () => {
    try {
      setLoading(true);
      const data = await komService.getAllKOMs(token);
      setKomList(data);
    } catch (error: any) {
      console.error('Failed to load KOMs:', error);
      toast.error(error.message || 'Failed to load KOMs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKOM = async (formData: KOMFormData) => {
    try {
      setUploading(true);

      // Upload files first
      let momFilePath: string | null = null;
      let otherDocsFilePaths: string[] = [];

      if (formData.komMomFile) {
        const momResponse = await komService.uploadKOMMoM(formData.komMomFile, token);
        momFilePath = momResponse.file_path;
      }

      if (formData.otherDocsFiles.length > 0) {
        const docsResponse = await komService.uploadKOMDocs(formData.otherDocsFiles, token);
        otherDocsFilePaths = docsResponse.file_paths;
      }

      // Create KOM with file paths
      const createData: CreateKOMRequest = {
        project_id: formData.projectId,
        project_name: formData.projectName,
        kom_start_date: new Date(formData.komStartDate).toISOString(),
        kom_end_date: new Date(formData.komEndDate).toISOString(),
        kom_venue: formData.komVenue || null,
        kom_mom_file: momFilePath,
        other_docs_files: otherDocsFilePaths,
        remarks: formData.remarks,
        status: 'completed',
      };

      console.log('Creating KOM with data:', createData);
      await komService.createKOM(createData, token);
      toast.success('KOM created successfully!');
      setIsCreateModalOpen(false);
      loadKOMs();
    } catch (error: any) {
      console.error('Failed to create KOM:', error);
      toast.error(error.message || 'Failed to create KOM');
    } finally {
      setUploading(false);
    }
  };

  const handleEditKOM = async (id: string, formData: KOMFormData) => {
    try {
      setUploading(true);

      // Get existing KOM to preserve old files if not changed
      const existingKOM = komList.find(k => extractId(k.id) === id);
      if (!existingKOM) {
        throw new Error('KOM not found');
      }

      // Upload new files if provided
      let momFilePath = existingKOM.kom_mom_file;
      let otherDocsFilePaths = existingKOM.other_docs_files;

      if (formData.komMomFile) {
        // Delete old file if exists
        if (existingKOM.kom_mom_file) {
          await komService.deleteKOMFile(existingKOM.kom_mom_file, token).catch(() => {});
        }
        const momResponse = await komService.uploadKOMMoM(formData.komMomFile, token);
        momFilePath = momResponse.file_path;
      }

      if (formData.otherDocsFiles.length > 0) {
        // Delete old files
        for (const oldFile of existingKOM.other_docs_files) {
          await komService.deleteKOMFile(oldFile, token).catch(() => {});
        }
        const docsResponse = await komService.uploadKOMDocs(formData.otherDocsFiles, token);
        otherDocsFilePaths = docsResponse.file_paths;
      }

      // Update KOM
      const updateData: UpdateKOMRequest = {
        project_name: formData.projectName,
        kom_start_date: new Date(formData.komStartDate).toISOString(),
        kom_end_date: new Date(formData.komEndDate).toISOString(),
        kom_venue: formData.komVenue || null,
        kom_mom_file: momFilePath,
        other_docs_files: otherDocsFilePaths,
        remarks: formData.remarks,
        status: 'completed',
      };

      await komService.updateKOM(id, updateData, token);
      toast.success('KOM updated successfully!');
      setIsEditModalOpen(false);
      loadKOMs();
    } catch (error: any) {
      console.error('Failed to update KOM:', error);
      toast.error(error.message || 'Failed to update KOM');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteKOM = async () => {
    if (!selectedKOM) return;

    try {
      const id = extractId(selectedKOM.id);
      
      // Delete associated files first
      if (selectedKOM.kom_mom_file) {
        await komService.deleteKOMFile(selectedKOM.kom_mom_file, token).catch(() => {});
      }
      for (const file of selectedKOM.other_docs_files) {
        await komService.deleteKOMFile(file, token).catch(() => {});
      }

      // Delete KOM
      await komService.deleteKOM(id, token);
      toast.success('KOM deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedKOM(null);
      loadKOMs();
    } catch (error: any) {
      console.error('Failed to delete KOM:', error);
      toast.error(error.message || 'Failed to delete KOM');
    }
  };

  const handleViewKOM = (kom: KOM) => {
    setSelectedKOM(kom);
    setIsViewModalOpen(true);
  };

  // Helper to extract ID from Thing object
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

  const getStatusBadge = (status: KOM['status']) => {
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
    kom.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#005EB8] text-white rounded-lg hover:bg-[#004a94] transition-colors disabled:opacity-50"
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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#005EB8]"></div>
            <p className="ml-3 text-gray-600">Loading KOMs...</p>
          </div>
        ) : (
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
                    <div className="col-span-2">Project Name</div>
                    <div className="col-span-2">Venue</div>
                    <div className="col-span-2">KOM Start Date</div>
                    <div className="col-span-2">KOM End Date</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Documents</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200">
                  {filteredKomList.map((kom) => (
                    <div key={extractId(kom.id)} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-900">{kom.project_name}</p>
                        {kom.remarks && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{kom.remarks}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-700">{kom.kom_venue || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-700">{formatDate(kom.kom_start_date)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-700">{formatDate(kom.kom_end_date)}</p>
                      </div>
                      <div className="col-span-1">
                        {getStatusBadge(kom.status)}
                      </div>
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          {kom.kom_mom_file && (
                            <a 
                              href={komService.getFileUrl(kom.kom_mom_file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              📄 KOM MoM
                            </a>
                          )}
                          {kom.other_docs_files.length > 0 && (
                            <p className="text-xs text-gray-600">
                              📎 {kom.other_docs_files.length} Other Doc(s)
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
        )}
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

      <ViewKOMModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        komData={selectedKOM}
      />

      <DeleteKOMModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteKOM}
        komName={selectedKOM?.project_name || ''}
      />

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8] mb-4"></div>
            <p className="text-gray-700">Uploading files...</p>
          </div>
        </div>
      )}
    </div>
  );
}
