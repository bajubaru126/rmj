import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search, RefreshCw, X, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { vendorService, type Vendor, type CreateVendorRequest, type UpdateVendorRequest } from '@/services/vendorService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type ModalType = 'create' | 'edit' | 'delete' | null;
type SortField = 'name' | 'code' | 'email' | 'created_at' | null;
type SortOrder = 'asc' | 'desc';

export function VendorManagement() {
  const { user: currentUser } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    is_super_vendor: false,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const data = await vendorService.getAllVendors();
      setVendors(data);
    } catch (error) {
      toast.error('Gagal memuat data vendor');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (type: 'create' | 'edit' | 'delete', vendor?: Vendor) => {
    setModalType(type);
    
    if (type === 'delete' && vendor) {
      setDeletingVendor(vendor);
    } else if (type === 'edit' && vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        code: vendor.code,
        address: vendor.address || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        is_super_vendor: vendor.is_super_vendor || false,
      });
    } else if (type === 'create') {
      setEditingVendor(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        is_super_vendor: false,
      });
    }
  };
  const handleCloseModal = () => {
    setModalType(null);
    setEditingVendor(null);
    setDeletingVendor(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      is_super_vendor: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingVendor) {
        // For update, only send fields that can be updated (exclude code and is_super_vendor)
        const updateData: UpdateVendorRequest = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        };
        
        await vendorService.updateVendor(editingVendor.id.replace('vendor:', ''), updateData);
        toast.success('Vendor berhasil diupdate');
      } else {
        // For create, send all fields
        const createData: CreateVendorRequest = {
          name: formData.name,
          code: formData.code,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          is_super_vendor: formData.is_super_vendor,
        };
        
        await vendorService.createVendor(createData);
        toast.success('Vendor berhasil ditambahkan');
      }
      handleCloseModal();
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVendor) return;
    
    setIsSubmitting(true);
    try {
      await vendorService.deleteVendor(deletingVendor.id.replace('vendor:', ''));
      toast.success('Vendor berhasil dihapus');
      handleCloseModal();
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.email && vendor.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle date sorting
    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle string sorting
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const getModalConfig = () => {
    switch (modalType) {
      case 'create':
        return {
          title: 'Tambah Vendor Baru',
          color: 'blue',
          icon: Plus,
        };
      case 'edit':
        return {
          title: 'Edit Vendor',
          color: 'blue',
          icon: Edit2,
        };
      case 'delete':
        return {
          title: 'Hapus Vendor',
          color: 'red',
          icon: AlertTriangle,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  // Check if current user is teknisi_lapangan - they shouldn't access this page
  if (currentUser && 'role' in currentUser && currentUser.role === 'teknisi_lapangan') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <p className="text-sm text-gray-500 mt-2">Halaman Vendor Management hanya dapat diakses oleh Admin.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Vendor Management</h1>
              <p className="text-sm text-gray-500">Kelola data vendor sistem</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchVendors}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => handleOpenModal('create')}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 15px rgba(0, 94, 184, 0.3)'
              }}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all hover:shadow-lg"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 94, 184, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 94, 184, 0.3)';
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Vendor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500">Memuat data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Nama Vendor</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Kode</span>
                        {getSortIcon('code')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Alamat
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Telepon
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Email</span>
                        {getSortIcon('email')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Super Vendor
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Created At</span>
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">
                            {searchQuery ? 'Tidak ada vendor yang ditemukan' : 'Tidak ada data vendor'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Silakan tambahkan vendor baru'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-mono">{vendor.code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {vendor.address || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{vendor.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{vendor.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              vendor.is_super_vendor 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {vendor.is_super_vendor ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(vendor.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', vendor)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit vendor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal('delete', vendor)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus vendor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        {!isLoading && sortedVendors.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Menampilkan <span className="font-semibold">{sortedVendors.length}</span> dari{' '}
              <span className="font-semibold">{vendors.length}</span> vendor
              {sortField && (
                <span className="ml-2 text-xs text-gray-500">
                  • Sorted by {sortField} ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Modal Backdrop & Content */}
      {modalType && modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          ></div>

          {/* Modal Content */}
          <div 
            className="relative bg-white shadow-2xl w-full flex flex-col" 
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              maxHeight: '85vh',
              maxWidth: '600px',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              className="p-6 flex items-center justify-between relative"
              style={{ 
                background: modalConfig.color === 'blue'
                  ? 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0
              }}
            >
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <modalConfig.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white" style={{ fontWeight: 900 }}>
                    {modalConfig.title}
                  </h3>
                  <p className="text-sm text-white/90 mt-0.5" style={{ fontWeight: 500 }}>
                    {modalType === 'delete' 
                      ? 'Konfirmasi penghapusan vendor'
                      : modalType === 'edit'
                      ? 'Update informasi vendor'
                      : 'Tambahkan vendor baru ke sistem'
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="p-2 hover:bg-white/20 rounded-lg transition-all relative z-10"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="absolute inset-0 opacity-20" style={{ 
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 60%)'
              }}></div>
            </div>

            {/* Modal Body */}
            <div 
              className="p-6" 
              style={{ 
                background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
                overflowY: 'auto',
                flexShrink: 1,
                flexGrow: 1
              }}
            >
              {modalType === 'delete' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-2 text-base">
                        Apakah Anda yakin ingin menghapus vendor ini?
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Data vendor berikut akan dihapus secara permanen:
                      </p>
                      <div className="bg-white rounded-lg p-3 space-y-2 border border-red-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Nama:</span>
                          <span className="text-sm text-gray-900 font-medium">{deletingVendor?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Kode:</span>
                          <span className="text-sm text-gray-900 font-medium">{deletingVendor?.code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Email:</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {deletingVendor?.email || '-'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-red-600 font-medium mt-3">
                        ⚠️ Tindakan ini tidak dapat dibatalkan!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Nama Vendor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="PT Vendor Indonesia"
                      required
                      disabled={isSubmitting}
                      minLength={3}
                      maxLength={100}
                    />
                  </div>
                  {!editingVendor && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Kode Vendor <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                        placeholder="VND001"
                        required={!editingVendor}
                        disabled={isSubmitting}
                        minLength={2}
                        maxLength={20}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Kode unik vendor (2-20 karakter). Tidak dapat diubah setelah dibuat.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Alamat
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                      placeholder="Jl. Sudirman No. 123, Jakarta"
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Telepon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="+62812345678"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="contact@vendor.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {!editingVendor && (
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.is_super_vendor}
                          onChange={(e) => setFormData({ ...formData, is_super_vendor: e.target.checked })}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isSubmitting}
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Super Vendor</span>
                          <p className="text-xs text-gray-500">
                            Tandai sebagai super vendor dengan akses khusus
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-6 border-t border-gray-200 flex justify-end gap-3" 
              style={{ 
                background: 'linear-gradient(to top, #f9fafb 0%, #ffffff 100%)',
                flexShrink: 0
              }}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Batal
              </button>
              {modalType === 'delete' ? (
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus Vendor
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(0, 94, 184, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 94, 184, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 94, 184, 0.3)';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editingVendor ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingVendor ? 'Update Vendor' : 'Tambah Vendor'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}