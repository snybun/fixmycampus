import React, { useState } from 'react';
import { Search, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function ReportsTable({ reports = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.building_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      r.status === statusFilter ||
      (statusFilter === 'active' && ['assigned', 'in_progress', 'under_review'].includes(r.status));

    return matchesSearch && matchesStatus;
  });

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'emergency':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'badge-success';
      case 'in_progress':
        return 'badge-warning';
      case 'assigned':
        return 'badge-info';
      case 'emergency':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  const formatStatus = (status) => {
    if (!status) return '—';
    return status
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <section className="card" id="reports">
      <div className="card-header">
        <div>
          <h2 className="card-title">Defect Tickets</h2>
          <p className="card-subtitle">
            Live tickets queried from <code>fixmycampus_db.reports</code> via PDO prepared statements
          </p>
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search tickets or rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.35rem 0.75rem 0.35rem 2rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem',
                background: 'var(--color-white)',
                fontFamily: 'inherit',
                outline: 'none',
                width: '200px',
              }}
            />
          </div>

          <button
            type="button"
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({reports.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active Work
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading defect tickets...
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Defect Summary</th>
                <th>Category</th>
                <th>Facility &amp; Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id || report.ticket_number}>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {report.ticket_number}
                    </strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{report.title}</div>
                    {report.specific_area && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Area: {report.specific_area}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                      {report.category_name || 'General'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>
                      {report.building_name || ''}
                      {report.location_name ? ` · ${report.location_name}` : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityBadgeClass(report.priority)}`}>
                      {report.priority ? report.priority.toUpperCase() : 'MEDIUM'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                      {formatStatus(report.status)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      {formatDate(report.reported_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          <p>No defect tickets match your search or filter.</p>
        </div>
      )}
    </section>
  );
}
