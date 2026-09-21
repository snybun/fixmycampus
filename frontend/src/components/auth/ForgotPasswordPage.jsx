import React, { useState } from 'react';
import { Eye, EyeOff, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendOtp, resetPassword } from '../../services/api';
import './auth.css';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('mafe.cerna.up@phinmaed.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setSendingOtp(true);
    try {
      const res = await sendOtp(email);
      setOtpSent(true);
      if (res.code) {
        setSuccessMsg(`OTP sent to ${email}. (Demo Code: ${res.code})`);
        setOtp(res.code); // auto-fill in demo for convenience
      } else {
        setSuccessMsg(`OTP has been sent to ${email}. Please check your inbox.`);
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !otp || !newPassword || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ email, otp, newPassword });
      if (res.success) {
        setSuccessMsg('Password changed successfully! Redirecting to login...');
        setTimeout(() => {
          onNavigate('login');
        }, 1500);
      } else {
        setError(res.message || 'Invalid OTP or failed to update password.');
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
        {/* Brand at top-left as in Screenshot 3 */}
        <div className="auth-top-nav">
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

        <div className="auth-centered-card" style={{ marginTop: '2rem' }}>
          <div className="auth-header" style={{ marginTop: 0 }}>
            <h1 className="auth-title">Forgot Password</h1>
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
            {/* Email Address with Send OTP Button */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgot-email">
                Email Address <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="forgot-email"
                  type="email"
                  className="auth-input auth-input-with-action"
                  placeholder="mafe.cerna.up@phinmaed.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-inline-btn"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
            </div>

            {/* OTP Code */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgot-otp">
                OTP <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="forgot-otp"
                  type="text"
                  className="auth-input"
                  placeholder="Enter 6 digits code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            {/* New Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgot-new-password">
                New Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="forgot-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="auth-input auth-input-has-toggle"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgot-confirm-password">
                Confirm Password <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="forgot-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input auth-input-has-toggle"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Updating Password...' : 'Change Password'}
            </button>
          </form>

          {/* Footer Switch to Login */}
          <div className="auth-footer-prompt">
            Remembered your password?
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
