import { Edit2, Plus } from 'lucide-react';
import { CustomDialog, CustomDialogHeader, CustomDialogTitle, CustomDialogFooter } from '../../ui/custom-dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { AttributeFormData } from '@/types';

interface EditAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AttributeFormData;
  onFormDataChange: (data: AttributeFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  attributeId?: string;
}

export function EditAttributeModal({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  attributeId,
}: EditAttributeModalProps) {
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
            background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #EA580C 100%)',
            padding: '32px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onClose={onCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', paddingRight: '48px' }}>
            <Edit2 className="w-8 h-8 text-white" />
            <div>
              <div className="text-2xl font-bold tracking-tight">
                Edit Attribute{attributeId ? ` - ${attributeId}` : ''}
              </div>
              <div className="text-sm font-normal text-orange-200 mt-1.5 tracking-wide">
                Update attribute configuration
              </div>
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-8">
          <div className="flex flex-col gap-6">
            {/* Basic Information */}
            <div 
              className="rounded-2xl p-6 border-2 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FEF3C7 100%)',
                borderColor: 'rgba(217, 119, 6, 0.2)'
              }}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 flex items-center justify-center rounded-xl shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  }}
                >
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #D97706 0%, #EA580C 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Basic Information</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Field Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                    placeholder="e.g., customField1"
                    className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="label" className="text-sm font-semibold text-gray-700">
                    Display Label <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => onFormDataChange({ ...formData, label: e.target.value })}
                    placeholder="e.g., Custom Field 1"
                    className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div 
              className="rounded-2xl p-6 border-2 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 50%, #FFEDD5 100%)',
                borderColor: 'rgba(234, 88, 12, 0.2)'
              }}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 flex items-center justify-center rounded-xl shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #EA580C 0%, #DC2626 100%)'
                  }}
                >
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #EA580C 0%, #DC2626 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Configuration</span>
              </h3>

              <div className="grid grid-cols-3 gap-5">
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="type" className="text-sm font-semibold text-gray-700">
                    Data Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as AttributeFormData['type'] })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none bg-white cursor-pointer"
                  >
                    <option value="text">📝 Text</option>
                    <option value="number">🔢 Number</option>
                    <option value="date">📅 Date</option>
                    <option value="select">📋 Select</option>
                    <option value="dropdown">📋 Dropdown</option>
                    <option value="multiselect">☑️ Multi Select</option>
                    <option value="boolean">✓ Boolean</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => onFormDataChange({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none bg-white cursor-pointer"
                  >
                    <option value="main">Main Table</option>
                    <option value="drm">DRM Data</option>
                    <option value="boq">BOQ Customer</option>
                    <option value="segmentasi">Segmentasi</option>
                    <option value="issue">Issue Log</option>
                    <option value="evidence">Evidence</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="level" className="text-sm font-semibold text-gray-700">
                    Level
                  </Label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => onFormDataChange({ ...formData, level: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm outline-none bg-white cursor-pointer"
                  >
                    <option value={0}>L0 - Kontrak</option>
                    <option value={1}>L1 - Lokasi</option>
                    <option value={2}>L2 - Ruas</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required}
                  onChange={(e) => onFormDataChange({ ...formData, required: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <Label htmlFor="required" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  This field is required
                </Label>
              </div>
            </div>

            {/* Default Value & Options */}
            <div 
              className="rounded-2xl p-6 border-2 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #FEF9C3 0%, #FDE047 50%, #FEF9C3 100%)',
                borderColor: 'rgba(202, 138, 4, 0.2)'
              }}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 flex items-center justify-center rounded-xl shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)'
                  }}
                >
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #CA8A04 0%, #A16207 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Default Value & Options</span>
              </h3>

              {formData.type !== 'select' ? (
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="defaultValue" className="text-sm font-semibold text-gray-700">
                    Default Value <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="defaultValue"
                    type={formData.type === 'number' ? 'number' : formData.type === 'date' ? 'date' : 'text'}
                    value={formData.defaultValue}
                    onChange={(e) => onFormDataChange({ ...formData, defaultValue: e.target.value })}
                    placeholder="Enter default value..."
                    className="h-11 px-4 border-2 border-gray-300 rounded-xl text-sm"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2.5 block">
                    Select Options <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-col gap-2.5">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2.5">
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 h-11 px-4 border-2 border-gray-300 rounded-xl text-sm"
                        />
                        {formData.options.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRemoveOption(index)}
                            className="w-11 h-11 p-0 border-2 border-red-500 rounded-xl text-red-500"
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
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 bg-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)',
          padding: '20px 32px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-amber-700">
              Updating this attribute will affect all records using it
            </p>
            <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={onCancel}
                className="px-6 h-11 rounded-xl border-2 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!isFormValid}
                className="px-8 h-11 rounded-xl text-white border-none flex items-center gap-2"
                style={{
                  background: isFormValid ? 'linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #EA580C 100%)' : '#9CA3AF',
                  boxShadow: isFormValid ? '0 10px 15px -3px rgba(217, 119, 6, 0.4)' : 'none',
                  opacity: isFormValid ? 1 : 0.5,
                  cursor: isFormValid ? 'pointer' : 'not-allowed'
                }}
              >
                <Edit2 className="w-5 h-5" />
                Update Attribute
              </Button>
            </div>
          </div>
        </CustomDialogFooter>
      </div>
    </CustomDialog>
  );
}
