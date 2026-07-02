import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CustomDialog({ open, onOpenChange, children, className = '', style }: CustomDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={() => onOpenChange(false)}
    >
      <div 
        ref={dialogRef}
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
          margin: '0 16px',
          ...style
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

interface CustomDialogHeaderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClose?: () => void;
}

export function CustomDialogHeader({ children, style, onClose }: CustomDialogHeaderProps) {
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
            WebkitBackdropFilter: 'blur(4px)',
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

interface CustomDialogTitleProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CustomDialogTitle({ children, style }: CustomDialogTitleProps) {
  return <div style={style}>{children}</div>;
}

interface CustomDialogFooterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CustomDialogFooter({ children, style }: CustomDialogFooterProps) {
  return <div style={style}>{children}</div>;
}
