import { useMemo, useState, useEffect } from 'react';
import { FileText, Edit2, Trash2, Save, X, Check, Plus, RefreshCw, FileSpreadsheet, Network, AlertTriangle } from 'lucide-react';
import { useRedline } from '@/hooks/useRedline';
import { extractSpanId } from '@/services/redlineService';
import { OrbitProgress } from 'react-loading-indicators';
import './TabRedLine.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { getProjectById, ProjectResponse, extractId } from '@/services/contractService';

interface TabRedLineProps {
  contractId?: string;
  linkId?: string; // Add linkId prop for filtering
  markAsDoneButton?: React.ReactNode; // Optional Mark as Done button from wrapper
}

export function TabRedLine({ contractId, linkId, markAsDoneButton }: TabRedLineProps) {
  const { 
    spans: redlineData, 
    loading, 
    error, 
    refetch, 
    createManualRedline, 
    updateRedlineItem, 
    deleteRedlineItem, 
    getSpanSummary, 
    regenerateRedline 
  } = useRedline(contractId);
  const [editedValues, setEditedValues] = useState<{[key: string]: {designator: string, length: number}}>({});
  const [selectedCell, setSelectedCell] = useState<{spanId: string, columnIndex: number, row: number} | null>(null);
  const [addingCell, setAddingCell] = useState<{spanId: string, afterIndex: number} | null>(null);
  const [newCellData, setNewCellData] = useState<{designator: string, length: string}>({designator: '', length: ''});
  const [editingSpanId, setEditingSpanId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{itemId: string, itemName: string} | null>(null);
  const [editConfirmation, setEditConfirmation] = useState<{spanId: string} | null>(null);
  const [regenerateConfirmation, setRegenerateConfirmation] = useState(false);
  
  // State for project data
  const [projectData, setProjectData] = useState<ProjectResponse | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);

  // State for span summary and warnings
  const [spanSummaries, setSpanSummaries] = useState<{[spanId: string]: any}>({});
  const [showWarning, setShowWarning] = useState<{spanId: string, message: string, delta: number} | null>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('redline_warning');
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingSummary, setLoadingSummary] = useState<{[spanId: string]: boolean}>({});
  
  // State for tracking adjacent columns that need length reduction (red columns)
  // Store by INDEX (not name) to avoid marking all columns with same designator
  const [adjacentRedColumns, setAdjacentRedColumns] = useState<{[spanId: string]: {beforeIndex: number, afterIndex: number, totalLengthBefore: number}}>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('redline_adjacent_red_columns');
    return saved ? JSON.parse(saved) : {};
  });
  
  // State for tracking actual total length of each span (baseline for comparison)
  // This is NEVER cleared, so we can always re-check if total exceeds
  const [spanBaselines, setSpanBaselines] = useState<{[spanId: string]: {totalLengthBefore: number, beforeIndex: number, afterIndex: number}}>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('redline_span_baselines');
    return saved ? JSON.parse(saved) : {};
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (showWarning) {
      localStorage.setItem('redline_warning', JSON.stringify(showWarning));
    } else {
      localStorage.removeItem('redline_warning');
    }
  }, [showWarning]);

  useEffect(() => {
    if (Object.keys(adjacentRedColumns).length > 0) {
      localStorage.setItem('redline_adjacent_red_columns', JSON.stringify(adjacentRedColumns));
    } else {
      localStorage.removeItem('redline_adjacent_red_columns');
    }
  }, [adjacentRedColumns]);

  useEffect(() => {
    if (Object.keys(spanBaselines).length > 0) {
      localStorage.setItem('redline_span_baselines', JSON.stringify(spanBaselines));
    } else {
      localStorage.removeItem('redline_span_baselines');
    }
  }, [spanBaselines]);

  console.log('📊 [TabRedLine] Render with:');
  console.log('  Contract ID:', contractId);
  console.log('  Link ID:', linkId);
  console.log('  Redline Data:', redlineData?.length || 0, 'spans');
  console.log('  Loading:', loading);
  console.log('  Error:', error);

  // Fetch project data when contractId changes
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!contractId) return;
      
      setProjectLoading(true);
      try {
        console.log('🔄 Fetching project data for contractId:', contractId);
        const project = await getProjectById(contractId);
        setProjectData(project);
        console.log('✅ Project data fetched:', project);
      } catch (err) {
        console.error('❌ Error fetching project data:', err);
        setProjectData(null);
      } finally {
        setProjectLoading(false);
      }
    };

    fetchProjectData();
  }, [contractId]);

  // Get current link data
  const currentLink = useMemo(() => {
    if (!projectData?.links || !linkId) return null;
    
    return projectData.links.find(link => {
      const linkIdStr = typeof link.id === 'string' ? link.id : extractId(link.id);
      return linkIdStr === linkId;
    });
  }, [projectData, linkId]);

  // Filter redline data by linkId if provided
  const filteredRedlineData = useMemo(() => {
    if (!linkId || !redlineData) return redlineData;

    console.log('🔍 [TabRedLine] Filtering by linkId:', linkId);
    
    // Filter spans that belong to the selected link
    // Spans have link_id field that should match the linkId
    const filtered = redlineData.filter(span => {
      // Extract link_id from span
      // Assuming span has a link_id field in format {tb: "link", id: {String: "xxx"}}
      const spanLinkId = (span as any).link_id;
      
      if (!spanLinkId) {
        console.log(`  ⚠️ Span "${span.span_name}" has no link_id`);
        return false;
      }
      
      // Extract the actual ID string
      let extractedLinkId: string;
      if (typeof spanLinkId === 'string') {
        extractedLinkId = spanLinkId;
      } else if (spanLinkId.id && spanLinkId.id.String) {
        extractedLinkId = spanLinkId.id.String;
      } else {
        console.log(`  ⚠️ Span "${span.span_name}" has invalid link_id format:`, spanLinkId);
        return false;
      }
      
      const matches = extractedLinkId === linkId;
      console.log(`  ${matches ? '✅' : '❌'} Span "${span.span_name}" link_id: ${extractedLinkId} ${matches ? '==' : '!='} ${linkId}`);
      return matches;
    });

    console.log(`✅ [TabRedLine] Filtered ${filtered.length} spans out of ${redlineData.length}`);
    return filtered;
  }, [redlineData, linkId]);

  // Re-check total length after every data change to update warning/red columns
  useEffect(() => {
    console.log('🔄 useEffect triggered - Re-checking total length');
    console.log('  filteredRedlineData:', filteredRedlineData?.length, 'spans');
    console.log('  spanBaselines:', spanBaselines);
    console.log('  showWarning:', showWarning);
    console.log('  adjacentRedColumns:', adjacentRedColumns);
    
    if (!filteredRedlineData) return;
    
    // Check each span that has baseline tracking (from manual insert)
    const spansToCheck = Object.keys(spanBaselines);
    
    if (spansToCheck.length === 0) {
      // No baseline tracking, check if warning exists and clear it
      if (showWarning) {
        console.log('⚠️ No baseline tracking found but warning exists, clearing...');
        setShowWarning(null);
        localStorage.removeItem('redline_warning');
      }
      return;
    }
    
    let needsWarningUpdate = false;
    let newWarning: {spanId: string, message: string, delta: number} | null = null;
    let needsRedColumnsUpdate = false;
    let newRedColumns: {[spanId: string]: {beforeIndex: number, afterIndex: number, totalLengthBefore: number}} = { ...adjacentRedColumns };
    
    spansToCheck.forEach(spanId => {
      const span = filteredRedlineData.find(s => extractSpanId(s.id) === spanId);
      if (!span) {
        // Span not found, skip (don't clear baseline, might be filtered out)
        console.log(`  ⚠️ Span ${spanId} not found in filtered data, skipping`);
        return;
      }
      
      const baseline = spanBaselines[spanId];
      const currentTotalLength = span.span_items.reduce((sum: number, item: any) => sum + (item.length || 0), 0);
      const targetLength = baseline.totalLengthBefore;
      const delta = currentTotalLength - targetLength;
      
      console.log(`🔍 Re-checking total length for span ${spanId}:`, {
        current: currentTotalLength,
        target: targetLength,
        delta: delta,
        exceeds: delta > 0
      });
      
      // If total length exceeds actual (delta > 0), show warning and red columns
      if (delta > 0) {
        console.log(`⚠️ Span ${spanId} total length exceeds by ${delta}m - showing warning`);
        
        // Check if warning needs update
        const needsUpdate = !showWarning || showWarning.spanId !== spanId || Math.abs(showWarning.delta - delta) > 0.01;
        if (needsUpdate) {
          needsWarningUpdate = true;
          newWarning = {
            spanId: spanId,
            delta: delta,
            message: `Total span length melebihi ${delta.toFixed(1)}m. Kurangi length designator sebelum/sesudah.`
          };
          console.log('  → Warning needs update:', newWarning);
        }
        
        // Check if red columns need update
        if (!adjacentRedColumns[spanId]) {
          needsRedColumnsUpdate = true;
          newRedColumns[spanId] = {
            beforeIndex: baseline.beforeIndex,
            afterIndex: baseline.afterIndex,
            totalLengthBefore: baseline.totalLengthBefore
          };
          console.log('  → Red columns need update');
        }
      } else {
        // Total length is back to actual (or less), clear warning and red columns
        console.log(`✅ Span ${spanId} total length is OK (delta: ${delta}) - clearing warning and red`);
        
        // Check if warning needs clearing
        if (showWarning?.spanId === spanId) {
          needsWarningUpdate = true;
          newWarning = null;
          console.log('  → Warning needs clearing (current warning spanId matches)');
        }
        
        // Check if red columns need clearing
        if (adjacentRedColumns[spanId]) {
          needsRedColumnsUpdate = true;
          delete newRedColumns[spanId];
          console.log('  → Red columns need clearing');
        }
      }
    });
    
    // Apply updates only if needed (prevents infinite loop)
    if (needsWarningUpdate) {
      console.log('📝 Applying warning update:', newWarning);
      setShowWarning(newWarning);
      if (newWarning) {
        localStorage.setItem('redline_warning', JSON.stringify(newWarning));
      } else {
        localStorage.removeItem('redline_warning');
      }
    }
    
    if (needsRedColumnsUpdate) {
      console.log('📝 Applying red columns update:', newRedColumns);
      setAdjacentRedColumns(newRedColumns);
      if (Object.keys(newRedColumns).length > 0) {
        localStorage.setItem('redline_adjacent_red_columns', JSON.stringify(newRedColumns));
      } else {
        localStorage.removeItem('redline_adjacent_red_columns');
      }
    }
    
    console.log('✅ useEffect complete');
  }, [filteredRedlineData, spanBaselines, showWarning, adjacentRedColumns]);

  // Helper: Get editable/deletable indices based on span position
  // UPDATE: All designators can now be edited (no restrictions)
  const getEditableIndices = (spanIndex: number, totalSpans: number, itemsCount: number) => {
    // All items are now editable and deletable
    const allIndices = Array.from({ length: itemsCount }, (_, i) => i);
    return {
      editable: allIndices,
      deletable: allIndices
    };
  };

  // Handle Edit button click - per span, save only changed cells
  const handleEditClick = (spanId: string) => {
    if (editingSpanId === spanId) {
      // Save mode - call API only for edited cells
      handleSaveEdit();
    } else {
      // Enter edit mode - show confirmation
      setEditConfirmation({ spanId });
    }
  };

  // Confirm edit mode
  const confirmEditMode = () => {
    if (editConfirmation) {
      setEditingSpanId(editConfirmation.spanId);
      setDeleteMode(null);
      setEditConfirmation(null);
    }
  };

  // Handle Save edit - only save cells that were actually edited
  const handleSaveEdit = async () => {
    console.log('💾 handleSaveEdit called');
    console.log('  editedValues:', editedValues);
    
    setIsSaving(true);
    const savedSpanId = editingSpanId; // Store before clearing
    
    try {
      // Only save cells that have been edited
      const editedItemIds = Object.keys(editedValues);
      
      console.log('  editedItemIds:', editedItemIds);
      
      if (editedItemIds.length === 0) {
        console.log('  No changes to save');
        setEditingSpanId(null);
        return;
      }

      // Check if all items have temporary IDs
      const allTemporary = editedItemIds.every(id => id.includes('-'));
      
      if (allTemporary) {
        console.log('⚠️ All items have temporary IDs, cannot save');
        console.warn('Backend belum generate ID untuk redline items. Semua item masih menggunakan temporary ID.');
        setEditingSpanId(null);
        setEditedValues({});
        return;
      }

      let savedCount = 0;
      let skippedCount = 0;
      
      // Save each edited cell using new API
      for (const itemId of editedItemIds) {
        // Skip temporary IDs (spanId-index format) - these don't have real IDs yet
        if (itemId.includes('-')) {
          console.log('⚠️ Skipping save for temporary ID:', itemId);
          skippedCount++;
          continue;
        }
        
        const editedValue = editedValues[itemId];
        
        console.log(`📤 Updating redline item ${itemId}:`, editedValue);
        
        await updateRedlineItem(itemId, editedValue);
        savedCount++;
      }

      setEditingSpanId(null);
      setEditedValues({});
      
      // Trigger refetch to get updated data
      console.log('🔄 Triggering refetch after save...');
      await refetch();
      
      // Wait for refetch to complete and data to update, then check total length
      // Note: useEffect will handle the check, but we also do it here for immediate feedback
      setTimeout(() => {
        if (savedSpanId) {
          const span = filteredRedlineData?.find(s => extractSpanId(s.id) === savedSpanId);
          if (span) {
            const currentTotalLength = span.span_items.reduce((sum: number, item: any) => sum + (item.length || 0), 0);
            
            // Check if we have tracking for this span
            const trackingInfo = adjacentRedColumns[savedSpanId];
            if (trackingInfo) {
              const targetLength = trackingInfo.totalLengthBefore;
              const delta = currentTotalLength - targetLength;
              
              console.log('🔍 Checking total length after edit:', {
                current: currentTotalLength,
                target: targetLength,
                delta: delta
              });
              
              // If total length is back to actual (or less), clear warning and red columns
              if (delta <= 0) {
                console.log('✅ Total length is back to actual, clearing warning and red columns');
                setShowWarning(null);
                localStorage.removeItem('redline_warning');
                
                setAdjacentRedColumns(prev => {
                  const newState = { ...prev };
                  delete newState[savedSpanId];
                  if (Object.keys(newState).length > 0) {
                    localStorage.setItem('redline_adjacent_red_columns', JSON.stringify(newState));
                  } else {
                    localStorage.removeItem('redline_adjacent_red_columns');
                  }
                  return newState;
                });
                
                toast.success(`${savedCount} perubahan berhasil disimpan. Total length kembali normal!`);
              } else {
                // Still exceeds, update warning with new delta
                const updatedWarning = {
                  spanId: savedSpanId,
                  message: `Total span length changed by ${delta.toFixed(2)}m. Consider adjusting other items to maintain original length.`,
                  delta: delta
                };
                setShowWarning(updatedWarning);
                localStorage.setItem('redline_warning', JSON.stringify(updatedWarning));
                
                toast.success(`${savedCount} perubahan berhasil disimpan${skippedCount > 0 ? ` (${skippedCount} item di-skip)` : ''}. Total length masih melebihi ${delta.toFixed(1)}m`);
              }
            } else {
              // No tracking, just show success
              if (savedCount > 0) {
                toast.success(`${savedCount} perubahan berhasil disimpan${skippedCount > 0 ? ` (${skippedCount} item di-skip)` : ''}`);
              }
            }
          }
        } else {
          if (savedCount > 0) {
            toast.success(`${savedCount} perubahan berhasil disimpan${skippedCount > 0 ? ` (${skippedCount} item di-skip)` : ''}`);
          }
        }
      }, 800); // Wait for refetch to complete
      
      console.log(`✅ ${savedCount} perubahan berhasil disimpan${skippedCount > 0 ? `, ${skippedCount} item di-skip (temporary ID)` : ''}`);
    } catch (error) {
      console.error('❌ Error saving edits:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete button click
  const handleDeleteClick = (spanId: string) => {
    if (deleteMode === spanId) {
      // Exit delete mode
      setDeleteMode(null);
    } else {
      // Enter delete mode
      setDeleteMode(spanId);
      setEditingSpanId(null);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    console.log('🗑️ handleDeleteItem called');
    console.log('  itemId:', itemId);
    console.log('  itemName:', itemName);
    
    // Skip temporary IDs
    if (itemId.includes('-')) {
      console.log('❌ Item has temporary ID, cannot delete');
      console.warn('Item ini belum memiliki ID dari backend, tidak bisa di-delete');
      return;
    }
    
    // Show confirmation modal
    setDeleteConfirmation({ itemId, itemName });
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const { itemId, itemName } = deleteConfirmation;
    console.log('✅ User confirmed delete for:', itemName);

    setDeletingItemId(itemId);
    
    // Get the span ID before delete
    let affectedSpanId: string | null = null;
    for (const span of filteredRedlineData || []) {
      const spanId = extractSpanId(span.id);
      const hasItem = span.span_items.some((item: any) => {
        const rawId = item.id?.id?.String || item.id;
        return rawId === itemId;
      });
      if (hasItem) {
        affectedSpanId = spanId;
        break;
      }
    }
    
    setDeleteConfirmation(null);

    try {
      console.log('📤 Deleting redline item:', itemId);
      
      await deleteRedlineItem(itemId);
      
      toast.success('Item berhasil dihapus');
      console.log('✅ Item berhasil dihapus');
      
      // Refetch to get updated data
      console.log('🔄 Refetching after delete...');
      await refetch();
      
      // Note: The useEffect will handle checking and clearing warning/red columns
      // after refetch completes and filteredRedlineData updates
      console.log('✅ Delete complete, useEffect will re-check total length');
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error('Gagal menghapus item');
    } finally {
      setDeletingItemId(null);
    }
  };

  // Handle value change in edit mode
  const handleValueChange = (itemId: string, field: 'designator' | 'length', value: string | number) => {
    console.log('🔧 handleValueChange called:', { itemId, field, value });
    
    setEditedValues(prev => {
      // Find the item to get its current values
      let currentItem: any = null;
      let spanIdForItem = '';
      let indexForItem = -1;
      
      // Search through all spans to find the item
      for (const span of filteredRedlineData || []) {
        const spanId = extractSpanId(span.id);
        const itemIndex = span.span_items.findIndex((item: any, idx: number) => {
          const rawId = item.id?.id?.String || item.id;
          const tempId = `${spanId}-${idx}`;
          return rawId === itemId || tempId === itemId;
        });
        
        if (itemIndex !== -1) {
          currentItem = span.span_items[itemIndex];
          spanIdForItem = spanId;
          indexForItem = itemIndex;
          break;
        }
      }
      
      if (!currentItem) {
        console.log('❌ Current item not found for itemId:', itemId);
        return prev;
      }
      
      // Use temporary ID format if itemId is null
      const rawItemId = currentItem.id?.id?.String || currentItem.id;
      const effectiveItemId = rawItemId || `${spanIdForItem}-${indexForItem}`;
      
      // Handle length field - convert empty string to 0 for storage
      const lengthValue = field === 'length' 
        ? (value === '' ? 0 : (typeof value === 'string' ? parseFloat(value) : value))
        : (prev[effectiveItemId]?.length ?? currentItem.length);
      
      console.log('✅ Setting editedValues for', effectiveItemId, ':', {
        designator: field === 'designator' ? value : (prev[effectiveItemId]?.designator ?? currentItem.item_name),
        length: lengthValue
      });
      
      const newValue = {
        designator: field === 'designator' ? value : (prev[effectiveItemId]?.designator ?? currentItem.item_name),
        length: lengthValue
      };
      
      return {
        ...prev,
        [effectiveItemId]: newValue
      };
    });
  };

  // Handle cell selection (only one cell at a time)
  const handleCellClick = (spanId: string, columnIndex: number, row: number) => {
    // Toggle selection
    if (selectedCell?.spanId === spanId && selectedCell?.columnIndex === columnIndex && selectedCell?.row === row) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ spanId, columnIndex, row });
    }
  };

  // Handle Add button click (from selected cell in Row 1)
  const handleAddClick = (spanId: string, afterIndex: number) => {
    setAddingCell({ spanId, afterIndex });
    setNewCellData({ designator: '', length: '' });
    setEditingSpanId(null);
    setDeleteMode(null);
    setSelectedCell(null);
  };

  // Handle Cancel add
  const handleCancelAdd = () => {
    setAddingCell(null);
    setNewCellData({ designator: '', length: '' });
    setSelectedCell(null);
  };

  // Handle Save new cell
  const handleSaveNewCell = async () => {
    console.log('🚀 handleSaveNewCell called');
    console.log('  addingCell:', addingCell);
    console.log('  newCellData:', newCellData);
    
    if (!addingCell) {
      console.log('❌ No addingCell state');
      return;
    }
    
    if (!newCellData.designator || !newCellData.length) {
      console.log('❌ Missing designator or length');
      toast.error('Mohon isi Designator dan Length');
      return;
    }

    try {
      // Extract span_id from the span object
      const span = filteredRedlineData?.find(s => extractSpanId(s.id) === addingCell.spanId);
      if (!span) {
        console.error('❌ Span not found for spanId:', addingCell.spanId);
        throw new Error('Span not found');
      }
      
      const spanIdValue = extractSpanId(span.id);
      const newItemLength = parseFloat(newCellData.length);
      
      const requestData = {
        span_id: spanIdValue,
        designator: newCellData.designator,
        length: newItemLength,
        insert_after_sequence: addingCell.afterIndex
      };
      
      console.log('📤 Creating manual redline:', requestData);
      
      const result = await createManualRedline(requestData);
      
      console.log('✅ Manual redline created:', result);
      console.log('📊 Span summary from backend:', result.span_summary);
      
      // Save state before clearing
      const savedSpanId = addingCell.spanId;
      const savedAfterIndex = addingCell.afterIndex;
      
      // Clear add state
      handleCancelAdd();
      
      // Refetch to get updated data with new item
      console.log('🔄 Refetching after create...');
      await refetch();
      
      // Check if backend returned span_summary with delta
      if (result.span_summary && result.span_summary.delta !== undefined) {
        const delta = result.span_summary.delta;
        const totalLengthBefore = result.span_summary.total_length_before;
        const totalLengthAfter = result.span_summary.total_length_after;
        
        console.log('🔍 Backend span summary:', {
          total_length_before: totalLengthBefore,
          total_length_after: totalLengthAfter,
          delta: delta,
          warning: result.span_summary.warning
        });
        
        // Save baseline (NEVER cleared, used for future re-checks)
        const baselineInfo = {
          totalLengthBefore: totalLengthBefore,
          beforeIndex: savedAfterIndex,
          afterIndex: savedAfterIndex + 2
        };
        setSpanBaselines(prev => {
          const updated = { ...prev, [savedSpanId]: baselineInfo };
          localStorage.setItem('redline_span_baselines', JSON.stringify(updated));
          return updated;
        });
        
        // Check if total length exceeds actual (delta > 0)
        if (delta > 0) {
          // Set warning
          setShowWarning({
            spanId: savedSpanId,
            message: result.span_summary.warning || `Total span length melebihi ${delta.toFixed(1)}m. Kurangi length designator sebelum/sesudah.`,
            delta: delta
          });
          
          // Mark adjacent columns as red by INDEX (not name)
          setAdjacentRedColumns(prev => ({
            ...prev,
            [savedSpanId]: baselineInfo
          }));
          
          console.log('⚠️ Total length exceeds actual by', delta, 'm');
          console.log('🔴 Marking adjacent columns as red by INDEX:', baselineInfo);
          
          toast.warning(`Redline ditambahkan! Total length melebihi ${delta.toFixed(1)}m, kurangi length designator sebelum/sesudah.`);
        } else {
          console.log('✅ Total length tidak melebihi actual (delta <= 0)');
          toast.success('Redline berhasil ditambahkan!');
        }
      } else {
        // Fallback: backend tidak return span_summary
        console.warn('⚠️ Backend tidak return span_summary');
        toast.success('Redline berhasil ditambahkan!');
      }
      
      console.log('✅ Redline manual berhasil ditambahkan!');
    } catch (error) {
      console.error('❌ Error adding new cell:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error(`Gagal menambahkan redline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle Regenerate
  const handleRegenerate = async () => {
    if (!contractId) {
      console.warn('No contract ID provided');
      return;
    }

    console.log('🔄 handleRegenerate called for contract:', contractId);
    
    // Show confirmation modal
    setRegenerateConfirmation(true);
  };

  // Confirm regenerate
  const confirmRegenerate = async () => {
    console.log('✅ User confirmed regenerate');
    setRegenerateConfirmation(false);
    setIsRegenerating(true);

    try {
      console.log('📤 Regenerating redline...');
      
      await regenerateRedline();
      
      toast.success('Redline berhasil di-regenerate');
      console.log('✅ Redline berhasil di-regenerate');
    } catch (error) {
      console.error('❌ Error regenerating redline:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error('Gagal regenerate redline');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Export to PDF function
  const handleExportRedlinePDF = () => {
    if (!filteredRedlineData || filteredRedlineData.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38); // Red color
      doc.text('RedLine Data Report', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Survey data with redline measurements', 14, 22);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 27);

      // Add project information
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      let yPos = 32;
      if (projectData?.no_kontrak) {
        doc.text(`No. Kontrak: ${projectData.no_kontrak}`, 14, yPos);
        yPos += 4;
      }
      if (currentLink?.link_name) {
        doc.text(`SS/LINK: ${currentLink.link_name}`, 14, yPos);
        yPos += 4;
      }
      if (projectData?.region) {
        doc.text(`Area: ${projectData.region}`, 14, yPos);
        yPos += 4;
      }
      if (currentLink?.sub_pelaksana || projectData?.pelaksana) {
        doc.text(`Pelaksana: ${currentLink?.sub_pelaksana || projectData?.pelaksana}`, 14, yPos);
        yPos += 4;
      }

      let yPosition = yPos + 5;

      // Process each span
      filteredRedlineData.forEach((span) => {
        // Check if we need a new page
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }

        // Span header
        doc.setFillColor(239, 68, 68);
        doc.rect(14, yPosition - 5, 267, 8, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(`${span.span_name} (${span.span_items?.length || 0} items)`, 16, yPosition);
        
        yPosition += 10;

        if (span.span_items && span.span_items.length > 0) {
          // Prepare table data - each row is one item
          const tableData: any[] = [];
          
          span.span_items.forEach((item, index) => {
            tableData.push([
              index + 1, // No
              item.item_name || '-', // Item Name
              item.length !== null && item.length !== undefined ? Math.round(item.length).toString() : '0', // Length
              Math.round(item.redline || 0).toString() // Redline
            ]);
          });

          // Create table
          autoTable(doc, {
            startY: yPosition,
            head: [['No', 'Item Name', 'Length (m)', 'Redline (m)']],
            body: tableData,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
              lineColor: [200, 200, 200],
              lineWidth: 0.1,
              halign: 'center'
            },
            headStyles: {
              fillColor: [220, 38, 38],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center'
            },
            columnStyles: {
              0: { 
                cellWidth: 15,
                halign: 'center'
              },
              1: { 
                cellWidth: 'auto',
                halign: 'left'
              },
              2: { 
                cellWidth: 30,
                halign: 'right'
              },
              3: { 
                cellWidth: 30,
                halign: 'right'
              }
            },
            alternateRowStyles: {
              fillColor: [248, 249, 250]
            },
            margin: { left: 14, right: 14 }
          });

          // Update yPosition after table
          yPosition = (doc as any).lastAutoTable.finalY + 15;
        } else {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text('No survey data for this span', 16, yPosition);
          yPosition += 15;
        }
      });

      // Save the PDF
      const projectName = projectData?.name || contractId || 'export';
      const linkName = currentLink?.link_name || '';
      const fileName = `Redline_Data_${projectName}${linkName ? `_${linkName}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF exported successfully');
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      toast.error('Gagal export PDF');
    }
  };

  // Export to Excel function - horizontal format matching Redline_example.xlsx
  const handleExportRedlineExcel = async () => {
    if (!filteredRedlineData || filteredRedlineData.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('REDLINE');

      // Fix sheetFormatPr to match Redline_example.xlsx:
      // defaultRowHeight=20 ensures all rows default to 20pt (40px) height
      // dyDescent=0.35 prevents Excel from inflating row heights with dyDescent=55 (ExcelJS default)
      worksheet.properties.defaultRowHeight = 20;
      worksheet.properties.dyDescent = 0.35;

      const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FF000000' } };
      const THICK_BORDER = { style: 'medium' as const, color: { argb: 'FF000000' } };
      const RED_THICK = { style: 'medium' as const, color: { argb: 'FFFF0000' } };

      const applyBorder = (cell: ExcelJS.Cell, top?: any, left?: any, bottom?: any, right?: any) => {
        cell.border = { top, left, bottom, right };
      };

      const DATA_START_COL = 3; // column C = index 3

      // Find max items across all spans
      const maxItems = Math.max(...filteredRedlineData.map((s: any) => s.span_items?.length || 0));

      // --- Column widths ---
      worksheet.getColumn(1).width = 35.0;  // A - Reduced from 45.0, will use smaller font for long text
      worksheet.getColumn(2).width = 25.0;  // B - Reduced from 30.0, will use smaller font for long text
      // Convert 1-based column index → Excel letter (A, B, ... Z, AA, AB, ...)
      // MUST use letter keys in ExcelJS - numeric index causes gaps with merged cells
      const colIdxToLetter = (idx: number): string => {
        let result = '';
        let n = idx;
        while (n > 0) {
          n--;
          result = String.fromCharCode(65 + (n % 26)) + result;
          n = Math.floor(n / 26);
        }
        return result;
      };
      for (let i = 0; i <= maxItems + 2; i++) {
        worksheet.getColumn(colIdxToLetter(DATA_START_COL + i)).width = 14.0;
      }

      // --- Row heights for header ---
      // Set row heights matching reference file exactly
      // dyDescent=0.35 per row is critical: ExcelJS defaults to 0.25 which causes
      // Excel to display header rows at 10.50pt instead of the correct 15.75pt
      const setRowHeight = (r: number, h: number) => {
        const row = worksheet.getRow(r);
        row.height = h;
        (row as any).dyDescent = 0.35;
      };
      setRowHeight(8, 20.0);   // sequence numbers row - reduced height
      setRowHeight(9, 20.0);   // empty spacer between sequence row and data

      // --- Header rows 1-6 (fonts match Redline_example.xlsx exactly) ---
      const setCalibri = (addr: string, val: string, leftAlign = false) => {
        const cell = worksheet.getCell(addr);
        cell.value = val;
        cell.font = { name: 'Calibri', bold: true, size: 12 };
        if (leftAlign) cell.alignment = { horizontal: 'left' };
      };
      const setNarrow = (addr: string, val: string) => {
        const cell = worksheet.getCell(addr);
        cell.value = val;
        cell.font = { name: 'Arial Narrow', bold: true, size: 12 };
        cell.alignment = { vertical: 'middle' };
      };

      setCalibri('A1', 'REDLINE');
      setCalibri('A2', 'Pengadaan dan Pemasangan OSP FO Backbone dan RMJ');
      setNarrow('A3', 'No.Kontrak');
      setCalibri('C3', `: ${projectData?.no_kontrak || contractId || '-'}`, true);
      setNarrow('A4', 'SS / LINK');
      const ssLinkFirst = filteredRedlineData[0]?.span_name || '-';
      const ssLinkLast  = filteredRedlineData[filteredRedlineData.length - 1]?.span_name || '-';
      const ssLinkValue = filteredRedlineData.length > 1 ? `${ssLinkFirst} - ${ssLinkLast}` : ssLinkFirst;
      setCalibri('C4', `: ${currentLink?.link_name || ssLinkValue}`, true);
      setNarrow('A5', 'Area');
      setCalibri('C5', `: ${projectData?.region || '-'}`, true);
      setNarrow('A6', 'Pelaksana');
      setCalibri('C6', `: ${currentLink?.sub_pelaksana || projectData?.pelaksana || '-'}`, true);

      // Set header row heights AFTER cell content is written
      // (ExcelJS can reset height when font is applied to cells)
      [1, 2, 3, 4, 5, 6].forEach(r => setRowHeight(r, 20.0));
      setRowHeight(7, 20.0);

      // --- Row 8: Sequence numbers with RED bottom border ---
      for (let i = 0; i < maxItems; i++) {
        const cell = worksheet.getCell(8, DATA_START_COL + i);
        cell.value = i + 1;
        cell.font = { name: 'Calibri', size: 12 };
        cell.alignment = { horizontal: 'right', vertical: 'bottom' };
        // RED thick border (matches reference: style='thick')
        cell.border = { bottom: { style: 'thick', color: { argb: 'FFFF0000' } } };
      }

      // --- Process each span ---
      let currentRow = 10;  // data starts at row 10, matching reference file structure

      filteredRedlineData.forEach((span: any, spanIndex: number) => {
        const items = span.span_items || [];
        const n = items.length;

        const rowCum = currentRow;       // cumulative distance row
        const rowDes = currentRow + 1;   // designator row
        const rowLen = currentRow + 2;   // length row
        const rowBlank = currentRow + 3; // blank separator row

        // Heights set AFTER content to prevent ExcelJS from resetting them
        // (set at end of span block below)

        // --- Col A: SPAN label (row 1 of block) ---
        const cellSpanLabel = worksheet.getCell(rowCum, 1);
        cellSpanLabel.value = `SPAN ${spanIndex + 1}`;
        cellSpanLabel.font = { name: 'Calibri', bold: true, size: 12 };
        cellSpanLabel.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        // --- Col A: Route name (row 2 of block, e.g. "STO SUMENEP-JT 01") ---
        const nextSpan = filteredRedlineData[spanIndex + 1];
        const startName = span.span_name || `SPAN ${spanIndex + 1}`;
        // Only show route to next span if there is a next span, otherwise just show current span name
        const routeLabel = nextSpan?.span_name ? `${startName}-${nextSpan.span_name}` : startName;
        const cellRouteName = worksheet.getCell(rowDes, 1);
        cellRouteName.value = routeLabel;
        // Use smaller font for long route names - more aggressive sizing
        let routeFontSize = 12;
        if (routeLabel.length > 40) routeFontSize = 8;
        else if (routeLabel.length > 30) routeFontSize = 9;
        else if (routeLabel.length > 20) routeFontSize = 10;
        cellRouteName.font = { name: 'Calibri', bold: true, size: routeFontSize };
        cellRouteName.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        // --- Col B: Start point name, merged 3 rows, with border box ---
        const cellB = worksheet.getCell(rowCum, 2);
        const spanName = span.span_name || `SPAN ${spanIndex + 1}`;
        cellB.value = spanName;
        // Use smaller font for long span names - more aggressive sizing
        let spanFontSize = 12;
        if (spanName.length > 30) spanFontSize = 8;
        else if (spanName.length > 20) spanFontSize = 9;
        else if (spanName.length > 15) spanFontSize = 10;
        cellB.font = { name: 'Calibri', bold: true, size: spanFontSize };
        cellB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.mergeCells(rowCum, 2, rowLen, 2);
        // Border on merged cell
        cellB.border = {
          top: THIN_BORDER,
          left: THIN_BORDER,
          bottom: THIN_BORDER,
          right: THIN_BORDER,
        };

        // --- Fill cumulative + designator + length for each item ---
        if (n > 0) {
          items.forEach((item: any, idx: number) => {
            const colIdx = DATA_START_COL + idx;
            const itemName = item.item_name || '-';
            const itemLen = item.length !== null && item.length !== undefined ? Math.round(item.length) : 0;
            
            // Cumulative row - USE REDLINE VALUE FROM BACKEND
            const cumCell = worksheet.getCell(rowCum, colIdx);
            cumCell.value = Math.round(item.redline || 0);  // ✅ Gunakan item.redline dari backend
            cumCell.font = { name: 'Calibri', size: 12 };
            cumCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Designator row
            const desCell = worksheet.getCell(rowDes, colIdx);
            desCell.value = itemName;
            desCell.font = { name: 'Calibri', size: 12 };
            desCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            // Length row
            const lenCell = worksheet.getCell(rowLen, colIdx);
            lenCell.value = itemLen;
            lenCell.font = { name: 'Calibri', size: 12 };
            lenCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // --- Border: thin box around each cell in the 3-row data block ---
            const isFirst = idx === 0;
            const isLast = idx === n - 1;

            [rowCum, rowDes, rowLen].forEach(r => {
              const c = worksheet.getCell(r, colIdx);
              c.border = {
                top: r === rowCum ? THIN_BORDER : undefined,
                bottom: r === rowLen ? THIN_BORDER : undefined,
                left: isFirst ? THIN_BORDER : THIN_BORDER,
                right: isLast ? THIN_BORDER : THIN_BORDER,
              };
            });
          });

          // Total column (after last item)
          const totalColIdx = DATA_START_COL + n;
          worksheet.getColumn(totalColIdx).width = 12;
          const totalLen = items.reduce((sum: number, item: any) => sum + (item.length || 0), 0);
          const cellTotal = worksheet.getCell(rowLen, totalColIdx);
          cellTotal.value = Math.round(totalLen);
          cellTotal.font = { name: 'Calibri', size: 12, bold: true };
          cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
          cellTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
          cellTotal.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
        }

        // Set row heights AFTER content is written for this span
        // Data rows (table redline) = 30pt for better readability
        setRowHeight(rowCum, 30.0);
        setRowHeight(rowDes, 30.0);
        setRowHeight(rowLen, 30.0);
        setRowHeight(rowBlank, 20.0);

        currentRow += 4; // 3 data rows + 1 blank
      });

      // Generate file name
      const projectName = projectData?.name || contractId || 'export';
      const linkName = currentLink?.link_name || '';
      const fileName = `Redline_Data_${projectName}${linkName ? `_${linkName}` : ''}_${new Date().toISOString().split('T')[0]}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Excel exported successfully');
      console.log('✅ Excel exported successfully');
    } catch (error) {
      console.error('❌ Error exporting Excel:', error);
      toast.error('Gagal export Excel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '500px' }}>
        <OrbitProgress color="#15396C" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load RedLine data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!filteredRedlineData || filteredRedlineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No RedLine data available</p>
          <p className="text-gray-400 text-sm mt-1">
            {linkId ? 'No data for this SS/Link' : 'Create surveys and assign to spans to see data here'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white relative" style={{ height: '600px' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: '#F8F9FA' }}>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">RedLine Data</h2>
          <p className="text-sm text-gray-500 mt-1">
            Survey data with redline measurements
            {linkId && <span className="ml-2 text-xs text-blue-600 font-medium">(Filtered by SS/Link)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportRedlineExcel}
            disabled={loading || !filteredRedlineData || filteredRedlineData.length === 0}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: (loading || !filteredRedlineData || filteredRedlineData.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportRedlinePDF}
            disabled={loading || !filteredRedlineData || filteredRedlineData.length === 0}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: (loading || !filteredRedlineData || filteredRedlineData.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          {markAsDoneButton}
        </div>
      </div>

      {/* Scrollable Container for Tables */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-4">
          {filteredRedlineData.map((span, spanIndex) => {
            const hasItems = span.span_items && span.span_items.length > 0;
            const spanId = extractSpanId(span.id);
            const isEditing = editingSpanId === spanId;
            const isDeleting = deleteMode === spanId;
            const totalSpans = filteredRedlineData.length;
            const { editable, deletable } = hasItems 
              ? getEditableIndices(spanIndex, totalSpans, span.span_items.length)
              : { editable: [], deletable: [] };
            
            return (
              <div 
                key={spanId} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                style={{
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                }}
              >
                {/* Table Content */}
                <div className="p-4" style={{ paddingTop: '24px' }}>
                  {hasItems ? (
                    <div className="flex gap-4 items-stretch">
                      {/* Left: Span Name Header */}
                      <div 
                        className="flex flex-col items-center justify-center rounded-lg px-6 py-8 text-center text-base font-bold text-white relative overflow-hidden"
                        style={{ 
                          minWidth: '150px', 
                          maxWidth: '150px',
                          background: 'linear-gradient(135deg, #0078D7 0%, #4DA6FF 100%)'
                        }}
                      >
                        {/* Decorative background pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full blur-2xl"></div>
                          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full blur-xl"></div>
                        </div>
                        
                        {/* Icon */}
                        <div className="relative z-10 mb-2">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Network className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        
                        {/* Span Name */}
                        <div className="relative z-10">
                          {span.span_name}
                        </div>
                      </div>

                      {/* Right: Action Bar + Table */}
                      <div className="flex flex-col gap-2 min-w-0 overflow-hidden">
                        {/* Action Bar - Only above table columns */}
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            {/* Span Summary Button */}
                            <button
                              onClick={async () => {
                                setLoadingSummary(prev => ({ ...prev, [spanId]: true }));
                                try {
                                  const summary = await getSpanSummary(spanId);
                                  setSpanSummaries(prev => ({ ...prev, [spanId]: summary }));
                                  toast.success(`Summary loaded: ${summary.total_length}m total, ${summary.item_count} items`);
                                } catch (error) {
                                  console.error('Error getting span summary:', error);
                                  toast.error('Failed to load span summary');
                                } finally {
                                  setLoadingSummary(prev => ({ ...prev, [spanId]: false }));
                                }
                              }}
                              disabled={loadingSummary[spanId]}
                              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                              style={{
                                background: loadingSummary[spanId] ? '#9CA3AF' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                              }}
                              title="View Span Summary"
                            >
                              {loadingSummary[spanId] ? (
                                <>
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                  <span>Loading...</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3.5 h-3.5 bg-white/20 rounded-full flex items-center justify-center">
                                    <FileText className="w-2.5 h-2.5" />
                                  </div>
                                  <span>Summary</span>
                                </>
                              )}
                            </button>
                            
                          </div>
                          
                          {/* Warning Tooltip - Right Side */}
                          {showWarning && showWarning.spanId === spanId && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-2 border-red-500 rounded-lg shadow-md animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-red-900">Total Length Melebihi Actual!</span>
                                <span className="text-xs text-red-700">Kurangi length designator sebelum/sesudah sebesar {showWarning.delta.toFixed(1)}m</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Span Summary Display */}
                        {spanSummaries[spanId] && (
                          <div className="mt-3 bg-gray-50 rounded-lg shadow-sm">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-slate-600 to-blue-600 px-3 py-2 flex items-center justify-between rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                                  <FileText className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-white font-medium text-sm">Span Summary</span>
                              </div>
                              <button
                                onClick={() => setSpanSummaries(prev => {
                                  const newSummaries = { ...prev };
                                  delete newSummaries[spanId];
                                  return newSummaries;
                                })}
                                className="text-white/70 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Content */}
                            <div className="p-3">
                              {/* Overview Stats */}
                              <div className="grid grid-cols-4 gap-3 mb-3 text-center">
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                  <div className="text-xs text-gray-500 mb-1">Total Length</div>
                                  <div className="text-lg font-bold text-gray-800">{spanSummaries[spanId].total_length}m</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                  <div className="text-xs text-gray-500 mb-1">Items</div>
                                  <div className="text-lg font-bold text-gray-800">{spanSummaries[spanId].item_count}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-2 shadow-sm">
                                  <div className="text-xs text-green-600 mb-1">Survey</div>
                                  <div className="text-sm font-semibold text-green-700">{spanSummaries[spanId].breakdown.survey_items} ({spanSummaries[spanId].breakdown.survey_length}m)</div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-2 shadow-sm">
                                  <div className="text-xs text-orange-600 mb-1">Manual</div>
                                  <div className="text-sm font-semibold text-orange-700">{spanSummaries[spanId].breakdown.manual_items} ({spanSummaries[spanId].breakdown.manual_length}m)</div>
                                </div>
                              </div>

                              {/* Auto Items Row */}
                              <div className="grid grid-cols-1">
                                <div className="bg-purple-50 rounded-lg p-2 shadow-sm text-center">
                                  <div className="text-xs text-purple-600 mb-1">Auto Items</div>
                                  <div className="text-sm font-semibold text-purple-700">{spanSummaries[spanId].breakdown.auto_items} items ({spanSummaries[spanId].breakdown.auto_length}m)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border border-gray-200" style={{ position: 'relative' }}>
                          <table className="border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
                            <tbody>
                            {/* Row 1: Redline values with cell merging for same batch_id */}
                            <tr className="bg-white">
                              <td 
                                rowSpan={3}
                                className="border border-gray-200 text-center text-sm font-bold text-white align-middle"
                                style={{ 
                                  width: '100px',
                                  minWidth: '100px',
                                  maxWidth: '100px',
                                  padding: '20px 12px',
                                  background: 'linear-gradient(135deg, #0078D7 0%, #4DA6FF 100%)',
                                  wordBreak: 'break-word',
                                  position: 'sticky',
                                  left : 0,
                                  zIndex: 2
                                }}
                              >
                                {span.link_from || '-'}
                              </td>
                              {(() => {
                                const renderedCells: JSX.Element[] = [];
                                let skipCount = 0;

                                span.span_items.forEach((item: any, idx: number) => {
                                  const isAddingAfterThis = addingCell?.spanId === spanId && addingCell?.afterIndex === idx;
                                  
                                  // Skip if this item is part of a batch that was already rendered
                                  if (skipCount > 0) {
                                    skipCount--;
                                    return;
                                  }

                                  // Check if this item has a batch_id
                                  if (item.batch_id) {
                                    // Count how many consecutive items have the same batch_id
                                    let colSpan = 1;
                                    for (let i = idx + 1; i < span.span_items.length; i++) {
                                      if (span.span_items[i].batch_id === item.batch_id) {
                                        colSpan++;
                                      } else {
                                        break;
                                      }
                                    }

                                    // Render merged cell
                                    renderedCells.push(
                                      <td 
                                        key={`redline-${idx}`}
                                        colSpan={colSpan}
                                        className="border border-gray-200 px-4 py-3 text-center relative"
                                        style={{ 
                                          minWidth: '120px',
                                          backgroundColor: '#FEF3C7'
                                        }}
                                      >
                                        <div className="text-sm font-semibold text-gray-900">
                                          {Math.round(item.redline || 0)}
                                        </div>
                                      </td>
                                    );

                                    // Skip the next items in this batch
                                    skipCount = colSpan - 1;
                                  } else {
                                    // Render normal cell (no batch)
                                    renderedCells.push(
                                      <td 
                                        key={`redline-${idx}`}
                                        className="border border-gray-200 px-4 py-3 text-center relative"
                                        style={{ 
                                          minWidth: '120px',
                                          backgroundColor: 'white'
                                        }}
                                      >
                                        <div className="text-sm font-semibold text-gray-900">
                                          {Math.round(item.redline || 0)}
                                        </div>
                                      </td>
                                    );
                                  }
                                  
                                  // Add new cell after this if adding
                                  if (isAddingAfterThis) {
                                    renderedCells.push(
                                      <td 
                                        key={`new-redline-${idx}`}
                                        className="border border-gray-200 px-4 py-3 text-center relative bg-green-50"
                                        style={{ minWidth: '120px' }}
                                      >
                                        {/* Cancel button at top-left */}
                                        <button
                                          onClick={handleCancelAdd}
                                          className="absolute top-1 left-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full text-white z-10"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                        {/* Save button at top-right - only show when both fields are filled */}
                                        {newCellData.designator && newCellData.length && (
                                          <button
                                            onClick={handleSaveNewCell}
                                            className="absolute top-1 right-1 p-0.5 bg-green-500 hover:bg-green-600 rounded-full text-white z-10"
                                            title="Save"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                        )}
                                        <input
                                          type="text"
                                          value=""
                                          disabled
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-500 text-center cursor-not-allowed"
                                        />
                                      </td>
                                    );
                                  }
                                });

                                return renderedCells;
                              })()}
                              <td 
                                rowSpan={3}
                                className="border border-gray-200 text-center text-sm font-bold text-white align-middle"
                                style={{ 
                                  width: '100px',
                                  minWidth: '100px',
                                  maxWidth: '100px',
                                  padding: '20px 12px',
                                  background: 'linear-gradient(135deg, #0078D7 0%, #4DA6FF 100%)',
                                  wordBreak: 'break-word',
                                  position: 'sticky',
                                  right : 0,
                                  zIndex : 2
                                }}
                              >
                                {span.link_to || '-'}
                              </td>
                            </tr>

                            {/* Row 2: Item names */}
                            <tr className="bg-white">
                              {span.span_items.map((item: any, idx: number) => {
                                // Use combination of spanId and index as unique identifier when itemId is null
                                const rawItemId = item.id?.id?.String || item.id;
                                const itemId = rawItemId || `${spanId}-${idx}`;
                                const isEditableCell = editable.includes(idx);
                                const isDeletableCell = deletable.includes(idx);
                                const currentValue = editedValues[itemId]?.designator ?? item.item_name;
                                const isAddingAfterThis = addingCell?.spanId === spanId && addingCell?.afterIndex === idx;
                                
                                // Check if this column should be red (adjacent to new designator) - by INDEX, not name
                                const adjacentInfo = adjacentRedColumns[spanId];
                                const isAdjacentRed = adjacentInfo && (
                                  idx === adjacentInfo.beforeIndex || 
                                  idx === adjacentInfo.afterIndex
                                );
                                
                                // Debug log for each cell
                                console.log(`Cell ${idx} (${item.item_name}):`, {
                                  itemId,
                                  editedValue: editedValues[itemId],
                                  currentValue,
                                  originalValue: item.item_name,
                                  isAdjacentRed,
                                  adjacentInfo
                                });
                                
                                return (
                                  <>
                                    <td 
                                      key={`name-${idx}`}
                                      className="border border-gray-200 px-4 py-3 text-center relative"
                                      style={{
                                        backgroundColor: isAdjacentRed ? '#FEE2E2' : (item.batch_id ? '#FEF3C7' : 'white'),
                                        borderColor: isAdjacentRed ? '#DC2626' : '#E5E7EB',
                                        borderWidth: isAdjacentRed ? '2px' : '1px'
                                      }}
                                    >
                                      {/* Red warning indicator for adjacent columns */}
                                      {isAdjacentRed && (
                                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-red-600 border-l-[12px] border-l-transparent"></div>
                                      )}
                                      
                                      {/* Delete icon in delete mode */}
                                      {isDeleting && isDeletableCell && (
                                        <button
                                          onClick={() => handleDeleteItem(itemId, item.item_name)}
                                          disabled={deletingItemId === itemId}
                                          className="absolute top-1 right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Delete this item"
                                        >
                                          {deletingItemId === itemId ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                          ) : (
                                            <X className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                      
                                      {/* Editable input or display */}
                                      {isEditing && isEditableCell ? (
                                        <input
                                          type="text"
                                          value={currentValue}
                                          onChange={(e) => handleValueChange(itemId, 'designator', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                        />
                                      ) : (
                                        <div className="text-sm font-semibold text-gray-900">
                                          {item.item_name}
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* New cell in Row 2: Add Designator input */}
                                    {isAddingAfterThis && (
                                      <td 
                                        className="border border-gray-200 px-4 py-3 text-center relative bg-green-50"
                                        style={{ minWidth: '120px' }}
                                      >
                                        <input
                                          type="text"
                                          value={newCellData.designator}
                                          onChange={(e) => setNewCellData(prev => ({ ...prev, designator: e.target.value }))}
                                          placeholder="Add Designator"
                                          className="w-full px-2 py-1 text-sm border border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                        />
                                      </td>
                                    )}
                                  </>
                                );
                              })}
                            </tr>

                            {/* Row 3: Length values */}
                            <tr className="bg-white">
                              {span.span_items.map((item: any, idx: number) => {
                                // Use combination of spanId and index as unique identifier when itemId is null
                                const rawItemId = item.id?.id?.String || item.id;
                                const itemId = rawItemId || `${spanId}-${idx}`;
                                const isEditableCell = editable.includes(idx);
                                const currentValue = editedValues[itemId]?.length ?? item.length;
                                const isAddingAfterThis = addingCell?.spanId === spanId && addingCell?.afterIndex === idx;
                                
                                // Check if this column should be red (adjacent to new designator) - by INDEX, not name
                                const adjacentInfo = adjacentRedColumns[spanId];
                                const isAdjacentRed = adjacentInfo && (
                                  idx === adjacentInfo.beforeIndex || 
                                  idx === adjacentInfo.afterIndex
                                );
                                
                                return (
                                  <>
                                    <td 
                                      key={`length-${idx}`}
                                      className="border border-gray-200 px-4 py-3 text-center"
                                      style={{
                                        backgroundColor: isAdjacentRed ? '#FEE2E2' : (item.batch_id ? '#FEF3C7' : 'white'),
                                        borderColor: isAdjacentRed ? '#DC2626' : '#E5E7EB',
                                        borderWidth: isAdjacentRed ? '2px' : '1px'
                                      }}
                                    >
                                      {isEditing && isEditableCell ? (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={currentValue === 0 ? '' : currentValue}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            // Allow empty string
                                            if (val === '') {
                                              handleValueChange(itemId, 'length', '');
                                              return;
                                            }
                                            // Prevent leading zeros (except for decimal like 0.5)
                                            if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
                                              return; // Block input
                                            }
                                            // Allow only valid numbers (no leading zeros)
                                            if (/^\d+\.?\d*$/.test(val)) {
                                              handleValueChange(itemId, 'length', parseFloat(val));
                                            }
                                          }}
                                          placeholder="0"
                                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                        />
                                      ) : (
                                        <div className="text-sm font-semibold text-gray-900">
                                          {item.length !== null && item.length !== undefined ? Math.round(item.length) : '0'}
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* New cell in Row 3: Add length input */}
                                    {isAddingAfterThis && (
                                      <td 
                                        className="border border-gray-200 px-4 py-3 text-center bg-green-50"
                                        style={{ minWidth: '120px' }}
                                      >
                                        <input
                                          type="number"
                                          value={newCellData.length}
                                          onChange={(e) => setNewCellData(prev => ({ ...prev, length: e.target.value }))}
                                          placeholder="Add length"
                                          className="w-full px-2 py-1 text-sm border border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                          step="0.01"
                                        />
                                      </td>
                                    )}
                                  </>
                                );
                              })}
                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 italic">
                      No survey data for this span.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Apakah Anda yakin ingin menghapus item <span className="font-semibold">"{deleteConfirmation.itemName}"</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {editConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Edit</h3>
                <p className="text-sm text-gray-500">Aktifkan mode edit untuk span ini</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Apakah Anda yakin ingin mengedit data redline untuk span ini? Anda dapat mengubah designator dan length pada cell yang diizinkan.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmEditMode}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                Ya, Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Confirmation Modal */}
      {regenerateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Regenerate</h3>
                <p className="text-sm text-gray-500">Hitung ulang semua redline data</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Apakah Anda yakin ingin me-regenerate semua redline data untuk contract ini? Proses ini akan menghitung ulang semua redline berdasarkan survey data terbaru.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRegenerateConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmRegenerate}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                Ya, Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}