import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  User,
} from 'lucide-react';
import { fetchStats, fetchReports, deleteReport } from '../../services/api';
import ConfirmationModal, { MODAL_PRESETS } from '../common/ConfirmationModal';
import ModalsGalleryView from '../common/ModalsGalleryView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import './dashboard.css';

export default function DashboardPage({
  currentUser,
  onNavigate,
  onLogout,
}) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  const [activeModalPreset, setActiveModalPreset] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'modals-gallery'
  const [unreadCount, setUnreadCount] = useState(3);
  const [toastMessage, setToastMessage] = useState('');

  // Initial reports - start empty until reported as requested
  const [reports, setReports] = useState([]);

  // Load stats and real reports from backend
  useEffect(() => {
    let isMounted = true;
    fetchStats().then((res) => {
      if (isMounted && res && res.success) {
        const statsData = res.data || res;
        setStats({
          total: statsData.total_reports ?? 0,
          pending: statsData.pending_review ?? 0,
          in_progress: statsData.in_progress ?? 0,
          resolved: statsData.resolved ?? 0,
        });
      }
    });

    fetchReports().then((res) => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        setReports(
          res.data.map((r) => ({
            id: r.id,
            title: r.title,
            location: `${r.building_name || 'Campus'} • ${r.specific_area || r.location_name || 'Facility Area'}`,
            date: r.reported_at
              ? new Date(r.reported_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recently',
            image: r.primary_photo || '/images/hero_ac_defect.jpg',
            status: r.status,
            statusLabel:
              r.status === 'resolved'
                ? 'Fixed'
                : r.status === 'assigned'
                ? 'Worker Assigned'
                : r.status === 'in_progress'
                ? 'Repair Ongoing'
                : 'Pending',
            badgeClass:
              r.status === 'resolved'
                ? 'badge-fixed'
                : r.status === 'assigned'
                ? 'badge-worker'
                : 'badge-pending',
            modalTrigger: 'update_status',
          }))
        );
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
  const handleModalConfirm = async () => {
    const currentPreset = activeModalPreset;

    if (currentPreset === 'logout') {
      setActiveModalPreset(null);
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('landing');
      }
    } else if (currentPreset === 'delete_report') {
      if (!reportToDelete) {
        setActiveModalPreset(null);
        return;
      }

      const targetId = reportToDelete.id;
      const targetTitle = reportToDelete.title;
      setIsDeleting(true);

      try {
        const res = await deleteReport(targetId);
        setActiveModalPreset(null);
        setReportToDelete(null);

        if (res && res.success) {
          setReports((prev) => prev.filter((r) => r.id !== targetId));
          setToastMessage(`Report "${targetTitle}" was deleted successfully.`);
          setTimeout(() => setToastMessage(''), 3500);

          // Refresh live stats counters
          fetchStats().then((sRes) => {
            if (sRes && sRes.success) {
              const statsData = sRes.data || sRes;
              setStats({
                total: statsData.total_reports ?? 0,
                pending: statsData.pending_review ?? 0,
                in_progress: statsData.in_progress ?? 0,
                resolved: statsData.resolved ?? 0,
              });
            }
          });
        } else {
          setToastMessage(res?.message || 'Failed to delete report.');
          setTimeout(() => setToastMessage(''), 4000);
        }
      } catch (err) {
        setActiveModalPreset(null);
        setReportToDelete(null);
        setToastMessage('Error connecting to server while deleting report.');
        setTimeout(() => setToastMessage(''), 4000);
      } finally {
        setIsDeleting(false);
      }
    } else if (currentPreset === 'submit_report') {
      setActiveModalPreset(null);
      setToastMessage('Maintenance report submitted successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'assign_worker') {
      setActiveModalPreset(null);
      setToastMessage('Worker Mark Santos successfully assigned.');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'update_status') {
      setActiveModalPreset(null);
      setToastMessage('Report status updated to Repair Ongoing.');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (currentPreset === 'mark_fixed') {
      setActiveModalPreset(null);
      setToastMessage('Issue confirmed and marked as Fixed!');
      setTimeout(() => setToastMessage(''), 3000);
    } else {
      setActiveModalPreset(null);
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
                onClick={() => onNavigate('report-issue')}
                id="dash-nav-report-issue-btn"
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

            {/* User Profile Menu with Settings & Logout Dropdown */}
            <UserProfileDropdown
              currentUser={currentUser}
              onNavigate={onNavigate}
              onLogout={() => setActiveModalPreset('logout')}
              idPrefix="dash-user-profile"
            />
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
            onClick={() => onNavigate('report-issue')}
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

          {reports.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px dashed #e2e8f0',
                borderRadius: 16,
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <Camera size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                No Defect Reports Submitted Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, maxWidth: 460 }}>
                All campus statistics start at zero until an issue is filed. Help keep the campus safe, clean, and functional by reporting your first defect!
              </p>
              <button
                type="button"
                className="dash-btn-primary"
                onClick={() => onNavigate('report-issue')}
                style={{ marginTop: '0.5rem' }}
              >
                <Plus size={16} strokeWidth={2.6} />
                <span>Report a Facility Issue</span>
              </button>
            </div>
          ) : (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportToDelete(report);
                            setActiveModalPreset('delete_report');
                          }}
                          title={`Delete report: ${report.title}`}
                          aria-label={`Delete report: ${report.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
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
          message={
            activeModalPreset === 'delete_report' && reportToDelete
              ? `Are you sure you want to delete report "${reportToDelete.title}"? This action cannot be undone.`
              : undefined
          }
          loading={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setActiveModalPreset(null);
              setReportToDelete(null);
            }
          }}
          onConfirm={handleModalConfirm}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
