import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Briefcase, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { vendorService, type Vendor } from '@/services/vendorService';
import logoLogin from '/logo-login.jpg';

interface RegisterFormProps {
  onRegisterSuccess: (email: string) => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onRegisterSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('teknisi_lapangan');
  const [vendorId, setVendorId] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoadingVendors(true);
      try {
        // Try to fetch vendors - will fail if not authenticated, that's ok
        const vendorList = await vendorService.getAllVendors();
        setVendors(vendorList);
        console.log('✅ Vendors loaded:', vendorList.length);
      } catch (err) {
        console.log('ℹ️ Could not fetch vendors (user not authenticated):', err);
        // Don't show error to user, just log it
        // Vendors will be empty, which is fine for registration
        setVendors([]);
      } finally {
        setIsLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (!email.includes('@')) {
      setError('Format email tidak valid');
      return;
    }

    if (username.length < 3) {
      setError('Username minimal 3 karakter');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      await register({ 
        email, 
        username, 
        password,
        role,
        vendor_id: vendorId || undefined
      });
      navigate('/dashboard');
      onRegisterSuccess(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registrasi gagal. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #003A70 0%, #005EB8 50%, #0074D9 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '384px',
          height: '384px',
          background: 'white',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '384px',
          height: '384px',
          background: 'white',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }}></div>
      </div>

      {/* Register Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '700px',
        margin: '0 16px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'white',
            padding: '24px 32px',
            textAlign: 'center',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <img 
              src={logoLogin} 
              alt="RMJ Manager Logo" 
              style={{
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '100px',
                margin: '0 auto',
                display: 'block'
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '20px 32px 24px 32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '4px'
              }}>Daftar Akun Baru</h2>
              <p style={{
                color: '#6B7280',
                fontSize: '12px'
              }}>Buat akun untuk mengakses sistem</p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            {/* Two Column Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Email Input */}
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="nama@telkom.co.id"
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label htmlFor="username" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="username"
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Role Select */}
              <div>
                <label htmlFor="role" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Role
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    zIndex: 1
                  }} />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%239CA3AF\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                    }}
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="teknisi_lapangan">Teknisi Lapangan</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Vendor Select */}
              <div>
                <label htmlFor="vendor" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Vendor <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Opsional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    zIndex: 1
                  }} />
                  <select
                    id="vendor"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: vendorId ? '#111827' : '#9CA3AF',
                      outline: 'none',
                      transition: 'all 0.2s',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%239CA3AF\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center'
                    }}
                    disabled={isLoading || isLoadingVendors}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Pilih Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id.replace('vendor:', '')}>
                        {vendor.name} ({vendor.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    zIndex: 1
                  }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="Minimal 6 karakter"
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9CA3AF',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Konfirmasi Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={20} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    zIndex: 1
                  }} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="Ulangi password"
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9CA3AF',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #003A70 0%, #005EB8 100%)',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 94, 184, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <div className="spinner" style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Mendaftar...
                </div>
              ) : (
                'Daftar'
              )}
            </button>

            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>

            {/* Switch to Login */}
            <div style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#005EB8',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                Masuk di sini
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
