import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { loginUser, loginWithGoogle, fetchGoogleConfig } from '../../services/api';
import './auth.css';

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [clientId, setClientId] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('phinmaed.com');
  const [tempClientId, setTempClientId] = useState('');
  const [gisLoaded, setGisLoaded] = useState(false);

  const googleBtnRef = useRef(null);

  // Initialize GIS once client ID and window.google are ready
  const initGis = (activeClientId) => {
    if (!activeClientId) return;
    if (!window.google?.accounts?.id) {
      // Retry in 300ms if script is still downloading
      setTimeout(() => initGis(activeClientId), 300);
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: activeClientId,
        callback: handleGoogleCredentialResponse,
        hosted_domain: allowedDomain,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 380,
        });
      }
      setGisLoaded(true);
    } catch (err) {
      console.warn('Google Identity Services initialization failed:', err);
    }
  };

  useEffect(() => {
    // 1. Fetch configured Client ID from backend or localStorage
    const savedLocalId = localStorage.getItem('fmc_google_client_id') || '';

    fetchGoogleConfig().then((cfg) => {
      const activeDomain = cfg?.allowed_domain || 'phinmaed.com';
      setAllowedDomain(activeDomain);

      const activeId = cfg?.client_id || savedLocalId || '';
      if (activeId) {
        setClientId(activeId);
        setTempClientId(activeId);
        initGis(activeId);
      }
    });
  }, []);

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const trimmed = tempClientId.trim();
    if (!trimmed) return;
    localStorage.setItem('fmc_google_client_id', trimmed);
    setClientId(trimmed);
    initGis(trimmed);
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setError('No credential received from Google.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle({ credential: response.credential });
      if (res.success) {
        setSuccessMsg(`Welcome, ${res.user?.full_name}! Verified institutional account (@${allowedDomain}).`);
        setTimeout(() => {
          onNavigate('landing');
        }, 1000);
      } else {
        setError(res.message || 'Google authentication failed.');
      }
    } catch (err) {
      setError('Unable to verify Google login token with server.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTriggerGooglePrompt = () => {
    setError('');
    setSuccessMsg('');

    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Client ID is not configured. Please enter your OAuth Client ID below.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email, password, remember: rememberMe });
      if (res.success) {
        setSuccessMsg(`Welcome back, ${res.user?.full_name || 'User'}! Redirecting...`);
        setTimeout(() => {
          onNavigate('landing');
        }, 800);
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-container">
        {/* Left Column: Form */}
        <div className="auth-split-left">
          <div className="auth-form-inner">
            <button
              type="button"
              className="auth-brand"
              onClick={() => onNavigate('landing')}
              title="Return to FixMyCampus Homepage"
            >
              <div className="auth-brand-icon">
                <Wrench size={19} />
              </div>
              <span className="auth-brand-name">FixMyCampus</span>
            </button>

            <div className="auth-header">
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">
                Log in to report and track facility issues across campus.
              </p>
            </div>

            {/* Institutional Notice */}
            <div className="auth-domain-banner">
              <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong>PHINMA Institutional Access:</strong> Google OAuth strictly permits active{' '}
                <span className="auth-domain-tag">@{allowedDomain}</span> accounts.
              </div>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert auth-alert-success" style={{ marginBottom: '1.25rem' }}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Identity Services Official Render Container */}
            <div
              ref={googleBtnRef}
              style={{
                display: gisLoaded ? 'flex' : 'none',
                justifyContent: 'center',
                marginBottom: '1rem',
                width: '100%',
              }}
            />

            {/* Custom Google OAuth button if GIS button not yet rendered */}
            {!gisLoaded && (
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleTriggerGooglePrompt}
                disabled={googleLoading}
              >
                <svg className="google-icon-svg" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>
                  {googleLoading ? 'Verifying account...' : `Sign in with Google (@${allowedDomain})`}
                </span>
              </button>
            )}

            {/* If Client ID is missing, provide a friendly setup box */}
            {!clientId && (
              <form onSubmit={handleSaveClientId} style={{ marginTop: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <KeyRound size={15} />
                    <span>Connect Google OAuth Client ID</span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.75rem', lineHeight: '1.4' }}>
                    Enter your Web Client ID from Google Cloud Console (or add <code>GOOGLE_CLIENT_ID</code> in <code>.env</code>):
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                      value={tempClientId}
                      onChange={(e) => setTempClientId(e.target.value)}
                      style={{ height: '36px', fontSize: '0.75rem' }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 0.85rem',
                        height: '36px',
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Divider */}
            <div className="auth-divider">
              <span>or sign in with password</span>
            </div>

            {/* Password Login Form */}
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email Address <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input"
                    placeholder="user@phinmaed.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">
                  Password <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input auth-input-has-toggle"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember Me</span>
                </label>

                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => onNavigate('forgot-password')}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-footer-prompt">
              Don't have an account?
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => onNavigate('register')}
              >
                Register
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Campus Courtyard Image */}
        <div className="auth-split-right">
          <div className="auth-image-frame">
            <img
              src="/images/campus_courtyard.jpg"
              alt="University campus academic building and courtyard"
            />
            <div className="auth-image-tint" />
          </div>
        </div>
      </div>
    </div>
  );
}
