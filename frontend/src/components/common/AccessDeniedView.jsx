import React from 'react';
import { Lock, ArrowLeft, LogIn } from 'lucide-react';
import './accessDenied.css';

export default function AccessDeniedView({ currentUser, onNavigate, onLogout }) {
  const currentRole = currentUser?.role_display || currentUser?.role_name || 'Student';
  const userName = currentUser?.full_name || 'Authenticated User';
  const userIdentifier = currentUser?.user_identifier || currentUser?.email || 'Campus Member';

  const handleReturnDashboard = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      window.location.hash = 'dashboard';
    }
  };

  const handleSwitchAccount = () => {
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('login');
    } else {
      window.location.hash = 'login';
    }
  };

  return (
    <div className="apple-denied-wrapper">
      <div className="apple-denied-card">
        {/* Apple Minimalist Icon */}
        <div className="apple-denied-icon">
          <Lock size={24} strokeWidth={2} />
        </div>

        {/* Clean Apple Typography */}
        <h1 className="apple-denied-title">Administrator Access Required</h1>
        <p className="apple-denied-subtitle">
          This portal is restricted to facility administrators. Your current institutional account
          does not have permission to view this page.
        </p>

        {/* Minimalist Apple Info Group */}
        <div className="apple-denied-info-inset">
          <div className="apple-info-row">
            <span className="apple-info-label">Account</span>
            <span className="apple-info-value" title={userName}>{userName}</span>
          </div>
          <div className="apple-info-divider" />
          <div className="apple-info-row">
            <span className="apple-info-label">ID / Email</span>
            <span className="apple-info-value apple-info-mono">{userIdentifier}</span>
          </div>
          <div className="apple-info-divider" />
          <div className="apple-info-row">
            <span className="apple-info-label">Current Role</span>
            <span className="apple-info-value apple-role-tag">{currentRole}</span>
          </div>
        </div>

        {/* Discreet Footnote */}
        <p className="apple-denied-note">
          Direct navigation to <code>#admin</code> is blocked by server security policy.
        </p>

        {/* Apple Pill Action Buttons */}
        <div className="apple-denied-actions">
          <button
            type="button"
            className="apple-btn apple-btn-primary"
            onClick={handleReturnDashboard}
            id="fmc-return-dashboard-btn"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            className="apple-btn apple-btn-secondary"
            onClick={handleSwitchAccount}
            id="fmc-switch-account-btn"
          >
            <LogIn size={16} />
            <span>Sign in as Administrator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
