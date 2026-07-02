import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Edit, Save, X, FileText, Download, Upload, PenTool, MapPin, Activity, CheckCircle } from 'lucide-react';
import { baDrmService, BADrmResponse, CreateBADrmRequest, UpdateBADrmRequest, DocumentMetadata } from '@/services/baDrmService';
import { baSurveyService, BASurveyResponse } from '@/services/baSurveyService';
import { authService } from '@/services/authService';
import { projectService, Project } from '@/services/projectService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { API_CONFIG } from '@/config/api';
import { generateBASurveyPDFWithQR } from '@/utils/baSurveyPdfGenerator';
import { generateBADrmPDFBlob } from '@/utils/baDrmPdfGenerator';
import { BADrmApprovalModal } from '@/components/modals/drm/BADrmApprovalModal';
import { ConfirmModal } from './shared/ConfirmModal';

interface TabBASurveyProps {
  contractId: string;
  linkId: string;
  linkName?: string;
}

interface FormState {
  lokasi: string;
  tanggal: string;
  documents: File[];
  // NEW: Metadata fields
  nama_proyek: string;
  nomor_kontrak: string;
  no_ba_drm: string;
  no_amandemen: string;
  pelaksana: string;
  tanggal_kontrak: string;
  tanggal_ba: string;
  tanggal_amandemen: string;
}

const EMPTY_FORM: FormState = {
  lokasi: '',
  tanggal: '',
  documents: [],
  nama_proyek: '',
  nomor_kontrak: '',
  no_ba_drm: '',
  no_amandemen: '',
  pelaksana: '',
  tanggal_kontrak: '',
  tanggal_ba: '',
  tanggal_amandemen: '',
};

export function TabBASurvey({ contractId, linkId, linkName }: TabBASurveyProps) {
  const { token: ctxToken } = useAuth();
  const getToken = () => ctxToken || authService.getToken();

  const [rows, setRows] = useState<BADrmResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [baSurveys, setBaSurveys] = useState<BASurveyResponse[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedBaDrm, setSelectedBaDrm] = useState<BADrmResponse | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('📋 [BA DRM] Loading from API for link:', linkId);
      const items = await baDrmService.getAllBADrm(contractId, linkId);
      console.log('✅ [BA DRM] Loaded', items.length, 'items from API');
      setRows(items);
    } catch (err: any) {
      console.error('BA DRM fetch error:', err);
      toast.error('Gagal memuat data BA DRM');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetails = async (): Promise<Project | null> => {
    try {
      // Token is optional – try without it too so unauthenticated project reads still work
      const token = getToken();
      const proj = await projectService.getProjectById(contractId, token);
      console.log('✅ [BA DRM] Loaded project for prefill:', proj);
      setProject(proj);
      return proj;
    } catch (err) {
      console.warn('⚠️ [BA DRM] Could not fetch project details for prefill:', err);
      return null;
    }
  };


  useEffect(() => {
    fetchData();
    fetchBASurveys();
    fetchProjectDetails();
  }, [contractId, linkId]);

  // ── Fetch BA Surveys ───────────────────────────────────────────────────────
  const fetchBASurveys = async () => {
    try {
      console.log('📋 [BA Survey] Loading from API for project:', contractId);
      const items = await baSurveyService.getAllBASurveys(contractId);
      console.log('✅ [BA Survey] Loaded', items.length, 'items from API');
      
      // Filter by linkId if provided
      const filteredItems = linkId 
        ? items.filter(item => {
            const itemLinkId = item.link_id 
              ? baSurveyService.extractId(item.link_id)
              : null;
            return itemLinkId === linkId;
          })
        : items;
      
      console.log('✅ [BA Survey] Filtered', filteredItems.length, 'items for link:', linkId);
      setBaSurveys(filteredItems);
    } catch (err: any) {
      console.error('BA Survey fetch error:', err);
      // Don't show error toast, just log it
    }
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    // Validation
    if (!form.lokasi || !form.tanggal) {
      toast.warning('Lokasi dan Tanggal wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      
      // Upload documents if any
      let uploadedDocs: DocumentMetadata[] = [];
      if (form.documents.length > 0) {
        setUploadingFiles(true);
        for (const file of form.documents) {
          const uploadResult = await baDrmService.uploadDocument(file, token);
          uploadedDocs.push({
            file_path: uploadResult.file_path,
            file_name: uploadResult.file_name || file.name,
            file_type: file.type,
            file_size: file.size,
            keterangan: `BA DRM Document - ${file.name}`,
            status: 'approved',
          });
        }
        setUploadingFiles(false);
      }

      if (editingId) {
        // UPDATE
        const updateData: UpdateBADrmRequest = {
          lokasi: form.lokasi,
          tanggal: `${form.tanggal}T00:00:00Z`,
          nama_proyek: form.nama_proyek,
          nomor_kontrak: form.nomor_kontrak,
          no_ba_drm: form.no_ba_drm,
          no_amandemen: form.no_amandemen,
          pelaksana: form.pelaksana,
          tanggal_kontrak: form.tanggal_kontrak ? `${form.tanggal_kontrak}T00:00:00Z` : undefined,
          tanggal_ba: form.tanggal_ba ? `${form.tanggal_ba}T00:00:00Z` : undefined,
          tanggal_amandemen: form.tanggal_amandemen ? `${form.tanggal_amandemen}T00:00:00Z` : undefined,
        };

        // Only include documents if new files were uploaded
        if (uploadedDocs.length > 0) {
          updateData.documents = uploadedDocs;
        }

        await baDrmService.updateBADrm(editingId, updateData, token);
        toast.success('BA DRM berhasil diupdate');
      } else {
        // CREATE
        const createData: CreateBADrmRequest = {
          project_id: contractId,
          link_id: linkId,
          lokasi: form.lokasi,
          tanggal: `${form.tanggal}T00:00:00Z`,
          nama_proyek: form.nama_proyek,
          nomor_kontrak: form.nomor_kontrak,
          no_ba_drm: form.no_ba_drm,
          no_amandemen: form.no_amandemen,
          pelaksana: form.pelaksana,
          tanggal_kontrak: form.tanggal_kontrak ? `${form.tanggal_kontrak}T00:00:00Z` : undefined,
          tanggal_ba: form.tanggal_ba ? `${form.tanggal_ba}T00:00:00Z` : undefined,
          tanggal_amandemen: form.tanggal_amandemen ? `${form.tanggal_amandemen}T00:00:00Z` : undefined,
          document: uploadedDocs.length > 0 ? uploadedDocs[0] : undefined,
        };

        await baDrmService.createBADrm(createData, token);
        toast.success('BA DRM berhasil dibuat');
      }

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan BA DRM');
    } finally {
      setIsSaving(false);
      setUploadingFiles(false);
    }
  };

  const handleEdit = (row: BADrmResponse) => {
    const id = baDrmService.extractId(row.id);
    setEditingId(id);
    setForm({
      lokasi: row.lokasi,
      tanggal: row.tanggal ? row.tanggal.slice(0, 10) : '',
      documents: [],
      nama_proyek: row.nama_proyek || '',
      nomor_kontrak: row.nomor_kontrak || '',
      no_ba_drm: row.no_ba_drm || '',
      no_amandemen: row.no_amandemen || '',
      pelaksana: row.pelaksana || '',
      tanggal_kontrak: row.tanggal_kontrak ? row.tanggal_kontrak.slice(0, 10) : '',
      tanggal_ba: row.tanggal_ba ? row.tanggal_ba.slice(0, 10) : '',
      tanggal_amandemen: row.tanggal_amandemen ? row.tanggal_amandemen.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const token = getToken();
      await baDrmService.deleteBADrm(id, token);
      toast.success('BA DRM dihapus');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm(f => ({ ...f, documents: Array.from(e.target.files!) }));
    }
  };

  const handleViewDocument = (filePath: string) => {
    const fullUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}${filePath}`;
    setViewingDoc(fullUrl);
  };

  const handleDownloadDocument = (filePath: string, fileName: string) => {
    const fullUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}${filePath}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName;
    link.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleApprove = async (userType: 'user1' | 'user2', nama: string, jabatan: string) => {
    if (!selectedBaDrm) return;
    
    try {
      const token = getToken();
      const id = baDrmService.extractId(selectedBaDrm.id);
      
      const approvalData = userType === 'user1' 
        ? { approved_by_user1: true, approved_by_user1_name: nama, approved_by_user1_jabatan: jabatan }
        : { approved_by_user2: true, approved_by_user2_name: nama, approved_by_user2_jabatan: jabatan };
      
      const result = await baDrmService.updateApproval(id, approvalData, token);
      toast.success('Approval berhasil disimpan');
      
      setSelectedBaDrm(prev => {
        if (!prev) return null;
        return {
          ...prev,
          approved_by_user1: result.approved_by_user1,
          approved_by_user2: result.approved_by_user2,
          approved_by_user1_name: result.approved_by_user1_name,
          approved_by_user1_jabatan: result.approved_by_user1_jabatan,
          approved_by_user2_name: result.approved_by_user2_name,
          approved_by_user2_jabatan: result.approved_by_user2_jabatan,
        };
      });
      
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Gagal menyimpan approval');
    }
  };

  const handleOpenApprovalModal = (row: BADrmResponse) => {
    setSelectedBaDrm(row);
    setShowApprovalModal(true);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = async (baSurvey: BASurveyResponse) => {
    setIsExporting(true);
    try {
      console.log('📄 Exporting BA Survey to PDF:', baSurvey);
      await generateBASurveyPDFWithQR(baSurvey);
      toast.success('PDF berhasil diexport');
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      toast.error('Gagal export PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBADrmPDF = async (row: BADrmResponse) => {
    setIsExporting(true);
    try {
      console.log('📄 Exporting BA DRM to PDF:', row);
      // Use embedded metadata from the row itself (no side-loading needed)
      const blob = await generateBADrmPDFBlob(row);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BA_DRM_${row.lokasi}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF berhasil diexport');
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      toast.error('Gagal export PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddClick = async () => {
    setEditingId(null);

    // Ensure project data is loaded – fetch on-demand if not available yet
    let proj: Project | null = project;
    if (!proj) {
      proj = await fetchProjectDetails();
    }

    // Helper: build a value using BA Survey field first, then project fallback
    const fromSurveyOrProject = (
      surveyVal: string | undefined,
      projectVal: string | undefined
    ) => surveyVal?.trim() || projectVal?.trim() || '';

    if (baSurveys && baSurveys.length > 0) {
      const activeSurvey = baSurveys[0];

      console.log('🔍 [BA DRM] Prefill source – BA Survey:', {
        nama_proyek:   activeSurvey.nama_proyek,
        nomor_kontrak: activeSurvey.nomor_kontrak,
        pelaksana:     activeSurvey.pelaksana,
      });
      console.log('🔍 [BA DRM] Prefill fallback – Project:', {
        name:        proj?.name,
        no_kontrak:  proj?.no_kontrak,
        main_vendor: proj?.main_vendor,
      });

      const tanggalKontrak = activeSurvey.tanggal_kontrak
        ? activeSurvey.tanggal_kontrak.slice(0, 10)
        : (proj?.contract_signed ? proj.contract_signed.slice(0, 10) : '');

      setForm({
        lokasi:       activeSurvey.lokasi || linkName || '',
        tanggal:      new Date().toISOString().split('T')[0],
        documents:    [],
        nama_proyek:   fromSurveyOrProject(activeSurvey.nama_proyek,   proj?.name),
        nomor_kontrak: fromSurveyOrProject(activeSurvey.nomor_kontrak,  proj?.no_kontrak),
        no_ba_drm:     activeSurvey.no_ba_drm    || '1',
        no_amandemen:  activeSurvey.no_amandemen  || '',
        pelaksana:     fromSurveyOrProject(activeSurvey.pelaksana,     proj?.main_vendor),
        tanggal_kontrak: tanggalKontrak,
        tanggal_ba:        activeSurvey.tanggal_ba        ? activeSurvey.tanggal_ba.slice(0, 10)        : '',
        tanggal_amandemen: activeSurvey.tanggal_amandemen ? activeSurvey.tanggal_amandemen.slice(0, 10) : '',
      });
    } else if (proj) {
      setForm({
        lokasi:        linkName || '',
        tanggal:       new Date().toISOString().split('T')[0],
        documents:     [],
        nama_proyek:   proj.name        || '',
        nomor_kontrak: proj.no_kontrak  || '',
        no_ba_drm:     '1',
        no_amandemen:  '',
        pelaksana:     proj.main_vendor || '',
        tanggal_kontrak:   proj.contract_signed ? proj.contract_signed.slice(0, 10) : '',
        tanggal_ba:        '',
        tanggal_amandemen: '',
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        lokasi:   linkName || '',
        tanggal:  new Date().toISOString().split('T')[0],
        no_ba_drm: '1',
      });
    }
    setShowModal(true);
  };


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header banner — matches BA Survey clean layout */}
      <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
        <div>
          <h3 className="text-blue-800 font-bold text-sm">BA DRM for this link</h3>
          <p className="text-[10px] text-gray-500">
            Berita Acara DRM — Design Review Meeting
            {rows.length > 0 && ` · ${rows.length} record`}
          </p>
        </div>
        <div className="flex gap-2">
          {baSurveys.length > 0 && (
            <button
              onClick={() => handleExportPDF(baSurveys[0])}
              disabled={isExporting || baSurveys.length === 0}
              className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add BA DRM</span>
          </button>
        </div>
      </div>

      {/* Table - matches BA Survey exactly */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Memuat data BA DRM...</span>
          </div>
        </div>
      ) : rows.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center justify-center py-12 border rounded-xl border-gray-200 bg-white w-full">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <div className="text-gray-400 text-lg mb-2">No BA DRM available</div>
            <div className="text-gray-500 text-sm">Click "Add BA DRM" to create the first BA DRM for this link</div>
          </div>
        </div>
      ) : (
        /* Table with Data */
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-4 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-0">
              <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
                <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, minWidth: '850px' }}>
                  <thead className="bg-[#F8FAFC] text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '30%' }}>
                        Lokasi
                      </th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '18%' }}>
                        Tanggal DRM
                      </th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '18%' }}>
                        Status Approval
                      </th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: 'inherit', width: '16%' }}>
                        Dibuat Pada
                      </th>
                      <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-right" style={{ fontFamily: 'inherit', width: '18%' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white/60">
                    {rows.map((row) => {
                      const id = baDrmService.extractId(row.id);
                      const isDeleting = deletingId === id;

                      return (
                        <tr key={id} className="hover:bg-blue-50/50 transition" style={{ fontFamily: 'inherit' }}>
                          {/* Lokasi */}
                          <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span>{row.lokasi}</span>
                            </div>
                          </td>

                          {/* Tanggal DRM */}
                          <td className="px-6 py-4 text-gray-900" style={{ fontFamily: 'inherit' }}>
                            {formatShortDate(row.tanggal)}
                          </td>

                          {/* Status Approval */}
                          <td className="px-6 py-4" style={{ fontFamily: 'inherit' }}>
                            {row.approved_by_user1 && row.approved_by_user2 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Fully Approved
                              </span>
                            ) : row.approved_by_user1 || row.approved_by_user2 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                                <Activity className="w-3.5 h-3.5" />
                                Partially Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                                <Activity className="w-3.5 h-3.5" />
                                Awaiting Approval
                              </span>
                            )}
                          </td>

                          {/* Dibuat Pada */}
                          <td className="px-6 py-4 text-gray-600 text-xs" style={{ fontFamily: 'inherit' }}>
                            {formatShortDate(row.created_at)}
                          </td>

                          {/* Action - Identical styles and icons to BA Survey */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 text-gray-400">
                              {/* Show Preview & Approve button if not fully approved */}
                              {!(row.approved_by_user1 && row.approved_by_user2) && (
                                <button
                                  onClick={() => handleOpenApprovalModal(row)}
                                  className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Preview & Approve"
                                >
                                  <PenTool className="w-4 h-4" />
                                </button>
                              )}

                              {/* Download BA DRM PDF Button */}
                              <button
                                onClick={() => handleExportBADrmPDF(row)}
                                disabled={isExporting}
                                className="p-1.5 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download BA DRM PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleEdit(row)}
                                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(id)}
                                disabled={isDeleting}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-40"
                                title="Delete"
                              >
                                {isDeleting ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? 'Edit BA DRM' : 'Tambah BA DRM'}
                  </h2>
                  <p className="text-sm text-blue-100 mt-1">Berita Acara DRM — Design Review Meeting</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Nama Proyek */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Proyek <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nama_proyek}
                    onChange={(e) => setForm((f) => ({ ...f, nama_proyek: e.target.value }))}
                    placeholder="Contoh: Proyek FTTH Kota Bandung"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Nomor Kontrak */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nomor Kontrak <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nomor_kontrak}
                    onChange={(e) => setForm((f) => ({ ...f, nomor_kontrak: e.target.value }))}
                    placeholder="Contoh: 001/PKT/2024"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* No BA DRM & No Amandemen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      No. BA DRM Ke-
                    </label>
                    <input
                      type="text"
                      value={form.no_ba_drm}
                      onChange={(e) => setForm((f) => ({ ...f, no_ba_drm: e.target.value }))}
                      placeholder="Contoh: 1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      No. Amandemen Ke-
                    </label>
                    <input
                      type="text"
                      value={form.no_amandemen}
                      onChange={(e) => setForm((f) => ({ ...f, no_amandemen: e.target.value }))}
                      placeholder="Contoh: 1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Pelaksana */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pelaksana / Mitra Kerja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.pelaksana}
                    onChange={(e) => setForm((f) => ({ ...f, pelaksana: e.target.value }))}
                    placeholder="Contoh: PT. Mitra Solusi"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Lokasi */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lokasi DRM <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={form.lokasi}
                      onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))}
                      placeholder="Contoh: Jl. Sudirman No. 123, Bandung"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tanggal DRM <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.tanggal}
                      onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tanggal Kontrak
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_kontrak}
                      onChange={(e) => setForm((f) => ({ ...f, tanggal_kontrak: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tanggal BA DRM
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_ba}
                      onChange={(e) => setForm((f) => ({ ...f, tanggal_ba: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tanggal Amandemen
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_amandemen}
                      onChange={(e) => setForm((f) => ({ ...f, tanggal_amandemen: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Dokumen Baru (Opsional)
                  </label>
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30 min-h-[120px]"
                  >
                    <Upload className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-sm text-blue-700 font-medium">
                      Klik untuk upload dokumen
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG, DOC (Max 10MB)
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                  {form.documents.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {form.documents.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Upload dokumen baru akan mengganti semua dokumen lama
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving || uploadingFiles}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || uploadingFiles}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingFiles ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingId ? 'Simpan Perubahan' : 'Buat BA DRM'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Viewer Modal ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Preview Dokumen</h2>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={viewingDoc} className="w-full h-full" title="Document Preview" />
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Modal ── */}
      {showApprovalModal && selectedBaDrm && (
        <BADrmApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedBaDrm(null);
          }}
          baDrm={selectedBaDrm}
          onApprove={handleApprove}
        />
      )}

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) executeDelete(confirmDeleteId);
        }}
        title="Hapus BA DRM"
        message="Apakah Anda yakin ingin menghapus BA DRM ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
