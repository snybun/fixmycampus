import React, { useState } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginUser } from '../../services/api';
import './auth.css';

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('mafe.cerna.up@phinmaed.com');
  const [password, setPassword] = useState('renebaterbonians99');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
          // If we had a dashboard or report defect page, navigate there
          alert(`Logged in successfully as ${res.user?.full_name || email}`);
        }, 800);
      } else {
        // Provide friendly fallback for demo environment
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
            {/* Email Address */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">
                Email Address <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  placeholder="mafe.cerna.up@phinmaed.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
