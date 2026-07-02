import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RuasFormData, RuasData } from '@/types';

interface EditRuasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RuasFormData) => Promise<void> | void;
  ruasData: RuasData | null;
}

export function EditRuasModal({ isOpen, onClose, onSubmit, ruasData }: EditRuasModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RuasFormData>({
    tahunProject: '',
    program: '',
    projectSitelist: '',
    siteName: '',
    regional: '',
    projectCode: '',
    mitra: '',
    planRFS: '',
    spCurr: '',
    milestone: '',
    planEndDate: '',
    owner: '',
  });

  useEffect(() => {
    if (ruasData) {
      setFormData({
        tahunProject: ruasData.tahunProject,
        program: ruasData.program,
        projectSitelist: ruasData.projectSitelist,
        siteName: ruasData.siteName,
        regional: ruasData.regional,
        projectCode: ruasData.projectCode,
        mitra: ruasData.mitra,
        planRFS: ruasData.planRFS,
        spCurr: ruasData.spCurr,
        milestone: ruasData.milestone,
        m0sInstallationCompleted: ruasData.m0sInstallationCompleted,
        planEndDate: ruasData.planEndDate,
        actualEndDate: ruasData.actualEndDate,
        owner: ruasData.owner,
      });
    }
  }, [ruasData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[75vw] max-w-4xl max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
          <h2 className="text-lg font-semibold text-white">Edit Ruas</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(75vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* Tahun Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahun Project <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="\d{4}"
                value={formData.tahunProject}
                onChange={(e) => setFormData({ ...formData, tahunProject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Program */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.program}
                onValueChange={(value) => setFormData({ ...formData, program: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RMJ Ring Jawbel">RMJ Ring Jawbel</SelectItem>
                  <SelectItem value="RMJ Metro">RMJ Metro</SelectItem>
                  <SelectItem value="RMJ Regional">RMJ Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Sitelist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PROJECT_SITELIST / UNXID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.projectSitelist}
                onChange={(e) => setFormData({ ...formData, projectSitelist: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="UNX-JKT-001"
                disabled={isSubmitting}
              />
            </div>

            {/* Site Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Regional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regional <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.regional}
                onValueChange={(value) => setFormData({ ...formData, regional: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Regional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R01 Sumbasel">R01 Sumbasel</SelectItem>
                  <SelectItem value="R02 Jawa Barat">R02 Jawa Barat</SelectItem>
                  <SelectItem value="R03 Jawa Tengah">R03 Jawa Tengah</SelectItem>
                  <SelectItem value="R04 Jawa Timur">R04 Jawa Timur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PRJ-001"
                disabled={isSubmitting}
              />
            </div>

            {/* MITRA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MITRA <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.mitra}
                onValueChange={(value) => setFormData({ ...formData, mitra: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih MITRA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT Meindo">PT Meindo</SelectItem>
                  <SelectItem value="PT Sumatera">PT Sumatera</SelectItem>
                  <SelectItem value="PT Telkom">PT Telkom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* S.P Curr */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S.P Curr <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.spCurr}
                onValueChange={(value) => setFormData({ ...formData, spCurr: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih S.P Curr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Survey">Survey</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Implementation">Implementation</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Milestone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.milestone}
                onValueChange={(value) => setFormData({ ...formData, milestone: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Milestone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Survey">Survey</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Implementation">Implementation</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan RFS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan RFS <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.planRFS}
                onChange={(e) => setFormData({ ...formData, planRFS: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Plan End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.planEndDate}
                onChange={(e) => setFormData({ ...formData, planEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* M-0S Installation Completed Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                M-0S Installation Completed
              </label>
              <input
                type="date"
                value={formData.m0sInstallationCompleted || ''}
                onChange={(e) => setFormData({ ...formData, m0sInstallationCompleted: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Actual End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual End Date
              </label>
              <input
                type="date"
                value={formData.actualEndDate || ''}
                onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-[#005EB8] hover:bg-[#004a94]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

