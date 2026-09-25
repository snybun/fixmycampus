import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { loginUser, loginWithGoogle, fetchGoogleConfig } from '../../services/api';
import './auth.css';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [loginInput, setLoginInput] = useState('');
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
  const [googleIframeRendered, setGoogleIframeRendered] = useState(false);

  const googleBtnRef = useRef(null);

  // 1. Fetch configured Client ID from backend or localStorage on mount
  useEffect(() => {
    const savedLocalId = localStorage.getItem('fmc_google_client_id') || '';

    fetchGoogleConfig().then((cfg) => {
      const activeDomain = cfg?.allowed_domain || 'phinmaed.com';
      setAllowedDomain(activeDomain);

      const activeId = cfg?.client_id || savedLocalId || '';
      if (activeId) {
        setClientId(activeId);
        setTempClientId(activeId);
      }
    });
  }, []);

  // 2. Initialize and render Google Identity Services whenever clientId or allowedDomain changes
  useEffect(() => {
    if (!clientId) return;

    let timer = null;
    let attempts = 0;

    const renderGoogleGsi = () => {
      attempts++;
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            hosted_domain: allowedDomain,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 380,
          });

          // Check if Google successfully injected an iframe / content
          setTimeout(() => {
            if (googleBtnRef.current && googleBtnRef.current.children.length > 0) {
              setGoogleIframeRendered(true);
            }
          }, 350);
          return;
        } catch (err) {
          console.warn('GIS render error:', err);
        }
      }

      if (attempts < 25) {
        timer = setTimeout(renderGoogleGsi, 200);
      }
    };

    renderGoogleGsi();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [clientId, allowedDomain]);

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const trimmed = tempClientId.trim();
    if (!trimmed) return;
    localStorage.setItem('fmc_google_client_id', trimmed);
    setClientId(trimmed);
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
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          onNavigate('dashboard');
        }
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

    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is unavailable or blocked by browser extensions (e.g. ad blocker, Brave Shields). Please allow accounts.google.com to continue.');
      return;
    }

    if (!clientId) {
      setError('Google Client ID is not configured. Please enter your OAuth Client ID below.');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        hosted_domain: allowedDomain,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason() || 'not_displayed';
          console.warn('Google One Tap not displayed:', reason);
          if (reason === 'opt_out_or_no_session') {
            setError(`Please ensure you are signed into your @${allowedDomain} account in this browser, or click below.`);
          } else if (reason === 'suppressed_by_user') {
            setError('Google prompt was dismissed recently. Please wait a moment or clear site data.');
          } else {
            setError(`Google Sign-In prompt status: ${reason}. Ensure http://localhost:8080 is added to Authorized JavaScript Origins in Google Cloud Console.`);
          }
        }
      });
    } catch (e) {
      console.error('Google prompt trigger error:', e);
      setError('Error initiating Google sign-in.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!loginInput || !password) {
      setError('Please fill in both Email / ID and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email: loginInput, password, remember: rememberMe });
      if (res.success) {
        setSuccessMsg(`Welcome back, ${res.user?.full_name || 'User'}! Authentication successful.`);
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          onNavigate('dashboard');
        }
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Connection error. Please ensure Docker backend is running.');
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
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}
              >
                <span>PHINMA University of Pangasinan Only</span>
              </div>
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">
                Facility Defect and Maintenance Reporting System
              </p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} className="auth-alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert auth-alert-success" role="status">
                <CheckCircle2 size={18} className="auth-alert-icon" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Institutional Domain Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.9rem',
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
                color: '#1e40af',
                lineHeight: 1.4,
              }}
            >
              <ShieldCheck size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span>
                This system is exclusively for <strong>PHINMA University of Pangasinan</strong>. Please sign in with your official <strong>@{allowedDomain}</strong> institutional account.
              </span>
            </div>

            {/* Official Google GIS Button Container */}
            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
              {/* Google's official rendered button iframe container */}
              <div
                ref={googleBtnRef}
                style={{
                  display: googleIframeRendered ? 'flex' : 'none',
                  justifyContent: 'center',
                  minHeight: '44px',
                  width: '100%',
                }}
              />

              {/* Styled Fallback Button: ALWAYS visible if Google iframe isn't injected yet */}
              {!googleIframeRendered && (
                <button
                  type="button"
                  className="auth-google-btn"
                  onClick={handleTriggerGooglePrompt}
                  disabled={googleLoading}
                  style={{ width: '100%' }}
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
                    {googleLoading ? 'Connecting to Google...' : `Sign in with Google (@${allowedDomain})`}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Client ID Config Drawer (Collapsible) */}
            {!clientId && (
              <form onSubmit={handleSaveClientId} style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
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
                    <span>Enter Google OAuth Client ID for Testing</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    Paste your Google Cloud Console Client ID to enable instant GIS One Tap &amp; Google Button.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                      value={tempClientId}
                      onChange={(e) => setTempClientId(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', height: 'auto' }}
                    />
                    <button
                      type="submit"
                      className="auth-submit-btn"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.75rem',
                        width: 'auto',
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
              {/* Email Address or Identifier */}
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email Address or Student / Employee ID <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-email"
                    type="text"
                    className="auth-input"
                    placeholder="yourname.up@phinmaed.com"
                    autoComplete="off"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
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
                    autoComplete="new-password"
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
