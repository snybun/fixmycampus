import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchUsers } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination & limit selection state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchUsers({ role: roleFilter !== 'all' ? roleFilter : '', search }).then((res) => {
      if (isMounted && res.success && res.data) {
        setUsers(res.data);
      }
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [roleFilter, search]);

  // Reset to page 1 whenever search, role filter, or limit changes
  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

  // Guard against out-of-range currentPage (e.g. after filtering)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Smart page numbers generation
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

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">User Accounts</h1>
          <p className="admin-header-subtitle">
            Manage authenticated university accounts, roles, and campus directory identifiers.
          </p>
        </div>
      </div>

      <div className="admin-filter-card">
        <div className="admin-search-row" style={{ flexWrap: 'wrap' }}>
          <div className="admin-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search user name, email, or institutional ID..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={handleRoleChange}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="supervisor">Maintenance Staff</option>
            <option value="technician">Technician / Worker</option>
            <option value="faculty">Faculty Member</option>
            <option value="student">Student</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
              Limit:
            </span>
            <select
              className="admin-filter-select"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              title="Items per page limit"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Department / Affiliation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                    No users match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-ticket-id">{u.user_identifier || `USR-${u.id}`}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{u.full_name}</strong>
                    </td>
                    <td style={{ color: '#64748b' }}>{u.email}</td>
                    <td>
                      <span
                        className="admin-badge"
                        style={{
                          backgroundColor:
                            u.role_name === 'admin'
                              ? '#0f172a'
                              : u.role_name === 'supervisor'
                              ? '#dbeafe'
                              : u.role_name === 'technician'
                              ? '#dcfce7'
                              : '#f1f5f9',
                          color:
                            u.role_name === 'admin'
                              ? '#ffffff'
                              : u.role_name === 'supervisor'
                              ? '#1d4ed8'
                              : u.role_name === 'technician'
                              ? '#15803d'
                              : '#334155',
                        }}
                      >
                        {u.role_display || u.role_name}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{u.department || 'Campus'}</td>
                    <td>
                      <span className="admin-badge fixed">
                        {u.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Limit Selection Bar */}
        {!loading && users.length > 0 && (
          <div className="admin-pagination-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span>
                Showing {startIndex + 1}–
                {Math.min(users.length, startIndex + pageSize)} of {users.length} user{users.length === 1 ? '' : 's'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Per page:</span>
                <select
                  className="admin-filter-select"
                  style={{ padding: '4px 8px', fontSize: '0.82rem', height: 'auto', minWidth: 'unset' }}
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  aria-label="Items per page"
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
                className="admin-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {getPageNumbers().map((item, idx) =>
                item === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ padding: '6px 8px', color: 'var(--admin-text-muted)', fontSize: '0.84rem' }}
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`admin-page-btn ${currentPage === item ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item)}
                    title={`Page ${item}`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                className="admin-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next page"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
