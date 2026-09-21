import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar({ onNavigate, onScrollTo }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onScrollTo) {
      onScrollTo(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReportClick = () => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate('login');
    }
  };

  return (
    <header className="landing-navbar">
      <div className="landing-nav-container">
        {/* Brand */}
        <button
          type="button"
          className="landing-brand"
          onClick={handleBrandClick}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="landing-logo-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="landing-brand-name">FixMyCampus</span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="landing-nav-links" aria-label="Landing Navigation">
          <a href="#process" className="landing-nav-link" onClick={(e) => handleNavClick(e, 'process')}>
            How it works
          </a>
          <a href="#roles" className="landing-nav-link" onClick={(e) => handleNavClick(e, 'roles')}>
            Roles &amp; Access
          </a>
          <a href="#impact" className="landing-nav-link" onClick={(e) => handleNavClick(e, 'impact')}>
            Impact
          </a>
        </nav>

        {/* Desktop Actions & Mobile Menu Toggle */}
        <div className="landing-nav-actions">
          <button
            type="button"
            className="btn-landing-primary"
            onClick={handleReportClick}
          >
            Report a defect
          </button>

          {/* Hamburger toggle button for mobile */}
          <button
            type="button"
            className="landing-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu">
          <nav className="mobile-nav-links" aria-label="Mobile Landing Navigation">
            <a
              href="#process"
              className="mobile-nav-link"
              onClick={(e) => handleNavClick(e, 'process')}
            >
              How it works
            </a>
            <a
              href="#roles"
              className="mobile-nav-link"
              onClick={(e) => handleNavClick(e, 'roles')}
            >
              Roles &amp; Access
            </a>
            <a
              href="#impact"
              className="mobile-nav-link"
              onClick={(e) => handleNavClick(e, 'impact')}
            >
              Impact
            </a>
            <div className="mobile-nav-cta">
              <button
                type="button"
                className="btn-hero-primary"
                style={{ width: '100%' }}
                onClick={handleReportClick}
              >
                Report a defect
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
