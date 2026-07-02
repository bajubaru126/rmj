import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '@/styles/ag-grid-custom.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface AttributeBuilderProps {
  onClose: () => void;
}

interface ExistingAttribute {
  id: string;
  name: string;
  type: string;
  attachedTo: string;
  defaultValue?: string;
  accessLevel: string;
  createdDate: string;
  createdBy: string;
}

const mockExistingAttributes: ExistingAttribute[] = [
  {
    id: 'attr1',
    name: 'Material Quality Rating',
    type: 'Number',
    attachedTo: 'BOQ',
    defaultValue: '0',
    accessLevel: 'Modify',
    createdDate: '2024-03-10',
    createdBy: 'Admin',
  },
  {
    id: 'attr2',
    name: 'Vendor Performance',
    type: 'Dropdown',
    attachedTo: 'Kontrak',
    defaultValue: 'Good',
    accessLevel: 'Modify',
    createdDate: '2024-03-08',
    createdBy: 'Admin',
  },
  {
    id: 'attr3',
    name: 'Installation Priority',
    type: 'Text',
    attachedTo: 'Cell',
    defaultValue: 'Medium',
    accessLevel: 'View Only',
    createdDate: '2024-03-05',
    createdBy: 'Manager',
  },
  {
    id: 'attr4',
    name: 'Quality Check Required',
    type: 'Boolean',
    attachedTo: 'Segmentasi',
    defaultValue: 'Yes',
    accessLevel: 'Modify',
    createdDate: '2024-03-01',
    createdBy: 'Admin',
  },
];

export function AttributeBuilder({ onClose }: AttributeBuilderProps) {
  // Form state
  const [attributeName, setAttributeName] = useState('');
  const [attributeType, setAttributeType] = useState('text');
  const [attachedTo, setAttachedTo] = useState('');
  const [accessLevel, setAccessLevel] = useState('Modify');
  const [defaultValue, setDefaultValue] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(['']);
  
  // Data state
  const [attributes, setAttributes] = useState<ExistingAttribute[]>(mockExistingAttributes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<ExistingAttribute[]>([]);

  const handleAttachedToChange = (value: string) => {
    setAttachedTo(value);
  };

  const resetForm = () => {
    setAttributeName('');
    setAttributeType('text');
    setAttachedTo('');
    setAccessLevel('Modify');
    setDefaultValue('');
    setDropdownOptions(['']);
    setEditingId(null);
  };

  const handleSaveAttribute = () => {
    // Validation
    if (!attributeName.trim()) {
      alert('Please enter an attribute name');
      return;
    }
    if (!attachedTo) {
      alert('Please select what this attribute is attached to');
      return;
    }

    // Prepare the attribute data
    const attributeData: ExistingAttribute = {
      id: editingId || `attr${Date.now()}`,
      name: attributeName.trim(),
      type: attributeType.charAt(0).toUpperCase() + attributeType.slice(1),
      attachedTo: attachedTo.charAt(0).toUpperCase() + attachedTo.slice(1),
      defaultValue: defaultValue || undefined,
      accessLevel: accessLevel,
      createdDate: editingId 
        ? attributes.find(a => a.id === editingId)?.createdDate || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      createdBy: editingId 
        ? attributes.find(a => a.id === editingId)?.createdBy || 'User'
        : 'User',
    };

    if (editingId) {
      // Update existing attribute
      setAttributes(prev => 
        prev.map(attr => attr.id === editingId ? attributeData : attr)
      );
    } else {
      // Create new attribute
      setAttributes(prev => [...prev, attributeData]);
    }

    resetForm();
  };

  const handleEditAttribute = (attribute: ExistingAttribute) => {
    setEditingId(attribute.id);
    setAttributeName(attribute.name);
    setAttributeType(attribute.type.toLowerCase());
    setAttachedTo(attribute.attachedTo.toLowerCase());
    setAccessLevel(attribute.accessLevel);
    setDefaultValue(attribute.defaultValue || '');
  };

  const handleDeleteAttribute = (id: string) => {
    if (confirm('Are you sure you want to delete this attribute?')) {
      setAttributes(prev => prev.filter(attr => attr.id !== id));
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) {
      alert('Please select attributes to delete');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedRows.length} attribute(s)?`)) {
      const selectedIds = selectedRows.map(row => row.id);
      setAttributes(prev => prev.filter(attr => !selectedIds.includes(attr.id)));
      setSelectedRows([]);
      if (editingId && selectedIds.includes(editingId)) {
        resetForm();
      }
    }
  };

  // Custom Cell Renderers
  const TypeBadgeRenderer = (props: ICellRendererParams) => {
    const getTypeBadgeColor = (type: string) => {
      switch (type) {
        case 'Number': return 'bg-blue-100 text-blue-700';
        case 'Text': return 'bg-gray-100 text-gray-700';
        case 'Dropdown': return 'bg-purple-100 text-purple-700';
        case 'Boolean': return 'bg-green-100 text-green-700';
        case 'Date': return 'bg-orange-100 text-orange-700';
        case 'Multiselect': return 'bg-pink-100 text-pink-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${getTypeBadgeColor(props.value)}`}>
        {props.value}
      </span>
    );
  };

  const AttachedToBadgeRenderer = (props: ICellRendererParams) => {
    return (
      <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">
        {props.value}
      </span>
    );
  };

  const AccessLevelRenderer = (props: ICellRendererParams) => {
    const getAccessColor = (level: string) => {
      switch (level) {
        case 'Modify': return 'bg-green-100 text-green-700';
        case 'View Only': return 'bg-yellow-100 text-yellow-700';
        case 'Hidden': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${getAccessColor(props.value)}`}>
        {props.value}
      </span>
    );
  };

  const ActionRenderer = (props: ICellRendererParams) => {
    return (
      <div className="flex items-center justify-center gap-1">
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEditAttribute(props.data);
          }}
        >
          <Save className="w-4 h-4 text-blue-600" />
        </button>
        <button 
          className="p-1 hover:bg-gray-200 rounded" 
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteAttribute(props.data.id);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    );
  };

  // Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'name', 
      headerName: 'Attribute Name', 
      flex: 1,
      minWidth: 180,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      sortable: true,
      filter: true,
      comparator: (valueA: string, valueB: string) => {
        return valueA.localeCompare(valueB);
      }
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      cellRenderer: TypeBadgeRenderer,
      cellStyle: { display: 'flex', alignItems: 'center' } as any,
      sortable: true,
      filter: true
    },
    { 
      field: 'attachedTo', 
      headerName: 'Attached To', 
      width: 130,
      cellRenderer: AttachedToBadgeRenderer,
      cellStyle: { display: 'flex', alignItems: 'center' } as any,
      sortable: true,
      filter: true
    },
    { 
      field: 'defaultValue', 
      headerName: 'Default Value', 
      width: 130,
      valueFormatter: (params) => params.value || '-',
      sortable: true,
      filter: true
    },
    { 
      field: 'accessLevel', 
      headerName: 'Access', 
      width: 120,
      cellRenderer: AccessLevelRenderer,
      cellStyle: { display: 'flex', alignItems: 'center' } as any,
      sortable: true,
      filter: true
    },
    { 
      field: 'createdDate', 
      headerName: 'Created', 
      width: 110,
      sortable: true,
      filter: true,
      comparator: (valueA: string, valueB: string) => {
        return new Date(valueA).getTime() - new Date(valueB).getTime();
      }
    },
    { 
      field: 'createdBy', 
      headerName: 'By', 
      width: 100,
      sortable: true,
      filter: true
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 100,
      cellRenderer: ActionRenderer,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
      pinned: 'right',
      sortable: false,
      filter: false
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="w-96 bg-white border-l border-[#D1D5DB] flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-[#D1D5DB] flex items-center justify-between bg-gradient-to-r from-[#003A70] to-[#005EB8]">
        <div>
          <h3 className="text-white text-lg">
            {editingId ? 'Edit Attribute' : 'Attribute Builder'}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            {editingId ? 'Update existing attribute' : 'Create custom attributes for RMJ data'}
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Attribute Name */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-2">
            Attribute Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={attributeName}
            onChange={(e) => setAttributeName(e.target.value)}
            placeholder="e.g., Material Type, Vendor Rating"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Attribute Type */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-2">
            Attribute Type <span className="text-red-500">*</span>
          </label>
          <select
            value={attributeType}
            onChange={(e) => setAttributeType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="multiselect">Multi-Select</option>
            <option value="boolean">Boolean (Yes/No)</option>
          </select>
        </div>

        {/* Attached To */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-2">
            Attached To <span className="text-red-500">*</span>
          </label>
          <select
            value={attachedTo}
            onChange={(e) => handleAttachedToChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="kontrak">Kontrak</option>
            <option value="ruas">Ruas</option>
            <option value="boq">BOQ</option>
            <option value="drm">DRM</option>
            <option value="segmentasi">Segmentasi</option>
            <option value="cell">Cell</option>
          </select>
        </div>

        {/* Default Value */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-2">
            Default Value
          </label>
          {attributeType === 'text' && (
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Enter default value"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {attributeType === 'number' && (
            <input
              type="number"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {attributeType === 'date' && (
            <input
              type="date"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {attributeType === 'dropdown' && (
            <div className="space-y-2">
              {dropdownOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...dropdownOptions];
                      newOptions[index] = e.target.value;
                      setDropdownOptions(newOptions);
                      if (index === 0) setDefaultValue(e.target.value);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {dropdownOptions.length > 1 && (
                    <button
                      onClick={() => {
                        const newOptions = dropdownOptions.filter((_, i) => i !== index);
                        setDropdownOptions(newOptions);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setDropdownOptions([...dropdownOptions, ''])}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add option
              </button>
            </div>
          )}
          {attributeType === 'multiselect' && (
            <div className="space-y-2">
              {dropdownOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...dropdownOptions];
                      newOptions[index] = e.target.value;
                      setDropdownOptions(newOptions);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {dropdownOptions.length > 1 && (
                    <button
                      onClick={() => {
                        const newOptions = dropdownOptions.filter((_, i) => i !== index);
                        setDropdownOptions(newOptions);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setDropdownOptions([...dropdownOptions, ''])}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add option
              </button>
            </div>
          )}
          {attributeType === 'boolean' && (
            <select
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          )}
        </div>

        {/* Access Level */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-2">
            Access Level
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="access"
                value="View Only"
                checked={accessLevel === 'View Only'}
                onChange={(e) => setAccessLevel(e.target.value)}
              />
              <span className="text-sm">View Only</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="access"
                value="Modify"
                checked={accessLevel === 'Modify'}
                onChange={(e) => setAccessLevel(e.target.value)}
              />
              <span className="text-sm">Modify</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="access"
                value="Hidden"
                checked={accessLevel === 'Hidden'}
                onChange={(e) => setAccessLevel(e.target.value)}
              />
              <span className="text-sm">Hidden</span>
            </label>
          </div>
        </div>

        {/* Existing Attributes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm text-gray-700">
              Existing Custom Attributes ({attributes.length})
            </label>
            <div className="flex gap-2">
              {selectedRows.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete ({selectedRows.length})
                </button>
              )}
              <button className="text-xs text-blue-600 hover:underline">
                Export
              </button>
            </div>
          </div>
          <div className="ag-theme-quartz" style={{ height: '320px' }}>
            <AgGridReact
              rowData={attributes}
              theme={themeQuartz}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              domLayout="normal"
              headerHeight={40}
              rowHeight={45}
              suppressCellFocus={false}
              pagination={false}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              onSelectionChanged={(event) => {
                setSelectedRows(event.api.getSelectedRows());
              }}
              getRowStyle={(params) => {
                const style: any = { cursor: 'pointer' };
                if (params.data.id === editingId) {
                  style.backgroundColor = '#EFF6FF';
                }
                return style;
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[#D1D5DB] bg-gray-50">
        <div className="flex gap-2">
          {editingId && (
            <button
              onClick={resetForm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          <button
            onClick={handleSaveAttribute}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#005EB8] text-white rounded hover:bg-[#004a94] transition-colors"
          >
            <Save className="w-4 h-4" />
            {editingId ? 'Update Attribute' : 'Save Attribute'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          {editingId 
            ? 'Update the existing attribute in the table'
            : 'New attributes will be added as columns to the table'}
        </p>
      </div>
    </div>
  );
}
