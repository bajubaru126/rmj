import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OrbitProgress } from 'react-loading-indicators';
import { ChevronRight, ChevronDown, Plus, X, Trash2, MapPin, Layers } from 'lucide-react';
import { extractId } from '@/services/contractService';
import { API_CONFIG } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { installationOcrService, type InstallationOcr } from '@/services/installationService';
import { CreateSpanInstalasiModal } from '@/components/modals/span/CreateSpanInstalasiModal';
import { DeleteSpanInstalasiModal } from '@/components/modals/span/DeleteSpanInstalasiModal';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SpanInstallasi {
  id: string | { tb: string; id: string };
  project_id: string | { tb: string; id: string };
  link_id: string | { tb: string; id: string };
  span_name: string;
  geometry: { type: string; coordinates: number[][] } | null;
  created_at: string;
}

interface TabSpanInstallationProps {
  projectId: string;
  linkId: string;
  projectName?: string;
}

// ── Helper: check if a point is near a LineString ─────────────────────────────
function isPointNearLine(
  lat: number, lon: number,
  coords: number[][],
  thresholdDeg = 0.002  // ~220m
): boolean {
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((lon - x1) * dx + (lat - y1) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * dx, nearY = y1 + t * dy;
    const dist = Math.sqrt((lon - nearX) ** 2 + (lat - nearY) ** 2);
    if (dist <= thresholdDeg) return true;
  }
  return false;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function TabSpanInstallation({ projectId, linkId, projectName }: TabSpanInstallationProps) {
  const { token } = useAuth();

  const [spans, setSpans] = useState<SpanInstallasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  // OCR records as "designators"
  const [ocrRecords, setOcrRecords] = useState<InstallationOcr[]>([]);
  const [loadingOcr, setLoadingOcr] = useState(false);

  // Selected span for right panel
  const [selectedSpan, setSelectedSpan] = useState<SpanInstallasi | null>(null);
  const [selectedOcr, setSelectedOcr] = useState<InstallationOcr | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lastCoordinates, setLastCoordinates] = useState<[number, number] | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [spanToDelete, setSpanToDelete] = useState<{ id: string; name: string } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSpans();
    fetchOcrRecords();
  }, [projectId, linkId]);

  const fetchSpans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/span-installasi?project_id=${projectId}&link_id=${linkId}`,
        { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSpans(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      console.error('Failed to fetch span installasi:', err);
      setError('Failed to load spans');
    } finally {
      setLoading(false);
    }
  };

  const fetchOcrRecords = async () => {
    try {
      setLoadingOcr(true);
      const { data } = await installationOcrService.getAll({ link_id: linkId }, token);
      setOcrRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch OCR records:', err);
      setOcrRecords([]);
    } finally {
      setLoadingOcr(false);
    }
  };

  // ── Match OCR records to a span by proximity ──────────────────────────────
  const getDesignatorsForSpan = (span: SpanInstallasi): InstallationOcr[] => {
    const coords = span.geometry?.coordinates;
    if (!coords || coords.length === 0) return [];
    return ocrRecords.filter(ocr => {
      if (typeof ocr.latitude !== 'number' || typeof ocr.longitude !== 'number') return false;
      return isPointNearLine(ocr.latitude, ocr.longitude, coords);
    });
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSpan = (spanId: string) => {
    setExpandedSpans(prev => {
      const next = new Set(prev);
      next.has(spanId) ? next.delete(spanId) : next.add(spanId);
      return next;
    });
  };

  const handleAddSpanClick = async () => {
    if (spans.length > 0) {
      const latest = spans[0];
      const coords = latest.geometry?.coordinates;
      if (coords && coords.length > 0) {
        const last = coords[coords.length - 1];
        if (last[0] !== 0 && last[1] !== 0) {
          setLastCoordinates([last[0], last[1]]);
          setShowContinueDialog(true);
          return;
        }
      }
    }
    setLastCoordinates(null);
    setShowCreateModal(true);
  };

  const handleContinueFromLastSpan = (useLast: boolean) => {
    setShowContinueDialog(false);
    if (!useLast) setLastCoordinates(null);
    setShowCreateModal(true);
  };

  const handleSpanCreated = async (coords?: [number, number] | null) => {
    if (coords) setLastCoordinates(coords);
    setShowCreateModal(false);
    await fetchSpans();
  };

  const handleDeleteClick = (spanId: string, spanName: string) => {
    setSpanToDelete({ id: spanId, name: spanName });
    setShowDeleteModal(true);
  };

  const handleSpanDeleted = async () => {
    setShowDeleteModal(false);
    setSpanToDelete(null);
    if (selectedSpan && extractId(selectedSpan.id) === spanToDelete?.id) setSelectedSpan(null);
    await fetchSpans();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex-grow flex" style={{ minHeight: '600px' }}>
      {/* ── LEFT: Main list ── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header - Hidden as requested */}
        {false && (
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontWeight: 600 }}>Spans</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? 'Loading spans...' : `Project: ${projectName || ''}`}
                </p>
              </div>
              {!loading && (
                <button
                  onClick={handleAddSpanClick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                    whiteSpace: 'nowrap', boxShadow: '0 8px 32px 0 rgba(0, 94, 184, 0.37)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)'; }}
                >
                  <Plus className="w-4 h-4" /><span>Add Span</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full"><p className="text-red-600">{error}</p></div>
          ) : spans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-gray-500">No spans available for this installation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {spans.map(span => {
                const spanId = extractId(span.id);
                const isExpanded = expandedSpans.has(spanId);
                const designators = getDesignatorsForSpan(span);
                const isLoadingDesig = loadingOcr;

                return (
                  <div key={spanId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Span Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-white p-4">
                      <div className="flex items-center gap-3">
                        <button className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors" onClick={() => toggleSpan(spanId)}>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-700" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </button>
                        <div onClick={() => { toggleSpan(spanId); setSelectedSpan(span); }} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{span.span_name}</span>
                            {designators.length > 0 && (
                              <span className="text-xs text-gray-500">({designators.length} designator{designators.length !== 1 ? 's' : ''})</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteClick(spanId, span.span_name); }}
                          className="flex-shrink-0 p-2 hover:bg-red-50 rounded-lg transition-colors group" title="Delete Span"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Designators list (like survey span items) */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-white">
                        {isLoadingDesig ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-gray-500">Loading designators...</div>
                          </div>
                        ) : designators.length === 0 ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-gray-500">No designators found for this span</div>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {designators.map((ocr, idx) => {
                              const ocrId = typeof ocr.id === 'string' ? ocr.id : String(ocr.id);
                              return (
                                <div
                                  key={ocrId || idx}
                                  className="p-3 hover:bg-blue-50 transition-colors cursor-pointer"
                                  onClick={() => { setSelectedOcr(ocr); setSelectedSpan(span); }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {ocr.designator || `Record ${idx + 1}`}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {ocr.kedalaman_galian != null && `Depth: ${ocr.kedalaman_galian}m`}
                                        {ocr.jarak_dari_hh_jt != null && ` • HH/JT: ${ocr.jarak_dari_hh_jt}m`}
                                        {ocr.keterangan && ` • ${ocr.keterangan}`}
                                      </div>
                                      {(ocr.latitude || ocr.longitude) && (
                                        <div className="text-xs text-gray-400 mt-0.5 font-mono">
                                          {ocr.latitude?.toFixed(6)}, {ocr.longitude?.toFixed(6)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-green-600 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>✓</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail Panel ── */}
      {(selectedSpan || selectedOcr) && (
        <div className="w-96 bg-white border-l border-gray-200 shadow-soft-lg flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm">{selectedOcr ? 'Designator Detail' : 'Span Detail'}</h3>
                <p className="text-xs text-blue-100 mt-1">
                  {selectedOcr ? (selectedOcr.designator || 'Installation Record') : selectedSpan?.span_name}
                </p>
              </div>
              <button onClick={() => { setSelectedOcr(null); setSelectedSpan(null); }} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {selectedOcr ? (
              <>
                {/* Designator Info */}
                <div className="glass-card rounded-lg p-4">
                  <h4 className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Designator Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Designator', selectedOcr.designator || '-'],
                      ['Kedalaman Galian', selectedOcr.kedalaman_galian != null ? `${selectedOcr.kedalaman_galian} m` : '-'],
                      ['Jarak dari HH/JT', selectedOcr.jarak_dari_hh_jt != null ? `${selectedOcr.jarak_dari_hh_jt} m` : '-'],
                      ['HH/JT', selectedOcr.span_hh_jt || '-'],
                      ['Total Length', selectedOcr.total_length != null ? `${selectedOcr.total_length} m` : '-'],
                      ['Status', selectedOcr.status || '-'],
                      ['Keterangan', selectedOcr.keterangan || '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-gray-600">{label}:</span>
                        <span className="text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location */}
                {(selectedOcr.latitude || selectedOcr.longitude) && (
                  <div className="glass-card rounded-lg p-4">
                    <h4 className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Location
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latitude:</span>
                        <span className="text-gray-900 font-mono">{selectedOcr.latitude?.toFixed(6) ?? '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Longitude:</span>
                        <span className="text-gray-900 font-mono">{selectedOcr.longitude?.toFixed(6) ?? '-'}</span>
                      </div>
                      {selectedOcr.address && (
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-600">Address:</span>
                          <span className="text-gray-900 text-right text-xs">{selectedOcr.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : selectedSpan && (
              /* Span Info when no designator selected */
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">Span Information</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ['Span Name', selectedSpan.span_name],
                    ['Geometry', selectedSpan.geometry?.type ?? 'N/A'],
                    ['Points', String(selectedSpan.geometry?.coordinates?.length ?? 0)],
                    ['Created', new Date(selectedSpan.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-600">{label}:</span>
                      <span className="text-gray-900 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateSpanInstalasiModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          projectId={projectId}
          linkId={linkId}
          onSpanCreated={handleSpanCreated}
          initialCoordinates={lastCoordinates}
        />
      )}

      {/* ── Continue Dialog ── */}
      {showContinueDialog && lastCoordinates && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 10001 }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Lanjutkan dari Titik Terakhir?</h3>
              <button onClick={() => { setShowContinueDialog(false); setLastCoordinates(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Gunakan koordinat titik terakhir Span sebelumnya sebagai titik awal Span baru?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 mb-1">Koordinat titik terakhir:</p>
              <p className="text-sm font-mono text-gray-900">{lastCoordinates[0].toFixed(6)}, {lastCoordinates[1].toFixed(6)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleContinueFromLastSpan(false)} className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700">
                Tidak, Mulai Baru
              </button>
              <button onClick={() => handleContinueFromLastSpan(true)} className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)' }}>
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && spanToDelete && (
        <DeleteSpanInstalasiModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setSpanToDelete(null); }}
          spanId={spanToDelete.id}
          spanName={spanToDelete.name}
          onSpanDeleted={handleSpanDeleted}
        />
      )}
    </div>
  );
}
