import React, { useState } from 'react';
import {
  Wrench,
  Bell,
  ChevronDown,
  Plus,
  BarChart2,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  X,
  FileText,
  Sparkles,
  MapPin,
  User,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import './heroDemo.css';

// Preset defect templates for fast one-click simulation
const DEMO_PRESETS = [
  {
    id: 'preset-ac',
    title: 'Broken Air Conditioner Unit',
    building: 'Science Hall',
    room: 'Room 302 (Physics Lab)',
    category: 'HVAC & Cooling',
    priority: 'High Priority',
    priorityClass: 'amber',
    icon: '❄️',
    image: '/images/hero_ac_defect.jpg',
    sla: '24h',
  },
  {
    id: 'preset-light',
    title: 'Flickering Overhead Light Fixture',
    building: 'Main Library',
    room: '2nd Floor Study Commons',
    category: 'Electrical',
    priority: 'Medium Priority',
    priorityClass: 'blue',
    icon: '💡',
    image: '/images/faulty_light_switch.jpg',
    sla: '48h',
  },
  {
    id: 'preset-chairs',
    title: 'Damaged Classroom Chairs & Desks',
    building: 'Engineering Complex',
    room: 'Lecture Hall B',
    category: 'Furniture & Fixtures',
    priority: 'Normal',
    priorityClass: 'green',
    icon: '🪑',
    image: '/images/classroom_chairs.jpg',
    sla: '72h',
  },
];

export default function HeroUserDashboardDemo({ onNavigate, currentUser }) {
  // Current active tab inside mockup: 'home' | 'my-reports'
  const [activeTab, setActiveTab] = useState('home');

  // Interactive demo reports state (starts empty to match Image 2 screenshot)
  const [reports, setReports] = useState([]);

  // Dynamic stat counters (starts at 0 as requested)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  // Modal & popover states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(DEMO_PRESETS[0]);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [activeReportToTrack, setActiveReportToTrack] = useState(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = currentUser?.full_name || 'Mark Dyvie Cerna';
  const firstName = displayName.split(' ')[0] || 'Mark';

  // Trigger quick toast inside the mockup
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Submit a demo report
  const handleSubmitDemoReport = () => {
    const preset = selectedPreset || DEMO_PRESETS[0];
    const ticketId = `#FMC-202609-000${reports.length + 1}`;

    const newReport = {
      id: `demo-${Date.now()}`,
      ticket_number: ticketId,
      title: preset.title,
      building: preset.building,
      room: preset.room,
      location: `${preset.building} • ${preset.room}`,
      category: preset.category,
      priority: preset.priority,
      image: preset.image,
      sla: preset.sla,
      date: 'Just now',
      timeAgo: 'Just now',
      status: 'pending_review',
      statusLabel: 'Pending Review',
      stepIndex: 1, // 0: Reported, 1: Under Review, 2: Assigned, 3: Fixed
      assignedWorker: null,
    };

    setReports((prev) => [newReport, ...prev]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      pending: prev.pending + 1,
    }));
    setUnreadCount((c) => c + 1);
    setIsReportModalOpen(false);
    showToast(`Report ${ticketId} submitted! Live stats updated.`);
  };

  // Advance simulation step in tracking modal
  const handleAdvanceSimulation = () => {
    if (!activeReportToTrack) return;

    if (activeReportToTrack.stepIndex === 1) {
      // Advance to Worker Assigned
      const updated = {
        ...activeReportToTrack,
        stepIndex: 2,
        status: 'in_progress',
        statusLabel: 'Worker Assigned',
        assignedWorker: {
          name: 'Carlos Ramos',
          role: 'HVAC Technician',
        },
      };
      setActiveReportToTrack(updated);
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        in_progress: prev.in_progress + 1,
      }));
      showToast(`Technician Carlos Ramos assigned to ${updated.ticket_number}!`);
    } else if (activeReportToTrack.stepIndex === 2) {
      // Advance to Fixed / Resolved
      const updated = {
        ...activeReportToTrack,
        stepIndex: 3,
        status: 'resolved',
        statusLabel: 'Fixed & Verified',
      };
      setActiveReportToTrack(updated);
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setStats((prev) => ({
        ...prev,
        in_progress: Math.max(0, prev.in_progress - 1),
        resolved: prev.resolved + 1,
      }));
      showToast(`Issue ${updated.ticket_number} marked as Resolved!`);
    }
  };

  // Delete a demo report
  const handleDeleteReport = (reportId) => {
    const target = reports.find((r) => r.id === reportId);
    if (!target) return;

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setStats((prev) => ({
      total: Math.max(0, prev.total - 1),
      pending:
        target.status === 'pending_review'
          ? Math.max(0, prev.pending - 1)
          : prev.pending,
      in_progress:
        target.status === 'in_progress'
          ? Math.max(0, prev.in_progress - 1)
          : prev.in_progress,
      resolved:
        target.status === 'resolved'
          ? Math.max(0, prev.resolved - 1)
          : prev.resolved,
    }));
    showToast('Demo report removed.');
  };

  // Reset entire demo to pristine empty state (Image 2)
  const handleResetDemo = () => {
    setReports([]);
    setStats({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
    setActiveTab('home');
    setUnreadCount(0);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
    showToast('Demo reset to initial 0-reports state.');
  };

  // Filtered reports for My Reports tab
  const filteredReports = reports.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return r.status === 'pending_review';
    if (activeFilter === 'in_progress') return r.status === 'in_progress';
    if (activeFilter === 'resolved') return r.status === 'resolved';
    return true;
  });

  return (
    <div className="demo-dashboard-window">
      {/* ------------------------------------------------------------------
          Top Chrome Bar: Window Controls + Demo Mode Ribbon
          ------------------------------------------------------------------ */}
      <div className="demo-window-chrome">
        <div className="demo-window-dots">
          <span className="demo-window-dot demo-dot-red" />
          <span className="demo-window-dot demo-dot-yellow" />
          <span className="demo-window-dot demo-dot-green" />
          <span className="demo-window-title" style={{ marginLeft: 8 }}>
            FixMyCampus Student Portal
          </span>
        </div>

        <div className="demo-window-actions">
          <span className="demo-badge-pill" title="Limited feature student portal demonstration">
            <span className="demo-badge-pulse" />
            <span>Interactive Demo</span>
          </span>

          {reports.length > 0 && (
            <button
              type="button"
              className="demo-reset-btn"
              onClick={handleResetDemo}
              title="Reset demo back to 0 reports"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          App Navigation Bar (Exact Visual Match to FixMyCampus User Dashboard)
          ------------------------------------------------------------------ */}
      <header className="demo-navbar">
        {/* Left: Brand + Navigation Links */}
        <div className="demo-nav-left">
          <button
            type="button"
            className="demo-logo-box"
            onClick={() => setActiveTab('home')}
            title="FixMyCampus"
          >
            <div className="demo-logo-icon">
              <Wrench size={16} strokeWidth={2.4} />
            </div>
            <span className="demo-logo-text">FixMyCampus</span>
          </button>

          <nav className="demo-nav-links" aria-label="Portal Navigation">
            <button
              type="button"
              className={`demo-nav-link ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`demo-nav-link ${activeTab === 'my-reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-reports')}
            >
              My Reports
              {reports.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: '0.7rem',
                    background: '#ecfdf5',
                    color: '#059669',
                    padding: '1px 6px',
                    borderRadius: 9999,
                    fontWeight: 700,
                  }}
                >
                  {reports.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className="demo-nav-link"
              onClick={() => setIsReportModalOpen(true)}
              title="Report an issue in this demo"
            >
              Report Issue
            </button>
          </nav>
        </div>

        {/* Right: Notifications Bell & User Profile */}
        <div className="demo-nav-right">
          {/* Notification Bell */}
          <button
            type="button"
            className="demo-notif-btn"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
              if (unreadCount > 0) setUnreadCount(0);
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="demo-notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* User Profile Pill */}
          <button
            type="button"
            className="demo-user-profile-btn"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            title="User Account"
          >
            <div className="demo-user-avatar">
              <User size={16} />
            </div>
            <span className="demo-user-name">{displayName}</span>
            <ChevronDown
              size={13}
              className={`demo-profile-chevron ${isProfileOpen ? 'open' : ''}`}
            />
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className="demo-popover demo-notif-popover">
              <div className="demo-notif-header">
                <span>Campus Activity</span>
                <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Live Updates</span>
              </div>
              {reports.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px 4px' }}>
                  🎉 Welcome to FixMyCampus Demo! Try reporting an issue to see live dispatch updates.
                </div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="demo-notif-item">
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Status: {r.statusLabel} &bull; {r.location}
                    </div>
                    <div className="demo-notif-time">Just now</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Profile Popover Dropdown */}
          {isProfileOpen && (
            <div className="demo-popover demo-profile-dropdown">
              <div className="demo-profile-header">
                <div className="demo-profile-fullname">{displayName}</div>
                <div className="demo-profile-role">Student Account &bull; Demo Mode</div>
              </div>

              <button
                type="button"
                className="demo-profile-action-btn"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsReportModalOpen(true);
                }}
              >
                <Plus size={14} />
                <span>Simulate Quick Report</span>
              </button>

              <button
                type="button"
                className="demo-profile-action-btn"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleResetDemo();
                }}
              >
                <RotateCcw size={14} />
                <span>Reset Demo to Zero</span>
              </button>

              <button
                type="button"
                className="demo-profile-action-btn"
                style={{ color: '#059669', fontWeight: 600 }}
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigate && onNavigate(currentUser ? 'dashboard' : 'login');
                }}
              >
                <ExternalLink size={14} />
                <span>Open Full Portal</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Floating Demo Toast */}
      {toastMessage && (
        <div className="demo-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------
          Main Dashboard Canvas
          ------------------------------------------------------------------ */}
      <main className="demo-canvas">
        {activeTab === 'home' ? (
          <>
            {/* Welcome Row: Greeting + Report Issue Button */}
            <section className="demo-welcome-row">
              <div className="demo-welcome-text">
                <h2>{getGreeting()}, {firstName}!</h2>
                <p>Help us keep the campus safe, clean, and functional.</p>
              </div>

              <button
                type="button"
                className="demo-btn-primary"
                onClick={() => setIsReportModalOpen(true)}
                title="Click to simulate reporting a facility defect"
                id="hero-demo-report-btn"
              >
                <Plus size={16} strokeWidth={2.6} />
                <span>Report a Facility Issue</span>
              </button>
            </section>

            {/* 4 Stat Metric Cards (Matching Image 2) */}
            <section className="demo-stats-grid" aria-label="Campus Reports Overview">
              {/* Total Reports */}
              <div className="demo-stat-card">
                <span className="demo-stat-label">TOTAL REPORTS</span>
                <div className="demo-stat-body">
                  <span className="demo-stat-number">{stats.total}</span>
                  <div className="demo-stat-icon-box indigo" title="Total Reports">
                    <BarChart2 size={17} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Pending Review */}
              <div className="demo-stat-card">
                <span className="demo-stat-label">PENDING REVIEW</span>
                <div className="demo-stat-body">
                  <span className="demo-stat-number amber">{stats.pending}</span>
                  <div className="demo-stat-icon-box amber" title="Pending Reviews">
                    <BarChart2 size={17} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div className="demo-stat-card">
                <span className="demo-stat-label">IN PROGRESS</span>
                <div className="demo-stat-body">
                  <span className="demo-stat-number blue">{stats.in_progress}</span>
                  <div className="demo-stat-icon-box blue" title="Active Repairs">
                    <BarChart2 size={17} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Fixed / Resolved */}
              <div className="demo-stat-card">
                <span className="demo-stat-label">FIXED / RESOLVED</span>
                <div className="demo-stat-body">
                  <span className="demo-stat-number green">{stats.resolved}</span>
                  <div className="demo-stat-icon-box green" title="Resolved Issues">
                    <BarChart2 size={17} strokeWidth={2} />
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Reports Section */}
            <section className="demo-section">
              <div className="demo-section-header">
                <h3>Recent Reports</h3>
                {reports.length > 0 && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.8rem',
                      color: '#059669',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setActiveTab('my-reports')}
                  >
                    View all ({reports.length}) &rarr;
                  </button>
                )}
              </div>

              {/* Exact Image 2 Empty State when reports === 0 */}
              {reports.length === 0 ? (
                <div className="demo-empty-state-card">
                  <div className="demo-empty-icon-circle">
                    <Camera size={23} />
                  </div>
                  <h4 className="demo-empty-title">
                    No Defect Reports Submitted Yet
                  </h4>
                  <p className="demo-empty-desc">
                    All campus statistics start at zero until an issue is filed.
                    Help keep the campus safe, clean, and functional by reporting your first defect!
                  </p>
                  <button
                    type="button"
                    className="demo-btn-primary"
                    style={{ marginTop: 8 }}
                    onClick={() => setIsReportModalOpen(true)}
                    id="hero-demo-empty-report-btn"
                  >
                    <Plus size={16} strokeWidth={2.6} />
                    <span>Report a Facility Issue</span>
                  </button>
                </div>
              ) : (
                /* Dynamic Interactive Reports Grid when reports are filed */
                <div className="demo-reports-grid">
                  {reports.map((report) => (
                    <article key={report.id} className="demo-report-card">
                      <div className="demo-report-img-wrapper">
                        <img
                          src={report.image}
                          alt={report.title}
                          className="demo-report-img"
                        />
                        <span className="demo-report-priority-badge">
                          {report.priority}
                        </span>
                      </div>

                      <div className="demo-report-content">
                        <h4 className="demo-report-title">{report.title}</h4>
                        <p className="demo-report-location">
                          <MapPin size={13} style={{ flexShrink: 0, color: '#059669' }} />
                          <span>{report.location}</span>
                        </p>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Reported: {report.date} &bull; SLA: {report.sla}
                        </span>

                        <div className="demo-report-footer">
                          <span
                            className={`demo-status-pill ${
                              report.status === 'resolved'
                                ? 'demo-status-resolved'
                                : report.status === 'in_progress'
                                ? 'demo-status-assigned'
                                : 'demo-status-pending'
                            }`}
                          >
                            {report.statusLabel}
                          </span>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="demo-track-btn"
                              onClick={() => {
                                setActiveReportToTrack(report);
                                setIsTrackingModalOpen(true);
                              }}
                              title="Inspect real-time tracking timeline"
                            >
                              Track Status
                            </button>
                            <button
                              type="button"
                              className="demo-track-btn"
                              style={{ color: '#ef4444', borderColor: '#fecaca' }}
                              onClick={() => handleDeleteReport(report.id)}
                              title="Delete demo report"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* My Reports View inside Mockup */
          <section className="demo-section">
            <div className="demo-section-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>My Submitted Reports</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Track and verify all facility tickets you have filed across campus.
                </p>
              </div>

              <button
                type="button"
                className="demo-btn-primary"
                onClick={() => setIsReportModalOpen(true)}
              >
                <Plus size={15} />
                <span>New Defect</span>
              </button>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['all', 'pending', 'in_progress', 'resolved'].map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setActiveFilter(filterKey)}
                  style={{
                    background: activeFilter === filterKey ? '#059669' : '#ffffff',
                    color: activeFilter === filterKey ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: activeFilter === filterKey ? '#059669' : '#e2e8f0',
                    borderRadius: 9999,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filterKey.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="demo-empty-state-card" style={{ padding: '2.5rem 1rem' }}>
                <FileText size={32} style={{ color: '#94a3b8' }} />
                <h4 className="demo-empty-title">No matching reports found</h4>
                <p className="demo-empty-desc">
                  Try reporting a test defect or switch back to the main overview.
                </p>
                <button
                  type="button"
                  className="demo-track-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => setActiveTab('home')}
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <div className="demo-reports-grid">
                {filteredReports.map((report) => (
                  <article key={report.id} className="demo-report-card">
                    <div className="demo-report-img-wrapper">
                      <img
                        src={report.image}
                        alt={report.title}
                        className="demo-report-img"
                      />
                      <span className="demo-report-priority-badge">
                        {report.priority}
                      </span>
                    </div>

                    <div className="demo-report-content">
                      <h4 className="demo-report-title">{report.title}</h4>
                      <p className="demo-report-location">
                        <MapPin size={13} style={{ flexShrink: 0, color: '#059669' }} />
                        <span>{report.location}</span>
                      </p>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Ticket: {report.ticket_number} &bull; SLA: {report.sla}
                      </span>

                      <div className="demo-report-footer">
                        <span
                          className={`demo-status-pill ${
                            report.status === 'resolved'
                              ? 'demo-status-resolved'
                              : report.status === 'in_progress'
                              ? 'demo-status-assigned'
                              : 'demo-status-pending'
                          }`}
                        >
                          {report.statusLabel}
                        </span>

                        <button
                          type="button"
                          className="demo-track-btn"
                          onClick={() => {
                            setActiveReportToTrack(report);
                            setIsTrackingModalOpen(true);
                          }}
                        >
                          Track Status
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ------------------------------------------------------------------
          Quick Demo Report Issue Modal (Limited Feature Simulation)
          ------------------------------------------------------------------ */}
      {isReportModalOpen && (
        <div className="demo-modal-overlay" onClick={() => setIsReportModalOpen(false)}>
          <div
            className="demo-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="demo-modal-header">
              <div>
                <h4>Report Campus Defect</h4>
                <p>Interactive student reporting demo with limited presets</p>
              </div>
              <button
                type="button"
                className="demo-modal-close"
                onClick={() => setIsReportModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="demo-modal-body">
              <span className="demo-preset-label">Choose a defect preset to simulate:</span>

              <div className="demo-presets-row">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`demo-preset-card ${
                      selectedPreset.id === preset.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedPreset(preset)}
                  >
                    <div className="demo-preset-icon">{preset.icon}</div>
                    <div className="demo-preset-info">
                      <div className="demo-preset-title">{preset.title}</div>
                      <div className="demo-preset-meta">
                        {preset.building} &bull; {preset.room} &bull; {preset.priority}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Limited demo notice */}
              <div className="demo-limited-notice">
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Limited Demo Features:</strong> Photo upload, GPS map pin, and
                  direct technician SMS notifications are simulated. Sign up to submit verified campus work orders.
                </div>
              </div>
            </div>

            <div className="demo-modal-footer">
              <button
                type="button"
                className="demo-modal-full-link"
                onClick={() => {
                  setIsReportModalOpen(false);
                  onNavigate && onNavigate(currentUser ? 'report-issue' : 'login');
                }}
              >
                Open Full Report Wizard ↗
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="demo-track-btn"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="demo-btn-primary"
                  onClick={handleSubmitDemoReport}
                >
                  <Plus size={15} />
                  <span>Submit Demo Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          Live Status Tracking Simulation Modal
          ------------------------------------------------------------------ */}
      {isTrackingModalOpen && activeReportToTrack && (
        <div className="demo-modal-overlay" onClick={() => setIsTrackingModalOpen(false)}>
          <div
            className="demo-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="demo-modal-header">
              <div>
                <h4>Ticket {activeReportToTrack.ticket_number}</h4>
                <p>{activeReportToTrack.title}</p>
              </div>
              <button
                type="button"
                className="demo-modal-close"
                onClick={() => setIsTrackingModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="demo-modal-body">
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#059669' }} />
                <span>{activeReportToTrack.location} &bull; Target SLA: {activeReportToTrack.sla}</span>
              </div>

              <div className="demo-timeline" style={{ marginTop: 12 }}>
                <div
                  className={`demo-timeline-step ${
                    activeReportToTrack.stepIndex >= 0 ? 'done' : ''
                  }`}
                >
                  <span className="demo-timeline-title">1. Defect Reported</span>
                  <span className="demo-timeline-desc">
                    Logged by {displayName} via Student Portal
                  </span>
                </div>

                <div
                  className={`demo-timeline-step ${
                    activeReportToTrack.stepIndex > 1
                      ? 'done'
                      : activeReportToTrack.stepIndex === 1
                      ? 'active'
                      : ''
                  }`}
                >
                  <span className="demo-timeline-title">2. Under Facilities Review</span>
                  <span className="demo-timeline-desc">
                    Maintenance dispatch assessing priority and allocating staff
                  </span>
                </div>

                <div
                  className={`demo-timeline-step ${
                    activeReportToTrack.stepIndex > 2
                      ? 'done'
                      : activeReportToTrack.stepIndex === 2
                      ? 'active'
                      : ''
                  }`}
                >
                  <span className="demo-timeline-title">3. Technician Assigned</span>
                  <span className="demo-timeline-desc">
                    {activeReportToTrack.assignedWorker
                      ? `${activeReportToTrack.assignedWorker.name} (${activeReportToTrack.assignedWorker.role})`
                      : 'Pending technician dispatch'}
                  </span>
                </div>

                <div
                  className={`demo-timeline-step ${
                    activeReportToTrack.stepIndex >= 3 ? 'done' : ''
                  }`}
                >
                  <span className="demo-timeline-title">4. Repair Fixed & Verified</span>
                  <span className="demo-timeline-desc">
                    Defect repaired with photo inspection and closed
                  </span>
                </div>
              </div>

              {activeReportToTrack.stepIndex < 3 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Simulate real-time status update:</span>
                  <button
                    type="button"
                    className="demo-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={handleAdvanceSimulation}
                  >
                    Advance Step ⚡
                  </button>
                </div>
              )}
            </div>

            <div className="demo-modal-footer">
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                FixMyCampus Real-time Status Sync
              </span>
              <button
                type="button"
                className="demo-btn-primary"
                onClick={() => setIsTrackingModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
