import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function UserMenu() {
  const { user, logout, isLoggedIn } = useAuth();

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* User Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingRight: '12px',
        borderRight: '1px solid #E5E7EB'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #003A70 0%, #005EB8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <User size={18} />
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#111827',
            lineHeight: '1.2'
          }}>
            {user.username}
          </span>
          <span style={{
            fontSize: '12px',
            color: '#6B7280',
            lineHeight: '1.2'
          }}>
            {user.email}
          </span>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={logout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          color: '#EF4444',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FEF2F2';
          e.currentTarget.style.borderColor = '#FECACA';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#E5E7EB';
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}

// Alternative compact version
export function UserMenuCompact() {
  const { user, logout, isLoggedIn } = useAuth();

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{
        fontSize: '14px',
        color: '#374151'
      }}>
        {user.username}
      </span>
      <button
        onClick={logout}
        title="Logout"
        style={{
          padding: '6px',
          background: 'transparent',
          border: 'none',
          color: '#EF4444',
          cursor: 'pointer',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FEF2F2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
