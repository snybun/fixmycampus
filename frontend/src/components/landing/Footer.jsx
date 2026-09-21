import React from 'react';

export default function Footer({ onScrollTo }) {
  const year = new Date().getFullYear();

  const handleLinkClick = (e, targetId) => {
    e.preventDefault();
    if (onScrollTo) {
      onScrollTo(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <div className="landing-brand">
              <div className="landing-logo-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="landing-brand-name">FixMyCampus</span>
            </div>
            <p className="footer-tagline">&ldquo;Report. Track. Improve.&rdquo;</p>
            <p className="footer-desc">
              Facility defect &amp; maintenance reporting platform for higher education institutions.
            </p>
          </div>

          <div className="footer-links-col">
            <div className="footer-links-group">
              <span className="footer-group-title">Platform</span>
              <a href="#process" className="footer-link" onClick={(e) => handleLinkClick(e, 'process')}>How it works</a>
              <a href="#roles" className="footer-link" onClick={(e) => handleLinkClick(e, 'roles')}>Role Access</a>
              <a href="/health.php" target="_blank" rel="noopener noreferrer" className="footer-link">Health API</a>
            </div>

            <div className="footer-links-group">
              <span className="footer-group-title">Operations</span>
              <a href="#reports" className="footer-link" onClick={(e) => e.preventDefault()}>Defect Tracking</a>
              <a href="#categories" className="footer-link" onClick={(e) => e.preventDefault()}>Categories &amp; SLA</a>
              <a href="http://localhost:8081" target="_blank" rel="noopener noreferrer" className="footer-link">Database Admin</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span className="footer-copy">&copy; {year} FixMyCampus &bull; University Physical Plant System.</span>
          <div className="footer-status-pill">
            <span className="status-dot" />
            <span>All Campus Facility Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
