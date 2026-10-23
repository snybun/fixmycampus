import React from 'react';
import SettingsPage from '../dashboard/SettingsPage';

export default function AdminSettings({ currentUser, onNavigate, onLogout, onUpdateUser }) {
  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Account Settings</h1>
          <p className="admin-header-subtitle">
            Manage your profile details, profile photo, and password.
          </p>
        </div>
      </div>
      <SettingsPage
        embedded
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
      />
    </div>
  );
}
