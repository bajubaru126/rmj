import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, MapPin } from 'lucide-react';
import { Toast } from '../../ui/Toast';
import { useToast } from '@/hooks/useToast';
import { MapPickerModal } from './MapPickerModal';
import { API_CONFIG } from '@/config/api';
import { authService } from '@/services/authService';

interface SpanData {
  spanName: string;
  coordinates: Array<[number, number]>;
}

interface CreateSpanInstalasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  linkId: string;
  onSpanCreated: (lastCoordinates?: [number, number] | null) => void;
  initialCoordinates?: [number, number] | null;
}

export function CreateSpanInstalasiModal({
  isOpen,
  onClose,
  projectId,
  linkId,
  onSpanCreated,
  initialCoordinates,
}: CreateSpanInstalasiModalProps) {
  const [spans, setSpans] = useState<SpanData[]>([
    { spanName: '', coordinates: [[0, 0], [0, 0]] },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [kmlData, setKmlData] = useState<any>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  if (!isOpen) return null;

  // Fetch KML data when modal opens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    const fetchKML = async () => {
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_CONFIG.BASE_URL}/projects/${projectId}/kml`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setKmlData(await res.json());
      } catch (_) {}
    };
    fetchKML();
  }, [isOpen, projectId]);

  // Auto-fill initial coordinates
  useEffect(() => {
    if (!isOpen) return;
    if (initialCoordinates) {
      setSpans([{ spanName: '', coordinates: [initialCoordinates, [0, 0]] }]);
    } else {
      setSpans([{ spanName: '', coordinates: [[0, 0], [0, 0]] }]);
    }
  }, [initialCoordinates, isOpen]);

  const handleSpanNameChange = (idx: number, val: string) => {
    const next = [...spans];
    next[idx].spanName = val;
    setSpans(next);
  };

  const handleCoordChange = (sIdx: number, pIdx: number, cIdx: 0 | 1, val: string) => {
    const next = [...spans];
    next[sIdx].coordinates[pIdx][cIdx] = parseFloat(val) || 0;
    setSpans(next);
  };

  const addCoordinate = (sIdx: number) => {
    const next = [...spans];
    next[sIdx].coordinates.push([0, 0]);
    setSpans(next);
  };

  const removeCoordinate = (sIdx: number, pIdx: number) => {
    const next = [...spans];
    if (next[sIdx].coordinates.length > 2) {
      next[sIdx].coordinates.splice(pIdx, 1);
      setSpans(next);
    }
  };

  const addNewSpan = () => {
    const prev = spans[spans.length - 1];
    const allFilled = prev.coordinates.every(c => c[0] !== 0 && c[1] !== 0);
    const lastCoord = prev.coordinates[prev.coordinates.length - 1];
    if (allFilled && lastCoord[0] !== 0 && lastCoord[1] !== 0) {
      setShowContinueDialog(true);
    } else {
      setSpans([...spans, { spanName: '', coordinates: [[0, 0], [0, 0]] }]);
    }
  };

  const handleContinueFromLastPoint = (useLast: boolean) => {
    const prev = spans[spans.length - 1];
    const lastCoord = prev.coordinates[prev.coordinates.length - 1];
    setSpans([
      ...spans,
      {
        spanName: '',
        coordinates: useLast && lastCoord[0] !== 0 ? [lastCoord, [0, 0]] : [[0, 0], [0, 0]],
      },
    ]);
    setShowContinueDialog(false);
  };

  const removeSpan = (idx: number) => {
    if (spans.length > 1) setSpans(spans.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    for (let i = 0; i < spans.length; i++) {
      if (!spans[i].spanName.trim()) {
        showToast(`Please enter name for Span ${i + 1}`, 'warning');
        return;
      }
      if (spans[i].coordinates.some(c => c[0] === 0 && c[1] === 0)) {
        showToast(`Please enter valid coordinates for Span ${i + 1}`, 'warning');
        return;
      }
    }

    setIsCreating(true);
    try {
      const token = authService.getToken();
      let lastCoordinates: [number, number] | null = null;

      for (const span of spans) {
        const body = {
          project_id: projectId,
          link_id: linkId,
          span_name: span.spanName.trim(),
          geometry: {
            type: 'LineString',
            coordinates: span.coordinates,
          },
        };

        const res = await fetch(`${API_CONFIG.BASE_URL}/span-installasi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `HTTP ${res.status}`);
        }

        const result = await res.json();
        const coords = result?.data?.geometry?.coordinates;
        if (coords && coords.length > 0) {
          lastCoordinates = coords[coords.length - 1] as [number, number];
        }
      }

      showToast(`${spans.length} span${spans.length > 1 ? 's' : ''} created successfully!`, 'success');
      onSpanCreated(lastCoordinates);
      handleClose();
    } catch (err) {
      showToast(`Failed to create span: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSpans([{ spanName: '', coordinates: [[0, 0], [0, 0]] }]);
    setShowMapPicker(false);
    setSelectedSpanIndex(0);
    setSelectedPointIndex(null);
    setShowContinueDialog(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9999 }} onClick={handleClose}>
      <div
        className="bg-white shadow-2xl flex flex-col relative"
        style={{ width: '500px', maxHeight: '90vh', borderRadius: '16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Span
            </h3>
            <p className="text-sm text-white/80 mt-1">Add a new span for this installation</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-all" disabled={isCreating}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          <div className="space-y-6">
            {spans.map((span, sIdx) => (
              <div key={sIdx} className="border-2 border-gray-200 rounded-lg p-4 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700">Span {sIdx + 1}</h4>
                  {spans.length > 1 && (
                    <button type="button" onClick={() => removeSpan(sIdx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" disabled={isCreating}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Span Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Span Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Span A-B, Section 1, etc."
                    value={span.spanName}
                    onChange={e => handleSpanNameChange(sIdx, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    disabled={isCreating}
                  />
                </div>

                {/* Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Coordinates (LineString) *</label>
                    <button type="button" onClick={() => addCoordinate(sIdx)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1" disabled={isCreating}>
                      <Plus className="w-3 h-3" /> Add Point
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Enter at least 2 points (longitude, latitude)</p>

                  {initialCoordinates && sIdx === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Using coordinates from last span as start point
                      </p>
                      <p className="text-xs text-blue-600 mt-1">{initialCoordinates[0].toFixed(6)}, {initialCoordinates[1].toFixed(6)}</p>
                    </div>
                  )}

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {span.coordinates.map((coord, pIdx) => (
                      <div key={pIdx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">Point {pIdx + 1}</span>
                          {span.coordinates.length > 2 && (
                            <button type="button" onClick={() => removeCoordinate(sIdx, pIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded" disabled={isCreating}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="number" step="0.000001" placeholder="112.768845"
                              value={coord[0] || ''}
                              onChange={e => handleCoordChange(sIdx, pIdx, 0, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 ${initialCoordinates && sIdx === 0 && pIdx === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                              disabled={isCreating}
                            />
                            <p className="text-xs text-gray-500 mt-1">Longitude</p>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1">
                              <input
                                type="number" step="0.000001" placeholder="-7.250445"
                                value={coord[1] || ''}
                                onChange={e => handleCoordChange(sIdx, pIdx, 1, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 ${initialCoordinates && sIdx === 0 && pIdx === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                                disabled={isCreating}
                              />
                              <p className="text-xs text-gray-500 mt-1">Latitude</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedSpanIndex(sIdx); setSelectedPointIndex(pIdx); setShowMapPicker(true); }}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                              disabled={isCreating}
                              title="Pick from map"
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

            <button
              type="button"
              onClick={addNewSpan}
              className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4" /> Add New Span
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex gap-3 border-t border-gray-200 bg-gray-50" style={{ borderRadius: '0 0 16px 16px' }}>
          <button onClick={handleClose} className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700" disabled={isCreating}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)' }}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-3 bg-white rounded-sm animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span>Creating...</span>
              </>
            ) : 'Create Span(s)'}
          </button>
        </div>
      </div>

      {/* Map Picker */}
      {showMapPicker && selectedPointIndex !== null && (
        <MapPickerModal
          isOpen={showMapPicker}
          onClose={() => { setShowMapPicker(false); setSelectedPointIndex(null); }}
          onLocationSelect={(lng, lat) => {
            if (selectedPointIndex !== null) {
              const next = [...spans];
              next[selectedSpanIndex].coordinates[selectedPointIndex] = [lng, lat];
              setSpans(next);
            }
            setShowMapPicker(false);
            setSelectedPointIndex(null);
          }}
          projectId={projectId}
          initialLongitude={spans[selectedSpanIndex].coordinates[selectedPointIndex ?? 0][0]}
          initialLatitude={spans[selectedSpanIndex].coordinates[selectedPointIndex ?? 0][1]}
          kmlData={kmlData}
          linkId={linkId}
          existingCoordinates={spans[selectedSpanIndex].coordinates}
        />
      )}

      {/* Continue Dialog */}
      {showContinueDialog && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 10001 }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Lanjutkan dari Titik Terakhir?</h3>
            <p className="text-sm text-gray-600 mb-6">Gunakan koordinat titik terakhir span sebelumnya sebagai titik awal span baru?</p>
            <div className="flex gap-3">
              <button onClick={() => handleContinueFromLastPoint(false)} className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700">
                Tidak, Mulai Baru
              </button>
              <button
                onClick={() => handleContinueFromLastPoint(true)}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)' }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={hideToast} />
    </div>,
    document.body
  );
}
