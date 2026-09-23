import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Bell,
  LogOut,
  BarChart2,
  Plus,
  Camera,
  FileText,
  Hourglass,
  CheckCircle2,
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  User,
} from 'lucide-react';
import { fetchStats, fetchReports } from '../../services/api';
import ConfirmationModal, { MODAL_PRESETS } from '../common/ConfirmationModal';
import ModalsGalleryView from '../common/ModalsGalleryView';
import './dashboard.css';

export default function DashboardPage({
  currentUser,
  onNavigate,
  onLogout,
}) {
  const [stats, setStats] = useState({
    total: 12,
    pending: 3,
    in_progress: 4,
    resolved: 5,
  });

  const [activeModalPreset, setActiveModalPreset] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'modals-gallery'
  const [unreadCount, setUnreadCount] = useState(3);
  const [toastMessage, setToastMessage] = useState('');

  // Initial reports matching Mockup 1
  const [reports, setReports] = useState([
    {
      id: 1,
      title: 'Broken Air Conditioner',
      location: 'PTC Bldg • Room 307',
      date: 'Aug 25, 2026',
      image: '/images/hero_ac_defect.jpg',
      status: 'assigned',
      statusLabel: 'Worker Assigned',
      badgeClass: 'badge-worker',
      modalTrigger: 'assign_worker',
    },
    {
      id: 2,
      title: 'Faulty Light Switch',
      location: 'CMA Building • Room 201',
      date: 'Aug 22, 2026',
      image: '/images/faulty_light_switch.jpg',
      status: 'pending',
      statusLabel: 'Pending',
      badgeClass: 'badge-pending',
      modalTrigger: 'update_status',
    },
    {
      id: 3,
      title: 'Damaged Whiteboard',
      location: 'NH Bldg • Room 105',
      date: 'Aug 18, 2026',
      image: '/images/damaged_whiteboard.jpg',
      status: 'resolved',
      statusLabel: 'Fixed',
      badgeClass: 'badge-fixed',
      modalTrigger: 'mark_fixed',
    },
  ]);

  // Load stats from backend if available
  useEffect(() => {
    let isMounted = true;
    fetchStats().then((res) => {
      if (isMounted && res.success && res.data) {
        setStats({
          total: res.data.total_reports || 12,
          pending: res.data.pending_review || 3,
          in_progress: res.data.in_progress || 4,
          resolved: res.data.fixed_resolved || 5,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = currentUser?.full_name || 'Mark Cerna';
  const firstName = displayName.split(' ')[0] || 'Mark';

  // Handle modal confirmation
  const handleModalConfirm = () => {
    const currentPreset = activeModalPreset;
    setActiveModalPreset(null);

    if (currentPreset === 'logout') {
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('landing');
      }
    } else if (currentPreset === 'delete_report') {
      setToastMessage('Report was deleted.');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'submit_report') {
      setToastMessage('Maintenance report submitted successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'assign_worker') {
      setToastMessage('Worker Mark Santos successfully assigned.');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'update_status') {
      setToastMessage('Report status updated to Repair Ongoing.');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'mark_fixed') {
      setToastMessage('Issue confirmed and marked as Fixed!');
      setTimeout(() => setToastMessage(''), 3000);
    } else {
      setToastMessage('Action confirmed.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  // Switch to Modals & Empty States Gallery View if toggled
  if (activeView === 'modals-gallery') {
    return <ModalsGalleryView onBackToDashboard={() => setActiveView('dashboard')} />;
  }

  return (
    <div className="dash-page-container">
      {/* --------------------------------------------------------------------
          Top Navigation Bar
          -------------------------------------------------------------------- */}
      <header className="dash-navbar">
        <div className="dash-nav-inner">
          {/* Brand & Nav Links */}
          <div className="dash-nav-left">
            <button
              type="button"
              className="dash-logo-btn"
              onClick={() => onNavigate('landing')}
              title="FixMyCampus Home"
            >
              <div className="dash-logo-icon">
                <Wrench size={18} strokeWidth={2.2} />
              </div>
              <span className="dash-logo-text">FixMyCampus</span>
            </button>

            <nav className="dash-nav-links" aria-label="Main Navigation">
              <button
                type="button"
                className="dash-nav-link active"
                onClick={() => onNavigate('dashboard')}
              >
                Home
              </button>
              <button
                type="button"
                className="dash-nav-link"
                onClick={() => {
                  setToastMessage('Navigating to My Reports...');
                  setTimeout(() => setToastMessage(''), 2000);
                }}
              >
                My Reports
              </button>
              <button
                type="button"
                className="dash-nav-link"
                onClick={() => setActiveModalPreset('submit_report')}
              >
                Report Issue
              </button>
            </nav>
          </div>

          {/* Right Controls */}
          <div className="dash-nav-right">
            {/* Quick Preview Toggle for Modals Collection & Empty States */}
            <button
              type="button"
              className="dash-states-pill"
              onClick={() => setActiveView('modals-gallery')}
              title="View the Confirmation Modals Collection & Empty States Registry mockups"
            >
              System Modals & States (7)
            </button>

            {/* Notification Bell with Badge */}
            <button
              type="button"
              className="dash-notif-btn"
              onClick={() => {
                setUnreadCount(0);
                setToastMessage('All notifications marked as read.');
                setTimeout(() => setToastMessage(''), 2500);
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="dash-notif-badge">{unreadCount}</span>
              )}
            </button>

            {/* User Profile Info */}
            <div
              className="dash-user-profile"
              onClick={() => setActiveModalPreset('start_over')}
              title="User Profile"
            >
              <div className="dash-user-avatar">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={displayName} />
                ) : (
                  <User size={18} strokeWidth={2.2} />
                )}
              </div>
              <span className="dash-user-name">{displayName}</span>
            </div>

            {/* Logout Trigger -> opens Logout? Confirmation Modal */}
            <button
              type="button"
              className="dash-logout-btn"
              onClick={() => setActiveModalPreset('logout')}
              title="Log out of FixMyCampus"
              id="dash-logout-button"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Toast alert banner if action triggered */}
      {toastMessage && (
        <div
          style={{
            maxWidth: 1240,
            margin: '16px auto 0 auto',
            padding: '10px 24px',
          }}
        >
          <div
            style={{
              background: '#dcfce7',
              color: '#15803d',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          Main Dashboard Content
          -------------------------------------------------------------------- */}
      <main className="dash-content">
        {/* Welcome Section */}
        <section className="dash-welcome">
          <div className="dash-welcome-text">
            <h1>{getGreeting()}, {firstName}!</h1>
            <p>Help us keep the campus safe, clean, and functional.</p>
          </div>

          <button
            type="button"
            className="dash-btn-primary"
            onClick={() => setActiveModalPreset('submit_report')}
            id="dash-report-btn"
          >
            <Plus size={16} strokeWidth={2.6} />
            <span>Report a Facility Issue</span>
          </button>
        </section>

        {/* ------------------------------------------------------------------
            4 Metric Stat Cards
            ------------------------------------------------------------------ */}
        <section className="dash-stats-grid" aria-label="Campus Reports Overview">
          {/* Total Reports */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">TOTAL REPORTS</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number">{stats.total}</span>
              <div className="dash-stat-icon-box" title="Statistics">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">PENDING REVIEW</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number">{stats.pending}</span>
              <div className="dash-stat-icon-box" title="Pending Reviews">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">IN PROGRESS</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number">{stats.in_progress}</span>
              <div className="dash-stat-icon-box" title="Active Repairs">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Fixed / Resolved */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">FIXED / RESOLVED</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number green">{stats.resolved}</span>
              <div className="dash-stat-icon-box green" title="Resolved Issues">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            Recent Reports Section (3-card grid)
            ------------------------------------------------------------------ */}
        <section className="dash-section" aria-labelledby="recent-reports-heading">
          <div className="dash-section-header">
            <h2 id="recent-reports-heading">Recent Reports</h2>
          </div>

          <div className="dash-reports-grid">
            {reports.map((report) => (
              <article key={report.id} className="dash-report-card">
                <div className="dash-report-image">
                  <img src={report.image} alt={report.title} loading="lazy" />
                </div>

                <div className="dash-report-info">
                  <h3 className="dash-report-title">{report.title}</h3>
                  <p className="dash-report-location">{report.location}</p>
                  <p className="dash-report-date">{report.date}</p>

                  <div className="dash-report-badge-container">
                    <button
                      type="button"
                      className={`dash-badge ${report.badgeClass}`}
                      onClick={() => setActiveModalPreset(report.modalTrigger)}
                      title={`Click to test "${MODAL_PRESETS[report.modalTrigger]?.title}" dialog`}
                    >
                      {report.statusLabel}
                    </button>

                    <div className="dash-card-actions">
                      <button
                        type="button"
                        className="dash-card-action-btn"
                        onClick={() => setActiveModalPreset('delete_report')}
                        title="Delete report"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------
            How It Works Card (4 horizontal steps)
            ------------------------------------------------------------------ */}
        <section className="dash-how-it-works" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="dash-how-title">How It Works</h2>

          <div className="dash-steps-grid">
            {/* Step 1 */}
            <div className="dash-step-col">
              <div className="dash-step-icon-row">
                <div className="dash-step-circle">1</div>
                <Camera size={18} className="dash-step-icon" />
              </div>
              <h3 className="dash-step-heading">Report an issue</h3>
              <p className="dash-step-text">
                Upload a photo and details in under a minute.
              </p>
            </div>

            {/* Step 2 */}
            <div className="dash-step-col">
              <div className="dash-step-icon-row">
                <div className="dash-step-circle">2</div>
                <FileText size={18} className="dash-step-icon" />
              </div>
              <h3 className="dash-step-heading">Maintenance reviews it</h3>
              <p className="dash-step-text">
                Facilities team reviews and assigns a worker.
              </p>
            </div>

            {/* Step 3 */}
            <div className="dash-step-col">
              <div className="dash-step-icon-row">
                <div className="dash-step-circle">3</div>
                <Hourglass size={18} className="dash-step-icon" />
              </div>
              <h3 className="dash-step-heading">Track the repair</h3>
              <p className="dash-step-text">
                Get live updates as action is taken on your ticket.
              </p>
            </div>

            {/* Step 4 */}
            <div className="dash-step-col">
              <div className="dash-step-icon-row">
                <div className="dash-step-circle green">4</div>
                <CheckCircle2 size={18} className="dash-step-icon green" />
              </div>
              <h3 className="dash-step-heading">Issue gets resolved</h3>
              <p className="dash-step-text">
                Campus stays functional and you are notified.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------------------
          Reusable Interactive Confirmation Modal
          Supports all 7 presets from Image 3
          -------------------------------------------------------------------- */}
      {activeModalPreset && (
        <ConfirmationModal
          isOpen={Boolean(activeModalPreset)}
          presetId={activeModalPreset}
          onClose={() => setActiveModalPreset(null)}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}
