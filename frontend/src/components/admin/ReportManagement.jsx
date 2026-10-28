import React, { useEffect, useState } from 'react';
import { Search, FileSpreadsheet, MapPin, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportReportsToExcel } from '../../utils/exportToExcel';

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

export default function ReportManagement({
  reports = [],
  buildings = [],
  categories = [],
  onViewReport,
  onAssignReport,
  onUpdateStatus,
  onArchiveReport,
  onArchiveReports,
  isArchiving = false,
  onDeleteReport,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const canArchive = (report) => ['resolved', 'closed'].includes(report.status);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => reports.some((r) => r.id === id && canArchive(r))));
  }, [reports]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeSearch, statusFilter, priorityFilter, buildingFilter, categoryFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchTerm.trim().toLowerCase());
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    const listToExport = filtered.length > 0 ? filtered : reports;
    exportReportsToExcel(listToExport, 'FixMyCampus_Report_Management');
  };

  const filtered = reports.filter((r) => {
    if (activeSearch) {
      const matchSearch =
        r.title?.toLowerCase().includes(activeSearch) ||
        r.ticket_number?.toLowerCase().includes(activeSearch) ||
        r.reporter_name?.toLowerCase().includes(activeSearch) ||
        r.building_name?.toLowerCase().includes(activeSearch);
      if (!matchSearch) return false;
    }

    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    if (buildingFilter !== 'all' && String(r.building_id) !== String(buildingFilter)) return false;
    if (categoryFilter !== 'all' && String(r.category_id) !== String(categoryFilter)) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);
  const startIndex = (Math.min(currentPage, totalPages) - 1) * pageSize;
  const paginatedReports = filtered.slice(startIndex, startIndex + pageSize);
  const selectedReports = filtered.filter((r) => selectedIds.includes(r.id) && canArchive(r));
  const selectableOnPage = paginatedReports.filter(canArchive);
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((r) => selectedIds.includes(r.id));
  const renderSelection = (report) => (
    <input
      type="checkbox"
      aria-label={`Select ${report.ticket_number || report.title} for archive`}
      checked={selectedIds.includes(report.id)}
      disabled={!canArchive(report) || isArchiving}
      onChange={() => setSelectedIds((ids) => ids.includes(report.id)
        ? ids.filter((id) => id !== report.id) : [...ids, report.id])}
    />
  );

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Report Management</h1>
          <p className="admin-header-subtitle">
            Filter, search, and update facility tickets on campus.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-excel"
          onClick={handleExportExcel}
          disabled={selectMode || reports.length === 0}
          title="Export filtered reports to Microsoft Excel (.xlsx)"
          id="admin-export-excel-btn"
        >
          <FileSpreadsheet size={16} />
          <span>Export to Excel ({filtered.length})</span>
        </button>
      </div>

      {/* Filter and Search Card */}
      <div className="admin-filter-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            className="admin-search-row"
            style={{ flex: '1 1 340px', maxWidth: 520, margin: 0 }}
          >
            <div className="admin-search-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by keyword, reporter name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="admin-btn-black">
              Search
            </button>
            {activeSearch && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setActiveSearch('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Upper Pagination Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginLeft: 'auto',
            }}
          >
            <span style={{ fontSize: '0.86rem', color: '#64748b' }}>
              Showing {filtered.length === 0 ? 0 : startIndex + 1}–
              {Math.min(filtered.length, startIndex + pageSize)} of {filtered.length} results
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Per page:</span>
              <select
                className="admin-filter-select"
                style={{ padding: '4px 8px', fontSize: '0.82rem', height: 34, minWidth: 'unset' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Reports per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="admin-pagination-btns">
              <button
                type="button"
                className="admin-page-box arrow-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers(currentPage, totalPages).map((pg, idx) =>
                pg === '...' ? (
                  <span
                    key={`top-ellipsis-${idx}`}
                    style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`top-page-${pg}`}
                    type="button"
                    className={`admin-page-box ${currentPage === pg ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pg)}
                    title={`Page ${pg}`}
                  >
                    {pg}
                  </button>
                )
              )}

              <button
                type="button"
                className="admin-page-box arrow-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="admin-filters-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <Filter size={14} style={{ color: '#059669' }} />
            <span>Filters:</span>
          </div>
          {/* Status */}
          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Status: All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Fixed / Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority */}
          <select
            className="admin-filter-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Priority: All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Real Campus Buildings from Database */}
          <select
            className="admin-filter-select"
            value={buildingFilter}
            onChange={(e) => {
              setBuildingFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Building: All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Real Categories from Database */}
          <select
            className="admin-filter-select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Category: All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <select
            className="admin-filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Date Range: All Time</option>
            <option value="30">Date Range: Last 30 Days</option>
            <option value="7">Date Range: Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Reports Table & Mobile Cards */}
      <div className="admin-table-card">
        {/* Mobile-only Selection Controls */}
        {onArchiveReports && (
          <div className="admin-mobile-only" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
              {selectMode ? `${selectedReports.length} selected` : 'Reports'}
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {selectMode && selectedReports.length > 0 && (
                <button
                  type="button"
                  className="admin-btn-action-archive"
                  disabled={isArchiving}
                  onClick={() => onArchiveReports(selectedReports)}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {isArchiving ? 'Archiving...' : `Archive (${selectedReports.length})`}
                </button>
              )}
              <button
                type="button"
                className="admin-btn-action-view"
                disabled={isArchiving || (!selectMode && !filtered.some(canArchive))}
                onClick={() => {
                  setSelectMode((value) => !value);
                  setSelectedIds([]);
                }}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>
        )}

        {/* Desktop / Tablet Table View */}
        <div className="admin-table-responsive admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                {selectMode && (
                  <th scope="col" style={{ width: '44px', textAlign: 'center', padding: '12px 8px' }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      disabled={isArchiving || selectableOnPage.length === 0}
                      onChange={() =>
                        setSelectedIds((ids) =>
                          allOnPageSelected
                            ? ids.filter((id) => !selectableOnPage.some((r) => r.id === id))
                            : [...new Set([...ids, ...selectableOnPage.map((r) => r.id)])]
                        )
                      }
                      title="Select all on this page"
                      aria-label="Select all on this page"
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                )}
                <th>ID</th>
                <th>Issue Title</th>
                <th>Reporter Name</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span>Actions</span>
                    {onArchiveReports && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {selectMode && selectedReports.length > 0 && (
                          <button
                            type="button"
                            className="admin-btn-action-archive"
                            disabled={isArchiving}
                            onClick={() => onArchiveReports(selectedReports)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              lineHeight: 1.4,
                            }}
                            title="Archive selected reports"
                          >
                            {isArchiving ? 'Archiving...' : `Archive (${selectedReports.length})`}
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn-action-view"
                          aria-pressed={selectMode}
                          disabled={isArchiving || (!selectMode && !filtered.some(canArchive))}
                          onClick={() => {
                            setSelectMode((value) => !value);
                            setSelectedIds([]);
                          }}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            lineHeight: 1.4,
                            backgroundColor: selectMode ? '#fee2e2' : '#ffffff',
                            borderColor: selectMode ? '#fca5a5' : 'var(--admin-border)',
                            color: selectMode ? '#dc2626' : '#0f172a',
                          }}
                          title={selectMode ? 'Cancel selection' : 'Select multiple reports to archive'}
                        >
                          {selectMode ? 'Cancel' : 'Select'}
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={selectMode ? 8 : 7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No incident reports match your active filters.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => {
                  const dateStr = report.reported_at
                    ? new Date(report.reported_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : 'Recent';

                  const locSub = report.building_name
                    ? `${report.building_code || report.building_name} • ${report.room_number || report.location_name || ''}`
                    : '';

                  const isResolved = report.status === 'resolved' || report.status === 'closed';

                  return (
                    <tr key={report.id}>
                      {selectMode && <td>{renderSelection(report)}</td>}
                      <td className="admin-ticket-id">
                        {report.ticket_number || `FM-${report.id}`}
                      </td>
                      <td>
                        <div className="admin-issue-cell">
                          <span className="admin-issue-title">{report.title}</span>
                          {locSub && <span className="admin-issue-sub">{locSub}</span>}
                        </div>
                      </td>
                      <td>{report.reporter_name || 'Reporter'}</td>
                      <td>
                        <span className={`admin-badge ${report.priority}`}>
                          {report.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${report.status}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{dateStr}</td>
                      <td>
                        <div className="admin-action-btns">
                          <button
                            type="button"
                            className="admin-btn-action-view"
                            disabled={selectMode}
                            onClick={() => onViewReport(report)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="admin-btn-action-assign"
                            onClick={() => {
                              if (isResolved || report.worker_id) return;
                              onAssignReport(report);
                            }}
                            disabled={selectMode || isResolved || Boolean(report.worker_id)}
                            style={(isResolved || report.worker_id) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                            title={(isResolved || report.worker_id) ? 'Worker assignment is locked' : 'Assign maintenance technician'}
                          >
                            {report.worker_id ? 'Assigned' : 'Assign'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn-action-update"
                            onClick={() => {
                              if (isResolved) return;
                              onUpdateStatus(report);
                            }}
                            disabled={selectMode || isResolved}
                            style={isResolved ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                            title={isResolved ? 'Status locked: Issue already fixed' : 'Update report status'}
                          >
                            Update
                          </button>
                          {!selectMode && isResolved && (onArchiveReport || onDeleteReport) && (
                            <button
                              type="button"
                              className="admin-btn-action-archive"
                              onClick={() => (onArchiveReport || onDeleteReport)(report)}
                              title="Archive fixed report into History Logs"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile-Optimized Reports Card List (Shown on screens <= 768px) */}
        <div className="admin-mobile-reports-list admin-mobile-only">
          {paginatedReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
              No incident reports match your active filters.
            </div>
          ) : (
            paginatedReports.map((report) => {
              const dateStr = report.reported_at
                ? new Date(report.reported_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              const locSub = report.building_name
                ? `${report.building_code || report.building_name} • ${report.room_number || report.location_name || ''}`
                : '';

              const isResolved = report.status === 'resolved' || report.status === 'closed';

              return (
                <div key={report.id} className="admin-report-mobile-card">
                  {/* Top Bar: Ticket ID + Priority/Status Badges */}
                  <div className="admin-report-card-top">
                    {selectMode && renderSelection(report)}
                    <span className="admin-ticket-id">
                      {report.ticket_number || `FM-${report.id}`}
                    </span>
                    <div className="admin-report-card-badges">
                      <span className={`admin-badge ${report.priority}`}>
                        {report.priority}
                      </span>
                      <span className={`admin-badge ${report.status}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Body: Title, Location, Reporter & Date */}
                  <div className="admin-report-card-body">
                    <h4 className="admin-report-card-title">{report.title}</h4>
                    {locSub && (
                      <div className="admin-report-card-loc">
                        <MapPin size={13} style={{ flexShrink: 0 }} />
                        <span>{locSub}</span>
                      </div>
                    )}
                    <div className="admin-report-card-meta">
                      <span>
                        <strong>Reporter:</strong> {report.reporter_name || 'Reporter'}
                      </span>
                      <span>
                        <strong>Date:</strong> {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Grid: Touch-Friendly Buttons */}
                  <div className="admin-report-card-actions">
                    <button
                      type="button"
                      className="admin-btn-action-view"
                      disabled={selectMode}
                            onClick={() => onViewReport(report)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action-assign"
                      onClick={() => {
                        if (isResolved || report.worker_id) return;
                        onAssignReport(report);
                      }}
                      disabled={selectMode || isResolved || Boolean(report.worker_id)}
                      style={(isResolved || report.worker_id) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      title={(isResolved || report.worker_id) ? 'Worker assignment is locked' : 'Assign maintenance technician'}
                    >
                      {report.worker_id ? 'Assigned' : 'Assign'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action-update"
                      onClick={() => {
                        if (isResolved) return;
                        onUpdateStatus(report);
                      }}
                      disabled={selectMode || isResolved}
                      style={isResolved ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      title={isResolved ? 'Status locked: Issue already fixed' : 'Update report status'}
                    >
                      Update
                    </button>
                    {!selectMode && isResolved && (onArchiveReport || onDeleteReport) && (
                      <button
                        type="button"
                        className="admin-btn-action-archive"
                        onClick={() => (onArchiveReport || onDeleteReport)(report)}
                        title="Archive fixed report into History Logs"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
