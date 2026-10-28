import React, { useState, useEffect } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Bell,
  User,
  Users,
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
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquareQuote,
} from 'lucide-react';
import { fetchReports, updateReportStatus, fetchNotifications } from '../../services/api';
import { exportReportsToExcel } from '../../utils/exportToExcel';
import ConfirmationModal from '../common/ConfirmationModal';
import MaintenanceNotificationsView from './MaintenanceNotificationsView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import ReportFeedback from '../feedback/ReportFeedback';
import FeedbackOverview from '../feedback/FeedbackOverview';
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

// Priority display label helper: Map 'emergency' to 'Urgent' to match student view
const getPriorityLabel = (priority) => {
  const p = String(priority || '').toLowerCase();
  if (p === 'emergency' || p === 'urgent') return 'Urgent';
  if (p === 'high') return 'High';
  if (p === 'medium') return 'Medium';
  if (p === 'low') return 'Low';
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium';
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
    confirmation_count: Number(r.confirmation_count || 1),
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, priorityFilter]);

  // Live Database Reports state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Job Details completion form state
  const [completionNotes, setCompletionNotes] = useState('');
  const [proofPhotoPreview, setProofPhotoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Confirmation modal state for submitting completed report
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [jobToComplete, setJobToComplete] = useState(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Confirmation modal state for starting repair
  const [showStartRepairModal, setShowStartRepairModal] = useState(false);
  const [jobToStartRepair, setJobToStartRepair] = useState(null);
  const [isStartingRepair, setIsStartingRepair] = useState(false);

  const displayName = currentUser?.full_name || 'Juan Dela Cruz';
  const firstName = displayName.split(' ')[0] || 'Staff';
  const displayRole = currentUser?.department
    ? `${currentUser.department} • Staff`
    : 'Maintenance Staff';

  // Load real tickets from database via API
  useEffect(() => {
    let isMounted = true;

    const loadData = (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      if (!currentUser?.id) {
        setJobs([]);
        setUnreadNotifCount(0);
        setLoading(false);
        return;
      }

      const workerParam = currentUser?.id
        ? { worker_id: currentUser.id, assigned_to: currentUser.id }
        : {};

      fetchReports({ limit: 100, ...workerParam })
        .then((res) => {
          if (!isMounted) return;
          if (res && res.success && Array.isArray(res.data)) {
            // Strictly filter to reports assigned to this specific logged-in maintenance worker
            const filteredByWorker = currentUser?.id
              ? res.data.filter((r) => Number(r.worker_id) === Number(currentUser.id))
              : [];
            const mappedApi = filteredByWorker.map((r) => mapApiReportToJob(r, displayName));
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
          if (isMounted && showSpinner) setLoading(false);
        });

      // Fetch unread notifications count from database for this specific user
      if (currentUser?.id) {
        fetchNotifications(currentUser.id, 'maintenance')
          .then((notifRes) => {
            if (!isMounted) return;
            if (notifRes && notifRes.success && typeof notifRes.unread_count === 'number') {
              setUnreadNotifCount(notifRes.unread_count);
            }
          })
          .catch(() => {});
      } else {
        setUnreadNotifCount(0);
      }
    };

    loadData(true);
    const interval = setInterval(() => loadData(false), 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [displayName, refreshKey, currentUser?.id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const handleRequestStartRepair = (jobOrId, e) => {
    if (e) e.stopPropagation();
    const targetJob = typeof jobOrId === 'object' ? jobOrId : jobs.find((j) => j.id === jobOrId);
    if (!targetJob) return;
    if (targetJob.status === 'in_progress') {
      showToast('Repair is already in progress.');
      return;
    }
    if (targetJob.status === 'resolved' || targetJob.status === 'closed') {
      showToast('This job is already completed.');
      return;
    }
    setJobToStartRepair(targetJob);
    setShowStartRepairModal(true);
  };

  const handleExecuteStartRepair = async () => {
    if (!jobToStartRepair) return;
    const targetJobId = jobToStartRepair.id;
    setIsStartingRepair(true);

    try {
      const result = await updateReportStatus({
        report_id: targetJobId,
        status: 'in_progress',
        remarks: `Work started by ${displayName}`,
        changed_by: currentUser.id,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to update status on server.');
      }
      setJobs((prev) => prev.map((job) =>
        job.id === targetJobId ? { ...job, status: 'in_progress' } : job
      ));
      showToast('Repair marked as In Progress!');
    } catch (err) {
      console.error('Failed to update status on server:', err);
      showToast(err.message);
    } finally {
      setRefreshKey((k) => k + 1);
      setIsStartingRepair(false);
      setShowStartRepairModal(false);
      setJobToStartRepair(null);
    }
  };

  const handleCancelStartRepair = () => {
    if (!isStartingRepair) {
      setShowStartRepairModal(false);
      setJobToStartRepair(null);
    }
  };

  const handleRequestCompletion = (job) => {
    if (!job) return;
    if (job.status === 'resolved' || job.status === 'closed') {
      showToast('This report is already marked as fixed.');
      return;
    }
    setJobToComplete(job);
    setShowCompletionModal(true);
  };

  const handleExecuteCompletion = async () => {
    if (!jobToComplete) return;
    const targetJobId = jobToComplete.id;
    const notes = completionNotes;
    const photo = proofPhotoPreview;

    setIsSubmittingCompletion(true);

    try {
      const result = await updateReportStatus({
        report_id: targetJobId,
        status: 'resolved',
        remarks: notes || `Repair verified and marked as fixed by ${displayName}`,
        changed_by: currentUser.id,
      });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to complete this job.');
      }
      setJobs((prev) => prev.map((job) =>
        job.id === targetJobId
          ? { ...job, status: 'resolved', completed_at: 'Just now', completion_notes: notes, completion_photo: photo }
          : job
      ));
      showToast('Job marked as Fixed and Completed!');
      setCompletionNotes('');
      setProofPhotoPreview(null);
      setShowCompletionModal(false);
      setJobToComplete(null);
    } catch (err) {
      console.error('Failed to complete report on server:', err);
      showToast(err.message);
    } finally {
      setRefreshKey((k) => k + 1);
      setIsSubmittingCompletion(false);
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
  let displayedJobs = [];
  if (activeTab === 'completed') {
    displayedJobs = jobs.filter((j) => j.status === 'resolved' || j.status === 'closed');
  } else if (activeTab === 'assigned') {
    displayedJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  } else {
    // Dashboard overview: show active assigned and in-progress jobs for this worker
    displayedJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  }

  if (priorityFilter !== 'all') {
    displayedJobs = displayedJobs.filter((j) => {
      const jp = (j.priority || '').toLowerCase();
      const fp = priorityFilter.toLowerCase();
      if (fp === 'urgent' || fp === 'emergency') {
        return jp === 'urgent' || jp === 'emergency';
      }
      return jp === fp;
    });
  }

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayedJobs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedJobs = displayedJobs.slice(startIndex, startIndex + pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Selected job for detail view
  const selectedJob =
    jobs.find((j) => String(j.id) === String(selectedJobId)) || null;

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
            <div className="maint-brand-text-group">
              <span className="maint-brand-title">FixMyCampus</span>
              <span className="maint-brand-role-badge">
                <span className="maint-brand-role-dot" />
                Maintenance Staff
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="maint-nav">
            {/* Section 1: Overview */}
            <div className="maint-nav-section">
              <span className="maint-nav-section-title">Overview</span>

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
                className={`maint-nav-item ${activeTab === 'feedback' && selectedJobId === null ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('feedback');
                  setSelectedJobId(null);
                }}
                id="maint-nav-feedback"
              >
                <div className="maint-nav-label-box">
                  <MessageSquareQuote size={18} />
                  <span>Feedback</span>
                </div>
              </button>
            </div>

            {/* Section 2: Management */}
            <div className="maint-nav-section">
              <span className="maint-nav-section-title">Management</span>

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
            </div>
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="maint-user-footer">
          <UserProfileDropdown
            currentUser={currentUser}
            onNavigate={onNavigate}
            onHistoryClick={() => {
              setActiveTab('completed');
              setSelectedJobId(null);
            }}
            onLogout={() => setShowLogoutModal(true)}
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
                          {getPriorityLabel(selectedJob.priority)}
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

                    {selectedJob.confirmation_count > 1 && (
                      <div className="maint-info-item">
                        <span className="maint-info-label">COMMUNITY IMPACT</span>
                        <span className="maint-info-impact">
                          <Users size={14} />
                          {selectedJob.confirmation_count} Students Confirmed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="maint-details-col">
                {['resolved', 'closed'].includes(selectedJob.status) && (
                  <ReportFeedback key={selectedJob.id} reportId={selectedJob.id} />
                )}
                {/* 1. JOB ACTIONS */}
                <div className="maint-card">
                  <h4 className="maint-card-title">JOB ACTIONS</h4>
                  <button
                    type="button"
                    className={`maint-btn-action-primary ${selectedJob.status === 'in_progress' ? 'in-progress' : selectedJob.status === 'resolved' || selectedJob.status === 'closed' ? 'completed' : ''}`}
                    onClick={() => {
                      if (selectedJob.status !== 'in_progress' && selectedJob.status !== 'resolved' && selectedJob.status !== 'closed') {
                        handleRequestStartRepair(selectedJob);
                      }
                    }}
                    disabled={selectedJob.status === 'in_progress' || selectedJob.status === 'resolved' || selectedJob.status === 'closed'}
                    id="maint-start-repair-btn"
                  >
                    {selectedJob.status === 'in_progress'
                      ? 'Repair In Progress'
                      : selectedJob.status === 'resolved' || selectedJob.status === 'closed'
                      ? 'Repair Completed'
                      : 'Start Repair'}
                  </button>
                  <button
                    type="button"
                    className={`maint-btn-action-secondary ${selectedJob.status !== 'resolved' && selectedJob.status !== 'closed' ? 'enabled' : ''}`}
                    onClick={() => {
                      if (selectedJob.status !== 'resolved' && selectedJob.status !== 'closed') {
                        handleRequestCompletion(selectedJob);
                      }
                    }}
                    disabled={selectedJob.status === 'resolved' || selectedJob.status === 'closed'}
                    style={selectedJob.status === 'resolved' || selectedJob.status === 'closed' ? { cursor: 'not-allowed', opacity: 0.65 } : {}}
                  >
                    {selectedJob.status === 'resolved' || selectedJob.status === 'closed'
                      ? 'Already Fixed'
                      : 'Mark as Fixed'}
                  </button>
                </div>

                {/* 2. COMPLETION DETAILS */}
                <div className="maint-card">
                  <h4 className="maint-card-title">COMPLETION DETAILS</h4>

                  <span className="maint-field-label">Completion Photo</span>

                  {(selectedJob.status === 'resolved' || selectedJob.status === 'closed') ? (
                    /* Locked View: Task is done, cannot be edited */
                    (proofPhotoPreview || selectedJob.completion_photo) ? (
                      <div className="maint-upload-preview-card" style={{ opacity: 0.95, pointerEvents: 'none' }}>
                        <img
                          src={proofPhotoPreview || selectedJob.completion_photo}
                          alt="Proof preview"
                          className="maint-preview-img"
                        />
                        <div className="maint-preview-info">
                          <span className="maint-preview-status">
                            <Check size={14} strokeWidth={3} /> Proof photo attached
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="maint-dropzone disabled"
                        style={{
                          cursor: 'not-allowed',
                          backgroundColor: '#f8fafc',
                          borderColor: '#e2e8f0',
                          opacity: 0.85,
                          pointerEvents: 'none',
                        }}
                      >
                        <div className="maint-dropzone-icon" style={{ color: '#94a3b8' }}>
                          <Camera size={26} strokeWidth={1.75} />
                        </div>
                        <div className="maint-dropzone-text">Upload proof photo</div>
                      </div>
                    )
                  ) : !proofPhotoPreview ? (
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
                    value={(selectedJob.status === 'resolved' || selectedJob.status === 'closed') ? (selectedJob.completion_notes || completionNotes || '') : completionNotes}
                    onChange={(e) => {
                      if (selectedJob.status !== 'resolved' && selectedJob.status !== 'closed') {
                        setCompletionNotes(e.target.value);
                      }
                    }}
                    disabled={selectedJob.status === 'resolved' || selectedJob.status === 'closed'}
                    readOnly={selectedJob.status === 'resolved' || selectedJob.status === 'closed'}
                    style={(selectedJob.status === 'resolved' || selectedJob.status === 'closed') ? {
                      cursor: 'not-allowed',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                      resize: 'none',
                    } : {}}
                  />

                  <button
                    type="button"
                    className={`maint-btn-confirm ${(selectedJob.status === 'resolved' || selectedJob.status === 'closed') ? 'disabled' : ''}`}
                    onClick={() => {
                      if (selectedJob.status !== 'resolved' && selectedJob.status !== 'closed') {
                        handleRequestCompletion(selectedJob);
                      }
                    }}
                    disabled={selectedJob.status === 'resolved' || selectedJob.status === 'closed'}
                    style={(selectedJob.status === 'resolved' || selectedJob.status === 'closed') ? {
                      backgroundColor: '#f1f5f9',
                      borderColor: '#e2e8f0',
                      color: '#94a3b8',
                      cursor: 'not-allowed',
                      boxShadow: 'none',
                    } : {}}
                  >
                    {selectedJob.status === 'resolved' || selectedJob.status === 'closed'
                      ? 'Report Already Completed'
                      : 'Confirm Completion'}
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
              setActiveTab('dashboard');
            }}
            onStartRepair={handleRequestStartRepair}
            jobs={jobs}
            currentUser={currentUser}
            onUnreadChange={setUnreadNotifCount}
            showToast={showToast}
          />
        ) : activeTab === 'feedback' && selectedJobId === null ? (
          <div>
            <div className="maint-header">
              <h1 className="maint-greeting">Ratings &amp; Feedback</h1>
              <p className="maint-subtext">Reporter ratings and comments on your completed maintenance jobs.</p>
            </div>
            <FeedbackOverview scopeKey={currentUser?.id} maintenance />
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
                {activeTab === 'completed'
                  ? `Completed Jobs (${displayedJobs.length})`
                  : activeTab === 'assigned'
                  ? `Assigned Jobs (${displayedJobs.length})`
                  : `Your Assigned Jobs (${displayedJobs.length})`}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                    className={`maint-filter-tab ${priorityFilter === 'urgent' ? 'active' : ''}`}
                    onClick={() => setPriorityFilter('urgent')}
                  >
                    Urgent
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

                <button
                  type="button"
                  className="maint-btn-export-excel"
                  title="Export assigned work orders to Microsoft Excel (.xlsx)"
                  onClick={() => exportReportsToExcel(displayedJobs.length > 0 ? displayedJobs : jobs, 'FixMyCampus_Work_Orders')}
                  disabled={jobs.length === 0}
                  id="maint-export-excel-btn"
                >
                  <FileSpreadsheet size={15} />
                  <span>Export to Excel</span>
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
              <>
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

                {/* Pagination Controls (Always present for consistent UI across Assigned and Completed Jobs) */}
                <div className="maint-pagination" aria-label="Maintenance tasks pagination">
                  <div className="maint-pagination-info">
                    <span>Showing 0–0 of 0 tasks</span>
                    <div className="maint-pagination-limit">
                      <span>Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="maint-pagination-select"
                        aria-label="Tasks per page"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="maint-pagination-controls">
                    <button
                      type="button"
                      className="maint-page-btn"
                      disabled={true}
                      title="Previous page"
                    >
                      <ChevronLeft size={15} />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      className="maint-page-btn active"
                      disabled={true}
                      title="Page 1"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="maint-page-btn"
                      disabled={true}
                      title="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="maint-jobs-list">
                {paginatedJobs.map((job) => {
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
                              {getPriorityLabel(job.priority)}
                            </span>
                            {job.confirmation_count > 1 && (
                              <span className="maint-job-impact-badge" title={`${job.confirmation_count} students reported or confirmed this defect`}>
                                <Users size={12} />
                                {job.confirmation_count} Confirmed
                              </span>
                            )}
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
                            if (!isFixed && !isOngoing) {
                              handleRequestStartRepair(job, e);
                            }
                          }}
                          disabled={isFixed || isOngoing}
                        >
                          {isFixed ? 'Completed' : isOngoing ? 'In Progress' : 'Start Repair'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {displayedJobs.length > 0 && (
                <div className="maint-pagination" aria-label="Maintenance tasks pagination">
                  <div className="maint-pagination-info">
                    <span>
                      Showing {startIndex + 1}–{Math.min(displayedJobs.length, startIndex + pageSize)} of {displayedJobs.length} {displayedJobs.length === 1 ? 'task' : 'tasks'}
                    </span>
                    <div className="maint-pagination-limit">
                      <span>Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="maint-pagination-select"
                        aria-label="Tasks per page"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="maint-pagination-controls">
                    <button
                      type="button"
                      className="maint-page-btn"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      title="Previous page"
                    >
                      <ChevronLeft size={15} />
                      <span>Previous</span>
                    </button>

                    {getPageNumbers().map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="maint-page-ellipsis">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`maint-page-btn ${currentPage === item ? 'active' : ''}`}
                          onClick={() => setCurrentPage(item)}
                          title={`Page ${item}`}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="maint-page-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      title="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Starting Repair */}
      {showStartRepairModal && jobToStartRepair && (
        <ConfirmationModal
          isOpen={showStartRepairModal}
          presetId="start_repair"
          title="Start Repair?"
          message={`Are you sure you want to start repair on ticket #${jobToStartRepair.ticket_number || jobToStartRepair.id} (${jobToStartRepair.title})? Once started, this action cannot be undone.`}
          confirmText="Yes, Start Repair"
          cancelText="Cancel"
          loading={isStartingRepair}
          onClose={handleCancelStartRepair}
          onConfirm={handleExecuteStartRepair}
        />
      )}

      {/* Confirmation Modal for Submitting / Marking Report as Fixed */}
      {showCompletionModal && jobToComplete && (
        <ConfirmationModal
          isOpen={showCompletionModal}
          presetId="mark_fixed"
          title="Ready to Submit Report?"
          message={`Are you sure you are ready to submit this report? This will mark ticket #${jobToComplete.ticket_number || jobToComplete.id} (${jobToComplete.title}) as fixed and completed.`}
          confirmText="Yes, Submit Report"
          cancelText="Cancel"
          loading={isSubmittingCompletion}
          onClose={() => {
            if (!isSubmittingCompletion) {
              setShowCompletionModal(false);
              setJobToComplete(null);
            }
          }}
          onConfirm={handleExecuteCompletion}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ConfirmationModal
          isOpen={showLogoutModal}
          presetId="logout"
          title="Logout?"
          message="Are you sure you want to log out of FixMyCampus?"
          confirmText="Log out"
          confirmClass="modal-btn-danger"
          cancelText="Cancel"
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            if (onLogout) onLogout();
          }}
        />
      )}
    </div>
  );
}
