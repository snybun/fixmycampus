import React from 'react';
import { Menu, Plus, Activity } from 'lucide-react';

export default function Header({ dbConnected, onToggleSidebar, onNewReport }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <button
            type="button"
            className="btn-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Drawer"
          >
            <Menu size={20} />
          </button>

          <a href="#" className="brand-link" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="brand-badge">F</div>
            <div>
              <span className="brand-title">FixMyCampus</span>
              <span className="brand-tag">· Facility Maintenance</span>
            </div>
          </a>
        </div>

        <div className="header-right">
          <div
            className="system-status-indicator"
            title={dbConnected ? 'MySQL 8 Database Connected' : 'Database Offline'}
          >
            <span className={`status-dot ${dbConnected ? '' : 'offline'}`} />
            <span className="text">{dbConnected ? 'MySQL Active' : 'DB Offline'}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNewReport}
          >
            <Plus size={15} />
            <span>Report Defect</span>
          </button>
        </div>
      </div>
    </header>
  );
}
