import React, { useState, useEffect } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Bell,
  User,
  LogOut,
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
} from 'lucide-react';
import { fetchReports, updateReportStatus } from '../../services/api';
import './maintenanceDashboard.css';

// Initial default jobs matching the user's design screenshots
const DEFAULT_JOBS = [
  {
    id: 102,
    ticket_number: 'FM-102',
    title: 'Broken Air Conditioner',
    category_name: 'Air Conditioning',
    location_name: 'Engineering Bldg • 3rd Flr • Rm 304',
    location_summary: 'Engineering Building • Room 304',
    priority: 'high',
    status: 'assigned',
    assigned_date: 'Aug 26, 2026',
    reported_date: 'August 25, 2026',
    reporter_name: 'Alex Johnson (Student)',
    description:
      'The AC unit in Room 304 is leaking water heavily and blowing warm air instead of cooling the room.',
    image_url: '/images/hero_ac_defect.jpg',
    stepper_assigned_worker: 'Mark Santos Assigned',
  },
  {
    id: 103,
    ticket_number: 'FM-103',
    title: 'Faulty Electrical Outlet',
    category_name: 'Electrical & Lighting',
    location_name: 'Main Bldg • 2nd Flr • Rm 201',
    location_summary: 'Main Building • Room 201',
    priority: 'medium',
    status: 'assigned',
    assigned_date: 'Aug 27, 2026',
    reported_date: 'August 26, 2026',
    reporter_name: 'Prof. Robert Vance (Faculty)',
    description:
      'Outlet sparks intermittently when plugging in laptop charger. Needs socket inspection and breaker check.',
    image_url: '/images/faulty_light_switch.jpg',
    stepper_assigned_worker: 'Carlos Ramos Assigned',
  },
  {
    id: 104,
    ticket_number: 'FM-104',
    title: 'Leaking Faucet',
    category_name: 'Plumbing & Restroom',
    location_name: 'Science Bldg • 1st Flr • Restroom 102',
    location_summary: 'Science Building • Room 102',
    priority: 'high',
    status: 'in_progress',
    assigned_date: 'Aug 28, 2026',
    reported_date: 'August 27, 2026',
    reporter_name: 'Emily Chen (Student)',
    description:
      'Wash basin faucet does not shut off completely, wasting water all day and creating a slip hazard near entrance.',
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    stepper_assigned_worker: 'John Miller Assigned',
  },
  {
    id: 105,
    ticket_number: 'FM-105',
    title: 'Broken Window Lock',
    category_name: 'Carpentry & Hardware',
    location_name: 'Library • 3rd Flr • Rm 305',
    location_summary: 'Library • Room 305',
    priority: 'low',
    status: 'assigned',
    assigned_date: 'Aug 29, 2026',
    reported_date: 'August 28, 2026',
    reporter_name: 'Dr. Sarah Smith (Faculty)',
    description:
      'Sliding window lock on north wall is loose and slips out of track, leaving the room open during windy days.',
    image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    stepper_assigned_worker: 'Carlos Ramos Assigned',
  },
  {
    id: 106,
    ticket_number: 'FM-106',
    title: 'Malfunctioning Projector',
    category_name: 'AV & Classroom Equipment',
    location_name: 'Student Center • 4th Flr • Rm 401',
    location_summary: 'Student Center • Room 401',
    priority: 'urgent',
    status: 'assigned',
    assigned_date: 'Aug 30, 2026',
    reported_date: 'August 29, 2026',
    reporter_name: 'Carlos Reyes (Student)',
    description:
      'Ceiling mounted projector bulb flashes red and shuts down after 5 minutes of operation. Audio passes through normally.',
    image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
    stepper_assigned_worker: 'John Miller Assigned',
  },
];

export default function MaintenanceStaffDashboard({
  currentUser,
  onNavigate,
  onLogout,
}) {
  // Navigation / active section
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'assigned', 'completed', 'notifications', 'profile'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'high', 'medium', 'low'

  // Data & jobs list state
  const [jobs, setJobs] = useState(DEFAULT_JOBS);
  const [toastMessage, setToastMessage] = useState('');

  // Job Details completion form state
  const [completionNotes, setCompletionNotes] = useState('');
  const [proofPhotoPreview, setProofPhotoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayName = currentUser?.full_name || 'Rendil Robosa';
  const firstName = displayName.split(' ')[0] || 'Mark';
  const displayRole = 'Maintenance Staff';

  // Merge live API reports if available
  useEffect(() => {
    fetchReports().then((res) => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Map any API tickets that are assigned or in progress
        const mappedApi = res.data.map((r) => ({
          id: r.id,
          ticket_number: r.ticket_number || `FM-${r.id}`,
          title: r.title,
          category_name: r.category_name || 'General Maintenance',
          location_name: `${r.building_name || 'Main Bldg'} • ${r.room_number || r.specific_area || 'Room 101'}`,
          location_summary: `${r.building_name?.split(' ')[0] || 'Main'} Building • ${r.room_number || 'Room 101'}`,
          priority: (r.priority || 'medium').toLowerCase(),
          status: r.status || 'assigned',
          assigned_date: 'Aug 26, 2026',
          reported_date: 'August 25, 2026',
          reporter_name: `${r.reporter_name || 'Alex Johnson'} (Student)`,
          description: r.description,
          image_url: r.primary_photo || r.image_url || '/images/hero_ac_defect.jpg',
          stepper_assigned_worker: r.worker_name ? `${r.worker_name} Assigned` : 'Mark Santos Assigned',
        }));

        // Merge keeping DEFAULT_JOBS priority for visual consistency with screenshot
        const existingIds = new Set(DEFAULT_JOBS.map((j) => j.id));
        const filteredNew = mappedApi.filter((m) => !existingIds.has(m.id));
        setJobs([...DEFAULT_JOBS, ...filteredNew]);
      }
    });
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const handleStartRepair = (jobId, e) => {
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
    updateReportStatus({ report_id: jobId, status: 'in_progress', remarks: 'Work started by Maintenance Staff' }).catch(() => {});
  };

  const handleConfirmCompletion = (jobId) => {
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
    setCompletionNotes('');
    setProofPhotoPreview(null);
    updateReportStatus({ report_id: jobId, status: 'resolved', remarks: completionNotes || 'Repair signed off by Maintenance Staff' }).catch(() => {});
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProofPhotoPreview(url);
    }
  };

  // Selected job for detail view
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // Dynamic Metrics Calculation
  const assignedJobsCount = jobs.filter((j) => j.status !== 'resolved' && j.status !== 'closed').length;
  const inProgressCount = jobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = 38 + jobs.filter((j) => j.status === 'resolved' || j.status === 'closed').length;
  const overdueCount = 1;

  // Filtered Jobs based on tab and priority
  let displayedJobs = jobs;
  if (activeTab === 'completed') {
    displayedJobs = jobs.filter((j) => j.status === 'resolved' || j.status === 'closed');
  } else if (activeTab === 'assigned') {
    displayedJobs = jobs.filter((j) => j.status !== 'resolved' && j.status !== 'closed');
  }

  if (priorityFilter !== 'all') {
    displayedJobs = displayedJobs.filter(
      (j) => j.priority.toLowerCase() === priorityFilter.toLowerCase()
    );
  }

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
              className={`maint-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                setSelectedJobId(null);
                showToast('You have 3 unread priority job alerts.');
              }}
            >
              <div className="maint-nav-label-box">
                <Bell size={18} />
                <span>Notifications</span>
              </div>
              <span className="maint-badge-count">3</span>
            </button>

            <button
              type="button"
              className={`maint-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setSelectedJobId(null);
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
          <div className="maint-user-link">
            <div className="maint-avatar">
              <User size={20} />
            </div>
            <div className="maint-user-meta">
              <span className="maint-user-name">{displayName}</span>
              <span className="maint-user-role">{displayRole}</span>
            </div>
          </div>
          <button
            type="button"
            className="maint-logout-btn"
            title="Log Out"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ====================================================================
          Main Content View
          ==================================================================== */}
      <main className="maint-main">
        {selectedJobId !== null ? (
          /* ================================================================
             SCREEN 2: Job Details View (FM-102)
             ================================================================ */
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
                    <span className="maint-step-sub">Aug 25, 2:30 PM</span>
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
                    <span className="maint-step-sub">Aug 25, 4:15 PM</span>
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
                      {selectedJob.stepper_assigned_worker || 'Mark Santos Assigned'}
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
          </div>
        )}
      </main>
    </div>
  );
}
