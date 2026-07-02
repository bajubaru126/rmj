import { Search, X, Star, Download } from 'lucide-react';

export function FilterBar() {
  return (
    <div className="sticky top-0 z-10 bg-[#F8F8F8] border-b border-[#DADADA] px-6 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filter Inputs */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Kontrak */}
          <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm min-w-[150px]">
            <option>Kontrak</option>
            <option>RMJ-2023-001</option>
            <option>RMJ-2024-001</option>
          </select>

          {/* TREG */}
          <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-32">
            <option>TREG</option>
            <option>TREG-1</option>
            <option>TREG-2</option>
            <option>TREG-3</option>
            <option>TREG-4</option>
            <option>TREG-5</option>
            <option>TREG-6</option>
            <option>TREG-7</option>
          </select>

          {/* Paket Area */}
          <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-32">
            <option>Paket Area</option>
            <option>Paket 1</option>
            <option>Paket 2</option>
            <option>Paket 3</option>
            <option>Paket 4</option>
            <option>Paket 5</option>
          </select>

          {/* Lokasi / Witel */}
          <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm min-w-[150px]">
            <option>Lokasi / Witel</option>
            <option>Jakarta Pusat</option>
            <option>Jakarta Barat</option>
            <option>Jakarta Timur</option>
          </select>

          {/* Ruas Kontrak */}
          <div className="relative min-w-[150px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ruas Kontrak"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded text-sm"
            />
          </div>

          {/* Segmentasi */}
          <input
            type="text"
            placeholder="Segmentasi"
            className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-32"
          />

          {/* Cell */}
          <input
            type="text"
            placeholder="Cell"
            className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-32"
          />

          {/* Status */}
          <select className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-40">
            <option>Status</option>
            <option>On Progress</option>
            <option>Done</option>
            <option>Issue</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            className="px-3 py-2 bg-white border border-gray-300 rounded text-sm w-40"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-[#005EB8] text-white rounded text-sm hover:bg-[#004a94] transition-colors">
            Apply Filter
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors flex items-center gap-1">
            <X className="w-4 h-4" />
            Clear Filters
          </button>
          <button className="p-2 text-gray-600 hover:text-yellow-500 transition-colors" title="Save View">
            <Star className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors" title="Export Filtered">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
