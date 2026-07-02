import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Trash2, Search, RefreshCw, X, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download, FileText, Check } from 'lucide-react';
import { userService, type UserData } from '@/services/userService';
import { vendorService, type Vendor } from '@/services/vendorService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type ModalType = 'create' | 'edit' | 'delete' | 'bulk' | null;
type SortField = 'username' | 'email' | 'role' | 'created_at' | null;
type SortOrder = 'asc' | 'desc';

interface BulkUserData {
  username: string;
  email: string;
  password: string;
  role: string;
  vendor_name: string;
  vendor_code: string;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkUsers, setBulkUsers] = useState<BulkUserData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'teknisi_lapangan',
    vendor_id: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Gagal memuat data user');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await vendorService.getAllVendors();
      setVendors(data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const handleOpenModal = (type: 'create' | 'edit' | 'delete' | 'bulk', user?: UserData) => {
    setModalType(type);
    
    if (type === 'delete' && user) {
      setDeletingUser(user);
    } else if (type === 'edit' && user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        username: user.username,
        password: '',
        role: user.role,
        vendor_id: user.vendor_id?.replace('vendor:', '') || '',
      });
    } else if (type === 'create') {
      setEditingUser(null);
      setFormData({
        email: '',
        username: '',
        password: '',
        role: 'teknisi_lapangan',
        vendor_id: '',
      });
    } else if (type === 'bulk') {
      setBulkUsers([]);
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setEditingUser(null);
    setDeletingUser(null);
    setBulkUsers([]);
    setFormData({
      email: '',
      username: '',
      password: '',
      role: 'teknisi_lapangan',
      vendor_id: '',
    });
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/user-import-template.csv';
    link.download = 'user-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template CSV berhasil didownload');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('File harus berformat CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('File CSV kosong atau tidak valid');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const expectedHeaders = ['username', 'email', 'password', 'role', 'vendor_name', 'vendor_code'];
        
        const hasAllHeaders = expectedHeaders.every(h => headers.includes(h));
        if (!hasAllHeaders) {
          toast.error('Format CSV tidak sesuai template. Pastikan header: username, email, password, role, vendor_name, vendor_code');
          return;
        }

        const parsedUsers: BulkUserData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === headers.length) {
            const userObj: any = {};
            headers.forEach((header, index) => {
              userObj[header] = values[index];
            });
            parsedUsers.push(userObj as BulkUserData);
          }
        }

        if (parsedUsers.length === 0) {
          toast.error('Tidak ada data user yang valid dalam file CSV');
          return;
        }

        setBulkUsers(parsedUsers);
        setModalType('bulk');
        toast.success(`Berhasil membaca ${parsedUsers.length} user dari CSV`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Gagal membaca file CSV');
      }
    };

    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkUserChange = (index: number, field: keyof BulkUserData, value: string) => {
    const updated = [...bulkUsers];
    updated[index] = { ...updated[index], [field]: value };
    setBulkUsers(updated);
  };

  const handleBulkVendorSelect = (index: number, value: string) => {
    const updated = [...bulkUsers];
    if (value === 'custom') {
      // Clear for custom input
      updated[index] = { ...updated[index], vendor_name: '', vendor_code: '' };
    } else if (value) {
      // Split and update both fields at once
      const [name, code] = value.split('|');
      updated[index] = { ...updated[index], vendor_name: name, vendor_code: code };
    }
    setBulkUsers(updated);
  };

  const handleRemoveBulkUser = (index: number) => {
    setBulkUsers(bulkUsers.filter((_, i) => i !== index));
  };

  const handleAddBulkUser = () => {
    const newUser: BulkUserData = {
      username: '',
      email: '',
      password: '',
      role: 'teknisi_lapangan',
      vendor_name: '',
      vendor_code: '',
    };
    setBulkUsers([...bulkUsers, newUser]);
  };

  const findOrCreateVendor = async (vendorName: string, vendorCode: string): Promise<string | undefined> => {
    if (!vendorName || !vendorCode) return undefined;

    // Find existing vendor (case-insensitive)
    const existingVendor = vendors.find(
      v => v.name.toLowerCase() === vendorName.toLowerCase() || 
           v.code.toLowerCase() === vendorCode.toLowerCase()
    );

    if (existingVendor) {
      return existingVendor.id.replace('vendor:', '');
    }

    // Create new vendor
    try {
      const newVendor = await vendorService.createVendor({
        name: vendorName,
        code: vendorCode,
        // Don't send empty strings for optional fields to avoid validation errors
      });
      
      // Refresh vendors list
      await fetchVendors();
      
      return newVendor.id.replace('vendor:', '');
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw new Error(`Gagal membuat vendor: ${vendorName}`);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkUsers.length === 0) {
      toast.error('Tidak ada user untuk diimport');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const bulkUser of bulkUsers) {
        try {
          // Validate role
          if (!['admin', 'teknisi_lapangan'].includes(bulkUser.role)) {
            throw new Error(`Role tidak valid: ${bulkUser.role}`);
          }

          // Find or create vendor
          const vendorId = await findOrCreateVendor(bulkUser.vendor_name, bulkUser.vendor_code);

          // Create user
          await userService.createUser({
            username: bulkUser.username,
            email: bulkUser.email,
            password: bulkUser.password,
            role: bulkUser.role,
            vendor_id: vendorId,
          });

          successCount++;
        } catch (error) {
          console.error(`Error creating user ${bulkUser.username}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Berhasil menambahkan ${successCount} user`);
      }
      if (errorCount > 0) {
        toast.error(`Gagal menambahkan ${errorCount} user`);
      }

      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error('Terjadi kesalahan saat bulk import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id.replace('users:', ''), {
          email: formData.email,
          username: formData.username,
          role: formData.role,
          vendor_id: formData.vendor_id || undefined,
        });
        toast.success('User berhasil diupdate');
      } else {
        if (!formData.password) {
          toast.error('Password harus diisi');
          setIsSubmitting(false);
          return;
        }
        await userService.createUser({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          vendor_id: formData.vendor_id || undefined,
        });
        toast.success('User berhasil ditambahkan');
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    setIsSubmitting(true);
    try {
      await userService.deleteUser(deletingUser.id.replace('users:', ''));
      toast.success('User berhasil dihapus');
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error('Gagal menghapus user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
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
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
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

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return '-';
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : vendorId;
  };

  const getModalConfig = () => {
    switch (modalType) {
      case 'create':
        return {
          title: 'Tambah User Baru',
          color: 'blue',
          icon: Plus,
        };
      case 'edit':
        return {
          title: 'Edit User',
          color: 'blue',
          icon: Edit2,
        };
      case 'delete':
        return {
          title: 'Hapus User',
          color: 'red',
          icon: AlertTriangle,
        };
      case 'bulk':
        return {
          title: 'Bulk Import Users',
          color: 'green',
          icon: Upload,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  // Check if current user is teknisi_lapangan - they shouldn't access this page
  if (currentUser?.role === 'teknisi_lapangan' || currentUser?.role === 'surveyor') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <p className="text-sm text-gray-500 mt-2">Halaman User Management hanya dapat diakses oleh Admin.</p>
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
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">Kelola pengguna sistem</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Download template CSV"
            >
              <Download className="w-4 h-4" />
              <span>Template CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                color: 'white'
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.3)';
              }}
            >
              <Upload className="w-4 h-4" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={fetchUsers}
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
              <span>Tambah User</span>
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
            placeholder="Cari user..."
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
                      onClick={() => handleSort('username')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Username</span>
                        {getSortIcon('username')}
                      </div>
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
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Role</span>
                        {getSortIcon('role')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Password
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
                  {sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Tidak ada data user</p>
                          <p className="text-sm text-gray-400">Silakan tambahkan user baru</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Teknisi Lapangan'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{getVendorName(user.vendor_id)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-mono">••••••••</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal('delete', user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus user"
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
        {!isLoading && sortedUsers.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Menampilkan <span className="font-semibold">{sortedUsers.length}</span> dari{' '}
              <span className="font-semibold">{users.length}</span> user
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

          {/* Modal Content - Wider like CreateContractModal */}
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
                  : modalConfig.color === 'orange'
                  ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 0.95) 100%)'
                  : modalConfig.color === 'green'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)'
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
                      ? 'Konfirmasi penghapusan user'
                      : modalType === 'edit'
                      ? 'Update informasi user'
                      : modalType === 'bulk'
                      ? 'Review dan edit data sebelum import'
                      : 'Tambahkan user baru ke sistem'
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
                background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
                overflowY: 'auto',
                flexShrink: 1,
                flexGrow: 1
              }}
            >
              {modalType === 'bulk' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          Review Data Import ({bulkUsers.length} users)
                        </p>
                        <p className="text-xs text-gray-600">
                          Periksa dan edit data sebelum import. Vendor akan dibuat otomatis jika belum ada.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddBulkUser}
                      style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%)',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg whitespace-nowrap"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add User</span>
                    </button>
                  </div>

                  {bulkUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Tidak ada data untuk diimport</p>
                      <p className="text-xs text-gray-400 mt-2">Upload CSV atau klik "Add User" di atas untuk mulai</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {bulkUsers.map((bulkUser, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-700">User #{index + 1}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveBulkUser(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Hapus user ini"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                              <input
                                type="text"
                                value={bulkUser.username}
                                onChange={(e) => handleBulkUserChange(index, 'username', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                              <input
                                type="email"
                                value={bulkUser.email}
                                onChange={(e) => handleBulkUserChange(index, 'email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                              <input
                                type="text"
                                value={bulkUser.password}
                                onChange={(e) => handleBulkUserChange(index, 'password', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                              <select
                                value={bulkUser.role}
                                onChange={(e) => handleBulkUserChange(index, 'role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              >
                                <option value="teknisi_lapangan">Teknisi Lapangan</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor</label>
                              <select
                                value={(() => {
                                  // Check if current values match any existing vendor
                                  if (bulkUser.vendor_name && bulkUser.vendor_code) {
                                    const matchValue = `${bulkUser.vendor_name}|${bulkUser.vendor_code}`;
                                    const hasMatch = vendors.some(v => `${v.name}|${v.code}` === matchValue);
                                    if (hasMatch) {
                                      return matchValue;
                                    }
                                    // If not match, add as dynamic option and select it
                                    return `csv_${matchValue}`;
                                  }
                                  return 'custom';
                                })()}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value.startsWith('csv_')) {
                                    // Extract the actual value from csv_ prefix
                                    const actualValue = value.substring(4);
                                    handleBulkVendorSelect(index, actualValue);
                                  } else {
                                    handleBulkVendorSelect(index, value);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              >
                                <option value="custom">Custom (Input Manual)</option>
                                <optgroup label="Existing Vendors">
                                  {vendors.map((vendor) => (
                                    <option key={vendor.id} value={`${vendor.name}|${vendor.code}`}>
                                      {vendor.name} ({vendor.code})
                                    </option>
                                  ))}
                                </optgroup>
                                {bulkUser.vendor_name && bulkUser.vendor_code && !vendors.some(v => v.name === bulkUser.vendor_name && v.code === bulkUser.vendor_code) && (
                                  <optgroup label="From CSV (Will be created)">
                                    <option value={`csv_${bulkUser.vendor_name}|${bulkUser.vendor_code}`}>
                                      {bulkUser.vendor_name} ({bulkUser.vendor_code})
                                    </option>
                                  </optgroup>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Vendor Name {bulkUser.vendor_name && <span className="text-xs text-gray-400">(Custom)</span>}
                              </label>
                              <input
                                type="text"
                                value={bulkUser.vendor_name}
                                onChange={(e) => handleBulkUserChange(index, 'vendor_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="PT Example"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Vendor Code {bulkUser.vendor_code && <span className="text-xs text-gray-400">(Custom)</span>}
                              </label>
                              <input
                                type="text"
                                value={bulkUser.vendor_code}
                                onChange={(e) => handleBulkUserChange(index, 'vendor_code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="EXMP"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : modalType === 'delete' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-semibold mb-2 text-base">
                        Apakah Anda yakin ingin menghapus user ini?
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Data user berikut akan dihapus secara permanen:
                      </p>
                      <div className="bg-white rounded-lg p-3 space-y-2 border border-red-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Username:</span>
                          <span className="text-sm text-gray-900 font-medium">{deletingUser?.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Email:</span>
                          <span className="text-sm text-gray-900 font-medium">{deletingUser?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-20">Role:</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {deletingUser?.role === 'admin' ? 'Admin' : 'Teknisi Lapangan'}
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
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="user@example.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="username"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="••••••••"
                        required={!editingUser}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSubmitting}
                    >
                      <option value="teknisi_lapangan">Teknisi Lapangan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Vendor <span className="text-gray-400 text-xs font-normal">(Opsional)</span>
                    </label>
                    <select
                      value={formData.vendor_id}
                      onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      disabled={isSubmitting}
                    >
                      <option value="">Pilih Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id.replace('vendor:', '')}>
                          {vendor.name} ({vendor.code})
                        </option>
                      ))}
                    </select>
                  </div>
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
              {modalType === 'bulk' ? (
                <button
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || bulkUsers.length === 0}
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && bulkUsers.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.3)';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Import {bulkUsers.length} Users
                    </>
                  )}
                </button>
              ) : modalType === 'delete' ? (
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
                      Hapus User
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
                    background: modalConfig.color === 'blue'
                      ? 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)'
                      : 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(234, 88, 12, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: modalConfig.color === 'blue'
                      ? '0 4px 15px rgba(0, 94, 184, 0.3)'
                      : '0 4px 15px rgba(249, 115, 22, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = modalConfig.color === 'blue'
                        ? '0 6px 20px rgba(0, 94, 184, 0.4)'
                        : '0 6px 20px rgba(249, 115, 22, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = modalConfig.color === 'blue'
                      ? '0 4px 15px rgba(0, 94, 184, 0.3)'
                      : '0 4px 15px rgba(249, 115, 22, 0.3)';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editingUser ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingUser ? 'Update User' : 'Tambah User'}
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
