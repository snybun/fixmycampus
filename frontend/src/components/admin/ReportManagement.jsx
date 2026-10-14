import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function ReportManagement({
  reports = [],
  buildings = [],
  categories = [],
  onViewReport,
  onAssignReport,
  onUpdateStatus,
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
  const pageSize = 8;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchTerm.trim().toLowerCase());
    setCurrentPage(1);
  };

  // Filter reports locally
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
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReports = filtered.slice(startIndex, startIndex + pageSize);

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
      </div>

      {/* Filter and Search Card */}
      <div className="admin-filter-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-row">
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
        </form>

        <div className="admin-filters-row">
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

      {/* Reports Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Issue Title</th>
                <th>Reporter Name</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
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

                  return (
                    <tr key={report.id}>
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
                            onClick={() => onViewReport(report)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="admin-btn-action-assign"
                            onClick={() => onAssignReport(report)}
                          >
                            Assign
                          </button>
                          <button
                            type="button"
                            className="admin-btn-action-update"
                            onClick={() => onUpdateStatus(report)}
                          >
                            Update
                          </button>
                          {(report.status === 'resolved' || report.status === 'closed') && onDeleteReport && (
                            <button
                              type="button"
                              className="admin-btn-action-delete"
                              onClick={() => onDeleteReport(report)}
                              title="Delete fixed report from database"
                            >
                              Delete
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

        {/* Pagination */}
        <div className="admin-pagination-bar">
          <span>
            Showing {filtered.length === 0 ? 0 : startIndex + 1}-
            {Math.min(filtered.length, startIndex + pageSize)} of {filtered.length} results
          </span>

          <div className="admin-pagination-btns">
            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                className={`admin-page-btn ${currentPage === pg ? 'active' : ''}`}
                onClick={() => setCurrentPage(pg)}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              className="admin-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
