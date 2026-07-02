import React, { useState, CSSProperties, ReactNode } from 'react';
import { Plus, X } from 'lucide-react';

// Type Definitions
interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

interface CustomDialogHeaderProps {
  children: ReactNode;
  style?: CSSProperties;
  onClose?: () => void;
}

interface CustomDialogTitleProps {
  children: ReactNode;
  style?: CSSProperties;
}

interface CustomDialogFooterProps {
  children: ReactNode;
  style?: CSSProperties;
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  style?: CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface InputProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  style?: CSSProperties;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLInputElement>) => void;
  required?: boolean;
}

interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  style?: CSSProperties;
}

// Custom Dialog Components with proper styling
function CustomDialog({ open, onOpenChange, children, className }: CustomDialogProps) {
  if (!open) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={() => onOpenChange(false)}
    >
      <div 
        className={className}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '900px',
          margin: '0 16px'
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CustomDialogHeader({ children, style, onClose }: CustomDialogHeaderProps) {
  return (
    <div style={{ ...style, position: 'relative' }}>
      {children}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(4px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

function CustomDialogTitle({ children, style }: CustomDialogTitleProps) {
  return <div style={style}>{children}</div>;
}

function CustomDialogFooter({ children, style }: CustomDialogFooterProps) {
  return <div style={style}>{children}</div>;
}

function Button({ children, onClick, disabled, variant, style, onMouseEnter, onMouseLeave }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  );
}

function Input({ id, value, onChange, placeholder, style, onFocus, onBlur, onMouseEnter, onMouseLeave, required }: InputProps) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      required={required}
    />
  );
}

function Label({ htmlFor, children, style }: LabelProps) {
  return <label htmlFor={htmlFor} style={style}>{children}</label>;
}

// Main Component
export default function AddNewIssueDemo() {
  const [open, setOpen] = useState(true);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    ruas: '',
    segmentasi: '',
    priority: 'Medium',
    status: 'Open'
  });

  const isFormValid = formData.type && formData.description && formData.ruas;

  const handleSubmit = () => {
    if (isFormValid) {
      alert('Issue created successfully!');
      console.log('Form Data:', formData);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <div style={{ padding: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '16px 32px',
          background: 'white',
          color: '#667eea',
          borderRadius: '12px',
          border: 'none',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: open ? 'none' : 'block'
        }}
      >
        Open Modal
      </button>

      <CustomDialog open={open} onOpenChange={setOpen}>
        {/* Header with Enhanced Gradient */}
        <CustomDialogHeader 
          style={{
            background: 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 50%, #4F46E5 100%)',
            padding: '32px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onClose={handleCancel}
        >
          <CustomDialogTitle style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', paddingRight: '48px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(255, 255, 255, 0.3)',
              transition: 'transform 0.2s'
            }}>
              <Plus style={{ width: '32px', height: '32px', color: 'white', filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.04))' }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '-0.02em' }}>Create New Issue</div>
              <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#BFDBFE', marginTop: '6px', letterSpacing: '0.025em' }}>Add a new issue to track and resolve</div>
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>

        {/* Scrollable Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Issue Classification */}
            <div style={{
              background: 'linear-gradient(135deg, #EFF6FF 0%, #E0E7FF 50%, #EFF6FF 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'box-shadow 0.3s'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>1</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #2563EB 0%, #4F46E5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Issue Classification</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="type" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Issue Type <span style={{ color: '#EF4444' }}>*</span>
                  </Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="">Select Issue Type</option>
                    <option value="Route Change">🛣️ Route Change</option>
                    <option value="Material Delay">📦 Material Delay</option>
                    <option value="Quality Issue">⚠️ Quality Issue</option>
                    <option value="Permit Issue">📋 Permit Issue</option>
                    <option value="Resource Issue">👥 Resource Issue</option>
                    <option value="Safety Issue">🛡️ Safety Issue</option>
                    <option value="Technical Issue">🔧 Technical Issue</option>
                    <option value="Documentation">📄 Documentation</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="priority" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Priority <span style={{ color: '#EF4444' }}>*</span>
                  </Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="High">🔴 High - Urgent</option>
                    <option value="Medium">🟡 Medium - Normal</option>
                    <option value="Low">🟢 Low - Minor</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div style={{
              background: 'linear-gradient(135deg, #FAF5FF 0%, #FCE7F3 50%, #FAF5FF 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid rgba(168, 85, 247, 0.2)',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'box-shadow 0.3s'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>2</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #9333EA 0%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Location Details</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="ruas" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Ruas <span style={{ color: '#EF4444' }}>*</span>
                  </Label>
                  <Input
                    id="ruas"
                    value={formData.ruas}
                    onChange={(e) => setFormData({ ...formData, ruas: e.target.value })}
                    placeholder="e.g., SS-JKT-001"
                    style={{
                      height: '44px',
                      padding: '0 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="segmentasi" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Segmentasi <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 'normal' }}>(Optional)</span>
                  </Label>
                  <Input
                    id="segmentasi"
                    value={formData.segmentasi}
                    onChange={(e) => setFormData({ ...formData, segmentasi: e.target.value })}
                    placeholder="e.g., SEG-A"
                    style={{
                      height: '44px',
                      padding: '0 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Issue Details */}
            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 50%, #F0FDF4 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid rgba(34, 197, 94, 0.2)',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'box-shadow 0.3s'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>3</span>
                </div>
                <span style={{
                  background: 'linear-gradient(90deg, #16A34A 0%, #10B981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Issue Details</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="status" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Status <span style={{ color: '#EF4444' }}>*</span>
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Open">🔴 Open</option>
                    <option value="In Progress">🟡 In Progress</option>
                    <option value="Resolved">🟢 Resolved</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Label htmlFor="description" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Description <span style={{ color: '#EF4444' }}>*</span>
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the issue in detail...&#10;&#10;Include:&#10;• What happened?&#10;• When did it occur?&#10;• Impact assessment"
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #D1D5DB',
                      borderRadius: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      background: 'white',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                    required
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{formData.description.length} characters</p>
                    {formData.description.length > 500 && (
                      <p style={{ fontSize: '12px', color: '#D97706' }}>⚠️ Consider keeping it concise</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <CustomDialogFooter style={{
          borderTop: '1px solid #E5E7EB',
          background: 'linear-gradient(90deg, #F9FAFB 0%, #F1F5F9 100%)',
          padding: '20px 32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <p style={{ fontSize: '14px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                background: '#EF4444',
                borderRadius: '50%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></span>
              Fields marked with <span style={{ color: '#EF4444', fontWeight: 600 }}>*</span> are required
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                style={{
                  padding: '12px 24px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '2px solid #D1D5DB',
                  background: 'white',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid}
                style={{
                  background: isFormValid ? 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 50%, #4F46E5 100%)' : '#9CA3AF',
                  color: 'white',
                  padding: '12px 32px',
                  height: '44px',
                  borderRadius: '12px',
                  boxShadow: isFormValid ? '0 10px 15px -3px rgba(37, 99, 235, 0.4)' : 'none',
                  opacity: isFormValid ? 1 : 0.5,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (isFormValid) {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #1D4ED8 0%, #1E40AF 50%, #4338CA 100%)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isFormValid) {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 50%, #4F46E5 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <Plus style={{ width: '20px', height: '20px' }} />
                Create Issue
              </Button>
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: .5;
              }
            }
          `}</style>
        </CustomDialogFooter>
      </CustomDialog>
    </div>
  );
}