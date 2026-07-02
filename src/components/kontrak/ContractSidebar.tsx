import { useState } from 'react';
import { 
  Search, 
  X, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Trash2, 
  Plus, 
  CornerDownRight 
} from 'lucide-react';
import { Contract } from '@/types/contract';
import { extractId } from '@/services/contractService';

interface ContractSidebarProps {
  contracts: Contract[];
  apiLoading: boolean;
  apiError: string | null;
  selectedContractId: string | null;
  selectedSpan: string | null;
  expanded: Set<string>;
  projectSpans: Record<string, any[]>;
  onSelectContract: (contractId: string) => void;
  onSelectSpan: (contractId: string, spanName: string, spanId?: string) => void;
  onToggleNode: (nodeId: string) => void;
  onDeleteContract: (contract: Contract) => void;
  onCreateSpan: (projectId: string) => void;
  onAddSpanItem: (spanId: string, spanName: string) => void;
  onRetry: () => void;
}

export function ContractSidebar({
  contracts,
  apiLoading,
  apiError,
  selectedContractId,
  selectedSpan,
  expanded,
  projectSpans,
  onSelectContract,
  onSelectSpan,
  onToggleNode,
  onDeleteContract,
  onCreateSpan,
  onAddSpanItem,
  onRetry,
}: ContractSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const renderContractList = () => {
    // Show loading state
    if (apiLoading && contracts.length === 0) {
      return (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm font-medium text-gray-600">Loading contracts...</p>
        </div>
      );
    }

    // Show error state
    if (apiError && contracts.length === 0) {
      return (
        <div className="p-6 text-center">
          <FileText className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-600">Error loading contracts</p>
          <p className="text-xs text-gray-500 mt-1">{apiError}</p>
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }

    const filteredContracts = contracts
      .filter(contract =>
        contract.nomorKontrak.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.namaProject.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });

    if (filteredContracts.length === 0) {
      return (
        <div className="p-6 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {searchQuery ? 'No contracts found' : 'No contracts yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? 'Try a different search term' : 'Create one to get started'}
          </p>
        </div>
      );
    }

    return filteredContracts.map(contract => {
      const isContractExpanded = expanded.has(contract.id);
      const isProjectExpanded = expanded.has(`${contract.id}-project`);
      const isSelected = selectedContractId === contract.id;

      return (
        <div key={contract.id} className="mb-3">
          {/* CARD A - Satu card yang expand untuk menampilkan semua konten */}
          <div
            className={`rounded-xl transition-all ${
              isSelected 
                ? 'shadow-lg border border-blue-200' 
                : 'bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm'
            }`}
            style={{
              background: isSelected
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.15) 100%)'
                : isContractExpanded && !isSelected
                ? 'linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%)'
                : undefined
            }}
          >
            {/* Header - Nomor Contract */}
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer transition-all"
              onClick={() => onSelectContract(contract.id)}
              title={contract.nomorKontrak}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNode(contract.id);
                }}
                className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
              >
                {isContractExpanded ? (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div className="flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 80px)' }}>
                <span 
                  className={`text-sm font-semibold block truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}
                >
                  {contract.nomorKontrak}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteContract(contract);
                }}
                className="flex-shrink-0 p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete contract"
              >
                <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
              </button>
            </div>

            {/* Expanded Content - Card B dan SPAN List */}
            {isContractExpanded && (
              <div className="px-4 pb-6 pt-2 mb-6">
                {/* CARD B - Nama Project */}
                <div
                  className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all rounded-xl ${
                    isProjectExpanded
                      ? 'shadow-sm border border-gray-300'
                      : 'hover:bg-gray-50 shadow-sm border border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    background: isProjectExpanded
                      ? 'linear-gradient(135deg, rgba(249, 250, 251, 1) 0%, rgba(243, 244, 246, 1) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(249, 250, 251, 1) 100%)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const projectKey = `${contract.id}-project`;
                    onToggleNode(projectKey);
                  }}
                  title={contract.namaProject}
                >
                  <button className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors">
                    {isProjectExpanded ? (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 70px)' }}>
                    <span className="text-sm font-medium text-gray-800 block truncate">
                      {contract.namaProject}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateSpan(contract.id);
                    }}
                    className="flex-shrink-0 p-1.5 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                    title="Add SPAN"
                  >
                    <Plus className="w-4 h-4 text-orange-600 hover:text-orange-700" />
                  </button>
                </div>

                {/* SPAN List */}
                {isProjectExpanded && contract.spans && contract.spans.length > 0 && (
                  <div className="space-y-2 pl-6 mb-3 mt-3">
                    {contract.spans.map((spanName, index) => {
                      // Get the span ID from spanObjects if available
                      const spanObj = contract.spanObjects?.[index];
                      const spanId = spanObj?.id;
                      
                      // Create unique key combining contract ID, span ID, and index
                      const uniqueKey = `${contract.id}-span-${spanId || index}-${index}`;
                      
                      return (
                        <div
                          key={uniqueKey}
                          className={`py-3 transition-all rounded-xl shadow-sm ${
                            selectedSpan === spanName 
                              ? 'border-2 border-orange-400' 
                              : 'border border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            background: selectedSpan === spanName
                              ? 'linear-gradient(135deg, rgba(255, 237, 213, 1) 0%, rgba(254, 215, 170, 1) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(249, 250, 251, 1) 100%)',
                            paddingLeft: '40px',
                            paddingRight: '16px'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className={`w-4 h-4 flex-shrink-0 ${selectedSpan === spanName ? 'text-orange-600' : 'text-orange-600'}`} />
                            <span 
                              className={`text-sm block truncate flex-1 cursor-pointer ${selectedSpan === spanName ? 'text-orange-700 font-semibold' : 'text-gray-700 font-medium' }`}
                              onClick={() => onSelectSpan(contract.id, spanName, spanId)}
                              title={spanName}
                            >
                              {spanName}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                
                                // Get span ID directly from projectSpans state
                                const projectId = contract.id;
                                const spansForProject = projectSpans[projectId] || [];
                                const spanData = spansForProject[index];
                                
                                console.log('🔍 [Button Click] Project ID:', projectId);
                                console.log('🔍 [Button Click] Spans for project:', spansForProject);
                                console.log('🔍 [Button Click] Span data at index', index, ':', spanData);
                                console.log('🔍 [Button Click] Raw Span ID:', JSON.stringify(spanData?.id));
                                console.log('🔍 [Button Click] Type of raw ID:', typeof spanData?.id);
                                
                                // Extract span ID properly - handle object format
                                const rawSpanId = spanData?.id;
                                if (!rawSpanId) {
                                  alert('Span ID not found! Please refresh and try again.');
                                  return;
                                }
                                
                                // Use helper to extract ID from object or string
                                const finalSpanId = extractId(rawSpanId);
                                
                                console.log('✅ [Button Click] Extracted span ID:', finalSpanId);
                                console.log('✅ [Button Click] Type of extracted ID:', typeof finalSpanId);
                                
                                onAddSpanItem(finalSpanId, spanName);
                              }}
                              className="flex-shrink-0 p-1.5 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Add Span Item"
                            >
                              <Plus className="w-4 h-4 text-orange-600 hover:text-orange-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-80 flex flex-col shadow-lg" style={{
      background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
      borderRight: '1px solid #e5e7eb'
    }}>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
          <span>Kontrak</span>
          <ChevronRight className="w-3 h-3" />
          <span>Project</span>
          <ChevronRight className="w-3 h-3" />
          <span>Spans</span>
        </p>
      </div>

      {/* Contract List */}
      <div className="flex-1 overflow-auto px-2 pb-2">
        {renderContractList()}
      </div>
    </div>
  );
}
