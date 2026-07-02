import { Save, ChevronDown, MoreHorizontal, History, Plus, Settings } from 'lucide-react';

interface ActionBarProps {
  selectedCount: number;
  onAttributeBuilder: () => void;
  onAddAttributeModal: () => void;
}

export function ActionBar({ selectedCount, onAttributeBuilder, onAddAttributeModal }: ActionBarProps) {
  return (
    <div className="bg-white border-b border-[#D1D5DB] px-6 py-3 flex items-center justify-between">
      {/* Left Actions */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-[#005EB8] text-white rounded hover:bg-[#004a94] transition-colors">
          <Save className="w-4 h-4" />
          Save
        </button>

        <div className="relative">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Batch Actions
            <ChevronDown className="w-4 h-4" />
          </button>
          {selectedCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {selectedCount}
            </span>
          )}
        </div>

        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          More Actions
          <ChevronDown className="w-4 h-4" />
        </button>

        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          <History className="w-4 h-4" />
          Editing History
        </button>

        <button 
          onClick={onAddAttributeModal}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>

        <button 
          onClick={onAttributeBuilder}
          className="flex items-center gap-2 px-4 py-2 border border-[#005EB8] text-[#005EB8] rounded hover:bg-blue-50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage Attributes
        </button>
      </div>
    </div>
  );
}
