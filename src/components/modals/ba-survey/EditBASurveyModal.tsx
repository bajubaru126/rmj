import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, Calendar, MapPin, Save } from 'lucide-react';
import { BASurveyResponse } from '@/services/baSurveyService';

export interface EditBASurveyFormData {
  lokasi?: string;
  // NEW: 3 separate date fields (all optional for update)
  tanggal_kontrak?: string;
  tanggal_ba?: string;
  tanggal_amandemen?: string;
  // NEW: Optional fields for update
  nama_proyek?: string;
  nomor_kontrak?: string;
  no_ba_drm?: string;
  no_amandemen?: string;
  pelaksana?: string;
  content?: string;
  documentFile?: File | null;
  keterangan?: string;
  approved_by_user1_id?: string;
  approved_by_user1_jabatan?: string;
  approved_by_user2_id?: string;
  approved_by_user2_jabatan?: string;
}

import { userService, UserData } from '@/services/userService';

const extractUserId = (user: any): string => {
  if (!user) return '';
  if (typeof user.id === 'string') return user.id;
  if (user.id && typeof user.id === 'object') {
    if (typeof user.id.id === 'string') return user.id.id;
    if (user.id.id && typeof user.id.id.String === 'string') return user.id.id.String;
  }
  return '';
};

interface EditBASurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EditBASurveyFormData) => Promise<void>;
  baSurvey: BASurveyResponse | null;
}

export function EditBASurveyModal({ open, onOpenChange, onSubmit, baSurvey }: EditBASurveyModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [pmMitraList, setPmMitraList] = useState<UserData[]>([]);
  const [pmWaspangList, setPmWaspangList] = useState<UserData[]>([]);

  const [formData, setFormData] = useState<EditBASurveyFormData>({
    lokasi: '',
    tanggal_kontrak: new Date().toISOString().split('T')[0],
    tanggal_ba: new Date().toISOString().split('T')[0],
    tanggal_amandemen: new Date().toISOString().split('T')[0],
    nama_proyek: '',
    nomor_kontrak: '',
    no_ba_drm: '',
    no_amandemen: '',
    pelaksana: '',
    content: '',
    documentFile: null,
    keterangan: '',
    approved_by_user1_id: '',
    approved_by_user1_jabatan: '',
    approved_by_user2_id: '',
    approved_by_user2_jabatan: '',
  });

  // Helper function to parse date from backend format
  const parseBackendDate = (dateStr: string): Date => {
    // Remove d' prefix and trailing ' if present
    // Format from backend: d'2026-02-11T00:00:00Z'
    let cleanDate = dateStr;
    if (typeof dateStr === 'string') {
      cleanDate = dateStr.replace(/^d'/, '').replace(/'$/, '');
    }
    return new Date(cleanDate);
  };

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    return parseBackendDate(dateStr).toISOString().split('T')[0];
  };

  // Update form when baSurvey changes
  useEffect(() => {
    if (baSurvey) {
      setFormData({
        lokasi: baSurvey.lokasi || '',
        tanggal_kontrak: formatDateForInput(baSurvey.tanggal_kontrak),
        tanggal_ba: formatDateForInput(baSurvey.tanggal_ba),
        tanggal_amandemen: formatDateForInput(baSurvey.tanggal_amandemen),
        nama_proyek: baSurvey.nama_proyek || '',
        nomor_kontrak: baSurvey.nomor_kontrak || '',
        no_ba_drm: baSurvey.no_ba_drm || '',
        no_amandemen: baSurvey.no_amandemen || '',
        pelaksana: baSurvey.pelaksana || '',
        content: baSurvey.content || '',
        documentFile: null,
        keterangan: baSurvey.documents?.[0]?.keterangan || '',
        approved_by_user1_id: baSurvey.approved_by_user1_id || '',
        approved_by_user1_jabatan: baSurvey.approved_by_user1_jabatan || '',
        approved_by_user2_id: baSurvey.approved_by_user2_id || '',
        approved_by_user2_jabatan: baSurvey.approved_by_user2_jabatan || '',
      });
    }
  }, [baSurvey]);

  // Fetch users for dropdowns
  useEffect(() => {
    if (open) {
      userService.getAllUsers()
        .then(users => {
          setPmMitraList(users.filter(u => u.role === 'pm_mitra'));
          setPmWaspangList(users.filter(u => u.role === 'pm_waspang'));
        })
        .catch(err => console.error('Failed to fetch users:', err));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - all fields are optional for update, but if provided must be valid
    if (formData.lokasi && !formData.lokasi.trim()) {
      alert('Location cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to update BA Survey:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      lokasi: '',
      tanggal_kontrak: new Date().toISOString().split('T')[0],
      tanggal_ba: new Date().toISOString().split('T')[0],
      tanggal_amandemen: new Date().toISOString().split('T')[0],
      nama_proyek: '',
      nomor_kontrak: '',
      no_ba_drm: '',
      no_amandemen: '',
      pelaksana: '',
      content: '',
      documentFile: null,
      keterangan: '',
    });
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, documentFile: file });
  };

  if (!open || !baSurvey) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-6" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Edit BA Survey</h2>
              <p className="text-sm text-teal-100 mt-1">Update Berita Acara Survey document</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lokasi
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  placeholder="e.g., LHOKSEUMAWE - PANTON LABU"
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
                />
              </div>
            </div>

            {/* 3 Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Kontrak
                </label>
                <input
                  type="date"
                  value={formData.tanggal_kontrak}
                  onChange={(e) => setFormData({ ...formData, tanggal_kontrak: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal BA DRM
                </label>
                <input
                  type="date"
                  value={formData.tanggal_ba}
                  onChange={(e) => setFormData({ ...formData, tanggal_ba: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Amandemen
                </label>
                <input
                  type="date"
                  value={formData.tanggal_amandemen}
                  onChange={(e) => setFormData({ ...formData, tanggal_amandemen: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
                />
              </div>
            </div>

            {/* Nama Proyek */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nama Proyek
              </label>
              <input
                type="text"
                value={formData.nama_proyek}
                onChange={(e) => setFormData({ ...formData, nama_proyek: e.target.value })}
                placeholder="e.g., Perjanjian Pengadaan dan Pemasangan OSP FO Backbone dan RMJ"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* Nomor Kontrak */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nomor Kontrak
              </label>
              <input
                type="text"
                value={formData.nomor_kontrak}
                onChange={(e) => setFormData({ ...formData, nomor_kontrak: e.target.value })}
                placeholder="e.g., K.TEL.005422/HK.810/GPP-A0000000/2024, 19 November 2024"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* No. BA DRM */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                No. BA DRM
              </label>
              <input
                type="text"
                value={formData.no_ba_drm}
                onChange={(e) => setFormData({ ...formData, no_ba_drm: e.target.value })}
                placeholder="e.g., TEL.057/LG.231/DID-A0000000/2025, 27 Maret 2025"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* No. Amandemen */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                No. Amandemen
              </label>
              <input
                type="text"
                value={formData.no_amandemen}
                onChange={(e) => setFormData({ ...formData, no_amandemen: e.target.value })}
                placeholder="e.g., K.TEL.001032/HK.820/GPP-A0000000/2025, 24 April 2025"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* Pelaksana */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pelaksana / Mitra Kerja
              </label>
              <input
                type="text"
                value={formData.pelaksana}
                onChange={(e) => setFormData({ ...formData, pelaksana: e.target.value })}
                placeholder="e.g., PT INFRASTRUKTUR TELEKOMUNIKASI INDONESIA"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* PM Mitra & PM Waspang Selectors & Jabatans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PM Mitra (Optional)
                  </label>
                  <select
                    value={formData.approved_by_user1_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedUser = pmMitraList.find(u => extractUserId(u) === selectedId);
                      const autoJabatan = selectedUser
                        ? (selectedUser.role === 'pm_mitra' ? 'PM Mitra' : selectedUser.role === 'pm_waspang' ? 'PM Waspang' : selectedUser.role)
                        : '';
                      console.log('🔍 [Edit] Selected PM Mitra:', { selectedId, selectedUser, autoJabatan });
                      setFormData({
                        ...formData,
                        approved_by_user1_id: selectedId,
                        approved_by_user1_jabatan: selectedId ? autoJabatan : '',
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all bg-white"
                  >
                    <option value="">(Kosong / Pilih Nanti)</option>
                    {pmMitraList.map(user => {
                      const userId = extractUserId(user);
                      return (
                        <option key={userId} value={userId}>
                          {user.username}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {formData.approved_by_user1_id && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Jabatan PM Mitra (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.approved_by_user1_jabatan || ''}
                      onChange={(e) => setFormData({ ...formData, approved_by_user1_jabatan: e.target.value })}
                      placeholder="e.g., Site Manager"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PM Waspang (Optional)
                  </label>
                  <select
                    value={formData.approved_by_user2_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedUser = pmWaspangList.find(u => extractUserId(u) === selectedId);
                      const autoJabatan = selectedUser
                        ? (selectedUser.role === 'pm_waspang' ? 'PM Waspang' : selectedUser.role === 'pm_mitra' ? 'PM Mitra' : selectedUser.role)
                        : '';
                      console.log('🔍 [Edit] Selected PM Waspang:', { selectedId, selectedUser, autoJabatan });
                      setFormData({
                        ...formData,
                        approved_by_user2_id: selectedId,
                        approved_by_user2_jabatan: selectedId ? autoJabatan : '',
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all bg-white"
                  >
                    <option value="">(Kosong / Pilih Nanti)</option>
                    {pmWaspangList.map(user => {
                      const userId = extractUserId(user);
                      return (
                        <option key={userId} value={userId}>
                          {user.username}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {formData.approved_by_user2_id && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Jabatan PM Waspang (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.approved_by_user2_jabatan || ''}
                      onChange={(e) => setFormData({ ...formData, approved_by_user2_jabatan: e.target.value })}
                      placeholder="e.g., Junior Project Manager"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content / Isi BA Survey
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Berdasarkan hasil pelaksanaan survey lapangan..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                rows={4}
              />
            </div>

            {/* Current Document Info */}
            {baSurvey.documents && baSurvey.documents.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Document</h4>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{baSurvey.documents[0].file_name}</p>
                    <p className="text-xs text-gray-500">{(baSurvey.documents[0].file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Upload New Document (Optional)
              </label>
              <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-teal-300 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors bg-teal-50/30 min-h-[120px]">
                <Upload className="w-6 h-6 text-teal-600 mb-2" />
                <span className="text-sm text-teal-700 font-medium truncate max-w-full px-2 text-center">
                  {formData.documentFile ? formData.documentFile.name : 'Choose PDF file to replace'}
                </span>
                {formData.documentFile && (
                  <span className="text-xs text-gray-500 mt-1">
                    {(formData.documentFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                />
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-teal-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update BA Survey
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
