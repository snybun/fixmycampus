import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  FileQuestion,
  Plus,
} from 'lucide-react';
import { fetchReports } from '../../services/api';
import ReportDetailsView from './ReportDetailsView';
import './myReports.css';

export default function MyReportsView({
  liveReports = [],
  onNavigate,
  initialSelectedReport = null,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'reported', 'verified', 'worker_assigned', 'in_progress', 'resolved'
  const [selectedReport, setSelectedReport] = useState(initialSelectedReport);
  const [localReports, setLocalReports] = useState([]);
  const [loading, setLoading] = useState(false);

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
      fetchReports({ limit: 100 })
        .then((res) => {
          if (isMounted && res && res.success && Array.isArray(res.data)) {
            setLocalReports(res.data);
          }
        })
        .catch((err) => {
          console.error('Error fetching student reports:', err);
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
        category: r.category_name || r.category || 'General Facility Defect',
        description: r.description || 'Facility maintenance defect ticket.',
        image: r.primary_photo || r.image_url || r.image || '/images/hero_ac_defect.jpg',
        stepIndex: stepIdx,
        assignedWorker,
      };
    });
  }, [liveReports, localReports]);

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

  // If a report is currently selected, render the dedicated Report Details Progress view
  if (selectedReport) {
    return (
      <ReportDetailsView
        report={selectedReport}
        onBack={() => setSelectedReport(null)}
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

            <button
              type="button"
              className="myreports-filter-btn"
              title="Filter reports"
              aria-label="Filter reports"
              onClick={() => {
                if (statusFilter !== 'all') {
                  setStatusFilter('all');
                }
              }}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Filter Tabs Navigation Bar
            ------------------------------------------------------------------ */}
        <div className="myreports-tabs-bar" role="tablist" aria-label="Report Status Filter">
          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            role="tab"
            aria-selected={statusFilter === 'all'}
          >
            All
          </button>

          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'reported' ? 'active' : ''}`}
            onClick={() => setStatusFilter('reported')}
            role="tab"
            aria-selected={statusFilter === 'reported'}
          >
            Reported
          </button>

          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'verified' ? 'active' : ''}`}
            onClick={() => setStatusFilter('verified')}
            role="tab"
            aria-selected={statusFilter === 'verified'}
          >
            Verified
          </button>

          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'worker_assigned' ? 'active' : ''}`}
            onClick={() => setStatusFilter('worker_assigned')}
            role="tab"
            aria-selected={statusFilter === 'worker_assigned'}
          >
            Worker Assigned
          </button>

          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
            role="tab"
            aria-selected={statusFilter === 'in_progress'}
          >
            Repair Ongoing
          </button>

          <button
            type="button"
            className={`myreports-tab ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
            role="tab"
            aria-selected={statusFilter === 'resolved'}
          >
            Fixed
          </button>
        </div>

        {/* Divider line underneath the tabs */}
        <div className="myreports-divider" />

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
            {filteredReports.map((report) => (
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
                    </div>

                    <h3 className="myreports-card-title">{report.title}</h3>
                    <p className="myreports-card-location">{report.location}</p>
                  </div>
                </div>

                {/* Right Side: Priority Pill + Status Pill + Arrow Button */}
                <div className="myreports-card-right">
                  <span className={`myreports-priority-badge priority-${report.priority.toLowerCase()}`}>
                    {report.priority}
                  </span>

                  <span className={`myreports-status-badge status-${report.status.toLowerCase()}`}>
                    {report.statusLabel}
                  </span>

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
      </div>
    </div>
  );
}
