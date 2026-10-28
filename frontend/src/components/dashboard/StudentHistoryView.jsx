import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Archive,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  AlertOctagon,
  Wrench,
  RefreshCw,
  Building,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchNotifications,
  unarchiveNotification,
  fetchReports,
  archiveReport,
  restoreReport,
} from '../../services/api';
import './studentHistory.css';

const getPageNumbers = (current, total) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

export default function StudentHistoryView({
  currentUser,
  onNavigate,
  onSelectReport,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'reports'
  const [archivedNotifs, setArchivedNotifs] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Pagination states for Archived Notifications
  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(5);

  // Pagination states for Defect Report History
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(5);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleArchiveReport = async (rep, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await archiveReport(rep.id);
      if (res && res.success) {
        showToast(`Report #${rep.ticket_number || rep.id} archived successfully.`);
        setReportHistory((prev) =>
          prev.map((r) => (r.id === rep.id ? { ...r, is_archived: 1 } : r))
        );
      } else {
        showToast(res?.message || 'Failed to archive report.');
      }
    } catch (err) {
      console.error('Error archiving report:', err);
      showToast('Error connecting to server.');
    }
  };

  const handleRestoreReport = async (rep, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await restoreReport(rep.id);
      if (res && res.success) {
        showToast(`Report #${rep.ticket_number || rep.id} restored to active.`);
        setReportHistory((prev) =>
          prev.map((r) => (r.id === rep.id ? { ...r, is_archived: 0 } : r))
        );
      } else {
        showToast(res?.message || 'Failed to restore report.');
      }
    } catch (err) {
      console.error('Error restoring report:', err);
      showToast('Error connecting to server.');
    }
  };

  const loadArchivedNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await fetchNotifications(currentUser?.id, 'student', { is_archived: 1 });
      if (res && res.success && Array.isArray(res.data)) {
        setArchivedNotifs(res.data);
      } else {
        setArchivedNotifs([]);
      }
    } catch (err) {
      console.error('Error fetching archived notifications:', err);
      setArchivedNotifs([]);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const loadReportHistory = async () => {
    setLoadingReports(true);
    try {
      const res = await fetchReports({ user_id: currentUser?.id, my_reports: 1, include_archived: 1 });
      if (res && res.success && Array.isArray(res.data)) {
        setReportHistory(res.data);
      } else {
        setReportHistory([]);
      }
    } catch (err) {
      console.error('Error loading report history:', err);
      setReportHistory([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadArchivedNotifications();
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'reports' && reportHistory.length === 0) {
      loadReportHistory();
    }
  }, [activeTab]);

  const handleRestoreNotification = async (item, e) => {
    if (e) e.stopPropagation();
    setRestoringId(item.id);

    // Optimistic removal from archived list
    setArchivedNotifs((prev) => prev.filter((n) => n.id !== item.id));

    try {
      await unarchiveNotification(item.id, currentUser?.id, 'student');
      showToast('Notification restored to active inbox.');
    } catch (err) {
      console.error('Error restoring notification:', err);
      showToast('Could not restore notification. Please try again.');
      loadArchivedNotifications();
    } finally {
      setRestoringId(null);
    }
  };

  // Notifications pagination calculations
  const notifTotalPages = Math.max(1, Math.ceil(archivedNotifs.length / notifPageSize));

  useEffect(() => {
    if (notifPage > notifTotalPages) {
      setNotifPage(notifTotalPages);
    }
  }, [notifPage, notifTotalPages]);

  const paginatedNotifs = useMemo(() => {
    const start = (notifPage - 1) * notifPageSize;
    return archivedNotifs.slice(start, start + notifPageSize);
  }, [archivedNotifs, notifPage, notifPageSize]);

  const notifStartIdx = archivedNotifs.length === 0 ? 0 : (notifPage - 1) * notifPageSize + 1;
  const notifEndIdx = Math.min(archivedNotifs.length, notifPage * notifPageSize);

  // Reports pagination calculations
  const reportTotalPages = Math.max(1, Math.ceil(reportHistory.length / reportPageSize));

  useEffect(() => {
    if (reportPage > reportTotalPages) {
      setReportPage(reportTotalPages);
    }
  }, [reportPage, reportTotalPages]);

  const paginatedReports = useMemo(() => {
    const start = (reportPage - 1) * reportPageSize;
    return reportHistory.slice(start, start + reportPageSize);
  }, [reportHistory, reportPage, reportPageSize]);

  const reportStartIdx = reportHistory.length === 0 ? 0 : (reportPage - 1) * reportPageSize + 1;
  const reportEndIdx = Math.min(reportHistory.length, reportPage * reportPageSize);

  const renderIconBadge = (type) => {
    switch (type) {
      case 'emergency':
        return (
          <div className="notif-icon-badge notif-badge-emergency" title="Emergency Hazard">
            <AlertOctagon size={18} strokeWidth={2.4} />
          </div>
        );
      case 'in_progress':
        return (
          <div className="notif-icon-badge notif-badge-in-progress" title="Repair In Progress">
            <Clock size={18} strokeWidth={2.4} />
          </div>
        );
      case 'verified':
      case 'fixed':
      case 'resolved':
        return (
          <div className="notif-icon-badge notif-badge-fixed" title="Issue Resolved">
            <CheckCircle2 size={18} strokeWidth={2.4} />
          </div>
        );
      case 'work_order':
      case 'assignment':
        return (
          <div className="notif-icon-badge notif-badge-assignment" title="Work Assignment">
            <Wrench size={18} strokeWidth={2.4} />
          </div>
        );
      default:
        return (
          <div className="notif-icon-badge notif-badge-info" title="Campus Notice">
            <FileText size={18} strokeWidth={2.4} />
          </div>
        );
    }
  };

  return (
    <div className="sh-page-wrapper">
      <div className="sh-container">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="sh-toast-container">
            <div className="sh-toast-box">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          type="button"
          className="sh-back-btn"
          onClick={onBack || (() => onNavigate && onNavigate('dashboard'))}
          id="sh-back-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        {/* Header Row */}
        <div className="sh-header-row">
          <div className="sh-title-group">
            <div className="sh-icon-circle">
              <History size={24} />
            </div>
            <div>
              <h1 className="sh-title">History & Archives</h1>
              <p className="sh-subtitle">
                Access your archived notifications and defect report history.
              </p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="sh-pill-tabs" role="tablist">
            <button
              type="button"
              className={`sh-tab-pill ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              role="tab"
              aria-selected={activeTab === 'notifications'}
              id="sh-tab-archived-notifs"
            >
              <Archive size={15} />
              <span>Archived Notifications</span>
              {archivedNotifs.length > 0 && (
                <span className="sh-pill-count">{archivedNotifs.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`sh-tab-pill ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
              role="tab"
              aria-selected={activeTab === 'reports'}
              id="sh-tab-report-history"
            >
              <FileText size={15} />
              <span>Report History</span>
              {reportHistory.length > 0 && (
                <span className="sh-pill-count">{reportHistory.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Archived Notifications */}
        {activeTab === 'notifications' && (
          <div className="sh-content-section">
            {loadingNotifs && archivedNotifs.length === 0 ? (
              <div className="sh-empty-state">
                <RefreshCw size={26} className="maint-spin" style={{ color: '#059669' }} />
                <h3>Loading Archived Notifications...</h3>
                <p>Retrieving your archived notifications from the system.</p>
              </div>
            ) : archivedNotifs.length > 0 ? (
              <>
                <div className="sh-notif-list">
                  {paginatedNotifs.map((item) => (
                    <div
                      key={item.id}
                      className="sh-notif-card"
                      id={`sh-archived-item-${item.id}`}
                    >
                      <div className="sh-notif-left">
                        {renderIconBadge(item.type)}
                        <div className="sh-notif-content">
                          <div className="sh-notif-header-line">
                            <h4 className="sh-notif-title">{item.title}</h4>
                            <span className="sh-badge-archived">Archived</span>
                          </div>
                          {item.message && (
                            <p className="sh-notif-desc">{item.message}</p>
                          )}
                          <div className="sh-notif-meta">
                            <span className="sh-notif-time">{item.time_ago}</span>
                            {item.location && (
                              <span className="sh-notif-location">• {item.location}</span>
                            )}
                            {item.ticket_number && (
                              <button
                                type="button"
                                className="sh-ticket-chip"
                                onClick={() => onSelectReport && onSelectReport(item.ticket_number)}
                                title="View related defect ticket"
                              >
                                {item.ticket_number}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sh-notif-right">
                        <button
                          type="button"
                          className="sh-restore-btn"
                          onClick={(e) => handleRestoreNotification(item, e)}
                          disabled={restoringId === item.id}
                          title="Restore notification to active inbox"
                          id={`sh-restore-btn-${item.id}`}
                        >
                          <RotateCcw size={14} className={restoringId === item.id ? 'maint-spin' : ''} />
                          <span>Restore</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="sh-pagination" aria-label="Archived notifications pagination">
                  <div className="sh-pagination-info">
                    <span>
                      Showing {notifStartIdx}–{notifEndIdx} of {archivedNotifs.length} {archivedNotifs.length === 1 ? 'notification' : 'notifications'}
                    </span>
                    <div className="sh-pagination-limit">
                      <span>Per page:</span>
                      <select
                        value={notifPageSize}
                        onChange={(e) => {
                          setNotifPageSize(Number(e.target.value));
                          setNotifPage(1);
                        }}
                        className="sh-pagination-select"
                        aria-label="Notifications per page"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="sh-pagination-controls">
                    <button
                      type="button"
                      className="sh-page-btn arrow-btn"
                      disabled={notifPage <= 1 || notifTotalPages <= 1}
                      onClick={() => setNotifPage((p) => Math.max(1, p - 1))}
                      title="Previous page"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {notifTotalPages === 0 ? (
                      <button type="button" className="sh-page-btn active" disabled>
                        1
                      </button>
                    ) : (
                      getPageNumbers(notifPage, notifTotalPages).map((pg, idx) =>
                        pg === '...' ? (
                          <span key={`ellipsis-notif-${idx}`} className="sh-page-ellipsis">
                            ...
                          </span>
                        ) : (
                          <button
                            key={`notif-page-${pg}`}
                            type="button"
                            className={`sh-page-btn ${notifPage === pg ? 'active' : ''}`}
                            onClick={() => setNotifPage(pg)}
                            title={`Page ${pg}`}
                            aria-current={notifPage === pg ? 'page' : undefined}
                          >
                            {pg}
                          </button>
                        )
                      )
                    )}

                    <button
                      type="button"
                      className="sh-page-btn arrow-btn"
                      disabled={notifPage >= notifTotalPages || notifTotalPages <= 1}
                      onClick={() => setNotifPage((p) => Math.min(notifTotalPages, p + 1))}
                      title="Next page"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="sh-empty-state">
                <div className="sh-empty-icon-circle">
                  <Archive size={30} />
                </div>
                <h3>No Archived Notifications</h3>
                <p>
                  When you archive notifications from your alerts inbox, they will be kept here safely for future reference.
                </p>
                <button
                  type="button"
                  className="sh-empty-action-btn"
                  onClick={() => onNavigate && onNavigate('notifications')}
                >
                  Go to Notifications
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Defect Report History */}
        {activeTab === 'reports' && (
          <div className="sh-content-section">
            {loadingReports && reportHistory.length === 0 ? (
              <div className="sh-empty-state">
                <RefreshCw size={26} className="maint-spin" style={{ color: '#059669' }} />
                <h3>Loading Report History...</h3>
                <p>Fetching your past defect reports and work tickets.</p>
              </div>
            ) : reportHistory.length > 0 ? (
              <>
                <div className="sh-reports-grid">
                  {paginatedReports.map((rep) => {
                    const rawStatus = (rep.status || '').toLowerCase();
                    const isFixed = rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed';
                    const dateStr = rep.reported_at
                      ? new Date(rep.reported_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently';

                    return (
                      <div
                        key={rep.id}
                        className="sh-report-card"
                        onClick={() => onSelectReport && onSelectReport(rep.ticket_number || `FM-${rep.id}`)}
                        role="button"
                        tabIndex={0}
                        id={`sh-report-item-${rep.id}`}
                      >
                        <div className="sh-report-top">
                          <span className="sh-report-ticket">{rep.ticket_number || `FM-${rep.id}`}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {Boolean(rep.is_archived) && (
                              <span className="sh-badge-archived">Archived</span>
                            )}
                            <span className={`sh-report-status-pill ${isFixed ? 'fixed' : rawStatus}`}>
                              {isFixed ? 'Fixed' : rep.status || 'Active'}
                            </span>
                          </div>
                        </div>

                        <h4 className="sh-report-title">{rep.title}</h4>

                        <div className="sh-report-meta-row">
                          <div className="sh-report-meta-item">
                            <Building size={13} />
                            <span>{rep.building_name || 'Main Campus'}</span>
                          </div>
                          <div className="sh-report-meta-item">
                            <MapPin size={13} />
                            <span>{rep.room_number || rep.specific_area || 'Facility Area'}</span>
                          </div>
                          <div className="sh-report-meta-item">
                            <Calendar size={13} />
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        {/* Card Actions: Archive for finished reports or Restore for archived */}
                        <div className="sh-report-card-actions" onClick={(e) => e.stopPropagation()}>
                          {Boolean(rep.is_archived) ? (
                            <button
                              type="button"
                              className="sh-restore-btn"
                              onClick={(e) => handleRestoreReport(rep, e)}
                              title="Restore report back to active reports"
                              id={`sh-restore-rep-${rep.id}`}
                            >
                              <RotateCcw size={13} />
                              <span>Restore to Active</span>
                            </button>
                          ) : isFixed ? (
                            <button
                              type="button"
                              className="sh-archive-btn"
                              onClick={(e) => handleArchiveReport(rep, e)}
                              title="Archive this finished report"
                              id={`sh-archive-rep-${rep.id}`}
                            >
                              <Archive size={13} />
                              <span>Archive</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="sh-pagination" aria-label="Report history pagination">
                  <div className="sh-pagination-info">
                    <span>
                      Showing {reportStartIdx}–{reportEndIdx} of {reportHistory.length} {reportHistory.length === 1 ? 'report' : 'reports'}
                    </span>
                    <div className="sh-pagination-limit">
                      <span>Per page:</span>
                      <select
                        value={reportPageSize}
                        onChange={(e) => {
                          setReportPageSize(Number(e.target.value));
                          setReportPage(1);
                        }}
                        className="sh-pagination-select"
                        aria-label="Reports per page"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="sh-pagination-controls">
                    <button
                      type="button"
                      className="sh-page-btn arrow-btn"
                      disabled={reportPage <= 1 || reportTotalPages <= 1}
                      onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                      title="Previous page"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {reportTotalPages === 0 ? (
                      <button type="button" className="sh-page-btn active" disabled>
                        1
                      </button>
                    ) : (
                      getPageNumbers(reportPage, reportTotalPages).map((pg, idx) =>
                        pg === '...' ? (
                          <span key={`ellipsis-report-${idx}`} className="sh-page-ellipsis">
                            ...
                          </span>
                        ) : (
                          <button
                            key={`report-page-${pg}`}
                            type="button"
                            className={`sh-page-btn ${reportPage === pg ? 'active' : ''}`}
                            onClick={() => setReportPage(pg)}
                            title={`Page ${pg}`}
                            aria-current={reportPage === pg ? 'page' : undefined}
                          >
                            {pg}
                          </button>
                        )
                      )
                    )}

                    <button
                      type="button"
                      className="sh-page-btn arrow-btn"
                      disabled={reportPage >= reportTotalPages || reportTotalPages <= 1}
                      onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
                      title="Next page"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="sh-empty-state">
                <div className="sh-empty-icon-circle">
                  <FileText size={30} />
                </div>
                <h3>No Defect Reports Found</h3>
                <p>You have not submitted or confirmed any campus defect reports yet.</p>
                <button
                  type="button"
                  className="sh-empty-action-btn"
                  onClick={() => onNavigate && onNavigate('report-issue')}
                >
                  Report a Facility Defect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
