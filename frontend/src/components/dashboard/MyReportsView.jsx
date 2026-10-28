import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  FileQuestion,
  Plus,
  Trash2,
  Check,
  X,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { fetchReports } from '../../services/api';
import ReportDetailsView from './ReportDetailsView';
import './myReports.css';

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

export default function MyReportsView({
  liveReports = [],
  onNavigate,
  initialSelectedReport = null,
  onDeleteReport = null,
  onArchiveReport = null,
  onRestoreReport = null,
  isAdmin = false,
  currentUser = null,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'reported', 'verified', 'worker_assigned', 'in_progress', 'resolved', 'archived'
  const filterDropdownRef = useRef(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(initialSelectedReport);
  const [localReports, setLocalReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const STATUS_CONFIG = [
    { key: 'all', label: 'All Reports', dotColor: '#9ca3af' },
    { key: 'reported', label: 'Reported', dotColor: '#f59e0b' },
    { key: 'verified', label: 'Verified', dotColor: '#3b82f6' },
    { key: 'worker_assigned', label: 'Worker Assigned', dotColor: '#6366f1' },
    { key: 'in_progress', label: 'Repair Ongoing', dotColor: '#8b5cf6' },
    { key: 'resolved', label: 'Fixed', dotColor: '#10b981' },
    { key: 'archived', label: 'Archived', dotColor: '#d97706' },
  ];

  // Close filter dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (initialSelectedReport) {
      setSelectedReport(initialSelectedReport);
    }
  }, [initialSelectedReport]);

  // Load reports from API if liveReports wasn't passed or is empty
  useEffect(() => {
    let isMounted = true;
    if (liveReports && liveReports.length > 0) {
      setLocalReports(liveReports);
    } else {
      setLoading(true);
      const params = currentUser?.id 
        ? { limit: 100, my_reports: 1, user_id: currentUser.id } 
        : { limit: 100, my_reports: 1 };

      fetchReports(params)
        .then((res) => {
          if (isMounted && res && res.success && Array.isArray(res.data)) {
            setLocalReports(res.data);
          } else if (isMounted) {
            setLocalReports([]);
          }
        })
        .catch((err) => {
          console.error('Error fetching student reports:', err);
          if (isMounted) setLocalReports([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [liveReports]);

  // Derive reports directly from the database without any mock fallback
  const allReports = useMemo(() => {
    const source = (liveReports && liveReports.length > 0) ? liveReports : localReports;
    if (!source || !Array.isArray(source)) return [];

    return source.map((r) => {
      const rawStatus = (r.status || 'submitted').toLowerCase();
      let statusLabel = 'Reported';
      let stepIdx = 0;
      if (rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed') {
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

      const rawPriority = String(r.priority || 'medium').toLowerCase();
      let priorityLabel = 'Medium';
      if (rawPriority === 'emergency' || rawPriority === 'urgent') priorityLabel = 'Urgent';
      else if (rawPriority === 'high') priorityLabel = 'High';
      else if (rawPriority === 'low') priorityLabel = 'Low';

      const repDate = r.reported_at
        ? new Date(r.reported_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : (r.date || 'Recently');

      const formattedDateReported = r.reported_at
        ? new Date(r.reported_at).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : (r.formattedDateReported || `${repDate} at 2:14 PM`);

      const building = r.building_name || r.building || 'Campus';
      const room = r.room_number || r.specific_area || r.room || 'Facility Area';
      const location = r.location || `${building} • ${room}`;

      const assignedWorker = r.assignedWorker || (r.worker_name
        ? {
            name: r.worker_name,
            role: r.worker_department ? `${r.worker_department} Staff` : 'Assigned Technician',
          }
        : null);

      return {
        ...r,
        id: r.id,
        ticket_number: r.ticket_number || `FMC-${r.id}`,
        date: repDate,
        reportedDate: repDate,
        formattedDateReported,
        title: r.title || 'Campus Facility Defect',
        location,
        building,
        room,
        priority: priorityLabel,
        status: rawStatus,
        statusLabel,
        is_confirmed: Boolean(r.is_confirmed || r.has_confirmed),
        confirmation_count: Number(r.confirmation_count || 1),
        category: r.category_name || r.category || 'General Facility Defect',
        description: r.description || 'Facility maintenance defect ticket.',
        image: r.primary_photo || r.image_url || r.image || '/images/hero_ac_defect.jpg',
        stepIndex: stepIdx,
        assignedWorker,
      };
    });
  }, [liveReports, localReports]);

  // Compute ticket counts per status for the filter dropdown
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      reported: 0,
      verified: 0,
      worker_assigned: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
    };
    allReports.forEach((report) => {
      if (report.is_archived) {
        counts.archived += 1;
        return;
      }
      counts.all += 1;
      if (report.status === 'submitted' || report.status === 'pending' || report.statusLabel === 'Reported') {
        counts.reported += 1;
      } else if (report.status === 'under_review' || report.statusLabel === 'Verified') {
        counts.verified += 1;
      } else if (report.status === 'assigned' || report.statusLabel === 'Worker Assigned') {
        counts.worker_assigned += 1;
      } else if (report.status === 'in_progress' || report.statusLabel === 'Repair Ongoing') {
        counts.in_progress += 1;
      } else if (report.status === 'resolved' || report.status === 'closed' || report.statusLabel === 'Fixed') {
        counts.resolved += 1;
      }
    });
    return counts;
  }, [allReports]);

  // Filter reports by search and status tab
  const filteredReports = useMemo(() => {
    return allReports.filter((report) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = report.title?.toLowerCase().includes(query);
        const matchesTicket = report.ticket_number?.toLowerCase().includes(query);
        const matchesBuilding = report.building?.toLowerCase().includes(query);
        const matchesLocation = report.location?.toLowerCase().includes(query);
        const matchesCategory = report.category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTicket && !matchesBuilding && !matchesLocation && !matchesCategory) {
          return false;
        }
      }

      // Tab filtering
      if (statusFilter === 'archived') {
        return Boolean(report.is_archived);
      }
      if (report.is_archived) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'reported') {
        return report.status === 'submitted' || report.status === 'pending' || report.statusLabel === 'Reported';
      }
      if (statusFilter === 'verified') {
        return report.status === 'under_review' || report.statusLabel === 'Verified';
      }
      if (statusFilter === 'worker_assigned') {
        return report.status === 'assigned' || report.statusLabel === 'Worker Assigned';
      }
      if (statusFilter === 'in_progress') {
        return report.status === 'in_progress' || report.statusLabel === 'Repair Ongoing';
      }
      if (statusFilter === 'resolved') {
        return report.status === 'resolved' || report.status === 'closed' || report.statusLabel === 'Fixed';
      }
      return true;
    });
  }, [allReports, searchQuery, statusFilter]);

  // Reset pagination to page 1 whenever search query, status filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  // Ensure currentPage does not exceed totalPages if reports list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredReports.slice(startIdx, startIdx + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const startIdx = filteredReports.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(filteredReports.length, currentPage * pageSize);

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

  // If a report is currently selected, render the dedicated Report Details Progress view
  if (selectedReport) {
    return (
      <ReportDetailsView
        report={selectedReport}
        onBack={() => setSelectedReport(null)}
        onDelete={onDeleteReport}
        onArchive={(rep) => {
          if (onArchiveReport) {
            onArchiveReport(rep);
            setSelectedReport(null);
          }
        }}
        onRestore={(rep) => {
          if (onRestoreReport) {
            onRestoreReport(rep);
            setSelectedReport(null);
          }
        }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="myreports-page-wrapper">
      <div className="myreports-container">
        {/* ------------------------------------------------------------------
            Header Row: Title, Subtitle, Search Box & Filter Button
            ------------------------------------------------------------------ */}
        <div className="myreports-header-row">
          <div>
            <h1 className="myreports-title">My Reports</h1>
            <p className="myreports-subtitle">
              View and track status updates on facility issues you have raised.
            </p>
          </div>

          <div className="myreports-search-wrap">
            <div className="myreports-search-box">
              <Search size={16} className="myreports-search-icon" />
              <input
                type="text"
                className="myreports-search-input"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search reports"
              />
            </div>

            {/* Filter Dropdown Button */}
            <div className="myreports-filter-dropdown-wrap" ref={filterDropdownRef}>
              <button
                type="button"
                className={`myreports-filter-btn ${isFilterOpen ? 'open' : ''} ${statusFilter !== 'all' ? 'has-active' : ''}`}
                title="Filter reports by status"
                aria-label="Filter reports by status"
                aria-expanded={isFilterOpen}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                id="myreports-filter-toggle-btn"
              >
                <SlidersHorizontal size={16} />
                {statusFilter !== 'all' && <span className="myreports-filter-active-dot" />}
              </button>

              {isFilterOpen && (
                <div className="myreports-filter-dropdown-menu" role="menu" aria-label="Filter by status">
                  <div className="myreports-filter-dropdown-header">
                    <span>Filter by Status</span>
                    {statusFilter !== 'all' && (
                      <button
                        type="button"
                        className="myreports-filter-reset-link"
                        onClick={() => {
                          setStatusFilter('all');
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="myreports-filter-dropdown-list">
                    {STATUS_CONFIG.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`myreports-filter-dropdown-item ${statusFilter === opt.key ? 'active' : ''}`}
                        onClick={() => {
                          setStatusFilter(opt.key);
                          setIsFilterOpen(false);
                        }}
                        role="menuitem"
                      >
                        <span
                          className={`myreports-filter-item-dot dot-${opt.key}`}
                          style={{ backgroundColor: opt.dotColor }}
                        />
                        <span className="myreports-filter-item-label">{opt.label}</span>
                        <span className="myreports-filter-item-count">
                          {statusCounts[opt.key] ?? 0}
                        </span>
                        {statusFilter === opt.key && (
                          <Check size={14} className="myreports-filter-item-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Pill Row (if not 'all') */}
        {statusFilter !== 'all' && (
          <div className="myreports-active-filter-row">
            <span className="myreports-active-filter-label">Active Filter:</span>
            <span className="myreports-active-filter-pill">
              <span
                className="myreports-active-filter-dot"
                style={{
                  backgroundColor: STATUS_CONFIG.find((s) => s.key === statusFilter)?.dotColor || '#059669',
                }}
              />
              {STATUS_CONFIG.find((s) => s.key === statusFilter)?.label}
              <button
                type="button"
                className="myreports-active-filter-clear-btn"
                onClick={() => setStatusFilter('all')}
                title="Clear filter"
                aria-label="Clear status filter"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------------
            Report Cards List
            ------------------------------------------------------------------ */}
        {filteredReports.length === 0 ? (
          <div className="myreports-empty-state">
            <div className="myreports-empty-icon">
              <FileQuestion size={32} strokeWidth={1.8} />
            </div>
            <h3 className="myreports-empty-title">
              {loading ? 'Loading reports...' : 'No reports found'}
            </h3>
            <p className="myreports-empty-desc">
              {loading
                ? 'Retrieving your campus facility reports from the database...'
                : searchQuery
                ? `No facility issues match your query "${searchQuery}".`
                : statusFilter !== 'all'
                ? `No facility issues found matching status filter "${statusFilter.replace('_', ' ')}".`
                : 'You have not submitted any facility issue reports yet.'}
            </p>
            {onNavigate && statusFilter === 'all' && !searchQuery && !loading && (
              <button
                type="button"
                className="myreports-report-btn-empty"
                onClick={() => onNavigate('report-issue')}
              >
                <Plus size={16} />
                <span>Report a Facility Issue</span>
              </button>
            )}
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                className="myreports-tab active"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="myreports-list" role="list">
            {paginatedReports.map((report) => (
              <div
                key={report.id}
                className="myreports-card"
                role="listitem"
                onClick={() => setSelectedReport(report)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedReport(report);
                  }
                }}
              >
                {/* Left Side: Thumbnail + Metadata + Title + Location */}
                <div className="myreports-card-left">
                  <div className="myreports-card-thumb">
                    <img
                      src={report.image}
                      alt={report.title}
                      onError={(e) => {
                        e.target.src = '/images/hero_ac_defect.jpg';
                      }}
                    />
                  </div>

                  <div className="myreports-card-content">
                    <div className="myreports-card-meta">
                      <span className="myreports-card-ticket">
                        {report.ticket_number}
                      </span>
                      <span className="myreports-card-dot">•</span>
                      <span className="myreports-card-date">{report.date}</span>
                      {report.is_confirmed ? (
                        <>
                          <span className="myreports-card-dot">•</span>
                          <span className="myreports-confirmed-tag">
                            👥 Confirmed by You{report.confirmation_count > 1 ? ` (+${report.confirmation_count - 1})` : ''}
                          </span>
                        </>
                      ) : report.confirmation_count > 1 ? (
                        <>
                          <span className="myreports-card-dot">•</span>
                          <span className="myreports-impact-tag">
                            👥 {report.confirmation_count} students affected
                          </span>
                        </>
                      ) : null}
                    </div>

                    <h3 className="myreports-card-title">{report.title}</h3>
                    <p className="myreports-card-location">{report.location}</p>
                  </div>
                </div>

                {/* Right Side: Priority Pill + Status Pill + Archive/Restore Button + Delete Button + Arrow Button */}
                <div className="myreports-card-right">
                  {report.is_archived ? (
                    <span className="myreports-status-badge status-archived">
                      <Archive size={12} style={{ marginRight: 4 }} />
                      Archived
                    </span>
                  ) : (
                    <span className={`myreports-status-badge status-${(report.status || 'reported').toLowerCase()}`}>
                      {report.statusLabel}
                    </span>
                  )}

                  {/* Archive button for finished reports */}
                  {!report.is_archived &&
                    (report.status === 'resolved' || report.status === 'closed' || report.status === 'fixed' || report.statusLabel === 'Fixed') &&
                    onArchiveReport && (
                      <button
                        type="button"
                        className="myreports-archive-btn"
                        title="Archive this finished report into History & Archives"
                        aria-label="Archive report"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveReport(report);
                        }}
                        id={`myreports-archive-btn-${report.id}`}
                      >
                        <Archive size={13} />
                        <span>Archive</span>
                      </button>
                    )}

                  {/* Restore button for archived reports */}
                  {Boolean(report.is_archived) && onRestoreReport && (
                    <button
                      type="button"
                      className="myreports-restore-btn"
                      title="Restore report back to active list"
                      aria-label="Restore report"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreReport(report);
                      }}
                      id={`myreports-restore-btn-${report.id}`}
                    >
                      <RotateCcw size={13} />
                      <span>Restore</span>
                    </button>
                  )}

                  {isReportDeletable(report) && onDeleteReport && !report.is_archived && (
                    <button
                      type="button"
                      className="myreports-delete-btn"
                      title="Delete report"
                      aria-label="Delete report"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReport(report);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="myreports-card-arrow-btn"
                    title="View report details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls (Card style matching Admin & Maintenance dashboards) */}
        {!loading && (
          <div className="myreports-pagination" aria-label="Reports pagination">
            <div className="myreports-pagination-info">
              <span>
                Showing {startIdx}–{endIdx} of {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
              </span>
              <div className="myreports-pagination-limit">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="myreports-pagination-select"
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

            <div className="myreports-pagination-controls">
              <button
                type="button"
                className="myreports-page-btn arrow-btn"
                disabled={currentPage <= 1 || totalPages <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {totalPages === 0 ? (
                <button type="button" className="myreports-page-btn active" disabled>
                  1
                </button>
              ) : (
                getPageNumbers(currentPage, totalPages).map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`ellipsis-${idx}`} className="myreports-page-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${pg}`}
                      type="button"
                      className={`myreports-page-btn ${currentPage === pg ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pg)}
                      title={`Page ${pg}`}
                      aria-current={currentPage === pg ? 'page' : undefined}
                    >
                      {pg}
                    </button>
                  )
                )
              )}

              <button
                type="button"
                className="myreports-page-btn arrow-btn"
                disabled={currentPage >= totalPages || totalPages <= 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
