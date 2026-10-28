import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  Search,
  RefreshCw,
  UserPlus,
  AlertCircle,
  RefreshCcw,
  Archive,
  MapPin,
  Clock,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  LogIn,
  Eye,
  RotateCcw,
  Camera,
  UploadCloud,
  Filter,
  ChevronDown,
  Check,
} from 'lucide-react';
import { fetchHistoryLogs, deleteHistoryLog, updateReportPhoto } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';

const HISTORY_FILTER_OPTIONS = [
  { key: 'all', label: 'All Logs', color: '#64748b' },
  { key: 'user_login', label: 'User Sign-ins', color: '#059669' },
  { key: 'user_registration', label: 'User Sign-ups', color: '#3b82f6' },
  { key: 'report_submitted', label: 'Reports Logged', color: '#f59e0b' },
  { key: 'status_change', label: 'Status Updates', color: '#8b5cf6' },
  { key: 'report_archived', label: 'Archived Reports', color: '#c2410c' },
];

export default function HistoryLogView({ onViewReport, onRestoreReport }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [summary, setSummary] = useState({
    all: 0,
    user_login: 0,
    user_registration: 0,
    report_submitted: 0,
    status_change: 0,
    report_archived: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 1,
  });

  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Photo editing state
  const logPhotoInputRef = useRef(null);
  const [editingPhotoLog, setEditingPhotoLog] = useState(null);
  const [photoModalPreview, setPhotoModalPreview] = useState(null);
  const [isSavingLogPhoto, setIsSavingLogPhoto] = useState(false);
  const [photoModalError, setPhotoModalError] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenEditPhotoModal = (log) => {
    setEditingPhotoLog(log);
    setPhotoModalPreview(null);
    setPhotoModalError('');
  };

  const handleCloseEditPhotoModal = () => {
    if (isSavingLogPhoto) return;
    setEditingPhotoLog(null);
    setPhotoModalPreview(null);
    setPhotoModalError('');
    if (logPhotoInputRef.current) logPhotoInputRef.current.value = '';
  };

  const handleLogPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoModalError('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoModalError('Image size cannot exceed 8MB.');
      return;
    }
    setPhotoModalError('');
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoModalPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogPhoto = async () => {
    if (!photoModalPreview || !editingPhotoLog?.report_id) return;
    setIsSavingLogPhoto(true);
    setPhotoModalError('');
    try {
      const res = await updateReportPhoto(editingPhotoLog.report_id, photoModalPreview);
      if (res?.success) {
        const newUrl = res.image_url || photoModalPreview;
        setLogs((prev) =>
          prev.map((item) =>
            item.report_id === editingPhotoLog.report_id
              ? { ...item, report_photo: newUrl }
              : item
          )
        );
        showToast(`Defect picture for #${editingPhotoLog.ticket_number || editingPhotoLog.title} updated successfully.`);
        handleCloseEditPhotoModal();
      } else {
        setPhotoModalError(res?.message || 'Failed to update photo.');
      }
    } catch (err) {
      console.error('Error saving photo from history logs:', err);
      setPhotoModalError('Network error while saving photo.');
    } finally {
      setIsSavingLogPhoto(false);
    }
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchHistoryLogs({
        page: currentPage,
        limit: pageSize,
        type: activeType,
        search: appliedSearch,
      });

      if (res?.success) {
        setLogs(res.data || []);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to load history logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeType, appliedSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setCurrentPage(newPage);
  };

  const handleConfirmDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteHistoryLog(logToDelete.id);
      if (res?.success) {
        showToast('History log entry deleted successfully.');
        setLogToDelete(null);
        await loadLogs();
      } else {
        alert(res?.message || 'Failed to delete history log entry.');
      }
    } catch (err) {
      console.error('Error deleting history log:', err);
      alert('Error deleting history log.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenReportWindow = (log) => {
    if (!onViewReport || !log.report_id) return;
    onViewReport(
      {
        id: log.report_id,
        ticket_number: log.ticket_number,
        title: log.report_title || log.title,
        is_archived: log.is_archived ?? (log.log_type === 'report_archived' ? 1 : 0),
      },
      'history-logs'
    );
  };

  const handleRestoreDirect = async (log) => {
    if (!onRestoreReport || !log.report_id) return;
    await onRestoreReport({
      id: log.report_id,
      ticket_number: log.ticket_number,
      title: log.report_title || log.title,
    });
    await loadLogs();
  };

  const formatLogDate = (dateStr) => {
    if (!dateStr) return { formatted: 'Unknown', time: '' };
    try {
      const d = new Date(dateStr);
      return {
        formatted: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    } catch {
      return { formatted: dateStr, time: '' };
    }
  };

  const renderTypeChip = (type) => {
    switch (type) {
      case 'user_login':
        return (
          <span className="history-type-chip user_login">
            <LogIn size={13} />
            <span>User Sign-in</span>
          </span>
        );
      case 'user_registration':
        return (
          <span className="history-type-chip user_registration">
            <UserPlus size={13} />
            <span>User Sign-up</span>
          </span>
        );
      case 'report_submitted':
        return (
          <span className="history-type-chip report_submitted">
            <AlertCircle size={13} />
            <span>Report Created</span>
          </span>
        );
      case 'status_change':
        return (
          <span className="history-type-chip status_change">
            <RefreshCcw size={13} />
            <span>Status Update</span>
          </span>
        );
      case 'report_archived':
        return (
          <span className="history-type-chip report_archived">
            <Archive size={13} />
            <span>Archived Report</span>
          </span>
        );
      default:
        return (
          <span className="history-type-chip system">
            <FileText size={13} />
            <span>System Event</span>
          </span>
        );
    }
  };

  const startRecord = pagination.total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, pagination.total);

  return (
    <div className="history-logs-view">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 32,
            zIndex: 1000,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: '0.88rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="history-logs-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="admin-header-title" style={{ margin: 0 }}>
              History Logs
            </h1>
            <span
              style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              {pagination.total} Total Entries
            </span>
          </div>
          <p className="admin-header-subtitle">
            Comprehensive audit trail of user sign-ins, registrations, defect reports logged with timestamps &amp; locations, status updates, and archived records.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-secondary"
          onClick={loadLogs}
          disabled={loading}
          title="Refresh History Logs"
        >
          <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="history-summary-grid">
        <div
          className={`history-summary-card ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => handleTypeChange('all')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View all activities"
        >
          <div className="history-summary-icon all">
            <History size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.all}</div>
            <div className="history-summary-lbl">All Activities</div>
          </div>
        </div>

        <div
          className={`history-summary-card ${activeType === 'user_login' ? 'active' : ''}`}
          onClick={() => handleTypeChange('user_login')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View user sign-ins"
        >
          <div className="history-summary-icon logins">
            <LogIn size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.user_login || 0}</div>
            <div className="history-summary-lbl">User Sign-ins</div>
          </div>
        </div>

        <div
          className={`history-summary-card ${activeType === 'user_registration' ? 'active' : ''}`}
          onClick={() => handleTypeChange('user_registration')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View user registrations"
        >
          <div className="history-summary-icon users">
            <UserPlus size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.user_registration}</div>
            <div className="history-summary-lbl">Users Signed Up</div>
          </div>
        </div>

        <div
          className={`history-summary-card ${activeType === 'report_submitted' ? 'active' : ''}`}
          onClick={() => handleTypeChange('report_submitted')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View incident reports"
        >
          <div className="history-summary-icon reports">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.report_submitted}</div>
            <div className="history-summary-lbl">Incidents Reported</div>
          </div>
        </div>

        <div
          className={`history-summary-card ${activeType === 'status_change' ? 'active' : ''}`}
          onClick={() => handleTypeChange('status_change')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View status updates"
        >
          <div className="history-summary-icon status">
            <RefreshCcw size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.status_change}</div>
            <div className="history-summary-lbl">Status Updates</div>
          </div>
        </div>

        <div
          className={`history-summary-card ${activeType === 'report_archived' ? 'active' : ''}`}
          onClick={() => handleTypeChange('report_archived')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="View archived reports"
        >
          <div className="history-summary-icon archive">
            <Archive size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.report_archived}</div>
            <div className="history-summary-lbl">Archived Reports</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="history-controls-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search & Filter Row */}
          <form
            onSubmit={handleSearchSubmit}
            className="admin-search-row"
            style={{ flex: '1 1 100%', width: '100%', margin: 0, flexWrap: 'wrap' }}
          >
            <div className="admin-search-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by keywords, user name, student ID, location, ticket number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <button type="submit" className="admin-btn-black">
              Search
            </button>
            {appliedSearch && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </button>
            )}

            {/* Filter Symbol Button & Dropdown Menu */}
            <div className="admin-filter-dropdown-wrap" ref={filterDropdownRef}>
              <button
                type="button"
                className={`admin-filter-btn ${isFilterOpen ? 'open' : ''} ${activeType !== 'all' ? 'has-active' : ''}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-expanded={isFilterOpen}
                title="Filter logs by category"
                id="history-filter-btn"
              >
                <Filter size={15} />
                <span className="admin-filter-btn-text">
                  {activeType === 'all'
                    ? 'Filter'
                    : (HISTORY_FILTER_OPTIONS.find((o) => o.key === activeType)?.label || 'Filter')}
                </span>
                {activeType !== 'all' && (
                  <span className="admin-filter-badge">
                    {summary[activeType] ?? 0}
                  </span>
                )}
                <ChevronDown size={14} className={`admin-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="admin-filter-menu" role="menu">
                  <div className="admin-filter-menu-header">
                    <span>Filter by Category</span>
                    {activeType !== 'all' && (
                      <button
                        type="button"
                        className="admin-filter-reset-btn"
                        onClick={() => {
                          handleTypeChange('all');
                          setIsFilterOpen(false);
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-menu-list">
                    {HISTORY_FILTER_OPTIONS.map((opt) => {
                      const isActive = activeType === opt.key;
                      const count = opt.key === 'all' ? summary.all : (summary[opt.key] ?? 0);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`admin-filter-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            handleTypeChange(opt.key);
                            setIsFilterOpen(false);
                          }}
                          role="menuitem"
                        >
                          <span className="admin-filter-item-dot" style={{ backgroundColor: opt.color }} />
                          <span className="admin-filter-item-label">{opt.label}</span>
                          <span className="admin-filter-item-count">{count}</span>
                          {isActive && <Check size={14} className="admin-filter-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Main Table */}
      <div className="history-table-container">
        <div className="admin-table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Timestamp</th>
                <th style={{ width: 130 }}>Log Type</th>
                <th style={{ width: 180 }}>Actor / User</th>
                <th style={{ width: 220 }}>Where (Location)</th>
                <th>Activity Description &amp; Details</th>
                <th style={{ width: 70, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={18} className="spin-anim" />
                      <span>Loading history logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>No history logs found.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      {appliedSearch ? 'Try clearing your search query or choosing another category.' : 'New activity will be automatically recorded here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const { formatted, time } = formatLogDate(log.created_at);
                  const actorInitials = log.actor_name
                    ? log.actor_name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'SY';

                  return (
                    <tr key={log.id}>
                      {/* Timestamp */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                            {formatted}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {time} ({log.time_ago})
                          </span>
                        </div>
                      </td>

                      {/* Log Type */}
                      <td>{renderTypeChip(log.log_type)}</td>

                      {/* Actor / User */}
                      <td>
                        <div className="history-actor-cell">
                          <div className="history-actor-avatar">
                            {log.actor_avatar ? (
                              <img
                                src={log.actor_avatar}
                                alt={log.actor_name}
                                className="history-actor-avatar-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              actorInitials
                            )}
                          </div>
                          <div>
                            <div className="history-actor-name">{log.actor_name}</div>
                            <div className="history-actor-role">{log.actor_role || 'Campus User'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Where / Location */}
                      <td>
                        <div className="history-location-badge" title={log.location_info}>
                          <MapPin size={13} style={{ color: '#059669', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                            {log.location_info || 'PHINMA UPang Campus'}
                          </span>
                        </div>
                      </td>

                      {/* Details */}
                      <td>
                        <div className="history-details-cluster">
                          {log.report_id && (
                            <div
                              className="history-report-thumb-wrapper"
                              onClick={() => handleOpenEditPhotoModal(log)}
                              title="Click to view or edit this defect report's photo"
                            >
                              <img
                                src={log.report_photo || '/images/hero_ac_defect.jpg'}
                                alt={log.report_title || 'Defect thumbnail'}
                                className="history-report-thumb"
                                onError={(e) => {
                                  e.target.src = '/images/hero_ac_defect.jpg';
                                }}
                              />
                              <div className="history-thumb-edit-overlay">
                                <Camera size={13} />
                                <span className="history-thumb-overlay-text">Edit</span>
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                className={log.report_id ? 'history-clickable-title' : ''}
                                style={{
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  cursor: log.report_id && onViewReport ? 'pointer' : 'default',
                                }}
                                onClick={() => handleOpenReportWindow(log)}
                                title={log.report_id ? 'Click to inspect defect ticket window' : ''}
                              >
                                {log.title}
                              </span>
                              {log.ticket_number && (
                                <button
                                  type="button"
                                  className="history-ticket-badge-btn"
                                  onClick={() => handleOpenReportWindow(log)}
                                  title="View defect report window"
                                >
                                  <FileText size={12} />
                                  <span>{log.ticket_number}</span>
                                </button>
                              )}
                            </div>
                            {log.description && (
                              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                                {log.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action: View, Edit Photo, Restore, Delete */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="history-action-cluster">
                          {log.report_id && onViewReport && (
                            <button
                              type="button"
                              className="history-view-row-btn"
                              onClick={() => handleOpenReportWindow(log)}
                              title="View defect report window and full specifications"
                              id={`history-view-${log.id}`}
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          )}
                          {log.report_id && (
                            <button
                              type="button"
                              className="history-edit-photo-row-btn"
                              onClick={() => handleOpenEditPhotoModal(log)}
                              title="Edit defect photo for this report"
                              id={`history-edit-photo-${log.id}`}
                            >
                              <Camera size={14} />
                            </button>
                          )}
                          {log.log_type === 'report_archived' && log.report_id && onRestoreReport && (
                            <button
                              type="button"
                              className="history-restore-row-btn"
                              onClick={() => handleRestoreDirect(log)}
                              title="Restore this archived report back to active reports"
                              id={`history-restore-${log.id}`}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="history-delete-row-btn"
                            onClick={() => setLogToDelete(log)}
                            title="Delete this history log entry"
                            id={`history-del-${log.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="admin-pagination-bar" aria-label="History logs pagination" style={{ margin: '16px 20px 20px' }}>
          <div className="admin-pagination-info">
            <span>
              Showing {pagination.total === 0 ? 0 : startRecord} to {endRecord} of {pagination.total} logs
            </span>
            <div className="admin-pagination-limit">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="admin-pagination-select"
                aria-label="Logs per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="admin-pagination-btns">
            <button
              type="button"
              className="admin-page-box arrow-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading || pagination.total_pages <= 1}
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {pagination.total_pages === 0 ? (
              <button type="button" className="admin-page-box active" disabled>
                1
              </button>
            ) : (
              Array.from({ length: Math.min(5, pagination.total_pages) }, (_, idx) => {
                let p = idx + 1;
                if (pagination.total_pages > 5) {
                  if (currentPage > 3) {
                    p = currentPage - 2 + idx;
                  }
                  if (p > pagination.total_pages) {
                    p = pagination.total_pages - (4 - idx);
                  }
                }
                if (p < 1 || p > pagination.total_pages) return null;

                return (
                  <button
                    key={`p-${p}`}
                    type="button"
                    className={`admin-page-box ${currentPage === p ? 'active' : ''}`}
                    onClick={() => handlePageChange(p)}
                    disabled={loading}
                    title={`Page ${p}`}
                  >
                    {p}
                  </button>
                );
              })
            )}

            <button
              type="button"
              className="admin-page-box arrow-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.total_pages || loading || pagination.total_pages <= 1}
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {logToDelete && (
        <ConfirmationModal
          isOpen={Boolean(logToDelete)}
          presetId="delete_log"
          title="Delete History Log?"
          message={`Are you sure you want to permanently delete this audit log entry: "${logToDelete.title}"? This action cannot be undone.`}
          confirmText="Yes, Delete Log"
          cancelText="Cancel"
          loading={isDeleting}
          onClose={() => {
            if (!isDeleting) setLogToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Edit Defect Photo Modal */}
      {editingPhotoLog && (
        <div className="admin-modal-backdrop" onClick={handleCloseEditPhotoModal}>
          <div
            className="admin-modal-dialog history-photo-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Camera size={18} color="#059669" />
                  <span>Edit Defect Photo</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                  Ticket: <strong>{editingPhotoLog.ticket_number || `FM-${editingPhotoLog.report_id}`}</strong> &bull; {editingPhotoLog.report_title || editingPhotoLog.title}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={handleCloseEditPhotoModal}
                disabled={isSavingLogPhoto}
              >
                &times;
              </button>
            </div>

            <div className="history-photo-modal-body">
              <input
                type="file"
                ref={logPhotoInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleLogPhotoSelect}
              />

              <div className="history-modal-photos-grid">
                <div>
                  <label className="history-photo-label">Current Photo</label>
                  <div className="history-modal-photo-preview">
                    <img
                      src={editingPhotoLog.report_photo || '/images/hero_ac_defect.jpg'}
                      alt="Current defect"
                      onError={(e) => {
                        e.target.src = '/images/hero_ac_defect.jpg';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="history-photo-label">
                    {photoModalPreview ? 'New Photo Preview' : 'Select Replacement Photo'}
                  </label>
                  {photoModalPreview ? (
                    <div className="history-modal-photo-preview new">
                      <img src={photoModalPreview} alt="New defect preview" />
                      <button
                        type="button"
                        className="history-photo-change-btn"
                        onClick={() => logPhotoInputRef.current?.click()}
                      >
                        Choose Different
                      </button>
                    </div>
                  ) : (
                    <div
                      className="history-photo-dropzone"
                      onClick={() => logPhotoInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <UploadCloud size={32} color="#059669" />
                      <span className="history-dropzone-title">Click to upload new picture</span>
                      <span className="history-dropzone-sub">Supports JPG, PNG, WebP (max 8MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {photoModalError && (
                <div className="admin-photo-toast-error" style={{ marginTop: 12 }}>
                  <span>{photoModalError}</span>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleCloseEditPhotoModal}
                disabled={isSavingLogPhoto}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-black"
                onClick={handleSaveLogPhoto}
                disabled={!photoModalPreview || isSavingLogPhoto}
                style={{
                  background: photoModalPreview ? '#059669' : undefined,
                  borderColor: photoModalPreview ? '#059669' : undefined,
                }}
              >
                {isSavingLogPhoto ? 'Saving Picture...' : 'Save New Picture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
