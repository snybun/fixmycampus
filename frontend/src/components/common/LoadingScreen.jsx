import React from 'react';

export default function LoadingScreen({ isVisible, message = 'Accessing FixMyCampus Portal...' }) {
  return (
    <div
      className={`portal-loading-overlay ${isVisible ? 'active' : ''}`}
      aria-hidden={!isVisible}
    >
      <div className="portal-loading-container">
        {/* Brand Icon with glowing pulse ring */}
        <div className="portal-loading-icon-wrap">
          <div className="portal-loading-logo-box">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="portal-loading-pulse-ring" />
        </div>

        {/* Minimalist spinner */}
        <div className="portal-loading-spinner" />

        {/* Text */}
        <div className="portal-loading-info">
          <span className="portal-loading-title">FixMyCampus</span>
          <span className="portal-loading-subtitle">{message}</span>
        </div>
      </div>
    </div>
  );
}
