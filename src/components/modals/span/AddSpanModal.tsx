import { useState, useEffect } from 'react';
import { X, Sparkles, Tag, ChevronDown, MapPin } from 'lucide-react';
import { spanService, SpanItemResponse } from '@/services/spanService';
import { extractId } from '@/services/contractService';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { OrbitProgress } from 'react-loading-indicators';

interface AddSpanModalProps {
  isOpen: boolean;
  onClose: () => void;
  spanId: string;
  spanName?: string; // Optional span name to display in header
  onAddSpan: (spanData: any) => void;
}

interface SpanFormData {
  selectedSpanItemId: string;
  itemName: string;
  offset: string;
  depth: string;
  date: string;
  location: string;
  ssLink: string;
  latitude: string;
  longitude: string;
  soilType: string;
}

export function AddSpanModal({ isOpen, onClose, spanId, spanName, onAddSpan }: AddSpanModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic'>('manual');
  const [formData, setFormData] = useState<SpanFormData>({
    selectedSpanItemId: '',
    itemName: '',
    offset: '',
    depth: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    location: '',
    ssLink: '',
    latitude: '',
    longitude: '',
    soilType: ''
  });
  const [availableSpanItems, setAvailableSpanItems] = useState<SpanItemResponse[]>([]);
  const [loadingSpanItems, setLoadingSpanItems] = useState<boolean>(false);
  const [showSpanItemDropdown, setShowSpanItemDropdown] = useState<boolean>(false);
  const { toast, showToast, hideToast } = useToast();

  // Fetch span data and span items when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableSpanItems();
      fetchSpanData();
    }
  }, [isOpen]);

  const fetchSpanData = async () => {
    try {
      console.log('📡 Fetching span data for span:', spanId);
      const spanData = await spanService.getSpanById(spanId);
      console.log('✅ Loaded span data:', spanData);
      
      // Auto-fill designator from span name if available
      if (spanData.span_name) {
        setFormData(prev => ({
          ...prev,
          itemName: spanData.span_name
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load span data:', error);
    }
  };

  const fetchAvailableSpanItems = async () => {
    setLoadingSpanItems(true);
    try {
      console.log('📡 Fetching available span items for span:', spanId);
      const data = await spanService.getAllSpanItemsBySpanId(spanId);
      console.log('✅ Loaded', data.length, 'span items');
      setAvailableSpanItems(data);
    } catch (error) {
      console.error('❌ Failed to load span items:', error);
      showToast('Failed to load span items', 'error');
    } finally {
      setLoadingSpanItems(false);
    }
  };

  // Handle span item selection - auto-fill fields
  const handleSpanItemSelect = (spanItem: SpanItemResponse) => {
    const spanItemId = extractId(spanItem.id);
    console.log('📍 Selected span item:', spanItemId, spanItem);
    
    setFormData(prev => ({
      ...prev,
      selectedSpanItemId: spanItemId,
      // Auto-fill from selected span item (these will be disabled)
      location: spanItem.location || '',
      ssLink: spanItem.ss_link || '',
      latitude: spanItem.latitude?.toString() || '',
      longitude: spanItem.longitude?.toString() || '',
      soilType: spanItem.soil_type || '',
      date: spanItem.date ? spanItem.date.split('T')[0] : new Date().toISOString().split('T')[0],
      // Keep itemName from span (auto-filled earlier), only reset offset and depth
      offset: '',
      depth: ''
    }));
    
    setShowSpanItemDropdown(false);
  };

  // Debug spanId when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 AddSpanModal opened with spanId:', spanId);
      console.log('🔍 spanId type:', typeof spanId);
      console.log('🔍 spanId value:', JSON.stringify(spanId));
      console.log('🔍 spanId is object?:', typeof spanId === 'object');
      
      // Alert if spanId is not a valid string
      if (!spanId) {
        console.error('❌ INVALID SPAN ID: undefined or null');
      } else if (typeof spanId === 'object') {
        console.error('❌ INVALID SPAN ID: Received object instead of string!', spanId);
        console.error('❌ This should have been extracted in KontrakExplorer!');
      } else if (spanId === 'undefined') {
        console.error('❌ INVALID SPAN ID: String "undefined"');
      }
    }
  }, [isOpen, spanId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Validation: Must select a span item (survey) first
    if (!formData.selectedSpanItemId) {
      showToast('Please select a span item location first', 'warning');
      return;
    }

    // Manual entry validation
    if (!formData.itemName.trim()) {
      showToast('Please enter item name', 'warning');
      return;
    }

    if (!formData.offset || parseFloat(formData.offset) < 0) {
      showToast('Please enter a valid offset', 'warning');
      return;
    }

    if (!formData.depth || parseFloat(formData.depth) < 0) {
      showToast('Please enter a valid depth', 'warning');
      return;
    }

    // Prepare data for complete survey API
    const completeSurveyData = {
      survey_id: formData.selectedSpanItemId,
      item_name: formData.itemName,
      offset: parseFloat(formData.offset),
      depth: parseFloat(formData.depth),
    };

    console.log('📤 Completing survey to span item:', JSON.stringify(completeSurveyData, null, 2));

    try {
      const { spanService } = await import('@/services/spanService');
      const { authService } = await import('@/services/authService');
      
      const token = authService.getToken();
      const result = await spanService.completeSurveyToSpanItem(completeSurveyData, token);
      
      console.log('✅ Survey completed to span item:', result);
      showToast('Span item created successfully!', 'success');
      onAddSpan(result);
      handleClose();
    } catch (error) {
      console.error('❌ Error completing survey:', error);
      showToast(`Failed to create span item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleClose = () => {
    setFormData({
      selectedSpanItemId: '',
      itemName: '',
      offset: '',
      depth: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      ssLink: '',
      latitude: '',
      longitude: '',
      soilType: ''
    });
    setActiveTab('manual');
    setShowSpanItemDropdown(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9999 }}>
      <div 
        className="shadow-2xl flex flex-col relative"
        style={{ 
          width: '600px', 
          height: '700px', 
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: activeTab === 'automatic' ? '#0a0e27' : '#ffffff',
          backdropFilter: activeTab === 'automatic' ? 'blur(10px)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Space Background Animation for Automatic Tab */}
        {activeTab === 'automatic' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="stars3"></div>
          </div>
        )}

        {/* Modal Header */}
        <div 
          className="p-6 flex items-center justify-between relative"
          style={{
            background: activeTab === 'automatic' 
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
            zIndex: 10
          }}
        >
          <div className="relative">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {activeTab === 'automatic' && <Sparkles className="w-5 h-5" />}
              Add Span Item
            </h3>
            <p className="text-sm text-white mt-1">
              {spanName ? `Adding item to: ${spanName}` : (activeTab === 'manual' ? 'Add span item manually' : 'AI-powered span item detection')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all relative"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        {/* COMMENTED OUT: Automatic Tab Hidden */}
        {/* <div 
          className="flex border-b relative z-20" 
          style={{ 
            background: 'transparent',
            borderColor: activeTab === 'automatic' ? '#374151' : '#e5e7eb'
          }}
        >
          <button
            onClick={() => setActiveTab('manual')}
            className="flex-1 px-6 py-4 text-sm font-medium transition-all relative z-20"
            style={{ 
              background: activeTab === 'manual' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              // Jika tab manual aktif: hitam (karena background terang)
              // Jika tab manual tidak aktif dan tema dark: abu-abu terang
              // Jika tab manual tidak aktif dan tema light: abu-abu gelap
              color: activeTab === 'manual' 
                ? '#1f2937'  // Hitam saat tab manual aktif
                : (activeTab === 'automatic' ? '#9ca3af' : '#6b7280'), // Abu menyesuaikan tema
              borderBottom: activeTab === 'manual' ? '2px solid #3B82F6' : 'none'
            }}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('automatic')}
            className="flex-1 px-6 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 relative z-20"
            style={{ 
              background: activeTab === 'automatic' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              // Jika tab automatic aktif: putih (karena background dark)
              // Jika tab automatic tidak aktif dan tema light: abu-abu gelap
              // Jika tab automatic tidak aktif dan tema dark: abu-abu terang
              color: activeTab === 'automatic' 
                ? '#ffffff'  // Putih saat tab automatic aktif
                : (activeTab === 'manual' ? '#6b7280' : '#9ca3af'), // Abu menyesuaikan tema
              borderBottom: activeTab === 'automatic' ? '2px solid #ffffff' : 'none'
            }}
          >
            <Sparkles className="w-4 h-4" />
            AI Analysis
          </button>
        </div> */}

        {/* Modal Body */}
        <div 
          className="p-6 relative flex flex-col" 
          style={{ 
            background: activeTab === 'automatic' 
              ? 'transparent'
              : 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
            overflowY: 'auto',
            flexShrink: 1,
            flexGrow: 1,
            zIndex: 5,
            minHeight: '0'
          }}
        >
          {/* COMMENTED OUT: Automatic Tab Content Hidden - Always show manual form */}
          {/* {activeTab === 'manual' ? ( */}
            {/* Manual Entry Form */}
            <div className="space-y-4">
              {/* Span Item Selection */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  <MapPin className="w-3.5 h-3.5 inline-block mr-1 text-blue-500" />
                  Select Span Item (Survey Location) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={loadingSpanItems ? "Loading span items..." : "Select a span item location"}
                    value={
                      formData.selectedSpanItemId 
                        ? availableSpanItems.find(item => extractId(item.id) === formData.selectedSpanItemId)?.location || formData.selectedSpanItemId
                        : ''
                    }
                    onFocus={() => setShowSpanItemDropdown(true)}
                    readOnly
                    className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
                    disabled={loadingSpanItems}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  
                  {/* Span Item Dropdown */}
                  {showSpanItemDropdown && availableSpanItems.length > 0 && (
                    <>
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availableSpanItems.map((spanItem) => {
                          const itemId = extractId(spanItem.id);
                          const displayText = spanItem.location || `ID: ${itemId}`;
                          const subText = spanItem.ss_link ? `SS Link: ${spanItem.ss_link}` : '';
                          
                          return (
                            <button
                              key={itemId}
                              type="button"
                              onClick={() => handleSpanItemSelect(spanItem)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="text-sm font-medium text-gray-900">{displayText}</div>
                              {subText && <div className="text-xs text-gray-500 mt-0.5">{subText}</div>}
                              <div className="text-xs text-gray-400 mt-0.5">
                                Lat: {spanItem.latitude?.toFixed(6)}, Lon: {spanItem.longitude?.toFixed(6)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {/* Close dropdown on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSpanItemDropdown(false)}
                      />
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select a survey location to auto-fill coordinates and location details
                </p>
              </div>

              {/* Divider */}
              {formData.selectedSpanItemId && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-3">
                    📍 Auto-filled from selected location (read-only)
                  </p>
                </div>
              )}

              {/* Location - DISABLED */}
              <div className="cursor-not-allowed">
                <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* SS Link - DISABLED */}
              <div className="cursor-not-allowed">
                <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">SS Link</label>
                <input
                  type="text"
                  value={formData.ssLink}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* GPS Coordinates - DISABLED */}
              <div className="grid grid-cols-2 gap-4">
                <div className="cursor-not-allowed">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="cursor-not-allowed">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Date - DISABLED */}
              <div className="cursor-not-allowed">
                <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Divider */}
              {formData.selectedSpanItemId && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-3">
                    ✏️ Fill in the following details
                  </p>
                </div>
              )}

              {/* Item Name (Designator) - AUTO-FILLED FROM SPAN, READ-ONLY */}
              <div className="cursor-not-allowed">
                <label className="block text-xs font-semibold text-gray-500 mb-2 cursor-not-allowed">
                  <Tag className="w-3.5 h-3.5 inline-block mr-1 text-blue-500" />
                  Item Name (Designator)
                </label>
                <input
                  type="text"
                  placeholder="Will be auto-filled from span"
                  value={formData.itemName}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Offset and Depth - EDITABLE */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Offset (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 100.5"
                    value={formData.offset}
                    onChange={(e) => setFormData({...formData, offset: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Depth (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1.5"
                    value={formData.depth}
                    onChange={(e) => setFormData({...formData, depth: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </div>
          {/* ) : ( */}
            {/* COMMENTED OUT: Automatic AI Analysis Content */}
            {/* <div className="space-y-2 flex flex-col h-full"> */}
              {/* Upload Area - SMALLER */}
              {/* <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className="border-2 border-dashed rounded-xl text-center transition-all cursor-pointer flex-shrink-0"
                style={{
                  background: isDragging 
                    ? 'rgba(168, 85, 247, 0.15)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isDragging ? '#a855f7' : 'rgba(255, 255, 255, 0.2)',
                  borderWidth: '2px',
                  borderStyle: 'dashed',
                  padding: '16px'
                }}
                onClick={() => !isProcessing && document.getElementById('span-image-upload')?.click()}
              >
                <input
                  id="span-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                
                <Upload className="w-8 h-8 text-white mx-auto mb-1" />
                <p className="text-white font-medium text-xs mb-0.5">Upload SPAN Image</p>
                <p className="text-gray-400 text-xs">Click or drag & drop</p>
              </div> */}

              {/* AI Analysis Result - LARGER */}
              {/* <div 
                className="border rounded-xl backdrop-blur-sm flex flex-col flex-grow overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  borderWidth: '1px',
                  minHeight: '0'
                }}
              >
                <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <h4 className="text-white font-semibold flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                    AI Analysis Result
                  </h4>
                </div>

                <div className="flex-grow overflow-y-auto p-3">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <OrbitProgress color="#15396C" size="small" text="" textColor="" />
                      <p className="text-white font-medium text-xs mb-0.5 mt-4">Analyzing Image</p>
                      <p className="text-gray-400 text-xs">Please wait...</p>
                    </div>
                ) : aiResult ? (
                  aiResult.error ? (
                    <div className="rounded-lg p-3 border" style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                          background: 'rgba(239, 68, 68, 0.2)'
                        }}>
                          <X className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-xs mb-1" style={{ color: '#ffffff' }}>Analysis Failed</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#fecaca' }}>{aiResult.error}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2"> */}
                      {/* Success Badge - COMPACT */}
                      {/* <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-xs truncate">Information extracted successfully</p>
                        </div>
                      </div> */}

                      {/* Check if we have any data to display */}
                      {/* {!aiResult.catatan?.segmen && !aiResult.catatan?.jarak && !aiResult.catatan?.kode && !aiResult.gps_coordinates && !aiResult.lokasi ? (
                        <div className="rounded-lg p-4 border text-center" style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderColor: 'rgba(245, 158, 11, 0.3)'
                        }}>
                          <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                          <p className="text-amber-400 font-semibold text-xs mb-1">No Data Extracted</p>
                          <p className="text-gray-400 text-xs">Please try uploading a clearer image.</p>
                        </div>
                      ) : null} */}

                      {/* Segment Info - COMPACT */}
                      {/* {aiResult.catatan?.segmen && (
                        <div 
                          className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Tag className="w-4 h-4 text-white flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400">Segment Name</p>
                            <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.segmen}</p>
                          </div>
                        </div>
                      )} */}

                      {/* Distance - COMPACT */}
                      {/* {aiResult.catatan?.jarak && (
                        <div 
                          className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Ruler className="w-4 h-4 text-white flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400">Distance / Length</p>
                            <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.jarak}</p>
                          </div>
                        </div>
                      )} */}

                      {/* Code - COMPACT */}
                      {/* {aiResult.catatan?.kode && (
                        <div 
                          className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Tag className="w-4 h-4 text-white flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400">Designator Code</p>
                            <p className="text-white font-semibold text-xs truncate">{aiResult.catatan.kode}</p>
                          </div>
                        </div>
                      )} */}

                      {/* GPS Coordinates - COMPACT */}
                      {/* {aiResult.gps_coordinates && (
                        <div 
                          className="rounded-lg p-2 transition-all hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Navigation className="w-4 h-4 text-white flex-shrink-0" />
                            <p className="text-xs text-gray-400">GPS Coordinates</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                              <p className="text-xs text-gray-500">Lat</p>
                              <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.latitude}</p>
                            </div>
                            <div className="rounded px-2 py-1" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                              <p className="text-xs text-gray-500">Lon</p>
                              <p className="text-white text-xs font-mono truncate">{aiResult.gps_coordinates.longitude}</p>
                            </div>
                          </div>
                        </div>
                      )} */}

                      {/* Location - COMPACT */}
                      {/* {aiResult.lokasi && (
                        <div 
                          className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <MapPin className="w-4 h-4 text-white flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400">Location Address</p>
                            <p className="text-white font-semibold text-xs truncate">{aiResult.lokasi}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Sparkles className="w-12 h-12 text-white mb-3 opacity-50" />
                    <p className="text-white font-medium text-xs mb-1">Ready to Analyze</p>
                    <p className="text-gray-400 text-xs text-center max-w-xs">
                      Upload a SPAN image above
                    </p>
                  </div>
                )}
                </div>
              </div>
            </div> */}
          {/* )} */}
        </div>

        {/* Modal Footer */}
        <div 
          className={`p-6 flex gap-3 border-t ${
            activeTab === 'automatic' ? 'border-gray-700' : 'border-gray-200'
          }`}
          style={{ 
            flexShrink: 0,
            background: activeTab === 'automatic' ? 'rgba(17, 24, 39, 0.5)' : '#f9fafb',
            position: 'relative',
            zIndex: 30
          }}
        >
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 relative z-30"
            style={{ color: '#374151' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 relative z-30"
            style={{ color: '#374151' }}
          >
            Add SPAN
          </button>
        </div>
      </div>

      {/* CSS for Space Animation */}
      <style>{`
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }

        .stars {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${Array.from({ length: 700 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
          animation: animStar 50s linear infinite;
        }

        .stars:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${Array.from({ length: 700 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
        }

        .stars2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${Array.from({ length: 200 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
          animation: animStar 100s linear infinite;
        }

        .stars2:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${Array.from({ length: 200 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
        }

        .stars3 {
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${Array.from({ length: 100 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
          animation: animStar 150s linear infinite;
        }

        .stars3:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${Array.from({ length: 100 }, () => 
            `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`
          ).join(', ')};
        }
      `}</style>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
    </div>
  );
}
