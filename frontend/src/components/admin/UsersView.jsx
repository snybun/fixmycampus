import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, ChevronDown, Check } from 'lucide-react';
import { fetchUsers } from '../../services/api';

const USER_ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles', color: '#64748b' },
  { key: 'admin', label: 'Administrator', color: '#0f172a' },
  { key: 'supervisor', label: 'Maintenance Staff', color: '#3b82f6' },
  { key: 'technician', label: 'Technician / Worker', color: '#10b981' },
  { key: 'faculty', label: 'Faculty Member', color: '#8b5cf6' },
  { key: 'student', label: 'Student', color: '#f59e0b' },
];

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination & limit selection state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchUsers({ role: roleFilter !== 'all' ? roleFilter : '', search: appliedSearch }).then((res) => {
      if (isMounted) {
        if (res?.success && Array.isArray(res?.data)) {
          setUsers(res.data);
        } else {
          setUsers([]);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [roleFilter, appliedSearch]);

  // Reset to page 1 whenever search, role filter, or limit changes
  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (val === '' && appliedSearch !== '') {
      setAppliedSearch('');
      setCurrentPage(1);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
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
            style={{ flex: '1 1 360px', maxWidth: 540, margin: 0, flexWrap: 'wrap' }}
          >
            <div className="admin-search-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search user name, email, or institutional ID..."
                value={searchInput}
                onChange={handleSearchChange}
              />
            </div>

            <button type="submit" className="admin-btn-black">
              Search
            </button>
            {appliedSearch && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}

            {/* Filter Symbol Button & Dropdown Menu */}
            <div className="admin-filter-dropdown-wrap" ref={filterDropdownRef}>
              <button
                type="button"
                className={`admin-filter-btn ${isFilterOpen ? 'open' : ''} ${roleFilter !== 'all' ? 'has-active' : ''}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-expanded={isFilterOpen}
                title="Filter users by role"
                id="users-filter-btn"
              >
                <Filter size={15} />
                <span className="admin-filter-btn-text">
                  {roleFilter === 'all'
                    ? 'Filter'
                    : (USER_ROLE_OPTIONS.find((o) => o.key === roleFilter)?.label || 'Filter')}
                </span>
                {roleFilter !== 'all' && (
                  <span className="admin-filter-badge">
                    {users.length}
                  </span>
                )}
                <ChevronDown size={14} className={`admin-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="admin-filter-menu" role="menu">
                  <div className="admin-filter-menu-header">
                    <span>Filter by Role</span>
                    {roleFilter !== 'all' && (
                      <button
                        type="button"
                        className="admin-filter-reset-btn"
                        onClick={() => {
                          handleRoleChange({ target: { value: 'all' } });
                          setIsFilterOpen(false);
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-menu-list">
                    {USER_ROLE_OPTIONS.map((opt) => {
                      const isActive = roleFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`admin-filter-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            handleRoleChange({ target: { value: opt.key } });
                            setIsFilterOpen(false);
                          }}
                          role="menuitem"
                        >
                          <span className="admin-filter-item-dot" style={{ backgroundColor: opt.color }} />
                          <span className="admin-filter-item-label">{opt.label}</span>
                          {isActive && <Check size={14} className="admin-filter-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Upper Pagination Controls */}
          {!loading && users.length > 0 && (
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
                Showing {startIndex + 1}–
                {Math.min(users.length, startIndex + pageSize)} of {users.length} user{users.length === 1 ? '' : 's'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Per page:</span>
                <select
                  className="admin-filter-select"
                  style={{ padding: '4px 8px', fontSize: '0.82rem', height: 34, minWidth: 'unset' }}
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

                {getPageNumbers().map((item, idx) =>
                  item === '...' ? (
                    <span
                      key={`top-ellipsis-${idx}`}
                      style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={`top-page-${item}`}
                      type="button"
                      className={`admin-page-box ${currentPage === item ? 'active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                      title={`Page ${item}`}
                    >
                      {item}
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
          )}
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

      </div>
    </div>
  );
}
