import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Hourglass,
  BarChart2,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';
import { exportReportsToExcel } from '../../utils/exportToExcel';

export default function FacilitiesDashboard({
  stats,
  recentReports = [],
  onViewReport,
  onAssignReport,
  onDeleteReport,
}) {
  const total = stats?.total_reports || 0;
  const pending = stats?.pending_review || 0;
  const inProgress = stats?.in_progress || 0;
  const fixed = stats?.resolved || 0;

  // Compute donut chart angles
  const fixedPct = total > 0 ? (fixed / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;

  // Donut SVG circumference calculation for r=46 -> C ≈ 289
  const circumference = 2 * Math.PI * 46;
  const fixedStroke = (fixedPct / 100) * circumference;
  const inProgressStroke = (inProgressPct / 100) * circumference;
  const pendingStroke = (pendingPct / 100) * circumference;

  const categories = stats?.by_category || [];
  const maxCategoryCount = Math.max(1, ...categories.map((c) => Number(c.count) || 0));

  const buildings = stats?.by_building || [];
  const maxBuildingCount = Math.max(1, ...buildings.map((b) => Number(b.count) || 0));

  const timeline = stats?.timeline_6m || [
    { month: 'Mar', count: 12 },
    { month: 'Apr', count: 8 },
    { month: 'May', count: 19 },
    { month: 'Jun', count: 16 },
    { month: 'Jul', count: 6 },
    { month: 'Aug', count: 21 },
  ];
  const maxTimelineCount = Math.max(1, ...timeline.map((t) => t.count));

  // Points for SVG sparkline
  const svgWidth = 440;
  const svgHeight = 110;
  const points = timeline.map((item, idx) => {
    const x = 20 + (idx / (timeline.length - 1)) * (svgWidth - 40);
    const y = svgHeight - 15 - (item.count / maxTimelineCount) * (svgHeight - 35);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      {/* ------------------------------------------------------------------
          Top Header
          ------------------------------------------------------------------ */}
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Facilities Dashboard</h1>
          <p className="admin-header-subtitle">
            Monitor and manage campus maintenance reports.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-excel"
          onClick={() => exportReportsToExcel(recentReports, 'FixMyCampus_Facilities_Reports')}
          disabled={!recentReports || recentReports.length === 0}
          title="Export all defect tickets to Microsoft Excel (.xlsx)"
          id="facilities-export-excel-btn"
        >
          <FileSpreadsheet size={16} />
          <span>Export to Excel</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------
          4 Stat Cards
          ------------------------------------------------------------------ */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">TOTAL REPORTS</span>
            <span className="admin-stat-value">{total}</span>
          </div>
          <div className="admin-stat-icon indigo" title="Total Reports">
            <FileText size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">PENDING REVIEW</span>
            <span className="admin-stat-value amber">{pending}</span>
          </div>
          <div className="admin-stat-icon amber" title="Pending Review">
            <Hourglass size={20} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">IN PROGRESS</span>
            <span className="admin-stat-value blue">{inProgress}</span>
          </div>
          <div className="admin-stat-icon blue" title="In Progress">
            <Clock size={20} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">FIXED / RESOLVED</span>
            <span className="admin-stat-value green">
              {fixed}
            </span>
          </div>
          <div className="admin-stat-icon green" title="Fixed and Resolved">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Row 1 of Charts: Status Donut & Category Progress Bars
          ------------------------------------------------------------------ */}
      <div className="admin-widgets-grid">
        {/* Reports by Status */}
        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Reports by Status</h3>
          <div className="admin-donut-wrapper">
            <div className="admin-donut-container">
              <svg width="140" height="140" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                {/* Fixed (Green) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${fixedStroke} ${circumference}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 60 60)"
                />
                {/* In Progress (Blue) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${inProgressStroke} ${circumference}`}
                  strokeDashoffset={-fixedStroke}
                  transform="rotate(-90 60 60)"
                />
                {/* Pending Review (Amber/Yellow) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${pendingStroke} ${circumference}`}
                  strokeDashoffset={-(fixedStroke + inProgressStroke)}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="admin-donut-center">
                <div className="admin-donut-total">{total}</div>
                <div className="admin-donut-sub">Active</div>
              </div>
            </div>

            <div className="admin-donut-legend">
              <div className="admin-legend-item">
                <span className="admin-legend-dot green" />
                <span>Fixed ({fixed})</span>
              </div>
              <div className="admin-legend-item">
                <span className="admin-legend-dot blue" />
                <span>In Progress ({inProgress})</span>
              </div>
              <div className="admin-legend-item">
                <span className="admin-legend-dot amber" />
                <span>Pending Review ({pending})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reports by Category */}
        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Reports by Category</h3>
          <div className="admin-category-list">
            {categories.map((cat, idx) => {
              const count = Number(cat.count) || 0;
              const barWidth = count === 0 ? '0%' : `${Math.min(100, Math.max(8, (count / maxCategoryCount) * 100))}%`;
              return (
                <div key={cat.id || idx} className="admin-cat-row">
                  <span className="admin-cat-name" title={cat.name}>
                    {cat.name}
                  </span>
                  <div className="admin-cat-bar-bg">
                    <div
                      className={`admin-cat-bar-fill ${count > 0 ? 'active' : ''}`}
                      style={{ width: barWidth }}
                    />
                  </div>
                  <span className={`admin-cat-count ${count > 0 ? 'has-reports' : ''}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Row 2 of Charts: Building Bars & 6-Month Timeline
          ------------------------------------------------------------------ */}
      <div className="admin-widgets-grid">
        {/* Reports by Real Campus Building */}
        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Reports by Building</h3>
          <div className="admin-buildings-chart">
            {buildings.map((b) => {
              const count = Number(b.count) || 0;
              const barHeight = count > 0 
                ? Math.max(22, Math.round((count / maxBuildingCount) * 110))
                : 6;
              const shortName = b.code
                ? b.code.replace('-BLDG', '').replace('-HALL', '').replace('-CTR', '').replace('-MAIN', '').replace('-CMP', '')
                : b.name.split(' ')[0];

              return (
                <div key={b.id} className="admin-bar-col">
                  {count > 0 && <span className="admin-bar-top-count">{count}</span>}
                  <div
                    className={`admin-bar-rect ${count > 0 ? 'active' : 'empty'}`}
                    style={{ height: `${barHeight}px` }}
                    title={`${b.name}: ${count} reports`}
                  />
                  <span className="admin-bar-label" title={b.name}>
                    {shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reports Over Time (6 Months) */}
        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Reports Over Time (6 Months)</h3>
          <div className="admin-line-chart-container">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: '110px', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="adminTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon
                points={`${points} ${svgWidth - 20},${svgHeight - 15} 20,${svgHeight - 15}`}
                fill="url(#adminTimelineGrad)"
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {timeline.map((item, idx) => {
                const x = 20 + (idx / (timeline.length - 1)) * (svgWidth - 40);
                const y = svgHeight - 15 - (item.count / maxTimelineCount) * (svgHeight - 35);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="2.5"
                  />
                );
              })}
            </svg>
            <div className="admin-timeline-axis">
              {timeline.map((t, idx) => (
                <span key={idx}>{t.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Bottom Table: Recent Incident Reports
          ------------------------------------------------------------------ */}
      <div className="admin-table-card">
        <h3 className="admin-table-title">Recent Incident Reports</h3>
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Issue Details</th>
                <th>Reporter</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.slice(0, 6).map((report) => {
                const dateStr = report.reported_at
                  ? new Date(report.reported_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                const locationStr = report.building_name
                  ? `${report.building_code || report.building_name} • ${report.room_number || report.location_name || ''}`
                  : 'Campus';

                return (
                  <tr key={report.id}>
                    <td className="admin-ticket-id">
                      {report.ticket_number || `FM-${report.id}`}
                    </td>
                    <td>
                      <div className="admin-issue-cell">
                        <span className="admin-issue-title">{report.title}</span>
                        <span className="admin-issue-sub">{locationStr}</span>
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
