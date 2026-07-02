import { AlertCircle, Search, X, Plus, ChevronRight, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';
import { AddNewIssueModal } from '../components/modals/issue/AddNewIssueModal';
import { EditIssueModal } from '../components/modals/issue/EditIssueModal';
import { DeleteIssueModal } from '../components/modals/issue/DeleteIssueModal';
import { useIssues } from '@/hooks/useIssues';
import { Issue, CreateIssueRequest, UpdateIssueRequest } from '@/types';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

export function IssueCenter() {
  // TODO: Get projectId from route params or context
  const projectId = 'project-id-here'; // Replace with actual project ID
  
  // Use real API hook
  const {
    issues,
    loading,
    error,
    loadIssues,
    createIssue,
    updateIssue,
    deleteIssue,
  } = useIssues(projectId);

  // State management
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Dialog states
  const [isNewIssueDialogOpen, setIsNewIssueDialogOpen] = useState(false);
  const [isEditIssueDialogOpen, setIsEditIssueDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<CreateIssueRequest>({
    title: '',
    description: '',
    priority: 'Medium',
    assigned_to: undefined,
  });
  
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load issues on mount
  useEffect(() => {
    loadIssues();
  }, []);

  // Update selected issue when issues change (but don't auto-select)
  useEffect(() => {
    if (selectedIssue && issues.length > 0) {
      const updated = issues.find(i => i.id === selectedIssue.id);
      if (updated) {
        setSelectedIssue(updated);
      } else {
        // Issue was deleted, clear selection
        setSelectedIssue(null);
      }
    }
  }, [issues]);

  // CRUD Operations
  const handleCreateIssue = async () => {
    try {
      setIsSubmitting(true);
      await createIssue(formData);
      setIsNewIssueDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create issue:', err);
      alert('Failed to create issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIssue = async () => {
    if (!selectedIssue) return;
    
    try {
      setIsSubmitting(true);
      const updateData: UpdateIssueRequest = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assigned_to: formData.assigned_to,
      };
      await updateIssue(selectedIssue.id, updateData);
      setIsEditIssueDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to update issue:', err);
      alert('Failed to update issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!issueToDelete) return;
    
    try {
      setIsSubmitting(true);
      await deleteIssue(issueToDelete.id);
      
      if (selectedIssue?.id === issueToDelete.id) {
        setSelectedIssue(issues[0] || null);
      }
      
      setIsDeleteDialogOpen(false);
      setIssueToDelete(null);
    } catch (err) {
      console.error('Failed to delete issue:', err);
      alert('Failed to delete issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await updateIssue(issueId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      assigned_to: undefined,
    });
  };

  const openEditDialog = (issue: Issue) => {
    setFormData({
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      assigned_to: issue.assigned_to,
    });
    setSelectedIssue(issue);
    setIsEditIssueDialogOpen(true);
  };

  const openDeleteDialog = (issue: Issue) => {
    setIssueToDelete(issue);
    setIsDeleteDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-[#D32F2F] text-white';
      case 'High': return 'bg-[#FF5252] text-white';
      case 'Medium': return 'bg-[#FFC107] text-gray-900';
      case 'Low': return 'bg-[#4CAF50] text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Resolved': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Custom Cell Renderers
  const PriorityRenderer = (props: ICellRendererParams) => {
    const priority = props.value;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(priority)}`}>
        {priority}
      </span>
    );
  };

  const StatusRenderer = (props: ICellRendererParams) => {
    const status = props.value;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  // Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 120,
      checkboxSelection: true,
      headerCheckboxSelection: true
    },
    { 
      field: 'title', 
      headerName: 'Title', 
      flex: 1, 
      minWidth: 250 
    },
    { field: 'project_id', headerName: 'Project', width: 150 },
    { 
      field: 'priority', 
      headerName: 'Priority', 
      width: 120,
      cellRenderer: PriorityRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellRenderer: StatusRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    { field: 'reported_by', headerName: 'Reported By', width: 150 },
    { field: 'assigned_to', headerName: 'Assigned To', width: 150 },
    { 
      field: 'created_at', 
      headerName: 'Created', 
      width: 120,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('id-ID');
      }
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIssue(params.data);
                openEditDialog(params.data);
              }}
              className="p-1 hover:bg-blue-100 rounded"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(params.data);
              }}
              className="p-1 hover:bg-red-100 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        );
      },
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Loading state
  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Issues</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadIssues}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left Panel - Filters */}
      <div className="w-64 border-r border-[#D1D5DB] p-4 bg-[#F8F8F8]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-gray-700">Filters</h3>
          <button className="text-xs text-blue-600 hover:underline">Clear</button>
        </div>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Priority</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm">High</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm">Medium</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm">Low</span>
              </label>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Issue Type</label>
            <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm">
              <option>All Types</option>
              <option>Route Change</option>
              <option>Material Delay</option>
              <option>Quality Issue</option>
              <option>Permit Issue</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Date Range</label>
            <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm mb-2" />
            <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm" />
          </div>
        </div>
      </div>

      {/* Center Panel - Issue List */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#D1D5DB]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#005EB8] text-white rounded hover:bg-[#004a94]"
              onClick={() => setIsNewIssueDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Issue
            </button>
          </div>
        </div>

        {/* AG Grid Issue Table */}
        <div className="flex-1 p-4">
          <div className="ag-theme-quartz ag-grid-container h-full">
            <AgGridReact
              rowData={issues}
              theme={themeQuartz}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              domLayout="normal"
              headerHeight={45}
              rowHeight={50}
              suppressCellFocus={false}
              enableCellTextSelection={true}
              onRowClicked={(event) => setSelectedIssue(event.data)}
              rowClass="cursor-pointer"
              getRowStyle={(params) => {
                if (selectedIssue?.id === params.data.id) {
                  return { background: '#EFF6FF' };
                }
                return undefined;
              }}
              loadingOverlayComponent={() => (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-600">Loading issues...</div>
                </div>
              )}
              noRowsOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center h-full">
                  <AlertCircle className="w-12 h-12 text-gray-400 mb-2" />
                  <div className="text-gray-400 text-lg mb-2">No issues found</div>
                  <div className="text-gray-500 text-sm">Try adjusting your filters</div>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Issue Details */}
      {selectedIssue && (
        <div className="w-96 border-l border-[#D1D5DB] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#D1D5DB] bg-[#F8F8F8]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm">Issue Details</h3>
              <button onClick={() => setSelectedIssue(null)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-500">{selectedIssue.id}</div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Type & Priority */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs ${getPriorityColor(selectedIssue.priority)}`}>
                  {selectedIssue.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(selectedIssue.status)}`}>
                  {selectedIssue.status}
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <p className="text-sm text-gray-900">{selectedIssue.description}</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Issue Information</label>
                <div className="text-sm text-gray-900 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project ID:</span>
                    <span className="font-medium">{selectedIssue.project_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reported By:</span>
                    <span className="font-medium">{selectedIssue.reported_by}</span>
                  </div>
                  {selectedIssue.assigned_to && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assigned To:</span>
                      <span className="font-medium">{selectedIssue.assigned_to}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Activity Timeline</label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-900">Issue created</div>
                      <div className="text-xs text-gray-500">
                        {new Date(selectedIssue.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-900">Last updated</div>
                      <div className="text-xs text-gray-500">
                        {new Date(selectedIssue.updated_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Comments</label>
                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded border border-gray-200">
                  Comments feature coming soon...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddNewIssueModal
        open={isNewIssueDialogOpen}
        onOpenChange={setIsNewIssueDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleCreateIssue}
        onCancel={() => {
          setIsNewIssueDialogOpen(false);
          resetForm();
        }}
        isSubmitting={isSubmitting}
      />

      <EditIssueModal
        open={isEditIssueDialogOpen}
        onOpenChange={setIsEditIssueDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleUpdateIssue}
        onCancel={() => {
          setIsEditIssueDialogOpen(false);
          resetForm();
        }}
        issueId={selectedIssue?.id}
        selectedIssue={selectedIssue}
        isSubmitting={isSubmitting}
        onStatusChange={handleStatusChange}
      />

      <DeleteIssueModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        issue={issueToDelete}
        onConfirm={handleDeleteIssue}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setIssueToDelete(null);
        }}
        getPriorityColor={getPriorityColor}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
