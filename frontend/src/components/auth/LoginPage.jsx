import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [googleConfig, setGoogleConfig] = useState({ client_id: '', allowed_domain: 'phinmaed.com' });
  const [showDemoOAuth, setShowDemoOAuth] = useState(false);

  useEffect(() => {
    // Fetch active Google OAuth config from backend
    fetchGoogleConfig().then((cfg) => {
      if (cfg && cfg.success) {
        setGoogleConfig(cfg);
        // If client_id is configured and GIS is available in window
        if (cfg.client_id && window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: cfg.client_id,
              callback: handleGoogleCredentialResponse,
              hosted_domain: cfg.allowed_domain || 'phinmaed.com',
            });
            window.google.accounts.id.renderButton(
              document.getElementById('google-btn-rendered'),
              { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
            );
          } catch (e) {
            console.warn('GIS initialization error:', e);
          }
        }
      }
    });
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle({ credential: response.credential });
      if (res.success) {
        setSuccessMsg(`Welcome, ${res.user?.full_name || 'Student'}! Verified via @${googleConfig.allowed_domain}`);
        setTimeout(() => {
          alert(`Successfully signed in via Google: ${res.user?.full_name} (${res.user?.email})`);
          onNavigate('landing');
        }, 900);
      } else {
        setError(res.message || 'Google authentication failed.');
      }
    } catch (err) {
      setError('Unable to verify Google login. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError('');
    setSuccessMsg('');

    if (googleConfig.client_id && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // In local dev without Google Client ID in .env, expand the quick-test tool
      setShowDemoOAuth(true);
    }
  };

  const handleMockGoogleLogin = async (mockEmail) => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle({ mockEmail });
      if (res.success) {
        setSuccessMsg(`Welcome back, ${res.user?.full_name || 'Student'}! Authenticated with @${googleConfig.allowed_domain}`);
        setTimeout(() => {
          alert(`Successfully signed in with ${res.user?.email} (${res.user?.department || 'PHINMA Education'})`);
          onNavigate('landing');
        }, 900);
      } else {
        setError(res.message || 'Google authentication failed.');
      }
    } catch (err) {
      setError('Connection error during Google authentication.');
    } finally {
      setGoogleLoading(false);
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
          alert(`Logged in successfully as ${res.user?.full_name || email}`);
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

            {/* Institutional Restriction Notice Banner */}
            <div className="auth-domain-banner">
              <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong>PHINMA Institutional Access:</strong> Google OAuth strictly permits active{' '}
                <span className="auth-domain-tag">@{googleConfig.allowed_domain}</span> accounts.
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

            {/* Google OAuth Button */}
            <div id="google-btn-rendered" style={{ marginBottom: googleConfig.client_id ? '0.75rem' : '0' }}></div>
            
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleClick}
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
              <span>{googleLoading ? 'Verifying account...' : 'Sign in with Google (@phinmaed.com)'}</span>
            </button>

            {/* Quick Test Bar for Development & Testing */}
            <div className="auth-demo-oauth-box">
              <div
                className="auth-demo-oauth-header"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowDemoOAuth(!showDemoOAuth)}
              >
                <span>🧪 Quick Test Accounts</span>
                {showDemoOAuth ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showDemoOAuth && (
                <div>
                  <p style={{ margin: '0.25rem 0 0.5rem', color: '#64748b' }}>
                    Click an address to test Google verification &amp; domain restriction:
                  </p>
                  <div className="auth-demo-chips">
                    <button
                      type="button"
                      className="auth-chip"
                      title="Test valid PHINMA student account"
                      onClick={() => handleMockGoogleLogin('rendil.robosa.up@phinmaed.com')}
                    >
                      ✓ rendil.robosa.up@phinmaed.com
                    </button>
                    <button
                      type="button"
                      className="auth-chip"
                      title="Test valid PHINMA faculty account"
                      onClick={() => handleMockGoogleLogin('prof.delacruz.up@phinmaed.com')}
                    >
                      ✓ prof.delacruz.up@phinmaed.com
                    </button>
                    <button
                      type="button"
                      className="auth-chip auth-chip-invalid"
                      title="Test rejection of personal Gmail"
                      onClick={() => handleMockGoogleLogin('student.test@gmail.com')}
                    >
                      ✕ student.test@gmail.com (Blocked)
                    </button>
                  </div>
                </div>
              )}
            </div>

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
