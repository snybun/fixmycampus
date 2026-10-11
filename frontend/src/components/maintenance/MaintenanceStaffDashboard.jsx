import React, { useState, useEffect } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Bell,
  User,
  Calendar,
  ArrowLeft,
  Camera,
  SlidersHorizontal,
  List,
  AlertTriangle,
  UploadCloud,
  Check,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { fetchReports, updateReportStatus, assignReport } from '../../services/api';
import MaintenanceNotificationsView from './MaintenanceNotificationsView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import './maintenanceDashboard.css';

// Format date helper for database timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format date and time helper
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Compute overdue status based on ticket SLA hours and reported_at timestamp
const isReportOverdue = (job) => {
  if (!job) return false;
  if (['resolved', 'closed', 'rejected'].includes(job.status)) return false;
  const reportedTime = job.reported_at
    ? new Date(String(job.reported_at).replace(' ', 'T')).getTime()
    : null;
  if (!reportedTime) return false;
  const slaHours = Number(job.sla_hours) || 24;
  const deadlineTime = reportedTime + slaHours * 3600 * 1000;
  return Date.now() > deadlineTime;
};

// Transform database report row into maintenance job object
const mapApiReportToJob = (r, defaultWorkerName = 'Maintenance Staff') => {
  const buildingName = r.building_name || 'Campus Building';
  const roomOrArea = r.room_number || r.specific_area || 'Facility';
  const locationSummary = `${buildingName} • ${roomOrArea}`;
  const locationDetail = `${buildingName}${r.floor_name ? ` • ${r.floor_name}` : ''} • ${roomOrArea}`;

  const assignedDate = r.assigned_at
    ? formatDate(r.assigned_at)
    : r.updated_at
    ? formatDate(r.updated_at)
    : formatDate(r.reported_at);

  const assignedWorkerName = r.worker_name || defaultWorkerName;

  return {
    id: r.id,
    ticket_number: r.ticket_number || `FMC-${r.id}`,
    title: r.title,
    category_name: r.category_name || 'General Maintenance',
    location_name: locationDetail,
    location_summary: locationSummary,
    priority: (r.priority || 'medium').toLowerCase(),
    status: r.status || 'assigned',
    assigned_date: assignedDate,
    reported_date: formatDate(r.reported_at),
    reported_time_str: formatDateTime(r.reported_at),
    reporter_name: r.reporter_name
      ? `${r.reporter_name} (${r.reporter_department || 'Student'})`
      : 'Alex Johnson (Student)',
    description: r.description || 'No description provided.',
    image_url: r.primary_photo || r.image_url || '/images/hero_ac_defect.jpg',
    stepper_assigned_worker: `${assignedWorkerName} Assigned`,
    worker_id: r.worker_id,
    worker_name: r.worker_name,
    sla_hours: r.sla_hours || 24,
    reported_at: r.reported_at,
    updated_at: r.updated_at,
  };
};

export default function MaintenanceStaffDashboard({
  currentUser,
  onNavigate,
  onLogout,
}) {
  // Navigation / active section
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'assigned', 'completed', 'notifications', 'profile'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Live Database Reports state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Job Details completion form state
  const [completionNotes, setCompletionNotes] = useState('');
  const [proofPhotoPreview, setProofPhotoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayName = currentUser?.full_name || 'Juan Dela Cruz';
  const firstName = displayName.split(' ')[0] || 'Staff';
  const displayRole = currentUser?.department
    ? `${currentUser.department} • Staff`
    : 'Maintenance Staff';

  // Load real tickets from database via API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchReports({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && Array.isArray(res.data)) {
          const mappedApi = res.data.map((r) => mapApiReportToJob(r, displayName));
          setJobs(mappedApi);
        } else {
          setJobs([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching maintenance reports from database:', err);
        setJobs([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [displayName, refreshKey]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const handleStartRepair = async (jobId, e) => {
    if (e) e.stopPropagation();
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: 'in_progress',
              repair_started_at: 'Just now',
            }
          : job
      )
    );
    showToast('Repair marked as In Progress!');

    try {
      await updateReportStatus({
        report_id: jobId,
        status: 'in_progress',
        remarks: `Work started by ${displayName}`,
        changed_by: currentUser?.id || 1,
      });

      if (currentUser?.id) {
        assignReport({
          report_id: jobId,
          assigned_to: currentUser.id,
          assigned_by: currentUser.id,
          notes: `Assigned upon repair start by ${displayName}`,
        }).catch(() => {});
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  };

  const handleConfirmCompletion = async (jobId) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: 'resolved',
              completed_at: 'Just now',
              completion_notes: completionNotes,
              completion_photo: proofPhotoPreview,
            }
          : job
      )
    );
    showToast('Job marked as Fixed and Completed!');
    const notes = completionNotes;
    setCompletionNotes('');
    setProofPhotoPreview(null);

    try {
      await updateReportStatus({
        report_id: jobId,
        status: 'resolved',
        remarks: notes || `Repair verified and signed off by ${displayName}`,
        changed_by: currentUser?.id || 1,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to complete report on server:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProofPhotoPreview(url);
    }
  };

  // Dynamic Metrics Calculation directly from database reports
  const assignedJobsCount = jobs.filter((j) => j.status === 'assigned').length;
  const inProgressCount = jobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = jobs.filter(
    (j) => j.status === 'resolved' || j.status === 'closed'
  ).length;
  const overdueCount = jobs.filter(isReportOverdue).length;

  // Filtered Jobs based on tab and priority
  let displayedJobs = jobs;
  if (activeTab === 'completed') {
    displayedJobs = jobs.filter((j) => j.status === 'resolved' || j.status === 'closed');
  } else if (activeTab === 'assigned') {
    displayedJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  } else {
    // Dashboard overview: show active assigned and in-progress jobs by default, or all if none
    const activeJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
    displayedJobs = activeJobs.length > 0 ? activeJobs : jobs;
  }

  if (priorityFilter !== 'all') {
    displayedJobs = displayedJobs.filter(
      (j) => j.priority.toLowerCase() === priorityFilter.toLowerCase()
    );
  }

  // Selected job for detail view
  const selectedJob =
    jobs.find((j) => j.id === selectedJobId) || displayedJobs[0] || jobs[0] || null;

  return (
    <div className="maint-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="maint-toast">
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          Left Sidebar (Specification)
          ==================================================================== */}
      <aside className="maint-sidebar">
        <div>
          {/* Brand Logo & Name */}
          <div
            className="maint-brand"
            onClick={() => {
              setSelectedJobId(null);
              setActiveTab('dashboard');
            }}
          >
            <div className="maint-brand-logo">
              <Wrench size={18} strokeWidth={2.5} />
            </div>
            <span className="maint-brand-title">FixMyCampus</span>
          </div>

          {/* Navigation Links */}
          <nav className="maint-nav">
            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'dashboard' && selectedJobId === null ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedJobId(null);
              }}
            >
              <div className="maint-nav-label-box">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'assigned' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('assigned');
                setSelectedJobId(null);
              }}
            >
              <div className="maint-nav-label-box">
                <ClipboardList size={18} />
                <span>Assigned Jobs</span>
              </div>
            </button>

            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('completed');
                setSelectedJobId(null);
              }}
            >
              <div className="maint-nav-label-box">
                <CheckCircle2 size={18} />
                <span>Completed Jobs</span>
              </div>
            </button>

            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'notifications' && selectedJobId === null ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                setSelectedJobId(null);
              }}
            >
              <div className="maint-nav-label-box">
                <Bell size={18} />
                <span>Notifications</span>
              </div>
              {unreadNotifCount > 0 && (
                <span className="maint-badge-count">{unreadNotifCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('settings');
                } else {
                  setActiveTab('profile');
                  setSelectedJobId(null);
                }
              }}
            >
              <div className="maint-nav-label-box">
                <User size={18} />
                <span>Profile</span>
              </div>
            </button>
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="maint-user-footer">
          <UserProfileDropdown
            currentUser={currentUser}
            onNavigate={onNavigate}
            onLogout={onLogout}
            direction="up"
            showSubInButton={true}
            subTitle={currentUser?.department ? `${currentUser.department} • Staff` : displayRole}
            fullWidth={true}
            idPrefix="maint-user"
          />
        </div>
      </aside>

      {/* ====================================================================
          Main Content View
          ==================================================================== */}
      <main className="maint-main">
        {selectedJobId !== null ? (
          !selectedJob ? (
            <div className="maint-empty-state">
              <ClipboardList size={40} className="maint-empty-icon" />
              <h4 className="maint-empty-title">Job Record Not Found</h4>
              <p className="maint-empty-desc">The selected maintenance job could not be loaded or has been removed.</p>
              <button
                type="button"
                className="maint-btn-details"
                style={{ marginTop: 16 }}
                onClick={() => setSelectedJobId(null)}
              >
                Return to Job List
              </button>
            </div>
          ) : (
            <div className="maint-details-view">
              {/* Header: Back Button & Title */}
              <div className="maint-details-header">
                <button
                  type="button"
                  className="maint-back-btn"
                  title="Back to Assigned Jobs"
                  onClick={() => setSelectedJobId(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="maint-details-title">
                  Job Details - {selectedJob.ticket_number || `FM-${selectedJob.id}`}
                </h2>
              </div>

            {/* Two-Column Grid: Left (Photo + Info) | Right (Actions + Completion) */}
            <div className="maint-details-grid">
              {/* Left Column */}
              <div className="maint-details-col">
                {/* 1. REPORTED ISSUE PHOTO */}
                <div className="maint-card">
                  <h4 className="maint-card-title">REPORTED ISSUE PHOTO</h4>
                  <div className="maint-photo-box">
                    <img
                      src={selectedJob.image_url}
                      alt={selectedJob.title}
                      className="maint-photo-img"
                      onError={(e) => {
                        e.target.src = '/images/hero_ac_defect.jpg';
                      }}
                    />
                  </div>
                </div>

                {/* 2. ISSUE INFORMATION */}
                <div className="maint-card">
                  <h4 className="maint-card-title">ISSUE INFORMATION</h4>
                  <div className="maint-info-grid">
                    <div className="maint-info-item">
                      <span className="maint-info-label">ISSUE</span>
                      <span className="maint-info-val">{selectedJob.title}</span>
                    </div>

                    <div className="maint-info-item">
                      <span className="maint-info-label">CATEGORY</span>
                      <span className="maint-info-val">{selectedJob.category_name}</span>
                    </div>

                    <div className="maint-info-item full-width">
                      <span className="maint-info-label">DESCRIPTION</span>
                      <p className="maint-info-desc">{selectedJob.description}</p>
                    </div>

                    <div className="maint-info-item">
                      <span className="maint-info-label">LOCATION</span>
                      <span className="maint-info-val">{selectedJob.location_name}</span>
                    </div>

                    <div className="maint-info-item">
                      <span className="maint-info-label">PRIORITY</span>
                      <div>
                        <span className={`maint-priority-badge ${selectedJob.priority}`}>
                          {selectedJob.priority.charAt(0).toUpperCase() + selectedJob.priority.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="maint-info-item">
                      <span className="maint-info-label">REPORTER</span>
                      <span className="maint-info-val">{selectedJob.reporter_name}</span>
                    </div>

                    <div className="maint-info-item">
                      <span className="maint-info-label">DATE REPORTED</span>
                      <span className="maint-info-val">{selectedJob.reported_date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="maint-details-col">
                {/* 1. JOB ACTIONS */}
                <div className="maint-card">
                  <h4 className="maint-card-title">JOB ACTIONS</h4>
                  <button
                    type="button"
                    className="maint-btn-action-primary"
                    onClick={() => handleStartRepair(selectedJob.id)}
                  >
                    {selectedJob.status === 'in_progress' ? 'Repair In Progress' : 'Start Repair'}
                  </button>
                  <button
                    type="button"
                    className={`maint-btn-action-secondary ${selectedJob.status === 'in_progress' ? 'enabled' : ''}`}
                    onClick={() => {
                      if (selectedJob.status === 'in_progress') {
                        handleConfirmCompletion(selectedJob.id);
                      } else {
                        showToast('Please start repair before marking as fixed.');
                      }
                    }}
                  >
                    Mark as Fixed
                  </button>
                </div>

                {/* 2. COMPLETION DETAILS */}
                <div className="maint-card">
                  <h4 className="maint-card-title">COMPLETION DETAILS</h4>

                  <span className="maint-field-label">Completion Photo</span>

                  {!proofPhotoPreview ? (
                    <label
                      htmlFor="maint-proof-upload"
                      className={`maint-dropzone ${isDragging ? 'drag-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          setProofPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    >
                      <input
                        id="maint-proof-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <div className="maint-dropzone-icon">
                        <Camera size={26} strokeWidth={1.75} />
                      </div>
                      <div className="maint-dropzone-text">Upload proof photo</div>
                    </label>
                  ) : (
                    <div className="maint-upload-preview-card">
                      <img src={proofPhotoPreview} alt="Proof preview" className="maint-preview-img" />
                      <div className="maint-preview-info">
                        <span className="maint-preview-status">
                          <Check size={14} strokeWidth={3} /> Proof photo attached
                        </span>
                        <label htmlFor="maint-proof-upload-replace" className="maint-btn-change-photo">
                          Change photo
                        </label>
                        <input
                          id="maint-proof-upload-replace"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
                      </div>
                      <button
                        type="button"
                        className="maint-btn-remove-photo"
                        title="Remove photo"
                        onClick={() => setProofPhotoPreview(null)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <label className="maint-field-label" style={{ marginTop: 16 }}>
                    Repair Notes
                  </label>
                  <textarea
                    className="maint-textarea"
                    placeholder="Describe the repairs performed..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />

                  <button
                    type="button"
                    className="maint-btn-confirm"
                    onClick={() => handleConfirmCompletion(selectedJob.id)}
                  >
                    Confirm Completion
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Card: WORK PROGRESS STEPPER */}
            <div className="maint-stepper-card">
              <h4 className="maint-card-title">WORK PROGRESS STEPPER</h4>
              <div className="maint-stepper">
                {/* Step 1: Reported */}
                <div className="maint-step">
                  <div className="maint-step-indicator done">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div className="maint-step-content">
                    <span className="maint-step-title">Reported</span>
                    <span className="maint-step-sub">{selectedJob.reported_time_str || selectedJob.reported_date}</span>
                  </div>
                </div>

                <div className="maint-step-line done" />

                {/* Step 2: Verified */}
                <div className="maint-step">
                  <div className="maint-step-indicator done">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div className="maint-step-content">
                    <span className="maint-step-title">Verified</span>
                    <span className="maint-step-sub">
                      {['assigned', 'in_progress', 'resolved'].includes(selectedJob.status)
                        ? 'Verified by Operations'
                        : 'Under Review'}
                    </span>
                  </div>
                </div>

                <div className="maint-step-line done" />

                {/* Step 3: Worker Assigned */}
                <div className="maint-step">
                  <div className="maint-step-indicator active">
                    <div className="maint-step-indicator dot" />
                  </div>
                  <div className="maint-step-content">
                    <span className="maint-step-title">Worker Assigned</span>
                    <span className="maint-step-sub">
                      {selectedJob.stepper_assigned_worker || `${displayName} Assigned`}
                    </span>
                  </div>
                </div>

                <div className={`maint-step-line ${selectedJob.status === 'in_progress' || selectedJob.status === 'resolved' ? 'done' : ''}`} />

                {/* Step 4: Repair Ongoing */}
                <div className={`maint-step ${selectedJob.status === 'in_progress' || selectedJob.status === 'resolved' ? '' : 'pending'}`}>
                  <div
                    className={`maint-step-indicator ${
                      selectedJob.status === 'resolved'
                        ? 'done'
                        : selectedJob.status === 'in_progress'
                        ? 'active'
                        : 'pending'
                    }`}
                  >
                    {selectedJob.status === 'resolved' ? (
                      <Check size={16} strokeWidth={3} />
                    ) : selectedJob.status === 'in_progress' ? (
                      <div className="maint-step-indicator dot" />
                    ) : null}
                  </div>
                  <div className="maint-step-content">
                    <span className="maint-step-title">Repair Ongoing</span>
                    <span className="maint-step-sub">
                      {selectedJob.status === 'in_progress' || selectedJob.status === 'resolved'
                        ? 'In Progress'
                        : 'Pending Action'}
                    </span>
                  </div>
                </div>

                <div className={`maint-step-line ${selectedJob.status === 'resolved' ? 'done' : ''}`} />

                {/* Step 5: Fixed */}
                <div className={`maint-step ${selectedJob.status === 'resolved' ? '' : 'pending'}`}>
                  <div className={`maint-step-indicator ${selectedJob.status === 'resolved' ? 'done' : 'pending'}`}>
                    {selectedJob.status === 'resolved' ? <Check size={16} strokeWidth={3} /> : null}
                  </div>
                  <div className="maint-step-content">
                    <span className="maint-step-title">Fixed</span>
                    <span className="maint-step-sub">
                      {selectedJob.status === 'resolved' ? 'Signed off' : 'Awaiting finish'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        ) : activeTab === 'notifications' ? (
          /* ================================================================
             SCREEN 3: Maintenance Notifications View
             ================================================================ */
          <MaintenanceNotificationsView
            onViewJob={(jobId) => {
              setSelectedJobId(jobId);
            }}
            onStartRepair={handleStartRepair}
            jobs={jobs}
            currentUser={currentUser}
            onUnreadChange={setUnreadNotifCount}
            showToast={showToast}
          />
        ) : (
          /* ================================================================
             SCREEN 1: Dashboard Overview (Assigned Jobs List & Metric Cards)
             ================================================================ */
          <div>
            {/* Greeting Header */}
            <div className="maint-header">
              <h1 className="maint-greeting">Good morning, {firstName}!</h1>
              <p className="maint-subtext">Here are your assigned maintenance tasks.</p>
            </div>

            {/* 4 Metric Cards */}
            <div className="maint-stats-grid">
              {/* 1. ASSIGNED JOBS */}
              <div className="maint-stat-card">
                <div className="maint-stat-top">
                  <span className="maint-stat-label">ASSIGNED JOBS</span>
                  <div className="maint-stat-icon gray">
                    <List size={18} />
                  </div>
                </div>
                <div className="maint-stat-value">{assignedJobsCount}</div>
              </div>

              {/* 2. IN PROGRESS */}
              <div className="maint-stat-card">
                <div className="maint-stat-top">
                  <span className="maint-stat-label">IN PROGRESS</span>
                  <div className="maint-stat-icon orange">
                    <SlidersHorizontal size={18} />
                  </div>
                </div>
                <div className="maint-stat-value">{inProgressCount}</div>
              </div>

              {/* 3. COMPLETED */}
              <div className="maint-stat-card">
                <div className="maint-stat-top">
                  <span className="maint-stat-label">COMPLETED</span>
                  <div className="maint-stat-icon green">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="maint-stat-value">{completedCount}</div>
              </div>

              {/* 4. OVERDUE */}
              <div className="maint-stat-card">
                <div className="maint-stat-top">
                  <span className="maint-stat-label">OVERDUE</span>
                  <div className="maint-stat-icon red">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="maint-stat-value">{overdueCount}</div>
              </div>
            </div>

            {/* Section Header & Priority Filter Tabs */}
            <div className="maint-section-bar">
              <h3 className="maint-section-title">
                Your Assigned Jobs ({displayedJobs.length})
              </h3>

              <div className="maint-filter-tabs">
                <button
                  type="button"
                  className={`maint-filter-tab ${priorityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('all')}
                >
                  All Priorities
                </button>
                <button
                  type="button"
                  className={`maint-filter-tab ${priorityFilter === 'high' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('high')}
                >
                  High
                </button>
                <button
                  type="button"
                  className={`maint-filter-tab ${priorityFilter === 'medium' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('medium')}
                >
                  Medium
                </button>
                <button
                  type="button"
                  className={`maint-filter-tab ${priorityFilter === 'low' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('low')}
                >
                  Low
                </button>
              </div>
            </div>

            {/* Job Cards List */}
            {loading ? (
              <div className="maint-empty-state">
                <div className="maint-loading-spinner" />
                <h4 className="maint-empty-title">Loading maintenance jobs...</h4>
                <p className="maint-empty-desc">Fetching assigned tasks and defect records from the database.</p>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="maint-empty-state">
                <ClipboardList size={40} className="maint-empty-icon" />
                <h4 className="maint-empty-title">
                  {priorityFilter !== 'all'
                    ? `No ${priorityFilter.toUpperCase()} priority tasks`
                    : activeTab === 'completed'
                    ? 'No completed tasks yet'
                    : 'No assigned maintenance tasks'}
                </h4>
                <p className="maint-empty-desc">
                  {priorityFilter !== 'all'
                    ? `There are no maintenance tasks with ${priorityFilter} priority in this queue.`
                    : activeTab === 'completed'
                    ? 'Completed repair tickets will show up here.'
                    : 'All campus defect reports have been resolved or are awaiting assignment.'}
                </p>
              </div>
            ) : (
              <div className="maint-jobs-list">
                {displayedJobs.map((job) => {
                  const isOngoing = job.status === 'in_progress';
                  const isFixed = job.status === 'resolved' || job.status === 'closed';

                  return (
                    <div
                      key={job.id}
                      className={`maint-job-card priority-${job.priority}`}
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="maint-job-left">
                        <img
                          src={job.image_url}
                          alt={job.title}
                          className="maint-job-thumb"
                          onError={(e) => {
                            e.target.src = '/images/hero_ac_defect.jpg';
                          }}
                        />
                        <div className="maint-job-info">
                          <h4 className="maint-job-title">{job.title}</h4>
                          <div className="maint-job-location">{job.location_summary}</div>
                          <div className="maint-job-meta-row">
                            <span className={`maint-priority-badge ${job.priority}`}>
                              {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                            </span>
                            <span className="maint-job-assigned-date">
                              <Calendar size={13} />
                              Assigned: {job.assigned_date}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="maint-job-actions">
                        <button
                          type="button"
                          className="maint-btn-details"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className={`maint-btn-start ${isFixed ? 'completed' : isOngoing ? 'in-progress' : ''}`}
                          onClick={(e) => {
                            if (!isFixed) {
                              handleStartRepair(job.id, e);
                            }
                          }}
                        >
                          {isFixed ? 'Completed' : isOngoing ? 'In Progress' : 'Start Repair'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
