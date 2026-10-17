import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { fetchHistoryLogs, deleteHistoryLog } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';

export default function HistoryLogView({ onViewReport }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [summary, setSummary] = useState({
    all: 0,
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
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
            Comprehensive audit trail of users who registered, defect reports logged with timestamps &amp; locations, status updates, and archived records.
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
        <div className="history-summary-card">
          <div className="history-summary-icon all">
            <History size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.all}</div>
            <div className="history-summary-lbl">All Activities</div>
          </div>
        </div>

        <div className="history-summary-card">
          <div className="history-summary-icon users">
            <UserPlus size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.user_registration}</div>
            <div className="history-summary-lbl">Users Signed Up</div>
          </div>
        </div>

        <div className="history-summary-card">
          <div className="history-summary-icon reports">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.report_submitted}</div>
            <div className="history-summary-lbl">Incidents Reported</div>
          </div>
        </div>

        <div className="history-summary-card">
          <div className="history-summary-icon status">
            <RefreshCcw size={20} />
          </div>
          <div>
            <div className="history-summary-val">{summary.status_change}</div>
            <div className="history-summary-lbl">Status Updates</div>
          </div>
        </div>

        <div className="history-summary-card">
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
        {/* Search & Filter Row */}
        <form onSubmit={handleSearchSubmit} className="admin-search-row" style={{ flexWrap: 'wrap' }}>
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

          <select
            className="admin-filter-select"
            value={activeType}
            onChange={(e) => handleTypeChange(e.target.value)}
            title="Filter by log category"
          >
            <option value="all">All Logs ({summary.all})</option>
            <option value="user_registration">User Sign-ups ({summary.user_registration})</option>
            <option value="report_submitted">Reports Logged ({summary.report_submitted})</option>
            <option value="status_change">Status Updates ({summary.status_change})</option>
            <option value="report_archived">Archived Reports ({summary.report_archived})</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
              Limit:
            </span>
            <select
              className="admin-filter-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              title="Items per page limit"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </form>

        {/* Category Pills */}
        <div className="history-pills-row">
          <button
            type="button"
            className={`history-pill ${activeType === 'all' ? 'active' : ''}`}
            onClick={() => handleTypeChange('all')}
          >
            <History size={14} />
            <span>All Logs</span>
            <span className="history-pill-badge">{summary.all}</span>
          </button>

          <button
            type="button"
            className={`history-pill ${activeType === 'user_registration' ? 'active' : ''}`}
            onClick={() => handleTypeChange('user_registration')}
          >
            <UserPlus size={14} />
            <span>User Sign-ups</span>
            <span className="history-pill-badge">{summary.user_registration}</span>
          </button>

          <button
            type="button"
            className={`history-pill ${activeType === 'report_submitted' ? 'active' : ''}`}
            onClick={() => handleTypeChange('report_submitted')}
          >
            <AlertCircle size={14} />
            <span>Reports Logged</span>
            <span className="history-pill-badge">{summary.report_submitted}</span>
          </button>

          <button
            type="button"
            className={`history-pill ${activeType === 'status_change' ? 'active' : ''}`}
            onClick={() => handleTypeChange('status_change')}
          >
            <RefreshCcw size={14} />
            <span>Status Updates</span>
            <span className="history-pill-badge">{summary.status_change}</span>
          </button>

          <button
            type="button"
            className={`history-pill ${activeType === 'report_archived' ? 'active' : ''}`}
            onClick={() => handleTypeChange('report_archived')}
          >
            <Archive size={14} />
            <span>Archived Reports</span>
            <span className="history-pill-badge">{summary.report_archived}</span>
          </button>
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
                          <div className="history-actor-avatar">{actorInitials}</div>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.title}</span>
                            {log.ticket_number && (
                              <span
                                className="admin-ticket-id"
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '1px 6px',
                                  background: '#eff6ff',
                                  borderRadius: 4,
                                  cursor: onViewReport && log.report_id ? 'pointer' : 'default',
                                }}
                                onClick={() => {
                                  if (onViewReport && log.report_id) {
                                    onViewReport({ id: log.report_id });
                                  }
                                }}
                                title={log.report_id ? 'Click to inspect defect ticket' : ''}
                              >
                                {log.ticket_number}
                              </span>
                            )}
                          </div>
                          {log.description && (
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                              {log.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action: Delete */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="history-delete-row-btn"
                          onClick={() => setLogToDelete(log)}
                          title="Delete this history log entry"
                          id={`history-del-${log.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.total > 0 && (
          <div className="history-pagination-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span className="history-page-info">
                Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
                <strong>{pagination.total}</strong> logs
              </span>

              <div className="history-perpage-wrap">
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="history-perpage-select"
                  title="Items per page"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>

            <div className="history-page-nav">
              <button
                type="button"
                className="history-page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, idx) => {
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
                    key={p}
                    type="button"
                    className={`history-page-btn ${currentPage === p ? 'active' : ''}`}
                    onClick={() => handlePageChange(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                className="history-page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.total_pages || loading}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
}
