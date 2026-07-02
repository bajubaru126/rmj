import { useEffect, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

// Dummy data for locations (Witel)
const DUMMY_LOCATIONS = [
  'Witel SURAMADU',
  'Witel MALANG',
  'Witel MADIUN',
  'Witel KEDIRI',
  'Witel SIDOARJO',
  'Witel JEMBER',
  'Witel BANYUWANGI',
  'Witel PROBOLINGGO'
];

// Dummy data for regions (Lokasi/Area)
const DUMMY_REGIONS = [
  'Jawa',
  'Jawa Timur',
  'Jawa Tengah',
  'Jawa Barat',
  'Sumatera',
  'Kalimantan',
  'Sulawesi',
  'Papua',
  'Bali',
  'Nusa Tenggara'
];

// Helper function to calculate contract duration with accurate month/day calculation
const calculateContractDuration = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) return '';
  
  // Calculate years, months, and days
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  
  // Adjust for negative days
  if (days < 0) {
    months--;
    // Get the last day of the previous month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Format output with years, months, and days
  const parts: string[] = [];
  
  if (years > 0) {
    parts.push(`${years} tahun`);
  }
  
  if (months > 0) {
    parts.push(`${months} bulan`);
  }
  
  if (days > 0) {
    parts.push(`${days} hari`);
  }
  
  // If no parts, return empty (shouldn't happen with valid dates)
  return parts.length > 0 ? parts.join(' ') : '';
};

interface ContractFormFieldsProps {
  formData: {
    nomorKontrak: string;
    namaProject: string;
    contractSigned: string;
    contractValue: string;
    contractDuration: string;
    startDatePlan: string;
    endDatePlan: string;
    location: string;
    link: string;
    lokasi: string;
    pelaksana: string;
  };
  onChange: (field: string, value: string) => void;
}

// Helper function to format number to Rupiah display
const formatRupiah = (value: string): string => {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Format with thousand separators
  const formatted = new Intl.NumberFormat('id-ID').format(parseInt(numbers));
  
  return `Rp ${formatted}`;
};

// Helper function to parse Rupiah display to plain number string
const parseRupiah = (value: string): string => {
  // Remove 'Rp', spaces, and dots (thousand separators)
  return value.replace(/Rp\s?|\.|\s/g, '');
};

export function ContractFormFields({ formData, onChange }: ContractFormFieldsProps) {
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

  // Auto-calculate contract duration when start or end date changes
  useEffect(() => {
    if (formData.startDatePlan && formData.endDatePlan) {
      const duration = calculateContractDuration(formData.startDatePlan, formData.endDatePlan);
      if (duration && duration !== formData.contractDuration) {
        onChange('contractDuration', duration);
      }
    }
  }, [formData.startDatePlan, formData.endDatePlan]);

  // Filter locations based on input
  const filteredLocations = DUMMY_LOCATIONS.filter(loc =>
    loc.toLowerCase().includes(formData.location.toLowerCase())
  );

  // Filter regions based on input
  const filteredRegions = DUMMY_REGIONS.filter(region =>
    region.toLowerCase().includes(formData.lokasi.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">No. Contract *</label>
        <input
          type="text"
          placeholder="e.g., K.TEL.005422/HK.810/GPP-A0000000/2024"
          value={formData.nomorKontrak}
          onChange={(e) => onChange('nomorKontrak', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Project Name *</label>
        <input
          type="text"
          placeholder="e.g., Pengadaan dan Pemasangan OSP FO Backbone dan RMJ"
          value={formData.namaProject}
          onChange={(e) => onChange('namaProject', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Contract Signed</label>
        <input
          type="date"
          value={formData.contractSigned}
          onChange={(e) => onChange('contractSigned', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Contract Value</label>
        <input
          type="text"
          placeholder="e.g., Rp 500.000.000"
          value={formData.contractValue ? formatRupiah(formData.contractValue) : ''}
          onChange={(e) => {
            const plainValue = parseRupiah(e.target.value);
            onChange('contractValue', plainValue);
          }}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Start Date Plan</label>
        <input
          type="date"
          value={formData.startDatePlan}
          onChange={(e) => onChange('startDatePlan', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">End Date Plan</label>
        <input
          type="date"
          value={formData.endDatePlan}
          onChange={(e) => onChange('endDatePlan', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Contract Duration
        </label>
        <input
          type="text"
          placeholder="Will be calculated from dates"
          value={formData.contractDuration}
          readOnly
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
        />
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline-block mr-1 text-orange-500" />
          Location *
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g., Witel SURAMADU"
            value={formData.location}
            onChange={(e) => {
              onChange('location', e.target.value);
              setShowLocationDropdown(true);
            }}
            onFocus={() => setShowLocationDropdown(true)}
            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          />
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          
          {/* Location Dropdown */}
          {showLocationDropdown && filteredLocations.length > 0 && (
            <>
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredLocations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => {
                      onChange('location', location);
                      setShowLocationDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {location}
                  </button>
                ))}
              </div>
              {/* Close dropdown on outside click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowLocationDropdown(false)}
              />
            </>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Link</label>
        <input
          type="text"
          placeholder="e.g., SS#17 STO SUMENEP-STO AMBUNTEN"
          value={formData.link}
          onChange={(e) => onChange('link', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold text-gray-700 mb-2">Region *</label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g., Jawa Timur"
            value={formData.lokasi}
            onChange={(e) => {
              onChange('lokasi', e.target.value);
              setShowRegionDropdown(true);
            }}
            onFocus={() => setShowRegionDropdown(true)}
            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          />
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          
          {/* Region Dropdown */}
          {showRegionDropdown && filteredRegions.length > 0 && (
            <>
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredRegions.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      onChange('lokasi', region);
                      setShowRegionDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {region}
                  </button>
                ))}
              </div>
              {/* Close dropdown on outside click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowRegionDropdown(false)}
              />
            </>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Pelaksana *</label>
        <input
          type="text"
          placeholder="e.g., PT Meindo Elang"
          value={formData.pelaksana}
          onChange={(e) => onChange('pelaksana', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        />
      </div>
    </div>
  );
}
