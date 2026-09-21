import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Building2,
  Tags,
  Database,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  totalTickets = 0
}) {
  const handleNavClick = (tab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Navigation">
        <div className="sidebar-section">
          <span className="sidebar-label">Operations</span>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleNavClick('reports')}
          >
            <Ticket size={17} />
            <span>Defect Tickets</span>
            {totalTickets > 0 && <span className="sidebar-badge">{totalTickets}</span>}
          </button>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'new-report' ? 'active' : ''}`}
            onClick={() => handleNavClick('new-report')}
          >
            <PlusCircle size={17} />
            <span>Report Defect</span>
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Campus Facilities</span>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'buildings' ? 'active' : ''}`}
            onClick={() => handleNavClick('buildings')}
          >
            <Building2 size={17} />
            <span>Buildings &amp; Rooms</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => handleNavClick('categories')}
          >
            <Tags size={17} />
            <span>Issue Categories</span>
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">System &amp; Verification</span>

          <button
            type="button"
            className={`sidebar-nav-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => handleNavClick('system')}
          >
            <Database size={17} />
            <span>Database Status</span>
          </button>

          <a
            href="/health.php"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-nav-btn"
            style={{ textDecoration: 'none' }}
          >
            <ShieldCheck size={17} />
            <span>Health Check API</span>
            <ExternalLink size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />
          </a>
        </div>
      </aside>

      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
