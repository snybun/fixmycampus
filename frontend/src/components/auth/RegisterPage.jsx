import React, { useState } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser } from '../../services/api';
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
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
            {/* Student / Employee ID */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-id">
                Student / Employee ID <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="register-id"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. 03-01-2526-00000"
                  value={formData.identifier}
                  onChange={(e) => handleChange('identifier', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Full Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-name">
                Full Name <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="register-name"
                  type="text"
                  className="auth-input"
                  placeholder="Mark Dyvie Cerna"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-email">
                Email Address <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="register-email"
                  type="email"
                  className="auth-input"
                  placeholder="mafe.cerna.up@phinmaed.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Department */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-dept">
                Department <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <select
                  id="register-dept"
                  className="auth-select"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  required
                >
                  <option value="" disabled>Select your department</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-password">
                Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="register-password"
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

            {/* Confirm Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-confirm-password">
                Confirm Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input auth-input-has-toggle"
                  placeholder="Repeat password"
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

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Switch to Login */}
          <div className="auth-footer-prompt">
            Already have an account?
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => onNavigate('login')}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
