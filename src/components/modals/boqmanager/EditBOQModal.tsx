import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface BOQUpdateData {
  no?: number;
  designator?: string;
  uraian_pekerjaan?: string;
  satuan?: string;
  harga_satuan_material?: number;
  harga_satuan_jasa?: number;
  drm?: number;
  planned?: number;
  tambah?: number;
  kurang?: number;
}

interface BOQData {
  id: string;
  no?: number;
  designator?: string;
  uraian_pekerjaan?: string;
  satuan?: string;
  harga_satuan_material?: number;
  harga_satuan_jasa?: number;
  drm?: number;
  planned?: number;
  tambah?: number;
  kurang?: number;
}

interface EditBOQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BOQUpdateData) => void;
  boqData: BOQData | null;
}

export function EditBOQModal({ isOpen, onClose, onSubmit, boqData }: EditBOQModalProps) {
  const [formData, setFormData] = useState<BOQUpdateData>({
    no: 1,
    designator: '',
    uraian_pekerjaan: '',
    satuan: 'meter',
    harga_satuan_material: 0,
    harga_satuan_jasa: 0,
    drm: 0,
    planned: 0,
    tambah: 0,
    kurang: 0,
  });

  useEffect(() => {
    if (boqData) {
      setFormData({
        no: boqData.no || 1,
        designator: boqData.designator || '',
        uraian_pekerjaan: boqData.uraian_pekerjaan || '',
        satuan: boqData.satuan || 'meter',
        harga_satuan_material: boqData.harga_satuan_material || 0,
        harga_satuan_jasa: boqData.harga_satuan_jasa || 0,
        drm: boqData.drm || 0,
        planned: boqData.planned || 0,
        tambah: boqData.tambah || 0,
        kurang: boqData.kurang || 0,
      });
    }
  }, [boqData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[75vw] max-w-4xl max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
          <h2 className="text-lg font-semibold text-white">Edit BOQ</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(75vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* Ruas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ruas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.ruas}
                onChange={(e) => setFormData({ ...formData, ruas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SS-JKT-001"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.kategori}
                onValueChange={(value) => setFormData({ ...formData, kategori: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A. Kabel">A. Kabel</SelectItem>
                  <SelectItem value="B. Manhole">B. Manhole</SelectItem>
                  <SelectItem value="C. Duct">C. Duct</SelectItem>
                  <SelectItem value="D. Joint Closure">D. Joint Closure</SelectItem>
                  <SelectItem value="E. ODP">E. ODP</SelectItem>
                  <SelectItem value="F. Labor">F. Labor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Uraian */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uraian <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.uraian}
                onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Deskripsi detail item BOQ..."
              />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Satuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Satuan <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.satuan}
                onValueChange={(value) => setFormData({ ...formData, satuan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Satuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meter">meter</SelectItem>
                  <SelectItem value="unit">unit</SelectItem>
                  <SelectItem value="ls">ls (lump sum)</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="set">set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Harga Satuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={formData.hargaSatuan}
                onChange={(e) => setFormData({ ...formData, hargaSatuan: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="125000"
              />
            </div>

            {/* Total (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total (Rp)
              </label>
              <input
                type="text"
                readOnly
                value={`Rp ${((formData.volume || 0) * (formData.hargaSatuan || 0)).toLocaleString('id-ID')}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'Approved' | 'Draft' | 'Rejected' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-[#005EB8] hover:bg-[#004a94]"
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
