import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Search,
  UserCheck,
  Lock,
} from 'lucide-react';
import { fetchAdminOverview, fetchAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '../../services/api';
import './admin.css';

export default function AdminPage({ currentUser, onNavigate, onLogout }) {
  const isAdmin = currentUser?.role_name === 'admin';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'logs'
  const [overviewData, setOverviewData] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadOverview = async () => {
    try {
      const res = await fetchAdminOverview();
      if (res.success && res.data) {
        setOverviewData(res.data);
      } else if (res.error_code === 'FORBIDDEN') {
        setErrorMsg('Server rejected access: Administrator role required.');
      }
    } catch (err) {
      setErrorMsg('Failed to load administrative overview.');
    }
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await fetchAdminUsers(params);
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin.php?action=audit_logs', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadOverview(), loadUsers(), loadAuditLogs()]).finally(() => {
      setLoading(false);
    });
  }, [isAdmin]);

  const handleRoleChange = async (userId, newRoleId) => {
    setFeedbackMsg('');
    setErrorMsg('');
    try {
      const res = await updateAdminUserRole(userId, newRoleId);
      if (res.success) {
        setFeedbackMsg(res.message);
        loadUsers();
        loadOverview();
      } else {
        setErrorMsg(res.message || 'Failed to update role.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    setFeedbackMsg('');
    setErrorMsg('');
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await updateAdminUserStatus(userId, newStatus);
      if (res.success) {
        setFeedbackMsg(res.message);
        loadUsers();
        loadOverview();
      } else {
        setErrorMsg(res.message || 'Failed to update status.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    }
  };

  // If user is not admin, render server-synchronized rejection UI
  if (!isAdmin) {
    return (
      <div className="admin-denied-page">
        <div className="admin-denied-card">
          <div className="admin-denied-icon">
            <Lock size={32} />
          </div>
          <span className="admin-denied-badge">403 &bull; Access Forbidden</span>
          <h1 className="admin-denied-title">Administrator Privileges Required</h1>
          <p className="admin-denied-text">
            Your institutional account does not possess administrator permissions.
            FixMyCampus PHP backend enforces role checks on every administrative route and API endpoint.
          </p>
          <div className="admin-role-info">
            <div className="role-col">
              <span className="role-label">Your Current Role</span>
              <span className="role-val">{currentUser?.role_display || currentUser?.role_name || 'Student'}</span>
            </div>
            <div className="role-col">
              <span className="role-label">Required Role</span>
              <span className="role-val required">Administrator</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-return-dashboard"
            onClick={() => onNavigate('dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      {/* Top Navigation */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="admin-brand-title">FixMyCampus &bull; Admin Console</h1>
            <p className="admin-brand-sub">Institutional Role &amp; Server Access Management</p>
          </div>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-pill">
            <UserCheck size={16} />
            <span>{currentUser?.full_name} (Admin)</span>
          </div>
          <button
            type="button"
            className="btn-admin-nav"
            onClick={() => onNavigate('dashboard')}
            title="Go to Standard Dashboard"
          >
            <ArrowLeft size={15} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className="btn-admin-logout"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="admin-container">
        {feedbackMsg && (
          <div className="admin-alert admin-alert-success">
            <CheckCircle2 size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="admin-alert admin-alert-error">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={16} />
            <span>Overview &amp; Health</span>
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            <span>User Management ({users.length})</span>
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <FileText size={16} />
            <span>Audit &amp; Dispatch Logs ({logs.length})</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="admin-tab-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-label">TOTAL REGISTERED USERS</span>
                <div className="admin-stat-num">{overviewData?.users?.total ?? '—'}</div>
                <span className="admin-stat-sub">Active institutional campus accounts</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">TOTAL TICKETS</span>
                <div className="admin-stat-num">{overviewData?.reports?.total ?? '—'}</div>
                <span className="admin-stat-sub">{overviewData?.reports?.pending ?? 0} pending review</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">ACTIVE REPAIRS</span>
                <div className="admin-stat-num">{overviewData?.reports?.in_progress ?? '—'}</div>
                <span className="admin-stat-sub">Dispatched to technicians</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">RESOLVED DEFECTS</span>
                <div className="admin-stat-num">{overviewData?.reports?.resolved ?? '—'}</div>
                <span className="admin-stat-sub">Completed with verification</span>
              </div>
            </div>

            <div className="admin-grid-2col" style={{ marginTop: '1.5rem' }}>
              <div className="admin-card">
                <h3 className="admin-card-title">User Breakdown by Role</h3>
                <div className="admin-roles-list">
                  {overviewData?.users?.by_role?.map((r, i) => (
                    <div key={i} className="admin-role-row">
                      <span className="admin-role-name">{r.display_name}</span>
                      <span className="admin-role-count">{r.count} users</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-card">
                <h3 className="admin-card-title">System &amp; Security Configuration</h3>
                <div className="admin-config-list">
                  <div className="admin-config-item">
                    <span className="config-k">PHP Runtime</span>
                    <span className="config-v">{overviewData?.server?.php_version || '8.3'}</span>
                  </div>
                  <div className="admin-config-item">
                    <span className="config-k">Institutional Domain</span>
                    <span className="config-v">@{overviewData?.server?.domain || 'phinmaed.com'}</span>
                  </div>
                  <div className="admin-config-item">
                    <span className="config-k">SMTP Host (OTP Notifications)</span>
                    <span className="config-v">{overviewData?.server?.smtp_host || 'smtp.gmail.com'}</span>
                  </div>
                  <div className="admin-config-item">
                    <span className="config-k">Server-Side RBAC</span>
                    <span className="config-v" style={{ color: '#10b981', fontWeight: 600 }}>Active (Protected)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && (
          <div className="admin-tab-content">
            <div className="admin-filters-bar">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search user by name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(loadUsers, 50);
                }}
                className="admin-select-filter"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              <button type="button" className="btn-admin-refresh" onClick={loadUsers}>
                <RefreshCw size={14} />
                <span>Search</span>
              </button>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User / ID</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Current Role</th>
                    <th>Status</th>
                    <th>Role Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.user_identifier}</div>
                      </td>
                      <td style={{ color: '#93c5fd' }}>{u.email}</td>
                      <td>{u.department || '—'}</td>
                      <td>
                        <span className={`badge-role badge-${u.role_name}`}>
                          {u.role_display}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge-status-btn ${u.status === 'active' ? 'active' : 'suspended'}`}
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          title="Click to toggle status"
                        >
                          {u.status}
                        </button>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          value={u.role_id}
                          onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                        >
                          <option value="1">Admin</option>
                          <option value="2">Supervisor</option>
                          <option value="3">Technician</option>
                          <option value="4">Faculty</option>
                          <option value="5">Student</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No users matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="admin-tab-content">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date &bull; Time</th>
                    <th>Ticket Number</th>
                    <th>Report Title</th>
                    <th>Transition</th>
                    <th>Changed By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, color: '#60a5fa' }}>{l.ticket_number}</td>
                      <td>{l.report_title}</td>
                      <td>
                        <span style={{ color: '#94a3b8' }}>{l.previous_status || 'new'}</span>
                        <span style={{ margin: '0 6px', color: '#f59e0b' }}>&rarr;</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>{l.new_status}</span>
                      </td>
                      <td>
                        <div>{l.changed_by_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({l.changed_by_role})</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{l.remarks || '—'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No audit history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
