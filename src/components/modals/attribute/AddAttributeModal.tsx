import { Plus } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { AttributeFormData } from '@/types';

interface AddAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AttributeFormData;
  onFormDataChange: (data: AttributeFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddAttributeModal({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
}: AddAttributeModalProps) {
  const isFormValid = formData.name && formData.label && formData.category;

  const handleAddOption = () => {
    onFormDataChange({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const handleRemoveOption = (index: number) => {
    onFormDataChange({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    onFormDataChange({
      ...formData,
      options: newOptions
    });
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} className="max-w-4xl w-full max-h-[90vh]">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <CustomDialogHeader 
          style={{
            background: 'linear-gradient(to right, #003A70, #005EB8)',
            padding: '24px',
            borderBottom: '1px solid #E5E7EB'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
            <Plus className="w-6 h-6 text-white" />
            <div>
              <div className="text-lg font-semibold">Tambah Atribut Baru</div>
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Field Name */}
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Field Name <span className="text-red-500">*</span>
              </Label>  
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="e.g., customField1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: 'monospace' }}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Internal field name (no spaces)</p>
            </div>

            {/* Display Label */}
            <div>
              <Label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                Display Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => onFormDataChange({ ...formData, label: e.target.value })}
                placeholder="e.g., Custom Field 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Data Type */}
            <div>
              <Label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Data Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as AttributeFormData['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
                <option value="dropdown">Dropdown</option>
                <option value="multiselect">Multi Select</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => onFormDataChange({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="main">Main Table</option>
                <option value="drm">DRM Data</option>
                <option value="boq">BOQ Customer</option>
                <option value="segmentasi">Segmentasi</option>
                <option value="issue">Issue Log</option>
                <option value="evidence">Evidence</option>
              </select>
            </div>

            {/* Level */}
            <div>
              <Label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </Label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => onFormDataChange({ ...formData, level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>L0 - Kontrak</option>
                <option value={1}>L1 - Lokasi</option>
                <option value={2}>L2 - Ruas</option>
              </select>
            </div>

            {/* Required Field Checkbox */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required}
                  onChange={(e) => onFormDataChange({ ...formData, required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">This field is required</span>
              </label>
            </div>

            {/* Default Value or Options */}
            {formData.type !== 'select' ? (
              <div className="col-span-2">
                <Label htmlFor="defaultValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Value <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Input
                  id="defaultValue"
                  type={formData.type === 'number' ? 'number' : formData.type === 'date' ? 'date' : 'text'}
                  value={formData.defaultValue}
                  onChange={(e) => onFormDataChange({ ...formData, defaultValue: e.target.value })}
                  placeholder="Enter default value..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="col-span-2">
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Options <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-col gap-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.options.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemoveOption(index)}
                          className="px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOption}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <CustomDialogFooter style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '24px',
          borderTop: '1px solid #E5E7EB',
          background: '#F9FAFB'
        }}>
          <Button 
            type="button"
            variant="outline" 
            onClick={onCancel}
          >
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isFormValid}
            className="bg-[#005EB8] hover:bg-[#004a94] text-white"
          >
            Simpan
          </Button>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
