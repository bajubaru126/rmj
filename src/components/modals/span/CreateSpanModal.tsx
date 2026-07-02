import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, MapPin } from 'lucide-react';
import { Toast } from '../../ui/Toast';
import { useToast } from '@/hooks/useToast';
import { MapPickerModal } from './MapPickerModal';
import { linkService } from '@/services/linkService';
import { authService } from '@/services/authService';

interface SpanData {
  spanName: string;
  coordinates: Array<[number, number]>;
}

interface CreateSpanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSpanCreated: (lastCoordinates?: [number, number] | null) => void; // Pass last coordinates back
  linkId?: string; // Add linkId prop for auto-fill
  initialCoordinates?: [number, number] | null; // NEW: Initial coordinates from last span
}

export function CreateSpanModal({ isOpen, onClose, projectId, onSpanCreated, linkId, initialCoordinates }: CreateSpanModalProps) {
  const [ssLink, setSSLink] = useState(''); // Selected SS/Link - moved to top
  const [spans, setSpans] = useState<SpanData[]>([
    {
      spanName: '',
      coordinates: [
        [0, 0], // Point 1: [longitude, latitude]
        [0, 0]  // Point 2: [longitude, latitude]
      ]
    }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedSpanIndex, setSelectedSpanIndex] = useState<number>(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [links, setLinks] = useState<any[]>([]); // Available SS/Links
  const [isLoadingLinks, setIsLoadingLinks] = useState(false); // Loading state
  const [kmlData, setKmlData] = useState<any>(null); // KML data for MapPickerModal
  const [showContinueDialog, setShowContinueDialog] = useState(false); // NEW: Show continue dialog
  const { toast, showToast, hideToast } = useToast();

  if (!isOpen) return null;

  // Fetch KML data when modal opens
  useEffect(() => {
    const fetchKMLData = async () => {
      if (!isOpen || !projectId) return;
      
      try {
        const { default: axios } = await import('axios');
        const token = authService.getToken();
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
        
        // Fetch KML data from project
        const response = await axios.get(`${apiUrl}/projects/${projectId}/kml`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ KML data fetched for CreateSpanModal:', response.data);
        setKmlData(response.data);
      } catch (error) {
        console.error('❌ Error fetching KML data:', error);
      }
    };

    fetchKMLData();
  }, [isOpen, projectId]);

  // Fetch links when modal opens
  useEffect(() => {
    const fetchLinks = async () => {
      if (!isOpen || !projectId) return;
      
      setIsLoadingLinks(true);
      try {
        const token = authService.getToken();
        const data = await linkService.getLinksByProjectId(projectId, token);
        console.log('✅ Loaded', data.length, 'links for span modal');
        setLinks(data);
      } catch (error) {
        console.error('Error fetching links:', error);
        showToast('Failed to load SS/Links. Please try again.', 'error');
      } finally {
        setIsLoadingLinks(false);
      }
    };

    fetchLinks();
  }, [isOpen, projectId]);

  // Auto-fill SS/Link when linkId is provided
  useEffect(() => {
    if (linkId && isOpen) {
      console.log('🔄 Auto-filling SS/Link with linkId:', linkId);
      setSSLink(linkId);
    }
  }, [linkId, isOpen]);

  // Auto-fill initial coordinates when provided
  useEffect(() => {
    if (initialCoordinates && isOpen) {
      console.log('🔄 Auto-filling initial coordinates:', initialCoordinates);
      setSpans([{
        spanName: '',
        coordinates: [
          initialCoordinates, // Use the last coordinate from previous span
          [0, 0] // Second point needs to be filled
        ]
      }]);
    } else if (isOpen && !initialCoordinates) {
      // Reset to default when no initial coordinates
      setSpans([{
        spanName: '',
        coordinates: [[0, 0], [0, 0]]
      }]);
    }
  }, [initialCoordinates, isOpen]);

  const handleSpanNameChange = (spanIndex: number, value: string) => {
    const newSpans = [...spans];
    newSpans[spanIndex].spanName = value;
    setSpans(newSpans);
  };

  const handleCoordinateChange = (spanIndex: number, pointIndex: number, coordIndex: 0 | 1, value: string) => {
    const newSpans = [...spans];
    newSpans[spanIndex].coordinates[pointIndex][coordIndex] = parseFloat(value) || 0;
    setSpans(newSpans);
  };

  const addCoordinate = (spanIndex: number) => {
    const newSpans = [...spans];
    newSpans[spanIndex].coordinates.push([0, 0]);
    setSpans(newSpans);
  };

  const removeCoordinate = (spanIndex: number, pointIndex: number) => {
    const newSpans = [...spans];
    if (newSpans[spanIndex].coordinates.length > 2) {
      newSpans[spanIndex].coordinates = newSpans[spanIndex].coordinates.filter((_, i) => i !== pointIndex);
      setSpans(newSpans);
    }
  };

  const addNewSpan = () => {
    // Check if previous span has ALL coordinates filled with valid values
    const previousSpan = spans[spans.length - 1];
    
    // Check if ALL coordinates are filled (not 0,0)
    const allCoordinatesFilled = previousSpan.coordinates.every(coord => 
      coord[0] !== 0 && coord[1] !== 0
    );
    
    // Get the last coordinate
    const lastCoordinate = previousSpan.coordinates[previousSpan.coordinates.length - 1];
    const lastCoordinateValid = lastCoordinate[0] !== 0 && lastCoordinate[1] !== 0;
    
    // Only show dialog if ALL coordinates are filled AND last coordinate is valid
    if (allCoordinatesFilled && lastCoordinateValid) {
      // Show confirmation dialog
      setShowContinueDialog(true);
    } else {
      // Not all coordinates filled, just add new span without dialog
      setSpans([...spans, {
        spanName: '',
        coordinates: [[0, 0], [0, 0]]
      }]);
    }
  };

  const handleContinueFromLastPoint = (useLast: boolean) => {
    const previousSpan = spans[spans.length - 1];
    const lastCoordinate = previousSpan.coordinates[previousSpan.coordinates.length - 1];
    
    if (useLast && lastCoordinate[0] !== 0 && lastCoordinate[1] !== 0) {
      // Use last coordinate as first point of new span
      setSpans([...spans, {
        spanName: '',
        coordinates: [lastCoordinate, [0, 0]]
      }]);
    } else {
      // Start fresh
      setSpans([...spans, {
        spanName: '',
        coordinates: [[0, 0], [0, 0]]
      }]);
    }
    
    setShowContinueDialog(false);
  };

  const removeSpan = (spanIndex: number) => {
    if (spans.length > 1) {
      setSpans(spans.filter((_, i) => i !== spanIndex));
    }
  };

  const handleSubmit = async () => {
    // Validate SS/Link is selected
    if (!ssLink || ssLink.trim() === '') {
      showToast('Please select SS/Link', 'warning');
      return;
    }

    // Validate all spans
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      
      if (!span.spanName.trim()) {
        showToast(`Please enter name for Span ${i + 1}`, 'warning');
        return;
      }

      // Validate coordinates
      const hasInvalidCoords = span.coordinates.some(coord => 
        coord[0] === 0 && coord[1] === 0
      );
      
      if (hasInvalidCoords) {
        showToast(`Please enter valid coordinates for Span ${i + 1} (non-zero values)`, 'warning');
        return;
      }
    }

    setIsCreating(true);

    try {
      const { spanService } = await import('@/services/spanService');
      const { authService } = await import('@/services/authService');
      
      const token = authService.getToken();
      
      // Prepare all spans data for bulk creation
      // Convert geometry coordinates to start_point and end_point format
      const spansData = spans.map(span => {
        const coords = span.coordinates;
        return {
          project_id: projectId,
          span_name: span.spanName.trim(),
          link_id: ssLink,
          start_point: coords[0] as [number, number], // First coordinate
          end_point: coords[coords.length - 1] as [number, number], // Last coordinate
          snap_to_route: true,
          auto_assign_surveys: true,
          distance_threshold: 50
        };
      });

      console.log('📤 Creating spans via bulk API:', JSON.stringify(spansData, null, 2));
      
      let lastCoordinates: [number, number] | null = null;
      
      // Always use bulk API (even for single span)
      const results = await spanService.createSpansBulk(spansData, token);
      console.log('✅ Spans created via bulk API:', results);
      
      const spanCount = spans.length;
      showToast(`${spanCount} span${spanCount > 1 ? 's' : ''} created successfully!`, 'success');
      
      // Get last coordinates from the last span in results
      if (results && results.length > 0) {
        const lastSpan = results[results.length - 1];
        if (lastSpan.geometry && lastSpan.geometry.coordinates && lastSpan.geometry.coordinates.length > 0) {
          const coords = lastSpan.geometry.coordinates;
          lastCoordinates = coords[coords.length - 1] as [number, number];
          console.log('📍 Last coordinates from bulk create:', lastCoordinates);
        }
      }
      
      onSpanCreated(lastCoordinates);
      handleClose();
    } catch (error) {
      console.error('❌ Error creating spans:', error);
      showToast(`Failed to create spans: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSSLink('');
    setSpans([{
      spanName: '',
      coordinates: [[0, 0], [0, 0]]
    }]);
    setShowMapPicker(false);
    setSelectedSpanIndex(0);
    setSelectedPointIndex(null);
    setShowContinueDialog(false);
    onClose();
  };

  const handleMapPickerOpen = (spanIndex: number, pointIndex: number) => {
    setSelectedSpanIndex(spanIndex);
    setSelectedPointIndex(pointIndex);
    setShowMapPicker(true);
  };

  const handleLocationSelect = (longitude: number, latitude: number) => {
    if (selectedPointIndex !== null) {
      const newSpans = [...spans];
      newSpans[selectedSpanIndex].coordinates[selectedPointIndex] = [longitude, latitude];
      setSpans(newSpans);
    }
    setShowMapPicker(false);
    setSelectedPointIndex(null);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9999 }} onClick={handleClose}>
      <div 
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ 
          width: '500px',
          maxHeight: '90vh',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
            borderRadius: '16px 16px 0 0'
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Span
            </h3>
            <p className="text-sm text-white mt-1">
              Add a new span to this project
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            disabled={isCreating}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {/* SS/Link Select - MOVED TO TOP */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SS/Link *
            </label>
            <select
              value={ssLink}
              onChange={(e) => {
                console.log('🔍 Selected SS/Link value:', e.target.value);
                setSSLink(e.target.value);
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all ${
                linkId ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-200'
              }`}
              disabled={isCreating || isLoadingLinks || !!linkId}
              title={linkId ? 'SS/Link is pre-selected from Survey Links' : ''}
            >
              <option value="">-- Select SS/Link --</option>
              {links.map((link) => {
                // Extract ID from deeply nested structure: link.id.id.String
                let linkId = '';
                
                if (link.id && typeof link.id === 'object') {
                  if ('id' in link.id && link.id.id) {
                    const nestedId = link.id.id as any;
                    // Check if link.id.id has String property
                    if (typeof nestedId === 'object' && nestedId.String) {
                      linkId = String(nestedId.String);
                    } else if (typeof nestedId === 'string') {
                      linkId = nestedId;
                    } else {
                      linkId = String(nestedId);
                    }
                  }
                } else if (typeof link.id === 'string') {
                  linkId = link.id;
                }
                
                console.log('🔍 Link option:', { 
                  name: link.link_name, 
                  extractedId: linkId, 
                  rawId: link.id,
                  nestedId: (link.id as any)?.id 
                });
                
                return (
                  <option key={linkId} value={linkId}>
                    {link.link_name}
                  </option>
                );
              })}
            </select>
            {isLoadingLinks && (
              <p className="text-xs text-gray-500 mt-1">Loading links...</p>
            )}
            {linkId && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                ✓ Pre-selected from Survey Links
              </p>
            )}
          </div>

          {/* Spans List */}
          <div className="space-y-6">
            {spans.map((span, spanIndex) => (
              <div key={spanIndex} className="border-2 border-gray-200 rounded-lg p-4 space-y-4 relative">
                {/* Span Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700">
                    Span {spanIndex + 1}
                  </h4>
                  {spans.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSpan(spanIndex)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      disabled={isCreating}
                      title="Remove this span"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Span Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Span Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Span A-B, Section 1, etc."
                    value={span.spanName}
                    onChange={(e) => handleSpanNameChange(spanIndex, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    disabled={isCreating}
                  />
                </div>

                {/* Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Coordinates (LineString) *
                    </label>
                    <button
                      type="button"
                      onClick={() => addCoordinate(spanIndex)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      disabled={isCreating}
                    >
                      <Plus className="w-3 h-3" />
                      Add Point
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Enter at least 2 points (longitude, latitude)
                  </p>
                  
                  {/* Show info if using coordinates from previous span */}
                  {initialCoordinates && spanIndex === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Menggunakan koordinat dari span terakhir sebagai titik awal
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {initialCoordinates[0].toFixed(6)}, {initialCoordinates[1].toFixed(6)}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {span.coordinates.map((coord, pointIndex) => (
                      <div key={pointIndex} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">
                            Point {pointIndex + 1}
                          </span>
                          {span.coordinates.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeCoordinate(spanIndex, pointIndex)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                              disabled={isCreating}
                              title="Remove point"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.000001"
                              placeholder="112.768845"
                              value={coord[0] || ''}
                              onChange={(e) => handleCoordinateChange(spanIndex, pointIndex, 0, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                                initialCoordinates && spanIndex === 0 && pointIndex === 0 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : 'border-gray-200'
                              }`}
                              disabled={isCreating}
                              title={initialCoordinates && spanIndex === 0 && pointIndex === 0 ? 'Koordinat dari span terakhir' : ''}
                            />
                            <p className="text-xs text-gray-500 mt-1">Longitude</p>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1">
                              <input
                                type="number"
                                step="0.000001"
                                placeholder="-7.250445"
                                value={coord[1] || ''}
                                onChange={(e) => handleCoordinateChange(spanIndex, pointIndex, 1, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                                  initialCoordinates && spanIndex === 0 && pointIndex === 0 
                                    ? 'border-blue-300 bg-blue-50' 
                                    : 'border-gray-200'
                                }`}
                                disabled={isCreating}
                                title={initialCoordinates && spanIndex === 0 && pointIndex === 0 ? 'Koordinat dari span terakhir' : ''}
                              />
                              <p className="text-xs text-gray-500 mt-1">Latitude</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMapPickerOpen(spanIndex, pointIndex)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isCreating}
                              title="Pick location from map"
                            >
                              <MapPin className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Span Button */}
            <button
              type="button"
              onClick={addNewSpan}
              className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4" />
              Add New Span
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
            }}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-3 bg-white rounded-sm"
                      style={{
                        animation: 'pulse 1s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`
                      }}
                    />
                  ))}
                </div>
                <span>Creating...</span>
              </>
            ) : 'Create Span(s)'}
          </button>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && selectedPointIndex !== null && (
        <MapPickerModal
          isOpen={showMapPicker}
          onClose={() => {
            setShowMapPicker(false);
            setSelectedPointIndex(null);
          }}
          onLocationSelect={handleLocationSelect}
          projectId={projectId}
          initialLongitude={spans[selectedSpanIndex].coordinates[selectedPointIndex][0]}
          initialLatitude={spans[selectedSpanIndex].coordinates[selectedPointIndex][1]}
          kmlData={kmlData}
          linkId={ssLink}
          existingCoordinates={spans[selectedSpanIndex].coordinates}
        />
      )}

      {/* Continue Dialog */}
      {showContinueDialog && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 10001 }}>
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Lanjutkan dari Titik Terakhir?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda ingin menggunakan koordinat titik terakhir Span sebelumnya sebagai titik awal Span baru?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleContinueFromLastPoint(false)}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
              >
                Tidak, Mulai Baru
              </button>
              <button
                onClick={() => handleContinueFromLastPoint(true)}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all text-white"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)',
                }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
    </div>,
    document.body
  );
}
