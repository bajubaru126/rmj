import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onLoginSuccess: (email: string) => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onLoginSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    if (!email.includes('@')) {
      setError('Format email tidak valid');
      return;
    }

    setIsLoading(true);

    try {
      // Call the real authentication API
      await login({ email, password });
      
      // On success, navigate to dashboard
      navigate('/dashboard');
      onLoginSuccess(email);
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.';
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

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '450px',
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
              src="/logo-login.jpg" 
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
              }}>Selamat Datang</h2>
              <p style={{
                color: '#6B7280',
                fontSize: '12px'
              }}>Silakan masuk ke akun Anda</p>
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
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            {/* Email Input */}
            <div style={{ marginBottom: '16px' }}>
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
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  paddingLeft: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <Mail style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
                </div>
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
                    e.target.style.borderColor = '#005EB8';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 94, 184, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '16px' }}>
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
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  paddingLeft: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <Lock style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '48px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#005EB8';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 94, 184, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    paddingRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
                  ) : (
                    <Eye style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ marginLeft: '8px', color: '#6B7280' }}>Ingat saya</span>
              </label>
              <a 
                href="#" 
                style={{
                  color: '#005EB8',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#003A70'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#005EB8'}
              >
                Lupa password?
              </a>
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
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 58, 112, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg 
                    style={{
                      animation: 'spin 1s linear infinite',
                      marginRight: '12px',
                      width: '20px',
                      height: '20px'
                    }} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>

            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>

            {/* Divider */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{ width: '100%', borderTop: '1px solid #D1D5DB' }}></div>
              </div>
              <div style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                <span style={{
                  padding: '0 8px',
                  background: 'white',
                  color: '#6B7280'
                }}>atau</span>
              </div>
            </div>

            {/* SSO Button */}
            <button
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                background: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              disabled={isLoading}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Masuk dengan Google
            </button>

            {/* Switch to Register */}
            {onSwitchToRegister && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <p style={{ color: '#6B7280', fontSize: '14px' }}>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
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
                    Daftar di sini
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Help Text */}
        <p style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          Butuh bantuan?{' '}
          <a 
            href="#" 
            style={{
              fontWeight: '600',
              color: 'white',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Hubungi Support
          </a>
        </p>

        {/* API URL Display */}
        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '8px 16px',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: '500' }}>API URL:</div>
          <div style={{ 
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.9)',
            wordBreak: 'break-all'
          }}>
            {import.meta.env.VITE_API_URL || 'Not configured'}
          </div>
        </div>
      </div>
    </div>
  );
}
