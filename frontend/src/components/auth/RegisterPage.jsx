import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { registerUser, loginWithGoogle, fetchGoogleConfig } from '../../services/api';
import './auth.css';

export default function RegisterPage({ onNavigate }) {
  const [formData, setFormData] = useState({
    identifier: '',
    fullName: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [clientId, setClientId] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('phinmaed.com');
  const [tempClientId, setTempClientId] = useState('');
  const [googleIframeRendered, setGoogleIframeRendered] = useState(false);

  const googleBtnRef = useRef(null);

  // 1. Fetch configured Client ID on mount
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
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signup_with',
            logo_alignment: 'left',
            width: 380,
          });

          setTimeout(() => {
            if (googleBtnRef.current && googleBtnRef.current.children.length > 0) {
              setGoogleIframeRendered(true);
            }
          }, 350);
          return;
        } catch (err) {
          console.warn('GIS error on register:', err);
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
        setSuccessMsg(`Welcome, ${res.user?.full_name}! Institutional account verified (@${allowedDomain}).`);
        setTimeout(() => {
          onNavigate('landing');
        }, 1000);
      } else {
        setError(res.message || 'Google registration failed.');
      }
    } catch (err) {
      setError('Unable to verify Google credential token with server.');
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

    if (clientId) {
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
            const reason = notification.getNotDisplayedReason();
            setError(`Google prompt not displayed (${reason || 'restricted by browser'}). Please check third-party cookies or browser popup permissions.`);
          }
        });
      } catch (err) {
        setError('Error initiating Google Sign-In.');
      }
    } else {
      setError('Google Client ID is not configured. Please enter your OAuth Client ID below.');
    }
  };

  const departments = [
    'College of Engineering & Technology',
    'College of Computer Studies / IT',
    'College of Arts & Sciences',
    'College of Business & Accountancy',
    'College of Education',
    'Facilities Management & Physical Plant',
    'General Campus Administration',
    'Student Affairs Office',
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (
      !formData.identifier ||
      !formData.fullName ||
      !formData.email ||
      !formData.department ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    // STRICT DOMAIN RESTRICTION CHECK
    if (!formData.email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      setError(`Access Restricted: Registration requires an official @${allowedDomain} institutional email.`);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(formData);
      if (res.success) {
        setSuccessMsg('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          onNavigate('login');
        }, 1200);
      } else {
        setError(res.message || 'Failed to create account.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-centered-wrapper">
        <div className="auth-centered-card">
          {/* Brand Header Centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
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
          </div>

          <div className="auth-header" style={{ textAlign: 'center', marginTop: 0 }}>
            <h1 className="auth-title">Create Your Account</h1>
            <p className="auth-subtitle">
              Join our community effort to maintain a safe, clean campus.
            </p>
          </div>

          {/* Institutional Notice */}
          <div className="auth-domain-banner">
            <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div>
              <strong>Exclusively for PHINMA University of Pangasinan:</strong> Registration is open only to verified{' '}
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
              display: googleIframeRendered ? 'flex' : 'none',
              justifyContent: 'center',
              marginBottom: '1rem',
              width: '100%',
              minHeight: '44px',
            }}
          />

          {!googleIframeRendered && (
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
                {googleLoading ? 'Setting up account...' : `Instant Sign up with Google (@${allowedDomain})`}
              </span>
            </button>
          )}

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

          <div className="auth-divider">
            <span>or register with manual details</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-identifier">
                  Student / Employee ID <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-identifier"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. 02-2324-00123"
                    value={formData.identifier}
                    onChange={(e) => handleChange('identifier', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-name">
                  Full Name <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Juan Dela Cruz"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">
                Institutional Email Address <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="yourname.up@phinmaed.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                Must be an official @{allowedDomain} address.
              </span>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-dept">
                Academic Unit / Department <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <select
                  id="reg-dept"
                  className="auth-select"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  required
                >
                  <option value="">Select your department or college</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-password">
                  Password <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input auth-input-has-toggle"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
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

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-confirm-password">
                  Confirm Password <span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input auth-input-has-toggle"
                    placeholder="Re-type password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              style={{ marginTop: '0.75rem' }}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="auth-footer-prompt" style={{ justifyContent: 'center', marginTop: '1.75rem' }}>
            Already have an account?
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => onNavigate('login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
