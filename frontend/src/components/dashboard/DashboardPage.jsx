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
  Menu,
  X,
  Home,
  PlusCircle,
} from 'lucide-react';
import { fetchStats, fetchReports, deleteReport, fetchNotifications } from '../../services/api';
import ConfirmationModal, { MODAL_PRESETS } from '../common/ConfirmationModal';
import ModalsGalleryView from '../common/ModalsGalleryView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import MyReportsView from './MyReportsView';
import NotificationsView from '../notifications/NotificationsView';
import './dashboard.css';

export default function DashboardPage({
  currentUser,
  initialTab = 'home',
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
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'my-reports') return 'my-reports';
    if (hash === 'notifications') return 'notifications';
    return initialTab || 'home';
  });
  const [selectedReportForDetails, setSelectedReportForDetails] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'my-reports') {
        setActiveTab('my-reports');
      } else if (hash === 'notifications') {
        setActiveTab('notifications');
      } else if (hash === 'dashboard') {
        setActiveTab('home');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initial reports - start empty until reported as requested
  const [reports, setReports] = useState([]);

  // Load stats, real reports, and notifications from backend
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

    fetchNotifications().then((res) => {
      if (isMounted && res && res.success && typeof res.unread_count === 'number') {
        setUnreadCount(res.unread_count);
      }
    }).catch(() => {});

    fetchReports({ limit: 100 }).then((res) => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        setReports(
          res.data.map((r) => {
            const rawStatus = (r.status || 'submitted').toLowerCase();
            let statusLabel = 'Reported';
            let stepIdx = 0;
            if (rawStatus === 'resolved' || rawStatus === 'closed') {
              statusLabel = 'Fixed';
              stepIdx = 4;
            } else if (rawStatus === 'in_progress') {
              statusLabel = 'Repair Ongoing';
              stepIdx = 3;
            } else if (rawStatus === 'assigned') {
              statusLabel = 'Worker Assigned';
              stepIdx = 2;
            } else if (rawStatus === 'under_review') {
              statusLabel = 'Verified';
              stepIdx = 1;
            }

            const rawPriority = (r.priority || 'medium').toLowerCase();
            let priorityLabel = 'Medium';
            if (rawPriority === 'emergency') priorityLabel = 'Urgent';
            else if (rawPriority === 'high') priorityLabel = 'High';
            else if (rawPriority === 'low') priorityLabel = 'Low';

            const repDate = r.reported_at
              ? new Date(r.reported_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recently';

            const building = r.building_name || 'Campus';
            const room = r.room_number || r.specific_area || r.location_name || 'Facility Area';
            const location = `${building} • ${room}`;

            return {
              ...r,
              id: r.id,
              ticket_number: r.ticket_number || `FMC-${r.id}`,
              title: r.title,
              description: r.description || '',
              location,
              building,
              room,
              date: repDate,
              reportedDate: repDate,
              formattedDateReported: r.reported_at
                ? new Date(r.reported_at).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : `${repDate} at 2:14 PM`,
              image: r.primary_photo || r.image_url || '/images/hero_ac_defect.jpg',
              priority: priorityLabel,
              status: rawStatus,
              statusLabel,
              category: r.category_name || 'General Facility Defect',
              stepIndex: stepIdx,
              assignedWorker: r.worker_name
                ? {
                    name: r.worker_name,
                    role: r.worker_department ? `${r.worker_department} Staff` : 'Assigned Technician',
                  }
                : null,
              badgeClass:
                rawStatus === 'resolved' || rawStatus === 'closed'
                  ? 'badge-fixed'
                  : rawStatus === 'assigned'
                  ? 'badge-worker'
                  : 'badge-pending',
              modalTrigger: 'update_status',
            };
          })
        );
      } else {
        setReports([]);
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
  const isAdmin = Boolean(currentUser && (currentUser.role_name === 'admin' || currentUser.role_id === 1));

  // Determine if a report is eligible for deletion
  // Admins can delete any report; students can delete only if a worker has NOT been assigned yet
  const isReportDeletable = (report) => {
    if (!report) return false;
    if (isAdmin) return true;
    const rawStatus = (report.status || '').toLowerCase();
    const hasWorker = Boolean(
      report.worker_name ||
      report.worker_id ||
      report.assignedWorker ||
      rawStatus === 'assigned' ||
      rawStatus === 'in_progress' ||
      rawStatus === 'resolved' ||
      rawStatus === 'closed' ||
      report.statusLabel === 'Worker Assigned' ||
      report.statusLabel === 'Repair Ongoing' ||
      report.statusLabel === 'Fixed'
    );
    return !hasWorker;
  };

  // Handle modal confirmation
  const handleModalConfirm = async () => {
    const currentPreset = activeModalPreset;

    if (currentPreset === 'logout') {
      setActiveModalPreset(null);
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('login');
      }
    } else if (currentPreset === 'delete_report') {
      if (!reportToDelete) {
        setActiveModalPreset(null);
        return;
      }

      if (!isReportDeletable(reportToDelete)) {
        setActiveModalPreset(null);
        setReportToDelete(null);
        setToastMessage('This report cannot be deleted because a maintenance worker has already been assigned.');
        setTimeout(() => setToastMessage(''), 4000);
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
                className={`dash-nav-link ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('home');
                  setSelectedReportForDetails(null);
                  window.location.hash = 'dashboard';
                }}
              >
                Home
              </button>
              <button
                type="button"
                className={`dash-nav-link ${activeTab === 'my-reports' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('my-reports');
                  setSelectedReportForDetails(null);
                  window.location.hash = 'my-reports';
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
            {/* Quick Preview Toggle for Modals Collection & Empty States (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                className="dash-states-pill"
                onClick={() => setActiveView('modals-gallery')}
                title="View the Confirmation Modals Collection & Empty States Registry mockups"
              >
                System Modals & States (7)
              </button>
            )}

            {/* Notification Bell with Badge */}
            <button
              type="button"
              className={`dash-notif-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                setSelectedReportForDetails(null);
                window.location.hash = 'notifications';
              }}
              title="Notifications"
              id="dash-navbar-notif-btn"
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

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              className="dash-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              id="dash-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Drawer & Backdrop */}
        {mobileMenuOpen && (
          <div className="dash-mobile-menu-container">
            <div
              className="dash-mobile-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="dash-mobile-drawer">
              <nav className="dash-mobile-nav-list" aria-label="Mobile Navigation">
                <button
                  type="button"
                  className={`dash-mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveTab('home');
                    window.location.hash = 'dashboard';
                  }}
                >
                  <Home size={18} className="dash-mobile-nav-icon" />
                  <span>Home</span>
                  {activeTab === 'home' && <span className="dash-mobile-active-tag">Active</span>}
                </button>

                <button
                  type="button"
                  className={`dash-mobile-nav-item ${activeTab === 'my-reports' ? 'active' : ''}`}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveTab('my-reports');
                    window.location.hash = 'my-reports';
                  }}
                >
                  <FileText size={18} className="dash-mobile-nav-icon" />
                  <span>My Reports</span>
                  {activeTab === 'my-reports' && <span className="dash-mobile-active-tag">Active</span>}
                </button>

                <button
                  type="button"
                  className={`dash-mobile-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveTab('notifications');
                    window.location.hash = 'notifications';
                  }}
                >
                  <Bell size={18} className="dash-mobile-nav-icon" />
                  <span>Notifications</span>
                  {unreadCount > 0 && <span className="dash-mobile-active-tag">{unreadCount}</span>}
                </button>

                <button
                  type="button"
                  className="dash-mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('report-issue');
                  }}
                >
                  <PlusCircle size={18} className="dash-mobile-nav-icon" />
                  <span>Report Issue</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    className="dash-mobile-nav-item"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveView('modals-gallery');
                    }}
                  >
                    <SlidersHorizontal size={18} className="dash-mobile-nav-icon" />
                    <span>System Modals & States (7)</span>
                  </button>
                )}
              </nav>

              <div className="dash-mobile-divider" />

              {/* Mobile User Profile Summary & Quick Actions */}
              <div className="dash-mobile-user-section">
                <div className="dash-mobile-user-row">
                  <div className="dash-mobile-avatar">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser?.full_name || 'User'} />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="dash-mobile-user-meta">
                    <span className="dash-mobile-user-name">
                      {currentUser?.full_name || 'Mark Dyvie Cerna'}
                    </span>
                    <span className="dash-mobile-user-role">
                      {currentUser?.role_display || 'Student Account'}
                    </span>
                  </div>
                </div>

                <div className="dash-mobile-user-actions">
                  <button
                    type="button"
                    className="dash-mobile-action-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('settings');
                    }}
                  >
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    className="dash-mobile-action-btn dash-mobile-logout"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveModalPreset('logout');
                    }}
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
          Main Dashboard Content, Notifications View OR My Reports Tab
          -------------------------------------------------------------------- */}
      {activeTab === 'notifications' ? (
        <NotificationsView
          onNavigate={onNavigate}
          onSelectReport={(ticketNumber) => {
            setActiveTab('my-reports');
            window.location.hash = 'my-reports';
          }}
          unreadCount={unreadCount}
          setUnreadCount={setUnreadCount}
        />
      ) : activeTab === 'my-reports' ? (
        <MyReportsView
          liveReports={reports}
          onNavigate={onNavigate}
          initialSelectedReport={selectedReportForDetails}
          onDeleteReport={(r) => {
            setReportToDelete(r);
            setActiveModalPreset('delete_report');
          }}
          isAdmin={isAdmin}
        />
      ) : (
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
              <div className="dash-stat-icon-box indigo" title="Statistics">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">PENDING REVIEW</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number amber">{stats.pending}</span>
              <div className="dash-stat-icon-box amber" title="Pending Reviews">
                <BarChart2 size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="dash-stat-card">
            <span className="dash-stat-label">IN PROGRESS</span>
            <div className="dash-stat-body">
              <span className="dash-stat-number blue">{stats.in_progress}</span>
              <div className="dash-stat-icon-box blue" title="Active Repairs">
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
                <article
                  key={report.id}
                  className="dash-report-card"
                  onClick={() => {
                    setSelectedReportForDetails(report);
                    setActiveTab('my-reports');
                    window.location.hash = 'my-reports';
                  }}
                  style={{ cursor: 'pointer' }}
                >
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

                      {isReportDeletable(report) && (
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
                      )}
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
      )}

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
