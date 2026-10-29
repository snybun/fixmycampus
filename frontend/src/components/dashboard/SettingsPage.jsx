import React, { useState, useRef, useEffect } from 'react';
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
import { updateProfilePicture, changeUserPassword, updateUserProfile } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import './settings.css';

const DEPARTMENTS = [
  'CITE - College of Information Technology Education',
  'CAHS - College of Allied Health Sciences',
  'CEA - College of Engineering and Architecture',
  'CCJE - College of Criminal Justice Education',
  'CELA - College of Education and Liberal Arts',
  'CMA - College of Management and Accountancy',
  'CHTM - College of Hospitality and Tourism Management',
  'SHS - Senior High School Department',
];

const YEAR_LEVELS = [
  '1st Year Student',
  '2nd Year Student',
  '3rd Year Student',
  '4th Year Student',
  '5th Year Student',
  'Senior High School',
  'Faculty / Staff Member',
];

export default function SettingsPage({
  currentUser,
  onNavigate,
  onLogout,
  onUpdateUser,
  embedded = false,
  showBackButton = false,
}) {
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Sync avatarPreview if currentUser updates
  useEffect(() => {
    if (currentUser?.avatar_url) {
      setAvatarPreview(currentUser.avatar_url);
    }
  }, [currentUser?.avatar_url]);

  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editProfileError, setEditProfileError] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

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

  // Check if current user is maintenance staff or admin
  const isMaintenance = Boolean(
    currentUser && (
      currentUser.role_name === 'supervisor' ||
      currentUser.role_name === 'technician' ||
      currentUser.role_id === 2 ||
      currentUser.role_id === 3 ||
      currentUser.role === 'maintenance' ||
      currentUser.role === 'technician' ||
      currentUser.role === 'supervisor' ||
      String(currentUser.user_identifier || '').toUpperCase().startsWith('MGT-') ||
      String(currentUser.user_identifier || '').toUpperCase().startsWith('MNT-') ||
      String(currentUser.user_identifier || '').toUpperCase().startsWith('TEC-') ||
      String(currentUser.user_identifier || '').toUpperCase().startsWith('STF-')
    )
  );

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role_name === 'admin' ||
      currentUser.role_id === 1 ||
      currentUser.role === 'admin'
    )
  );

  // Parse existing names from currentUser
  const displayName = currentUser?.full_name || (isAdmin ? 'Administrator' : isMaintenance ? 'Maintenance Staff' : 'User');
  const staffOrStudentId = currentUser?.user_identifier || '';
  const emailAddress = currentUser?.email || 'user@phinmaed.com';
  const departmentName = currentUser?.department || '';
  
  // Role display: locked by admin for staff/admin, year level for students
  const roleDisplay = isMaintenance
    ? (currentUser?.role_display || (currentUser?.role_name === 'supervisor' ? 'Maintenance Supervisor' : 'Maintenance Staff'))
    : isAdmin
    ? (currentUser?.role_display || 'Administrator')
    : (currentUser?.year_level || 'Student');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Open Edit Profile modal with populated values
  const handleOpenEditProfile = () => {
    setEditProfileError('');
    
    // Default or parsed names
    let fn = currentUser?.first_name || '';
    let mn = currentUser?.middle_name || '';
    let ln = currentUser?.last_name || '';

    if (!fn && !ln && currentUser?.full_name) {
      const parts = currentUser.full_name.trim().split(/\s+/);
      if (parts.length === 1) {
        fn = parts[0];
      } else if (parts.length === 2) {
        fn = parts[0];
        ln = parts[1];
      } else if (parts.length >= 3) {
        fn = parts[0];
        mn = parts.slice(1, -1).join(' ');
        ln = parts[parts.length - 1];
      }
    }

    setEditFirstName(fn || '');
    setEditMiddleName(mn || '');
    setEditLastName(ln || '');
    setEditYear(currentUser?.year_level || '2nd Year Student');
    setEditDepartment(currentUser?.department || 'CITE - College of Information Technology Education');
    setShowEditProfileModal(true);
  };

  // Handle Edit Profile submission
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditProfileError('');

    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditProfileError('First Name and Last Name are required.');
      return;
    }

    setIsSubmittingProfile(true);
    try {
      const payload = {
        first_name: editFirstName.trim(),
        middle_name: editMiddleName.trim(),
        last_name: editLastName.trim(),
      };

      // Only student profiles include year_level and college department
      if (!isMaintenance && !isAdmin) {
        payload.year_level = editYear;
        payload.department = editDepartment;
      }

      const res = await updateUserProfile(payload);

      if (res && res.success) {
        showToast('Profile updated successfully!');
        if (onUpdateUser && res.user) {
          onUpdateUser(res.user);
        }
        setShowEditProfileModal(false);
      } else {
        setEditProfileError(res?.message || 'Failed to update profile details.');
      }
    } catch (err) {
      setEditProfileError('Error connecting to server. Please try again.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Handle Photo Picker Selection (beside/on the profile avatar)
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
        showToast('Password updated! You can now use this password to sign in via the textbox.');
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess('');
        }, 1800);
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
    <div className={`settings-page-wrapper${embedded ? ' settings-page-embedded' : ''}`}>
      {/* Hidden File Input for Avatar Photo (Triggered only by camera badge on the avatar) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* Top Bar with Back Button (only rendered when not embedded and requested) */}
      {!embedded && showBackButton && (
        <div className="settings-top-bar">
          <button
            type="button"
            className="settings-back-btn"
            onClick={() => onNavigate(isMaintenance ? 'maintenance' : isAdmin ? 'admin' : 'dashboard')}
            title="Return to Dashboard"
            id="settings-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Page Header (Title & Subtitle for Standalone Window) */}
      {!embedded && (
        <div className="settings-page-header">
          <h1 className="settings-page-title">Account Settings</h1>
          <p className="settings-page-subtitle">
            Manage your profile details, profile photo, and password.
          </p>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="settings-card">
        {/* User Avatar with Camera Badge Beside It */}
        <div className="settings-header">
          <div
            className="settings-avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
            title="Click camera icon to change profile photo"
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
            <div className="settings-avatar-badge" title="Change profile photo">
              <Camera size={15} strokeWidth={2.4} />
            </div>
          </div>

          <h2 className="settings-user-name">{displayName}</h2>
          <p className="settings-user-role">{roleDisplay}</p>
        </div>

        <div className="settings-divider" />

        {/* Information Fields */}
        <div className="settings-fields-group">
          {/* Student / Staff ID (Read Only) */}
          <div className="settings-field">
            <label className="settings-field-label">
              {isMaintenance ? 'Staff ID' : isAdmin ? 'Admin ID' : 'Student ID'}
            </label>
            <input
              type="text"
              className="settings-field-input"
              value={staffOrStudentId}
              readOnly
              disabled
              title={isMaintenance || isAdmin ? 'Account ID assigned by Campus Administration' : 'Student ID is permanent and managed by Registrar'}
            />
          </div>

          {/* Email Address (Read Only) */}
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

          {/* Department (Only shown for student accounts; removed for maintenance staff) */}
          {!isMaintenance && departmentName && (
            <div className="settings-field">
              <label className="settings-field-label">Department</label>
              <input
                type="text"
                className="settings-field-input"
                value={departmentName}
                readOnly
                disabled
                title="Academic Department / College"
              />
            </div>
          )}
        </div>

        <div className="settings-divider" />

        {/* Action Buttons List */}
        <div className="settings-actions-list">
          {/* 1. Edit Profile */}
          <button
            type="button"
            className="settings-action-row"
            onClick={handleOpenEditProfile}
            title={isMaintenance || isAdmin ? 'Edit your name details' : 'Edit your name, academic year level, and department'}
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

          {/* 4. Logout */}
          <button
            type="button"
            className="settings-action-row settings-action-logout"
            onClick={() => setShowLogoutModal(true)}
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

      {/* Edit Profile Modal (Name: FN, MN, LN, Year, Department) */}
      {showEditProfileModal && (
        <div className="settings-modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div className="settings-modal-dialog settings-modal-dialog-wide" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <Pencil size={19} color="#059669" />
                <span>Edit Profile Information</span>
              </div>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setShowEditProfileModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              {isMaintenance || isAdmin
                ? 'Update your name details. Your role is managed and locked by Campus Administration.'
                : 'Update your name details, academic year, and college department.'}
            </p>

            {editProfileError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{editProfileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* Name Row: FN & MN */}
              <div className="settings-form-row-2col" style={{ marginBottom: '12px' }}>
                <div className="settings-field">
                  <label className="settings-field-label">First Name (FN) *</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="e.g. Juan"
                    required
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Middle Name (MN)</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    placeholder="e.g. Dela (Optional)"
                  />
                </div>
              </div>

              {/* Name Row: LN */}
              <div className="settings-field" style={{ marginBottom: (isMaintenance || isAdmin) ? '18px' : '12px' }}>
                <label className="settings-field-label">Last Name (LN) *</label>
                <input
                  type="text"
                  className="settings-field-input"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="e.g. Cruz"
                  required
                />
              </div>

              {/* Year Level Dropdown - Hidden for maintenance & admin (role locked by admin) */}
              {!isMaintenance && !isAdmin && (
                <div className="settings-field" style={{ marginBottom: '12px' }}>
                  <label className="settings-field-label">Year Level *</label>
                  <select
                    className="settings-field-select"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    required
                  >
                    {YEAR_LEVELS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department Dropdown - Hidden for maintenance & admin (role and trade locked by admin) */}
              {!isMaintenance && !isAdmin && (
                <div className="settings-field" style={{ marginBottom: '16px' }}>
                  <label className="settings-field-label">College / Department *</label>
                  <select
                    className="settings-field-select"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-modal-btn-submit"
                  style={{ flex: 1, marginTop: 0 }}
                  disabled={isSubmittingProfile}
                >
                  {isSubmittingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    placeholder="Leave blank if setting first password"
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ConfirmationModal
          isOpen={showLogoutModal}
          presetId="logout"
          title="Logout?"
          message="Are you sure you want to log out of FixMyCampus?"
          confirmText="Log out"
          confirmClass="modal-btn-danger"
          cancelText="Cancel"
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            if (onLogout) onLogout();
          }}
        />
      )}
    </div>
  );
}
