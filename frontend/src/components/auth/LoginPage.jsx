import React, { useState } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginUser } from '../../services/api';
import './auth.css';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFillDemo = (demoEmail, demoPass) => {
    setLoginInput(demoEmail);
    setPassword(demoPass);
    setError('');
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
        }
        setTimeout(() => {
          onNavigate('landing');
        }, 1000);
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
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">
                Log in to report and track facility issues on your campus.
              </p>
            </div>

            {/* Responsive photo banner for tablet/mobile viewports */}
            <div className="auth-mobile-photo">
              <div className="auth-image-frame">
                <img
                  src="/images/campus_courtyard.jpg"
                  alt="University campus academic building and courtyard"
                />
                <div className="auth-image-tint" />
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
                    placeholder="e.g. student.alex@fixmycampus.edu or STU-202401"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
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

              {/* Options Row: Remember Me & Forgot Password */}
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

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Quick Demo Test Credential Helpers */}
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-subtle, #e2e8f0)', fontSize: '0.78rem', color: '#64748b' }}>
              <div style={{ marginBottom: '0.35rem', fontWeight: 600 }}>Quick Test Accounts:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleFillDemo('student.alex@fixmycampus.edu', 'Student@1234')}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#334155' }}
                >
                  Student (Alex)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin@fixmycampus.edu', 'Admin@1234')}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#334155' }}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('worker.john@fixmycampus.edu', 'Worker@1234')}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#334155' }}
                >
                  Technician (John)
                </button>
              </div>
            </div>

            {/* Footer Switch to Register */}
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
