import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn, Lock, AlertTriangle } from 'lucide-react';
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
    <div className="fmc-denied-wrapper">
      <div className="fmc-denied-card">
        {/* Security Shield Icon */}
        <div className="fmc-denied-icon-box">
          <div className="fmc-denied-icon-pulse" />
          <ShieldAlert size={36} strokeWidth={2.2} />
        </div>

        {/* 403 Forbidden Badge */}
        <div className="fmc-denied-badge">
          <Lock size={13} />
          <span>403 &bull; Access Forbidden</span>
        </div>

        {/* Title */}
        <h1 className="fmc-denied-title">Administrator Privileges Required</h1>

        {/* Explanation */}
        <p className="fmc-denied-desc">
          Your institutional account does not have sufficient role permissions to access the
          Super Administrator facilities portal. Server-side Role-Based Access Control (RBAC)
          strictly monitors and restricts access to verified administrative accounts only.
        </p>

        {/* Role Comparison Pill */}
        <div className="fmc-denied-role-box">
          <div className="fmc-denied-role-item">
            <span className="fmc-denied-role-label">Your Account</span>
            <span className="fmc-denied-role-val fmc-role-user" title={userName}>
              {userName}
            </span>
            <span className="fmc-denied-role-sub">{userIdentifier}</span>
          </div>

          <div className="fmc-denied-role-divider" />

          <div className="fmc-denied-role-item">
            <span className="fmc-denied-role-label">Current Role</span>
            <span className="fmc-denied-role-val fmc-role-current">
              {currentRole}
            </span>
            <span className="fmc-denied-role-sub">Unauthorized for #admin</span>
          </div>

          <div className="fmc-denied-role-divider" />

          <div className="fmc-denied-role-item">
            <span className="fmc-denied-role-label">Required Role</span>
            <span className="fmc-denied-role-val fmc-role-required">
              Super Administrator
            </span>
            <span className="fmc-denied-role-sub">Tier 1 Full Authority</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="fmc-denied-notice">
          <AlertTriangle size={15} className="fmc-notice-icon" />
          <span>
            Direct URL tampering (such as entering <code>#admin</code>) is intercepted and blocked
            by server-side authentication guards.
          </span>
        </div>

        {/* Actions */}
        <div className="fmc-denied-actions">
          <button
            type="button"
            className="fmc-denied-btn fmc-btn-primary"
            onClick={handleReturnDashboard}
            id="fmc-return-dashboard-btn"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            className="fmc-denied-btn fmc-btn-secondary"
            onClick={handleSwitchAccount}
            id="fmc-switch-account-btn"
          >
            <LogIn size={16} />
            <span>Log in with Admin Account</span>
          </button>
        </div>

        {/* Footer */}
        <div className="fmc-denied-footer">
          FixMyCampus &bull; PHINMA Education Facility Security &amp; RBAC System
        </div>
      </div>
    </div>
  );
}
