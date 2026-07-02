import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, RefreshCw, X, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { designatorV2Service, type DesignatorV2, type CreateDesignatorV2Request, type UpdateDesignatorV2Request } from '@/services/designatorV2Service';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type ModalType = 'create' | 'edit' | 'delete' | null;
type SortField = 'no' | 'name' | 'unit' | 'status' | 'created_at' | null;
type SortOrder = 'asc' | 'desc';

export function DesignatorManagement() {
  const [designators, setDesignators] = useState<DesignatorV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('no');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingDesignator, setEditingDesignator] = useState<DesignatorV2 | null>(null);
  const [deletingDesignator, setDeletingDesignator] = useState<DesignatorV2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [formData, setFormData] = useState<CreateDesignatorV2Request>({
    no: 0,
    name: '',
    description: '',
    unit: '',
    status: true,
  });

  useEffect(() => {
    fetchDesignators();
  }, []);

  const fetchDesignators = async () => {
    try {
      setIsLoading(true);
      const data = await designatorV2Service.getAllDesignators();
      setDesignators(data);
    } catch (error) {
      toast.error('Gagal memuat data designator');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (type: 'create' | 'edit' | 'delete', designator?: DesignatorV2) => {
    setModalType(type);
    
    if (type === 'delete' && designator) {
      setDeletingDesignator(designator);
    } else if (type === 'edit' && designator) {
      setEditingDesignator(designator);
      setFormData({
        no: designator.no,
        name: designator.name,
        description: designator.description,
        unit: designator.unit,
        status: designator.status,
      });
    } else if (type === 'create') {
      setEditingDesignator(null);
      setFormData({
        no: 0,
        name: '',
        description: '',
        unit: '',
        status: true,
      });
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setEditingDesignator(null);
    setDeletingDesignator(null);
    setFormData({
      no: 0,
      name: '',
      description: '',
      unit: '',
      status: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingDesignator) {
        const updateData: UpdateDesignatorV2Request = {};
        if (formData.no !== editingDesignator.no) updateData.no = formData.no;
        if (formData.name !== editingDesignator.name) updateData.name = formData.name;
        if (formData.description !== editingDesignator.description) updateData.description = formData.description;
        if (formData.unit !== editingDesignator.unit) updateData.unit = formData.unit;
        if (formData.status !== editingDesignator.status) updateData.status = formData.status;

        await designatorV2Service.updateDesignator(
          editingDesignator.id.id.String,
          updateData
        );
        toast.success('Designator berhasil diupdate');
      } else {
        await designatorV2Service.createDesignator(formData);
        toast.success('Designator berhasil ditambahkan');
      }
      handleCloseModal();
      fetchDesignators();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan designator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDesignator) return;
    
    setIsSubmitting(true);
    try {
      await designatorV2Service.deleteDesignator(deletingDesignator.id.id.String);
      toast.success('Designator berhasil dihapus');
      handleCloseModal();
      fetchDesignators();
    } catch (error) {
      toast.error('Gagal menghapus designator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = sortedDesignators.map((designator, index) => ({
        'No': index + 1,
        'Nomor': designator.no,
        'Nama': designator.name,
        'Deskripsi': designator.description,
        'Unit': designator.unit,
        'Status': designator.status ? 'Aktif' : 'Tidak Aktif',
        'Dibuat Pada': new Date(designator.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 5 },  // No
        { wch: 10 }, // Nomor
        { wch: 30 }, // Nama
        { wch: 50 }, // Deskripsi
        { wch: 10 }, // Unit
        { wch: 15 }, // Status
        { wch: 25 }, // Dibuat Pada
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Designators');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Designators_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Data berhasil diekspor ke ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };

  const handleExportCSV = () => {
    try {
      // Prepare data for export
      const exportData = sortedDesignators.map((designator, index) => ({
        'No': index + 1,
        'Nomor': designator.no,
        'Nama': designator.name,
        'Deskripsi': designator.description,
        'Unit': designator.unit,
        'Status': designator.status ? 'Aktif' : 'Tidak Aktif',
        'Dibuat Pada': new Date(designator.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Designators');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Designators_${timestamp}.csv`;

      // Save as CSV
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
      
      toast.success(`Data berhasil diekspor ke ${filename}`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Gagal mengekspor data ke CSV');
    }
  };

  const filteredDesignators = designators.filter((designator) => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      designator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      designator.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      designator.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      designator.no.toString().includes(searchQuery);

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && designator.status) ||
      (filterStatus === 'inactive' && !designator.status);

    return matchesSearch && matchesStatus;
  });

  const sortedDesignators = [...filteredDesignators].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

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

  const getCategoryBadgeColor = (status: boolean) => {
    return status 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getModalConfig = () => {
    switch (modalType) {
      case 'create':
        return {
          title: 'Tambah Designator Baru',
          color: 'blue',
          icon: Plus,
        };
      case 'edit':
        return {
          title: 'Edit Designator',
          color: 'blue',
          icon: Edit2,
        };
      case 'delete':
        return {
          title: 'Hapus Designator',
          color: 'red',
          icon: AlertTriangle,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Designator Management</h1>
              <p className="text-sm text-gray-500">Kelola designator material, equipment, dan service</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              {showExportMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Export Excel</div>
                        <div className="text-xs text-gray-500">Format .xlsx</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">Export CSV</div>
                        <div className="text-xs text-gray-500">Format .csv</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={fetchDesignators}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {/* Button Tambah Designator - Hidden as per requirement */}
            {/* <button
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
              <span>Tambah Designator</span>
            </button> */}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari designator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
            {(filterStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
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
                      onClick={() => handleSort('no')}
                    >
                      <div className="flex items-center gap-2">
                        <span>No</span>
                        {getSortIcon('no')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Name</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('unit')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Unit</span>
                        {getSortIcon('unit')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        {getSortIcon('status')}
                      </div>
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
                  {sortedDesignators.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Tidak ada data designator</p>
                          <p className="text-sm text-gray-400">Silakan tambahkan designator baru</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedDesignators.map((designator) => (
                      <tr key={designator.id.id.String} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{designator.no}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{designator.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md truncate">{designator.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{designator.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeColor(
                              designator.status
                            )}`}
                          >
                            {designator.status ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(designator.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', designator)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit designator"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal('delete', designator)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus designator"
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
        {!isLoading && sortedDesignators.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Menampilkan <span className="font-semibold">{sortedDesignators.length}</span> dari{' '}
              <span className="font-semibold">{designators.length}</span> designator
              {(filterStatus !== 'all' || searchQuery) && (
                <span className="ml-2 text-xs text-gray-500">
                  • Filtered
                  {filterStatus !== 'all' && ` by ${filterStatus === 'active' ? 'Aktif' : 'Tidak Aktif'}`}
                  {searchQuery && ` - Search: "${searchQuery}"`}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Sorted by {sortField || 'no'} ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
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
                      ? 'Konfirmasi penghapusan designator'
                      : modalType === 'edit'
                      ? 'Update informasi designator'
                      : 'Tambahkan designator baru ke sistem'
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
              className="p-6 overflow-y-auto" 
              style={{ 
                background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
                flexGrow: 1
              }}
            >
              {modalType === 'delete' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      Apakah Anda yakin ingin menghapus designator ini?
                    </p>
                    {deletingDesignator && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-red-900">
                          {deletingDesignator.name}
                        </p>
                        <p className="text-xs text-red-700">
                          No: {deletingDesignator.no} | Unit: {deletingDesignator.unit} | Status: {deletingDesignator.status ? 'Aktif' : 'Tidak Aktif'}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Hide Nomor input for edit modal */}
                  {modalType === 'create' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nomor <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.no === 0 ? '' : formData.no}
                        onChange={(e) => setFormData({ ...formData, no: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Masukkan nomor"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Contoh: Kabel FO 12 Core"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Deskripsi <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Deskripsi lengkap designator"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="m2, m3, unit, kg, dll"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center h-[42px]">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ms-3 text-sm font-medium text-gray-700">
                            {formData.status ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-6 flex items-center justify-end gap-3 border-t border-gray-200"
              style={{ 
                background: 'linear-gradient(to top, #f9fafb 0%, #ffffff 100%)',
                flexShrink: 0
              }}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              {modalType === 'delete' ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menghapus...' : 'Hapus'}
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(0, 94, 184, 0.3)'
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menyimpan...' : editingDesignator ? 'Update' : 'Simpan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
