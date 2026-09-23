import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [googleConfig, setGoogleConfig] = useState({ client_id: '', allowed_domain: 'phinmaed.com' });
  const [showDemoOAuth, setShowDemoOAuth] = useState(false);

  useEffect(() => {
    fetchGoogleConfig().then((cfg) => {
      if (cfg && cfg.success) {
        setGoogleConfig(cfg);
        if (cfg.client_id && window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: cfg.client_id,
              callback: handleGoogleResponse,
              hosted_domain: cfg.allowed_domain || 'phinmaed.com',
            });
            window.google.accounts.id.renderButton(
              document.getElementById('google-register-btn-rendered'),
              { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
            );
          } catch (e) {
            console.warn('GIS error on register:', e);
          }
        }
      }
    });
  }, []);

  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle({ credential: response.credential });
      if (res.success) {
        setSuccessMsg(`Welcome, ${res.user?.full_name}! Account created & verified via @${googleConfig.allowed_domain}`);
        setTimeout(() => {
          alert(`Successfully signed up via Google: ${res.user?.full_name}`);
          onNavigate('landing');
        }, 900);
      } else {
        setError(res.message || 'Google registration failed.');
      }
    } catch (err) {
      setError('Unable to complete Google registration.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMockGoogleLogin = async (mockEmail) => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithGoogle({ mockEmail });
      if (res.success) {
        setSuccessMsg(`Account created for ${res.user?.full_name}! Verified via @${googleConfig.allowed_domain}`);
        setTimeout(() => {
          alert(`Registered with @${googleConfig.allowed_domain}: ${res.user?.email}`);
          onNavigate('landing');
        }, 900);
      } else {
        setError(res.message || 'Google registration failed.');
      }
    } catch (err) {
      setError('Connection error during Google authentication.');
    } finally {
      setGoogleLoading(false);
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
    const allowed = googleConfig.allowed_domain || 'phinmaed.com';
    if (!formData.email.toLowerCase().endsWith(`@${allowed}`)) {
      setError(`Access Restricted: Registration requires an official @${allowed} institutional email.`);
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
              <strong>Institutional Registration:</strong> Open exclusively to verified{' '}
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

          {/* Google 1-Click Fast Registration */}
          <div id="google-register-btn-rendered" style={{ marginBottom: googleConfig.client_id ? '0.75rem' : '0' }}></div>

          <button
            type="button"
            className="auth-google-btn"
            onClick={() => {
              if (googleConfig.client_id && window.google?.accounts?.id) {
                window.google.accounts.id.prompt();
              } else {
                setShowDemoOAuth(true);
              }
            }}
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
            <span>{googleLoading ? 'Setting up account...' : 'Instant Sign up with Google (@phinmaed.com)'}</span>
          </button>

          {/* Quick Test Bar for Development */}
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
                  Click to test instant registration and domain restriction:
                </p>
                <div className="auth-demo-chips">
                  <button
                    type="button"
                    className="auth-chip"
                    onClick={() => handleMockGoogleLogin('new.student.up@phinmaed.com')}
                  >
                    ✓ new.student.up@phinmaed.com
                  </button>
                  <button
                    type="button"
                    className="auth-chip auth-chip-invalid"
                    onClick={() => handleMockGoogleLogin('someone.unauthorized@yahoo.com')}
                  >
                    ✕ someone.unauthorized@yahoo.com (Blocked)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="auth-divider">
            <span>or register with manual details</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Student/Faculty ID & Full Name in two columns */}
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

            {/* Email Address */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">
                Institutional Email Address <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="your.name.up@phinmaed.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                Must be an official @{googleConfig.allowed_domain} address.
              </span>
            </div>

            {/* Academic Department */}
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

            {/* Password & Confirm Password */}
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
