import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div>
          <span>&copy; {currentYear} FixMyCampus · Facility Defect &amp; Maintenance Reporting System</span>
        </div>
        <div className="footer-links">
          <a href="/health.php" target="_blank" rel="noopener noreferrer">
            JSON Health API
          </a>
          <a href="http://localhost:8081" target="_blank" rel="noopener noreferrer">
            phpMyAdmin
          </a>
          <span>React 18 · PHP 8.3 · MySQL 8</span>
        </div>
      </div>
    </footer>
  );
}
