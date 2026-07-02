import { useState, useRef } from 'react';
import { X, Upload, MapPin, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadKMLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, cellId: string, description: string) => void;
}

export function UploadKMLModal({ isOpen, onClose, onUpload }: UploadKMLModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cellId, setCellId] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (file.name.endsWith('.kml') || file.name.endsWith('.kmz')) {
      setSelectedFile(file);
    } else {
      alert('Format file tidak valid. Harap upload file KML (.kml) atau KMZ (.kmz)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile && cellId) {
      onUpload(selectedFile, cellId, description);
      onClose();
      // Reset form
      setSelectedFile(null);
      setCellId('');
      setDescription('');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCellId('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[60vw] max-w-3xl max-h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Import KML File</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(75vh-140px)]">
          {/* Cell Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cell ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cellId}
              onChange={(e) => setCellId(e.target.value)}
              placeholder="Masukkan Cell ID (contoh: CELL-01)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi (Opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tambahkan deskripsi untuk file KML ini..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File KML <span className="text-red-500">*</span>
            </label>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Hapus File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Drag & drop file KML di sini, atau
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-blue-600 hover:underline font-medium mt-1"
                    >
                      pilih file
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Format: KML (.kml) atau KMZ (.kmz)
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.kmz"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Tentang File KML:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>File KML berisi data koordinat geografis</li>
                <li>Dapat dibuat dari Google Earth atau aplikasi GIS</li>
                <li>File akan ditampilkan di peta untuk visualisasi rute</li>
                <li>Maksimal ukuran file: 10 MB</li>
              </ul>
            </div>
          </div>

          {/* Help Link */}
          <div className="flex items-center justify-center">
            <button className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <FileText className="w-4 h-4" />
              Panduan Membuat File KML
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || !cellId}
            className="bg-[#005EB8] hover:bg-[#004a94] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}
