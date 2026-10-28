import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, Settings, LogOut, History } from 'lucide-react';
import './userProfileDropdown.css';

export default function UserProfileDropdown({
  currentUser,
  onNavigate,
  onLogout,
  direction = 'down',
  onSettingsClick,
  onHistoryClick,
  className = '',
  idPrefix = 'user-profile',
  subTitle,
  showSubInButton = false,
  fullWidth = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const displayName = currentUser?.full_name || 'Mark Dyvie Cerna';
  const emailOrId = subTitle || currentUser?.email || currentUser?.user_identifier || 'Student Account';

  const handleSettings = () => {
    setIsOpen(false);
    if (onSettingsClick) {
      onSettingsClick();
    } else if (onNavigate) {
      onNavigate('settings');
    }
  };

  const handleHistory = () => {
    setIsOpen(false);
    if (onHistoryClick) {
      onHistoryClick();
    } else if (onNavigate) {
      onNavigate('history');
    }
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div
      className={`fmc-profile-menu-container ${direction === 'up' ? 'direction-up' : 'direction-down'} ${fullWidth ? 'fmc-container-full' : ''} ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`fmc-user-profile-btn ${fullWidth ? 'fmc-btn-full' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title="Account menu"
        id={`${idPrefix}-menu-btn`}
      >
        <div className="fmc-btn-left-cluster">
          <div className="fmc-user-avatar">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt={displayName} />
            ) : (
              <User size={18} strokeWidth={2.2} />
            )}
          </div>
          <div className="fmc-btn-text-col">
            <span className="fmc-user-name">{displayName}</span>
            {showSubInButton && (
              <span className="fmc-user-sub-label">{subTitle || currentUser?.role_display || 'Super Administrator'}</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`fmc-profile-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`fmc-profile-dropdown ${direction === 'up' ? 'drop-up' : 'drop-down'} ${fullWidth ? 'drop-full' : ''}`}
          role="menu"
        >
          <div className="fmc-dropdown-header">
            <div className="fmc-dropdown-avatar">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt={displayName} />
              ) : (
                <User size={20} strokeWidth={2} />
              )}
            </div>
            <div className="fmc-dropdown-info">
              <span className="fmc-dropdown-name">{displayName}</span>
              <span className="fmc-dropdown-sub">{emailOrId}</span>
            </div>
          </div>

          <div className="fmc-dropdown-divider" />

          {/* Settings */}
          <button
            type="button"
            className="fmc-dropdown-item"
            onClick={handleSettings}
            id={`${idPrefix}-dropdown-settings-btn`}
          >
            <Settings size={16} className="fmc-dropdown-icon" />
            <span>Settings</span>
          </button>

          {/* History */}
          <button
            type="button"
            className="fmc-dropdown-item"
            onClick={handleHistory}
            id={`${idPrefix}-dropdown-history-btn`}
          >
            <History size={16} className="fmc-dropdown-icon" />
            <span>History</span>
          </button>

          <div className="fmc-dropdown-divider" />

          {/* Logout */}
          <button
            type="button"
            className="fmc-dropdown-item fmc-dropdown-item-logout"
            onClick={handleLogoutClick}
            id={`${idPrefix}-dropdown-logout-btn`}
          >
            <LogOut size={16} className="fmc-dropdown-icon" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
