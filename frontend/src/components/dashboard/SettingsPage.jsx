import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  User,
  Pencil,
  Lock,
  Bell,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { updateProfilePicture, changeUserPassword } from '../../services/api';
import './settings.css';

export default function SettingsPage({
  currentUser,
  onNavigate,
  onLogout,
  onUpdateUser,
}) {
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Notification Preferences Modal State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  const displayName = currentUser?.full_name || 'Mark Cerna';
  const studentId = currentUser?.user_identifier || '03-01-2526-045589';
  const emailAddress = currentUser?.email || 'mafe.cerna.up@phinmaed.com';
  const departmentName = currentUser?.department || 'Information Technology';
  const roleDisplay = currentUser?.role_display || '2nd Year Student';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Handle Photo Picker Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image file size must be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setAvatarPreview(base64Data);
      setIsUploading(true);

      try {
        const res = await updateProfilePicture(base64Data);
        if (res && res.success) {
          showToast('Profile picture updated successfully!');
          if (onUpdateUser) {
            onUpdateUser(res.user);
          }
        } else {
          showToast(res?.message || 'Failed to update profile picture.');
        }
      } catch (err) {
        showToast('Error uploading profile picture to server.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Password Update Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res && res.success) {
        setPasswordSuccess(res.message || 'Password changed successfully!');
        showToast('Password updated! You can now use this password on the login form.');
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(res?.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError('Connection error. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="settings-page-wrapper">
      {/* Hidden File Input Triggered by "Edit Profile" */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* Top Bar with Back Button */}
      <div className="settings-top-bar">
        <button
          type="button"
          className="settings-back-btn"
          onClick={() => onNavigate('dashboard')}
          title="Return to Dashboard"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="settings-card">
        {/* User Avatar, Name, and Role */}
        <div className="settings-header">
          <div
            className="settings-avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
            title="Click to edit profile picture"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={displayName}
                className="settings-avatar-img"
              />
            ) : (
              <div className="settings-avatar-placeholder">
                <User size={46} strokeWidth={1.8} />
              </div>
            )}
            <div className="settings-avatar-badge" title="Change photo">
              <Camera size={15} strokeWidth={2.4} />
            </div>
          </div>

          <h2 className="settings-user-name">{displayName}</h2>
          <p className="settings-user-role">{roleDisplay}</p>
        </div>

        <div className="settings-divider" />

        {/* Read-Only Information Fields */}
        <div className="settings-fields-group">
          {/* Student ID */}
          <div className="settings-field">
            <label className="settings-field-label">Student ID</label>
            <input
              type="text"
              className="settings-field-input"
              value={studentId}
              readOnly
              disabled
              title="Student ID is permanent and managed by Registrar"
            />
          </div>

          {/* Email Address */}
          <div className="settings-field">
            <label className="settings-field-label">Email Address</label>
            <input
              type="text"
              className="settings-field-input"
              value={emailAddress}
              readOnly
              disabled
              title="Official institutional Google/PHINMA email"
            />
          </div>

          {/* Department */}
          <div className="settings-field">
            <label className="settings-field-label">Department</label>
            <input
              type="text"
              className="settings-field-input"
              value={departmentName}
              readOnly
              disabled
              title="Department enrollment"
            />
          </div>
        </div>

        <div className="settings-divider" />

        {/* Action Buttons List */}
        <div className="settings-actions-list">
          {/* 1. Edit Profile -> triggers file upload for profile picture */}
          <button
            type="button"
            className="settings-action-row"
            onClick={() => fileInputRef.current?.click()}
            title="Update your profile photo"
          >
            <div className="settings-action-left">
              <div className="settings-action-icon">
                <Pencil size={17} strokeWidth={2} />
              </div>
              <span>Edit Profile</span>
            </div>
            <ChevronRight size={17} className="settings-action-chevron" />
          </button>

          {/* 2. Change Password */}
          <button
            type="button"
            className="settings-action-row"
            onClick={() => {
              setPasswordError('');
              setPasswordSuccess('');
              setShowPasswordModal(true);
            }}
            title="Set or change password for textbox sign in"
          >
            <div className="settings-action-left">
              <div className="settings-action-icon">
                <Lock size={17} strokeWidth={2} />
              </div>
              <span>Change Password</span>
            </div>
            <ChevronRight size={17} className="settings-action-chevron" />
          </button>

          {/* 3. Notification Preferences */}
          <button
            type="button"
            className="settings-action-row"
            onClick={() => setShowNotifModal(true)}
            title="Configure notification settings"
          >
            <div className="settings-action-left">
              <div className="settings-action-icon">
                <Bell size={17} strokeWidth={2} />
              </div>
              <span>Notification Preferences</span>
            </div>
            <ChevronRight size={17} className="settings-action-chevron" />
          </button>

          {/* 4. Logout (Styled in soft Red matching Image 2) */}
          <button
            type="button"
            className="settings-action-row settings-action-logout"
            onClick={onLogout}
            title="Log out of FixMyCampus"
          >
            <div className="settings-action-left">
              <div className="settings-action-icon">
                <LogOut size={17} strokeWidth={2} />
              </div>
              <span>Logout</span>
            </div>
            <ChevronRight size={17} className="settings-action-chevron" />
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="settings-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="settings-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <Lock size={19} color="#059669" />
                <span>Change Account Password</span>
              </div>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Set a password so you can sign in using either your Google account or the username/password textbox.
            </p>

            {passwordError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="settings-field" style={{ marginBottom: '12px' }}>
                <label className="settings-field-label">Current Password (if set)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="settings-field-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Leave blank if registering first password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="settings-field" style={{ marginBottom: '12px' }}>
                <label className="settings-field-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="settings-field-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => setShowNewPass(!showNewPass)}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="settings-field" style={{ marginBottom: '12px' }}>
                <label className="settings-field-label">Confirm New Password</label>
                <input
                  type="password"
                  className="settings-field-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <button
                type="submit"
                className="settings-modal-btn-submit"
                disabled={isSubmittingPassword}
              >
                {isSubmittingPassword ? 'Updating Password...' : 'Save Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {showNotifModal && (
        <div className="settings-modal-overlay" onClick={() => setShowNotifModal(false)}>
          <div className="settings-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <Bell size={19} color="#059669" />
                <span>Notification Preferences</span>
              </div>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setShowNotifModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Choose how FixMyCampus updates you on report statuses and campus maintenance.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Email Status Updates</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Receive email when reported defects are assigned or fixed</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>SLA Resolution Bulletins</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Alerts on critical repairs nearing resolution deadline</div>
                </div>
                <input
                  type="checkbox"
                  checked={slaAlerts}
                  onChange={(e) => setSlaAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>SMS Urgent Alerts</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Urgent campus safety hazard notices to verified phone</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                />
              </label>
            </div>

            <button
              type="button"
              className="settings-modal-btn-submit"
              onClick={() => {
                setShowNotifModal(false);
                showToast('Notification preferences saved successfully!');
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="settings-toast">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
