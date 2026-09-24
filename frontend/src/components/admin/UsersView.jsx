import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Shield } from 'lucide-react';
import { fetchUsers } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
        <div className="admin-search-row">
          <div className="admin-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search user name, email, or institutional ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="supervisor">Maintenance Supervisor</option>
            <option value="technician">Technician / Worker</option>
            <option value="faculty">Faculty Member</option>
            <option value="student">Student</option>
          </select>
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
                users.map((u) => (
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
