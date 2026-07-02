import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { spanService, SpanResponse, SpanItemResponse } from '@/services/spanService';
import { extractId } from '@/services/contractService';
import { OrbitProgress } from 'react-loading-indicators';
import { ChevronRight, ChevronDown, Plus, X, MapPin, Image as ImageIcon, Eye, Paperclip, Trash2 } from 'lucide-react';
import { CreateSpanModal } from '@/components/modals/span/CreateSpanModal';
import { AddSpanModal } from '@/components/modals/span/AddSpanModal';
import { DeleteSpanModal } from '@/components/modals/span/DeleteSpanModal';

interface TabSpanProps {
  projectId: string;
  projectName: string;
  linkId?: string; // NEW: Optional link ID for filtering spans
  onDataChanged?: () => void; // NEW: Callback when span data changes (create/edit/delete)
}

export function TabSpan({ projectId, projectName, linkId, onDataChanged }: TabSpanProps) {
  const [spans, setSpans] = useState<SpanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [spanItems, setSpanItems] = useState<Record<string, SpanItemResponse[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<SpanItemResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateSpanModal, setShowCreateSpanModal] = useState(false);
  const [showAddSpanModal, setShowAddSpanModal] = useState(false);
  const [selectedSpanForAddItem, setSelectedSpanForAddItem] = useState<{ id: string; name: string } | null>(null);
  const [showContinueFromLastSpanDialog, setShowContinueFromLastSpanDialog] = useState(false);
  const [lastSpanCoordinates, setLastSpanCoordinates] = useState<[number, number] | null>(null);
  const [showDeleteSpanModal, setShowDeleteSpanModal] = useState(false);
  const [selectedSpanForDelete, setSelectedSpanForDelete] = useState<{ id: string; name: string } | null>(null);

  // Global error handler for uncaught errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('❌ Uncaught error:', event.error);
      setRenderError(`Uncaught error: ${event.error?.message || 'Unknown error'}`);
      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      setRenderError(`Unhandled rejection: ${event.reason?.message || 'Unknown error'}`);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Fetch spans on component mount
  useEffect(() => {
    const fetchSpans = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 Fetching spans for project:', projectId);
        
        // Use linkId if available to filter spans
        let data;
        if (linkId) {
          console.log('📡 Filtering spans by linkId:', linkId);
          data = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
        } else {
          console.log('📡 Fetching all spans for project (no linkId filter)');
          data = await spanService.getSpansByProjectId(projectId);
        }
        
        console.log('✅ Spans fetched:', data);
        setSpans(data);
      } catch (err) {
        console.error('❌ Failed to fetch spans:', err);
        setError('Failed to load spans');
      } finally {
        setLoading(false);
      }
    };

    fetchSpans();
  }, [projectId, linkId]); // Re-fetch when projectId or linkId changes

  // Toggle span expansion and fetch items if needed
  const toggleSpan = async (spanId: string) => {
    try {
      console.log('🔄 toggleSpan called with spanId:', spanId);
      
      const newExpanded = new Set(expandedSpans);
      const isExpanding = !newExpanded.has(spanId);
      
      console.log('🔄 isExpanding:', isExpanding);
      
      if (newExpanded.has(spanId)) {
        newExpanded.delete(spanId);
      } else {
        newExpanded.add(spanId);
      }
      setExpandedSpans(newExpanded);

      // Fetch span items when expanding
      if (isExpanding && !spanItems[spanId]) {
        setLoadingItems(prev => ({ ...prev, [spanId]: true }));
        try {
          console.log('📡 Fetching span items for span:', spanId);
          const items = await spanService.getSpanItems(spanId);
          console.log('✅ Span items fetched - raw response:', items);
          console.log('✅ Items type:', typeof items, 'Array?', Array.isArray(items));
          
          // Ensure items is an array and validate each item
          let itemsArray: SpanItemResponse[] = [];
          
          if (Array.isArray(items)) {
            // Filter out any invalid items
            itemsArray = items.filter(item => {
              if (!item || typeof item !== 'object') {
                console.warn('⚠️ Invalid item (not an object):', item);
                return false;
              }
              return true;
            });
            console.log('✅ Valid items count:', itemsArray.length);
          } else {
            console.error('❌ Response is not an array:', items);
          }
          
          if (itemsArray.length > 0) {
            console.log('✅ First item sample:', itemsArray[0]);
          }
          
          setSpanItems(prev => ({
            ...prev,
            [spanId]: itemsArray
          }));
        } catch (error) {
          console.error('❌ Failed to fetch span items:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack',
            error
          });
          
          // Set empty array on error to prevent white screen
          setSpanItems(prev => ({
            ...prev,
            [spanId]: []
          }));
          
          // Show error to user
          setRenderError(`Failed to load items: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setLoadingItems(prev => ({ ...prev, [spanId]: false }));
        }
      }
    } catch (error) {
      console.error('❌ Error in toggleSpan:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        error
      });
      setRenderError(`Error toggling span: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle span created
  const handleSpanCreated = async (lastCoordinates?: [number, number] | null) => {
    try {
      console.log('🔄 Refreshing spans after create');
      console.log('📍 Received last coordinates from create:', lastCoordinates);
      
      // Apply same filter logic as initial fetch
      let data;
      if (linkId) {
        console.log('📡 Filtering spans by linkId:', linkId);
        data = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
      } else {
        console.log('📡 Fetching all spans for project (no linkId filter)');
        data = await spanService.getSpansByProjectId(projectId);
      }
      
      setSpans(data);
      
      // Store the last coordinates for next span creation
      // Priority: use coordinates from callback, otherwise get from latest span in data
      let coordinatesToStore: [number, number] | null = null;
      
      if (lastCoordinates && lastCoordinates[0] !== 0 && lastCoordinates[1] !== 0) {
        coordinatesToStore = lastCoordinates;
        console.log('💾 Using coordinates from callback:', coordinatesToStore);
      } else if (data && data.length > 0) {
        // Backend returns spans sorted by created_at DESC, so first span is the latest
        const latestSpan = data[0];
        if (latestSpan.geometry && latestSpan.geometry.coordinates && latestSpan.geometry.coordinates.length > 0) {
          const coords = latestSpan.geometry.coordinates;
          const lastCoord = coords[coords.length - 1] as [number, number];
          if (lastCoord[0] !== 0 && lastCoord[1] !== 0) {
            coordinatesToStore = lastCoord;
            console.log('💾 Using coordinates from latest fetched span:', coordinatesToStore);
          }
        }
      }
      
      if (coordinatesToStore) {
        setLastSpanCoordinates(coordinatesToStore);
      }
      
      // Trigger parent refetch for KML and Survey data
      if (onDataChanged) {
        console.log('🔄 Triggering parent data refetch after span created');
        onDataChanged();
      }
    } catch (err) {
      console.error('❌ Failed to refresh spans:', err);
    }
    setShowCreateSpanModal(false);
  };

  // Handle Add Span button click - check for existing spans first
  const handleAddSpanClick = async () => {
    try {
      // First check if we have stored coordinates from last create
      if (lastSpanCoordinates && lastSpanCoordinates[0] !== 0 && lastSpanCoordinates[1] !== 0) {
        console.log('✅ Using stored last coordinates:', lastSpanCoordinates);
        setShowContinueFromLastSpanDialog(true);
        return;
      }
      
      // Otherwise, fetch spans and get the latest one (first in array since BE sorts DESC)
      let data;
      if (linkId) {
        data = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
      } else {
        data = await spanService.getSpansByProjectId(projectId);
      }
      
      if (data && data.length > 0) {
        // Backend returns spans sorted by created_at DESC, so first span is the latest
        const latestSpan = data[0];
        if (latestSpan.geometry && latestSpan.geometry.coordinates && latestSpan.geometry.coordinates.length > 0) {
          const coordinates = latestSpan.geometry.coordinates;
          const lastCoordinate = coordinates[coordinates.length - 1] as [number, number];
          
          // Check if the last coordinate is valid (not 0,0)
          if (lastCoordinate[0] !== 0 && lastCoordinate[1] !== 0) {
            console.log('✅ Using coordinates from latest span:', latestSpan.span_name, lastCoordinate);
            setLastSpanCoordinates(lastCoordinate);
            setShowContinueFromLastSpanDialog(true);
            return;
          }
        }
      }
      
      // No existing spans or no valid coordinates, open modal directly
      setShowCreateSpanModal(true);
    } catch (error) {
      console.error('❌ Error checking for latest span:', error);
      // If error, just open the modal normally
      setShowCreateSpanModal(true);
    }
  };

  // Handle continue from last span dialog
  const handleContinueFromLastSpan = (useLast: boolean) => {
    setShowContinueFromLastSpanDialog(false);
    setShowCreateSpanModal(true);
    
    // The CreateSpanModal will receive the lastSpanCoordinates via props
    if (!useLast) {
      setLastSpanCoordinates(null);
    }
  };

  // Handle delete span
  const handleDeleteSpanClick = (spanId: string, spanName: string) => {
    setSelectedSpanForDelete({ id: spanId, name: spanName });
    setShowDeleteSpanModal(true);
  };

  // Handle span deleted
  const handleSpanDeleted = async () => {
    try {
      console.log('🔄 Refreshing spans after delete');
      
      // Apply same filter logic as initial fetch
      let data;
      if (linkId) {
        console.log('📡 Filtering spans by linkId:', linkId);
        data = await spanService.getSpansByProjectIdAndLinkId(projectId, linkId);
      } else {
        console.log('📡 Fetching all spans for project (no linkId filter)');
        data = await spanService.getSpansByProjectId(projectId);
      }
      
      setSpans(data);
      
      // Trigger parent refetch for KML and Survey data
      if (onDataChanged) {
        console.log('🔄 Triggering parent data refetch after span deleted');
        onDataChanged();
      }
    } catch (err) {
      console.error('❌ Failed to refresh spans:', err);
    }
    setShowDeleteSpanModal(false);
    setSelectedSpanForDelete(null);
  };

  // Handle span item added
  const handleSpanItemAdded = async () => {
    if (selectedSpanForAddItem) {
      try {
        console.log('🔄 Refreshing items for span:', selectedSpanForAddItem.id);
        const items = await spanService.getSpanItems(selectedSpanForAddItem.id);
        setSpanItems(prev => ({
          ...prev,
          [selectedSpanForAddItem.id]: items
        }));
      } catch (err) {
        console.error('❌ Failed to refresh span items:', err);
      }
    }
    setShowAddSpanModal(false);
    setSelectedSpanForAddItem(null);
  };

  // Show span list
  return (
    <div className="h-full flex-grow flex" style={{ minHeight: '600px' }}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontWeight: 600 }}>
                Spans
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {loading ? 'Loading spans...' : `Project: ${projectName}`}
              </p>
            </div>
            {!loading && (
              <button
                onClick={handleAddSpanClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 8px 32px 0 rgba(0, 94, 184, 0.37)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(0, 94, 184, 0.5)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 94, 184, 0.37)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)';
                }}
                title="Add New Span"
              >
                <Plus className="w-4 h-4" />
                <span>Add Span</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
        {renderError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-2">Render Error</p>
              <p className="text-sm text-gray-500">{renderError}</p>
              <button 
                onClick={() => setRenderError(null)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-600">{error}</p>
          </div>
        ) : spans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-gray-500">No spans available for this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spans.map(span => {
              try {
                const spanId = extractId(span.id);
                const isExpanded = expandedSpans.has(spanId);
                const items = spanItems[spanId] || [];
                const isLoadingItems = loadingItems[spanId] || false;
                
                // Safe calculation of total offset (using offset instead of length)
                const totalOffset = items.reduce((sum, item) => {
                  const offset = typeof item?.offset === 'number' ? item.offset : 0;
                  return sum + offset;
                }, 0);

                // Debug logging
                console.log('🔍 Render span:', {
                  spanName: span.span_name,
                  rawId: span.id,
                  extractedId: spanId,
                  isExpanded,
                  itemsCount: items.length,
                  isLoading: isLoadingItems,
                  totalOffset
                });

                return (
                <div key={spanId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Span Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-4">
                    <div className="flex items-center gap-3">
                      <button 
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                        onClick={() => {
                          console.log('👆 Click expand/collapse for span:', spanId);
                          toggleSpan(spanId);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div 
                        onClick={() => {
                          console.log('👆 Click span name for:', spanId);
                          toggleSpan(spanId);
                        }} 
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{span.span_name}</span>
                          {items.length > 0 && (
                            <span className="text-xs text-gray-500">({items.length} items)</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpanClick(spanId, span.span_name);
                        }}
                        className="flex-shrink-0 p-2 hover:bg-red-50 rounded-lg transition-colors group"
                        title="Delete Span"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </button>
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSpanForAddItem({ id: spanId, name: span.span_name });
                          setShowAddSpanModal(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 6px 24px 0 rgba(0, 94, 184, 0.37)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 10px 32px 0 rgba(0, 94, 184, 0.5)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 1) 0%, rgba(0, 119, 204, 1) 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 6px 24px 0 rgba(0, 94, 184, 0.37)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 94, 184, 0.9) 0%, rgba(0, 119, 204, 0.9) 100%)';
                        }}
                        title="Add Span Item"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button> */}
                    </div>
                  </div>

                  {/* Span Items */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white">
                      {isLoadingItems ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-sm text-gray-500">Loading items...</div>
                        </div>
                      ) : !Array.isArray(items) ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-sm text-red-500">Error: Invalid data format</div>
                        </div>
                      ) : items.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-sm text-gray-500">No items available for this span</div>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {items.map((item, idx) => {
                            try {
                              // Validate item structure
                              if (!item || typeof item !== 'object') {
                                console.error('❌ Invalid item at index', idx, ':', item);
                                return (
                                  <div key={`invalid-${idx}`} className="p-3 bg-yellow-50 text-yellow-700 text-xs">
                                    Invalid item data at position {idx + 1}
                                  </div>
                                );
                              }

                              // Safe extraction with fallbacks
                              const itemId = item?.id ? extractId(item.id) : `item-${idx}`;
                              const itemName = item?.item_name || 'Unnamed Item';
                              const offset = typeof item?.offset === 'number' ? item.offset : 0;
                              const depth = typeof item?.depth === 'number' ? item.depth : 0;
                              const soilType = item?.soil_type || '-';
                              const location = item?.location || '-';
                              
                              // Extract ss_link - now it's an object with {tb, id}
                              let ssLink = '-';
                              if (item?.ss_link) {
                                if (typeof item.ss_link === 'string') {
                                  ssLink = item.ss_link;
                                } else if (typeof item.ss_link === 'object' && item.ss_link.id) {
                                  // Extract ID from object structure
                                  ssLink = extractId(item.ss_link);
                                }
                              }
                              
                              const hasCoords = Boolean(item?.latitude && item?.longitude);
                              
                              return (
                                <div 
                                  key={itemId} 
                                  className="p-3 hover:bg-blue-50 transition-colors cursor-pointer"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {itemName}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Offset: {offset.toFixed(2)}m • Depth: {depth.toFixed(2)}m • {location}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        SS Link: {ssLink} • Soil: {soilType}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {hasCoords ? (
                                        <span className="text-green-600">✓ Coordinates</span>
                                      ) : (
                                        <span>-</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            } catch (err) {
                              console.error('❌ Error rendering item at index', idx, ':', err, item);
                              return (
                                <div key={`error-${idx}`} className="p-3 bg-red-50 text-red-600 text-xs">
                                  Error rendering item {idx + 1}: {err instanceof Error ? err.message : 'Unknown error'}
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              } catch (err) {
                console.error('❌ Error rendering span:', err, span);
                setRenderError(`Error rendering span: ${err instanceof Error ? err.message : 'Unknown error'}`);
                return (
                  <div key={span.id?.id || Math.random()} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">Error rendering span: {span.span_name}</p>
                  </div>
                );
              }
            })}
          </div>
        )}
        </div>
      </div>

      {/* Right Panel - Item Evidence Detail (Sama persis dengan Cell Evidence di Project List) */}
      {selectedItem && (
        <div className="w-96 bg-white border-l border-gray-200 shadow-soft-lg flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003A70] to-[#005EB8]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm">Span Item Detail</h3>
                <p className="text-xs text-blue-100 mt-1">{selectedItem.item_name}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Cell Info */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">Item Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offset:</span>
                    <span className="text-gray-900">{selectedItem.offset?.toFixed(2) || 0}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Depth:</span>
                    <span className="text-gray-900">{selectedItem.depth?.toFixed(2) || 0}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-gray-900">{selectedItem.location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SS Link:</span>
                    <span className="text-gray-900">
                      {(() => {
                        if (!selectedItem.ss_link) return '-';
                        if (typeof selectedItem.ss_link === 'string') return selectedItem.ss_link;
                        if (typeof selectedItem.ss_link === 'object' && selectedItem.ss_link.id) {
                          return extractId(selectedItem.ss_link);
                        }
                        return '-';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Soil Type:</span>
                    <span className="text-gray-900">{selectedItem.soil_type || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900">
                      {selectedItem.date ? new Date(selectedItem.date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence Photos */}
              <div className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs text-gray-600">Evidence Photos (0)</h4>
                  <button className="text-xs text-blue-600 hover:underline">Upload</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* KML Preview */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">KML Location</h4>
                <div className="h-32 bg-gray-200 rounded flex items-center justify-center mb-3">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <button className="w-full px-3 py-2 bg-[#005EB8] text-white rounded text-xs hover:bg-[#004a94]">
                  Open in Map
                </button>
              </div>

              {/* Evidence Files */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs text-gray-600 mb-3">Evidence Files</h4>
                <div className="space-y-2">
                  {['survey_report.pdf', 'installation_photo.jpg', 'test_result.xlsx'].map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Paperclip className="w-4 h-4 text-gray-600" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-900">{file}</div>
                        <div className="text-xs text-gray-500">2024-03-15 14:30</div>
                      </div>
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <Eye className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Span Modal */}
      {showCreateSpanModal && (
        <CreateSpanModal
          isOpen={showCreateSpanModal}
          onClose={() => {
            setShowCreateSpanModal(false);
            setLastSpanCoordinates(null);
          }}
          projectId={projectId}
          onSpanCreated={handleSpanCreated}
          linkId={linkId}
          initialCoordinates={lastSpanCoordinates}
        />
      )}

      {/* Continue from Last Span Dialog */}
      {showContinueFromLastSpanDialog && lastSpanCoordinates && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 10001 }}>
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Lanjutkan dari Titik Terakhir?
              </h3>
              <button
                onClick={() => {
                  setShowContinueFromLastSpanDialog(false);
                  setLastSpanCoordinates(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Apakah Anda ingin menggunakan koordinat titik terakhir Span sebelumnya sebagai titik awal Span baru?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 mb-1">Koordinat titik terakhir:</p>
              <p className="text-sm font-mono text-gray-900">
                {lastSpanCoordinates[0].toFixed(6)}, {lastSpanCoordinates[1].toFixed(6)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleContinueFromLastSpan(false)}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700"
              >
                Tidak, Mulai Baru
              </button>
              <button
                onClick={() => handleContinueFromLastSpan(true)}
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

      {/* Add Span Item Modal */}
      {showAddSpanModal && selectedSpanForAddItem && (
        <AddSpanModal
          isOpen={showAddSpanModal}
          onClose={() => {
            setShowAddSpanModal(false);
            setSelectedSpanForAddItem(null);
          }}
          spanId={selectedSpanForAddItem.id}
          spanName={selectedSpanForAddItem.name}
          onAddSpan={handleSpanItemAdded}
        />
      )}

      {/* Delete Span Modal */}
      {showDeleteSpanModal && selectedSpanForDelete && (
        <DeleteSpanModal
          isOpen={showDeleteSpanModal}
          onClose={() => {
            setShowDeleteSpanModal(false);
            setSelectedSpanForDelete(null);
          }}
          spanId={selectedSpanForDelete.id}
          spanName={selectedSpanForDelete.name}
          onSpanDeleted={handleSpanDeleted}
        />
      )}
    </div>
  );
}
