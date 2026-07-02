import { useRef, useEffect, useState } from 'react';
import { X, Upload, MapPin, Plus, FileText, Trash2, ChevronDown, Map as MapIcon } from 'lucide-react';
import { BOQItem } from '@/types/contract';
import { getAllRegionals, getAllWitels, getWitelsByRegionId, extractId, type Regional, type Witel } from '@/services/regionalService';
import { vendorService, type Vendor } from '@/services/vendorService';

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

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    employeer: string;
    mainVendor: string;
    pelaksana: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  ssLinks?: Array<{link_name: string; sub_pelaksana?: string; ss_contract_value?: string; kml_file?: File}>; // Optional
  setSSLinks?: React.Dispatch<React.SetStateAction<Array<{link_name: string; sub_pelaksana?: string; ss_contract_value?: string; kml_file?: File}>>>; // Optional
  boqItems: BOQItem[];
  boqFileName: string;
  kmlFileName: string;
  kmlPreviewData: string;
  isDraggingBOQ: boolean;
  isDraggingKML: boolean;
  isCreatingContract: boolean;
  setIsDraggingBOQ: (value: boolean) => void;
  setIsDraggingKML: (value: boolean) => void;
  handleBOQUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleKMLUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBOQDrop: (e: React.DragEvent) => void;
  handleKMLDrop: (e: React.DragEvent) => void;
  handleKMLPreview: () => void;
  handleAddBOQRow: () => void;
  handleDeleteBOQRow: (id: string) => void;
  handleBOQItemChange: (id: string, field: keyof BOQItem, value: string) => void;
  handleCreateContract: () => void;
}

export function CreateContractModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  ssLinks: ssLinksProp,
  setSSLinks: setSSLinksProp,
  boqItems,
  boqFileName,
  kmlFileName,
  kmlPreviewData,
  isDraggingBOQ,
  isDraggingKML,
  isCreatingContract,
  setIsDraggingBOQ,
  setIsDraggingKML,
  handleBOQUpload,
  handleKMLUpload,
  handleBOQDrop,
  handleKMLDrop,
  handleKMLPreview,
  handleAddBOQRow,
  handleDeleteBOQRow,
  handleBOQItemChange,
  handleCreateContract
}: CreateContractModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const boqDetailRef = useRef<HTMLDivElement>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [expandedSSLinkIndex, setExpandedSSLinkIndex] = useState<number | null>(null);
  
  // Regional & Witel state
  const [regionalList, setRegionalList] = useState<Regional[]>([]);
  const [witelList, setWitelList] = useState<Witel[]>([]);
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>('');
  const [selectedRegionalName, setSelectedRegionalName] = useState<string>(''); // ✅ NEW: For display
  const [selectedWitelName, setSelectedWitelName] = useState<string>(''); // ✅ NEW: For display
  const [loadingRegional, setLoadingRegional] = useState(false);
  const [loadingWitel, setLoadingWitel] = useState(false);
  
  // Vendor state
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState<{[key: number]: boolean}>({});
  const [vendorSearchQuery, setVendorSearchQuery] = useState<{[key: number]: string}>({});
  
  // State for SS Links with contract value per link
  const [localSSLinks, setLocalSSLinks] = useState<Array<{
    link_name: string; 
    sub_pelaksana?: string; // ✅ FIXED: matches parent state field name
    ss_contract_value?: string; // Contract value per link
    kml_file?: File;
  }>>([
    {link_name: '', sub_pelaksana: '', ss_contract_value: ''}
  ]);
  
  // Use props if provided, otherwise use local state
  const ssLinks = ssLinksProp || localSSLinks;
  const setSSLinks = setSSLinksProp || setLocalSSLinks;
  
  const [contractDocFileName, setContractDocFileName] = useState<string>('');
  const [contractDocFile, setContractDocFile] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<Array<{fileName: string; title: string; file: File}>>([]);
  const [kmlFileNames, setKmlFileNames] = useState<{[key: number]: string}>({});
  
  // Drag and drop states
  const [isDraggingContract, setIsDraggingContract] = useState(false);
  const [isDraggingOther, setIsDraggingOther] = useState(false);
  const [isDraggingKMLGeometry, setIsDraggingKMLGeometry] = useState<{[key: number]: boolean}>({});

  // Update formData with ssLinks whenever ssLinks change
  useEffect(() => {
    // Store ssLinks, contract document, and other documents in formData for access in parent
    setFormData((prev: any) => ({
      ...prev,
      ssLinksData: ssLinks,
      contractDocFile: contractDocFile,
      otherDocsData: otherDocs
    }));
  }, [ssLinks, contractDocFile, otherDocs, setFormData]);

  // Fetch regional list on mount
  useEffect(() => {
    const fetchRegional = async () => {
      setLoadingRegional(true);
      try {
        const data = await getAllRegionals();
        setRegionalList(data);
      } catch (error) {
        console.error('Failed to fetch regional:', error);
      } finally {
        setLoadingRegional(false);
      }
    };

    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const data = await vendorService.getAllVendors();
        setVendorList(data);
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      } finally {
        setLoadingVendors(false);
      }
    };

    if (isOpen) {
      fetchRegional();
      fetchVendors();
    }
  }, [isOpen]);

  // Fetch witel list when regional is selected
  useEffect(() => {
    const fetchWitel = async () => {
      if (!selectedRegionalId) {
        setWitelList([]);
        return;
      }

      setLoadingWitel(true);
      try {
        const data = await getWitelsByRegionId(selectedRegionalId);
        setWitelList(data);
      } catch (error) {
        console.error('Failed to fetch witel:', error);
        setWitelList([]);
      } finally {
        setLoadingWitel(false);
      }
    };

    fetchWitel();
  }, [selectedRegionalId]);

  // Filter regions based on input
  const filteredRegions = regionalList.filter(region =>
    region.region.toLowerCase().includes(selectedRegionalName.toLowerCase())
  );

  // Filter locations (witel) based on input
  const filteredLocations = witelList.filter(witel =>
    witel.witel.toLowerCase().includes(selectedWitelName.toLowerCase())
  );
  
  // ✅ DEBUG: Log formData whenever it changes
  useEffect(() => {
    console.log('🔍 [DEBUG] formData changed:', {
      lokasi: formData.lokasi,
      location: formData.location,
      selectedRegionalName,
      selectedWitelName
    });
  }, [formData.lokasi, formData.location, selectedRegionalName, selectedWitelName]);

  const handleAddSSLink = () => {
    setSSLinks([...ssLinks, {link_name: '', sub_pelaksana: '', ss_contract_value: ''}]);
  };

  const handleRemoveSSLink = (index: number) => {
    if (ssLinks.length > 1) {
      setSSLinks(ssLinks.filter((_, i) => i !== index));
    }
  };

  const handleSSLinkChange = (index: number, value: string) => {
    const newLinks = [...ssLinks];
    newLinks[index].link_name = value;
    setSSLinks(newLinks);
  };

  const handleVendorChange = (index: number, vendorId: string, vendorName: string) => {
    const newLinks = [...ssLinks];
    newLinks[index].sub_pelaksana = extractId(vendorId);
    setSSLinks(newLinks);
    
    // Update search query to show selected vendor name
    setVendorSearchQuery(prev => ({
      ...prev,
      [index]: vendorName
    }));
    
    // Close dropdown
    setShowVendorDropdown(prev => ({
      ...prev,
      [index]: false
    }));
  };

  const handleVendorSearchChange = (index: number, value: string) => {
    setVendorSearchQuery(prev => ({
      ...prev,
      [index]: value
    }));
    
    // Clear sub_pelaksana when user starts typing (unless exact match)
    const exactMatch = vendorList.find(vendor => vendor.name === value);
    const newLinks = [...ssLinks];
    newLinks[index].sub_pelaksana = exactMatch ? extractId(exactMatch.id) : '';
    setSSLinks(newLinks);
    
    // Show dropdown when typing
    setShowVendorDropdown(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const handleVendorInputFocus = (index: number) => {
    // Show dropdown and clear search if there's a selected vendor
    setShowVendorDropdown(prev => ({
      ...prev,
      [index]: true
    }));
    
    // If there's a selected vendor, clear the search to allow new search
    if (ssLinks[index].sub_pelaksana) {
      setVendorSearchQuery(prev => ({
        ...prev,
        [index]: ''
      }));
    }
  };

  // Get filtered vendors based on search query
  const getFilteredVendors = (index: number) => {
    const query = vendorSearchQuery[index] || '';
    if (!query) return vendorList;
    
    return vendorList.filter(vendor =>
      vendor.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Get vendor name by ID (handles both plain ID and prefixed format)
  const getVendorNameById = (vendorId: string) => {
    const vendor = vendorList.find(v => 
      extractId(v.id) === vendorId || v.id === vendorId
    );
    return vendor ? vendor.name : '';
  };

  // Get display value for input
  const getVendorDisplayValue = (index: number) => {
    // If user is actively searching, show search query
    if (showVendorDropdown[index] && vendorSearchQuery[index] !== undefined) {
      return vendorSearchQuery[index];
    }
    
    // If vendor is selected and not searching, show vendor name
    if (ssLinks[index].sub_pelaksana) {
      return getVendorNameById(ssLinks[index].sub_pelaksana);
    }
    
    // Default empty
    return '';
  };

  // Handler for contract value change per link
  const handleContractValueChange = (index: number, value: string) => {
    const newLinks = [...ssLinks];
    // Store plain number value (without Rp and dots)
    newLinks[index].ss_contract_value = parseRupiah(value);
    setSSLinks(newLinks);
  };

  const handleContractDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setContractDocFileName(file.name);
      setContractDocFile(file);
    }
  };

  const handleContractDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingContract(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setContractDocFileName(file.name);
      setContractDocFile(file);
    }
  };

  const handleOtherDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map(file => ({
        fileName: file.name,
        title: '',
        file: file
      }));
      setOtherDocs([...otherDocs, ...newDocs]);
      e.target.value = '';
    }
  };

  const handleOtherDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOther(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map(file => ({
        fileName: file.name,
        title: '',
        file: file
      }));
      setOtherDocs([...otherDocs, ...newDocs]);
    }
  };

  const handleOtherDocTitleChange = (index: number, title: string) => {
    const updated = [...otherDocs];
    updated[index].title = title;
    setOtherDocs(updated);
  };

  const handleRemoveOtherDoc = (index: number) => {
    setOtherDocs(otherDocs.filter((_, i) => i !== index));
  };

  const handleKMLFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newLinks = [...ssLinks];
      newLinks[index] = {
        ...newLinks[index],
        kml_file: file
      };
      setSSLinks(newLinks);
      
      setKmlFileNames(prev => ({
        ...prev,
        [index]: file.name
      }));
    }
  };

  const handleKMLFileDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingKMLGeometry(prev => ({...prev, [index]: false}));
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.kml') || file.name.endsWith('.kmz'))) {
      const newLinks = [...ssLinks];
      newLinks[index] = {
        ...newLinks[index],
        kml_file: file
      };
      setSSLinks(newLinks);
      
      setKmlFileNames(prev => ({
        ...prev,
        [index]: file.name
      }));
    }
  };

  const handleRemoveKMLFile = (index: number) => {
    const newLinks = [...ssLinks];
    delete newLinks[index].kml_file;
    setSSLinks(newLinks);
    
    setKmlFileNames(prev => {
      const updated = {...prev};
      delete updated[index];
      return updated;
    });
  };

  // Auto-calculate contract duration when start or end date changes
  useEffect(() => {
    if (formData.startDatePlan && formData.endDatePlan) {
      const duration = calculateContractDuration(formData.startDatePlan, formData.endDatePlan);
      if (duration && duration !== formData.contractDuration) {
        setFormData((prev: any) => ({
          ...prev,
          contractDuration: duration
        }));
      }
    }
  }, [formData.startDatePlan, formData.endDatePlan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white shadow-2xl w-full flex flex-col" style={{ 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
        maxHeight: '85vh',
        maxWidth: '900px',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div className="p-6 flex items-center justify-between" style={{ 
          backgroundColor: '#003A70',
          flexShrink: 0
        }}>
          <div>
            <h3 className="text-white text-lg font-semibold">Create New Project</h3>
            <p className="text-xs text-blue-200 mt-1">Fill in contract details and upload KML geometry</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div ref={modalContentRef} className="p-6" style={{ 
          background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
          overflowY: 'auto',
          flexShrink: 1,
          flexGrow: 1
        }}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Pengadaan dan Pemasangan OSP FO Backbone dan RMJ"
                value={formData.namaProject}
                onChange={(e) => setFormData({...formData, namaProject: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                No. Contract <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., K.TEL.005422/HK.810/GPP-A0000000/2024"
                value={formData.nomorKontrak}
                onChange={(e) => setFormData({...formData, nomorKontrak: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Contract Signed <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.contractSigned}
                onChange={(e) => setFormData({...formData, contractSigned: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDatePlan}
                onChange={(e) => setFormData({...formData, startDatePlan: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDatePlan}
                onChange={(e) => setFormData({...formData, endDatePlan: e.target.value})}
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
                Region <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Regional 1"
                  value={selectedRegionalName}
                  onChange={(e) => {
                    setSelectedRegionalName(e.target.value);
                    setFormData({...formData, lokasi: '', location: ''}); // Reset IDs when typing
                    setSelectedRegionalId(''); // Reset selected regional ID
                    setSelectedWitelName(''); // Reset witel name
                    setShowRegionDropdown(true);
                  }}
                  onFocus={() => setShowRegionDropdown(true)}
                  disabled={loadingRegional}
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                
                {/* Region Dropdown */}
                {showRegionDropdown && filteredRegions.length > 0 && (
                  <>
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredRegions.map((region) => (
                        <button
                          key={extractId(region.id)}
                          type="button"
                          onClick={() => {
                            const regionId = extractId(region.id);
                            // ✅ FIX: Store ID in formData, name in display state
                            setFormData({...formData, lokasi: regionId, location: ''}); // Store ID, reset location
                            setSelectedRegionalId(regionId);
                            setSelectedRegionalName(region.region); // Store name for display
                            setSelectedWitelName(''); // Reset witel name
                            setShowRegionDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {region.region}
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

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-block mr-1 text-orange-500" />
                Witel <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={selectedRegionalId ? "e.g., Witel Bandung" : "Select region first"}
                  value={selectedWitelName}
                  onChange={(e) => {
                    setSelectedWitelName(e.target.value);
                    setFormData({...formData, location: ''}); // Reset ID when typing
                    setShowLocationDropdown(true);
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  disabled={!selectedRegionalId || loadingWitel}
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                
                {/* Location Dropdown */}
                {showLocationDropdown && filteredLocations.length > 0 && (
                  <>
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredLocations.map((witel) => (
                        <button
                          key={extractId(witel.id)}
                          type="button"
                          onClick={() => {
                            const witelId = extractId(witel.id);
                            // ✅ FIX: Store ID in formData, name in display state
                            setFormData({...formData, location: witelId});
                            setSelectedWitelName(witel.witel); // Store name for display
                            setShowLocationDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {witel.witel}
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
                
                {/* Loading indicator for witel */}
                {loadingWitel && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., PT Telkom Indonesia"
                value={formData.employeer}
                onChange={(e) => setFormData({...formData, employeer: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Pelaksana <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., PT. Telkom Infra"
                value={formData.mainVendor}
                onChange={(e) => setFormData({...formData, mainVendor: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                SS/Link <span className="text-red-500">*</span>
                <button
                  type="button"
                  onClick={handleAddSSLink}
                  className="ml-2 text-blue-600 hover:text-blue-700 text-xs"
                >
                  <Plus className="w-3 h-3 inline-block" /> Add More
                </button>
              </label>
              <div className="space-y-3">
                {ssLinks.map((link, index) => (
                  <div key={index} className="relative">
                    <div className="flex gap-2 items-center">
                      {/* Chevron Icon Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedSSLinkIndex(expandedSSLinkIndex === index ? null : index)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        title={expandedSSLinkIndex === index ? "Collapse" : "Expand"}
                      >
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform ${
                            expandedSSLinkIndex === index ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      {/* Input Field */}
                      <input
                        type="text"
                        placeholder="e.g., SS#01"
                        value={link.link_name}
                        onChange={(e) => handleSSLinkChange(index, e.target.value)}
                        onClick={() => setExpandedSSLinkIndex(index)}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      
                      {/* Remove Button */}
                      {ssLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSSLink(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remove link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Dropdown Content - Sub Pelaksana, Contract Value, and Geometry Upload */}
                    {expandedSSLinkIndex === index && (
                      <div className="mt-2 ml-10 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="p-4 space-y-4">
                          {/* Sub Pelaksana Dropdown with Search */}
                          <div className="relative">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Sub Pelaksana <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={loadingVendors ? "Loading vendors..." : "Search vendor..."}
                                value={getVendorDisplayValue(index)}
                                onChange={(e) => handleVendorSearchChange(index, e.target.value)}
                                onFocus={() => handleVendorInputFocus(index)}
                                disabled={loadingVendors}
                                className="w-full px-3 py-2 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              
                              {/* Loading indicator */}
                              {loadingVendors && (
                                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                </div>
                              )}
                              
                              {/* Vendor Dropdown */}
                              {showVendorDropdown[index] && !loadingVendors && (
                                <>
                                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {getFilteredVendors(index).length > 0 ? (
                                      getFilteredVendors(index).map((vendor) => (
                                        <button
                                          key={vendor.id}
                                          type="button"
                                          onClick={() => handleVendorChange(index, vendor.id, vendor.name)}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                        >
                                          {vendor.name}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-4 py-2 text-sm text-gray-500">
                                        {vendorSearchQuery[index] ? 'No vendors found matching your search' : 'No vendors available'}
                                      </div>
                                    )}
                                  </div>
                                  {/* Close dropdown on outside click */}
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowVendorDropdown(prev => ({...prev, [index]: false}))}
                                  />
                                </>
                              )}
                            </div>
                          </div>

                          {/* Contract Value Input */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Contract Value <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., Rp 500.000.000"
                              value={ssLinks[index].ss_contract_value ? formatRupiah(ssLinks[index].ss_contract_value || '') : ''}
                              onChange={(e) => handleContractValueChange(index, e.target.value)}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                          </div>

                          {/* Geometry Upload Section */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <MapIcon className="w-4 h-4 text-blue-500" />
                              Geometry Upload <span className="text-red-500">*</span>
                            </label>
                            {kmlFileNames[index] ? (
                              <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <MapIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 font-semibold truncate">{kmlFileNames[index]}</p>
                                      <p className="text-xs text-gray-500">KML file uploaded</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKMLFile(index)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                    title="Remove file"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                  isDraggingKMLGeometry[index] 
                                    ? 'border-blue-500 bg-blue-100/50' 
                                    : 'border-blue-300 bg-blue-50/30'
                                }`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsDraggingKMLGeometry(prev => ({...prev, [index]: true}));
                                }}
                                onDragLeave={() => setIsDraggingKMLGeometry(prev => ({...prev, [index]: false}))}
                                onDrop={(e) => handleKMLFileDrop(index, e)}
                              >
                                <input
                                  type="file"
                                  id={`geometry-upload-${index}`}
                                  accept=".kml,.kmz"
                                  onChange={(e) => handleKMLFileUpload(index, e)}
                                  className="hidden"
                                />
                                <label htmlFor={`geometry-upload-${index}`} className="cursor-pointer block">
                                  <Upload className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                  <p className="text-sm text-gray-900 font-semibold mb-1">Upload KML / KMZ</p>
                                  <p className="text-xs text-gray-500 mb-2">Drag & drop or click to browse</p>
                                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                                    .kml, .kmz
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document Upload Section - 2 Columns */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Contract Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Contract Document
              </label>
              <div 
                className={`border-2 border-dashed rounded-xl py-6 px-4 transition-colors ${
                  isDraggingContract 
                    ? 'border-orange-500 bg-orange-100/50' 
                    : 'border-orange-300 bg-orange-50/30'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingContract(true);
                }}
                onDragLeave={() => setIsDraggingContract(false)}
                onDrop={handleContractDocDrop}
              >
                <input
                  type="file"
                  id="contract-doc-upload"
                  accept="*/*"
                  onChange={handleContractDocUpload}
                  className="hidden"
                />
                <label htmlFor="contract-doc-upload" className="cursor-pointer block">
                  {contractDocFileName ? (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <FileText className="w-6 h-6 text-orange-500" />
                      </div>
                      <p className="text-sm text-gray-900 font-semibold truncate px-2">{contractDocFileName}</p>
                      <p className="text-xs text-gray-500 mt-1">File uploaded</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setContractDocFileName('');
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Upload className="w-6 h-6 text-orange-500" />
                      </div>
                      <p className="text-sm text-gray-900 font-semibold mb-2">Upload Contract Doc</p>
                      <p className="text-xs text-gray-500 mb-3 px-2">
                        Drag & drop or click to browse
                      </p>
                      <span className="inline-block px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                        Choose File
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Other Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Other Document
              </label>
              
              {/* List of uploaded documents with title inputs */}
              {otherDocs.length > 0 && (
                <div className="space-y-3 mb-3">
                  {otherDocs.map((doc, index) => (
                    <div key={index} className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50/30">
                      {/* Document Title Input */}
                      <div className="mb-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Document Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Technical Specification"
                          value={doc.title}
                          onChange={(e) => handleOtherDocTitleChange(index, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                      
                      {/* File Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-semibold truncate">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">File uploaded</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherDoc(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-xl py-6 px-4 transition-colors ${
                  isDraggingOther 
                    ? 'border-blue-500 bg-blue-100/50' 
                    : 'border-blue-300 bg-blue-50/30'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOther(true);
                }}
                onDragLeave={() => setIsDraggingOther(false)}
                onDrop={handleOtherDocDrop}
              >
                <input
                  type="file"
                  id="other-doc-upload"
                  accept="*/*"
                  multiple
                  onChange={handleOtherDocUpload}
                  className="hidden"
                />
                <label htmlFor="other-doc-upload" className="cursor-pointer block">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-900 font-semibold mb-2">Upload Other Doc</p>
                    <p className="text-xs text-gray-500 mb-3 px-2">
                      Drag & drop or click to browse (Multiple files allowed)
                    </p>
                    <span className="inline-block px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                      {otherDocs.length > 0 ? 'Add More Files' : 'Choose Files'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white" style={{ 
          flexShrink: 0
        }}>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-50 text-gray-600 rounded-md text-sm hover:bg-gray-100 transition-colors font-medium border border-gray-200"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateContract}
            disabled={isCreatingContract}
            className="liquid-btn px-6 py-2.5 bg-gradient-to-r from-[#15396C] to-[#0078D7] text-white rounded-lg text-sm hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isCreatingContract ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
