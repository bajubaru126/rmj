import { X, Upload, Download, FileText, FileSpreadsheet, Database } from 'lucide-react';

interface ImportExportProps {
  onClose: () => void;
}

export function ImportExport({ onClose }: ImportExportProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#D1D5DB] flex items-center justify-between bg-gradient-to-r from-[#003A70] to-[#005EB8]">
          <div>
            <h3 className="text-white text-lg">Import / Export Data</h3>
            <p className="text-xs text-blue-100 mt-1">Manage data import and export operations</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Import Section */}
          <div className="mb-8">
            <h4 className="text-sm text-gray-900 mb-4">Import Data</h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Import Sitelist */}
              <button className="p-4 border-2 border-[#D1D5DB] rounded-lg hover:border-[#005EB8] hover:bg-blue-50 transition-all group">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                    <FileText className="w-6 h-6 text-[#005EB8]" />
                  </div>
                </div>
                <div className="text-sm text-gray-900 mb-1">Import Sitelist</div>
                <div className="text-xs text-gray-500">Upload project sitelist template</div>
              </button>

              {/* Import BOQ */}
              <button className="p-4 border-2 border-[#D1D5DB] rounded-lg hover:border-[#005EB8] hover:bg-blue-50 transition-all group">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-900 mb-1">Import BOQ</div>
                <div className="text-xs text-gray-500">Upload Bill of Quantity data</div>
              </button>

              {/* Import DRM */}
              <button className="p-4 border-2 border-[#D1D5DB] rounded-lg hover:border-[#005EB8] hover:bg-blue-50 transition-all group">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-900 mb-1">Import DRM</div>
                <div className="text-xs text-gray-500">Upload DRM route data</div>
              </button>

              {/* Import Indikatif BOQ */}
              <button className="p-4 border-2 border-[#D1D5DB] rounded-lg hover:border-[#005EB8] hover:bg-blue-50 transition-all group">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200">
                    <FileSpreadsheet className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-900 mb-1">Import Indikatif BOQ</div>
                <div className="text-xs text-gray-500">Upload indicative BOQ</div>
              </button>
            </div>

            {/* Upload Area */}
            <div className="mt-4 border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#005EB8] transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-600 mb-1">
                Drag and drop file here, or click to browse
              </div>
              <div className="text-xs text-gray-500">
                Supported formats: .xlsx, .xls, .csv (Max 50MB)
              </div>
            </div>

            {/* Template Downloads */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-900 mb-2">Download Templates</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 bg-white border border-blue-300 rounded text-xs text-blue-700 hover:bg-blue-100">
                  Sitelist Template
                </button>
                <button className="px-3 py-1.5 bg-white border border-blue-300 rounded text-xs text-blue-700 hover:bg-blue-100">
                  BOQ Template
                </button>
                <button className="px-3 py-1.5 bg-white border border-blue-300 rounded text-xs text-blue-700 hover:bg-blue-100">
                  DRM Template
                </button>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div>
            <h4 className="text-sm text-gray-900 mb-4">Export Data</h4>
            <div className="space-y-3">
              {/* Export Filtered */}
              <button className="w-full flex items-center justify-between p-4 border border-[#D1D5DB] rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-[#005EB8]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-900">Export Filtered Data</div>
                    <div className="text-xs text-gray-500">Export current filtered view</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Export All */}
              <button className="w-full flex items-center justify-between p-4 border border-[#D1D5DB] rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-900">Export All Data</div>
                    <div className="text-xs text-gray-500">Export complete dataset</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Export BOQ Summary */}
              <button className="w-full flex items-center justify-between p-4 border border-[#D1D5DB] rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-900">Export BOQ Summary</div>
                    <div className="text-xs text-gray-500">Export aggregated BOQ report</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Export Issue Log */}
              <button className="w-full flex items-center justify-between p-4 border border-[#D1D5DB] rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-900">Export Issue Log</div>
                    <div className="text-xs text-gray-500">Export all issues and resolutions</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Format Selection */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-900 mb-2">Export Format</div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="format" value="xlsx" defaultChecked />
                  <span className="text-sm">Excel (.xlsx)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="format" value="csv" />
                  <span className="text-sm">CSV</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="format" value="pdf" />
                  <span className="text-sm">PDF</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#D1D5DB] bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Last import: 2024-03-15 10:30 WIB
            </div>
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
