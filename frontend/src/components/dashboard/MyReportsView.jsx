import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  FileQuestion,
} from 'lucide-react';
import ReportDetailsView from './ReportDetailsView';
import './myReports.css';

// Default mock reports matching user mockup screenshot
export const DEFAULT_MY_REPORTS = [
  {
    id: 153,
    ticket_number: 'FM-2026-00153',
    date: 'Aug 25, 2026',
    formattedDateReported: 'August 25, 2026 at 2:14 PM',
    title: 'Broken Air Conditioner',
    location: 'PTC Building • Room 307',
    building: 'PTC Building',
    room: 'Room 307',
    priority: 'High',
    status: 'assigned',
    statusLabel: 'Worker Assigned',
    category: 'Air Conditioning & Ventilation',
    description: 'The wall-mounted AC unit in Room 307 is blowing warm air and making a vibrating noise during lectures. Needs compressor inspection and refrigerant check.',
    image: '/images/hero_ac_defect.jpg',
    stepIndex: 2,
    reportedDate: 'Aug 25',
    verifiedDate: 'Aug 26',
    assignedDate: 'Aug 26',
    progressDate: 'Pending',
    fixedDate: 'Pending',
    assignedWorker: {
      name: 'Mark Santos',
      role: 'Lead HVAC Technician',
    },
    updatesLog: [
      { date: 'Aug 27, 2026', message: 'Repair scheduled for August 28' },
      { date: 'Aug 26, 2026', message: 'Worker assigned: Mark Santos' },
      { date: 'Aug 26, 2026', message: 'Report verified by admin' },
    ],
  },
  {
    id: 148,
    ticket_number: 'FM-2026-00148',
    date: 'Aug 23, 2026',
    formattedDateReported: 'August 23, 2026 at 10:45 AM',
    title: 'Leaking Pipe in Washroom',
    location: 'CMA Building • Ground Floor',
    building: 'CMA Building',
    room: 'Ground Floor Restroom',
    priority: 'Urgent',
    status: 'in_progress',
    statusLabel: 'Repair Ongoing',
    category: 'Plumbing & Restroom',
    description: 'Water is pooling on the ground floor washroom tiles from a leaking under-sink supply pipe. Creates a major slip hazard for passing students.',
    image: '/images/faulty_light_switch.jpg',
    stepIndex: 3,
    reportedDate: 'Aug 23',
    verifiedDate: 'Aug 23',
    assignedDate: 'Aug 24',
    progressDate: 'Aug 24',
    fixedDate: 'Pending',
    assignedWorker: {
      name: 'Danilo Reyes',
      role: 'Senior Campus Plumber',
    },
    updatesLog: [
      { date: 'Aug 24, 2026', message: 'Water shutoff valve closed, pipe replacement underway' },
      { date: 'Aug 24, 2026', message: 'Technician dispatched to CMA Building Ground Floor' },
      { date: 'Aug 23, 2026', message: 'Hazard flagged as urgent and verified by facilities supervisor' },
    ],
  },
  {
    id: 145,
    ticket_number: 'FM-2026-00145',
    date: 'Aug 20, 2026',
    formattedDateReported: 'August 20, 2026 at 3:30 PM',
    title: 'Flickering Lecture Hall Lights',
    location: 'NH Building • Hall B',
    building: 'NH Building',
    room: 'Hall B',
    priority: 'Medium',
    status: 'under_review',
    statusLabel: 'Verified',
    category: 'Electrical & Lighting',
    description: 'Overhead LED ballast in the front row of Hall B is flickering constantly, causing eye strain during presentations. Needs ballast replacement.',
    image: '/images/damaged_whiteboard.jpg',
    stepIndex: 1,
    reportedDate: 'Aug 20',
    verifiedDate: 'Aug 21',
    assignedDate: 'Pending',
    progressDate: 'Pending',
    fixedDate: 'Pending',
    assignedWorker: {
      name: 'Pending Assignment',
      role: 'Electrical Maintenance Team',
    },
    updatesLog: [
      { date: 'Aug 21, 2026', message: 'Issue verified on-site by facilities inspector' },
      { date: 'Aug 20, 2026', message: 'Defect ticket registered in campus queue' },
    ],
  },
  {
    id: 139,
    ticket_number: 'FM-2026-00139',
    date: 'Aug 15, 2026',
    formattedDateReported: 'August 15, 2026 at 9:15 AM',
    title: 'Loose Staircase Handrail',
    location: 'NH Building • Center Stairs',
    building: 'NH Building',
    room: 'Center Stairs',
    priority: 'High',
    status: 'resolved',
    statusLabel: 'Fixed',
    category: 'Safety & Hardware',
    description: 'Wall anchors for the stainless steel handrail on the 2nd floor landing have come loose from the drywall. Re-anchored with concrete sleeve fasteners.',
    image: '/images/hero_ac_defect.jpg',
    stepIndex: 4,
    reportedDate: 'Aug 15',
    verifiedDate: 'Aug 15',
    assignedDate: 'Aug 16',
    progressDate: 'Aug 17',
    fixedDate: 'Aug 18',
    assignedWorker: {
      name: 'Ronaldo Cruz',
      role: 'Structural Maintenance Specialist',
    },
    updatesLog: [
      { date: 'Aug 18, 2026', message: 'Anchors replaced, load testing passed, job marked fixed' },
      { date: 'Aug 17, 2026', message: 'Repair started on 2nd floor staircase landing' },
      { date: 'Aug 16, 2026', message: 'Worker assigned: Ronaldo Cruz' },
    ],
  },
  {
    id: 132,
    ticket_number: 'FM-2026-00132',
    date: 'Aug 10, 2026',
    formattedDateReported: 'August 10, 2026 at 11:00 AM',
    title: 'Graffiti on Exterior Wall',
    location: 'Gymnasium • Near CAS Office',
    building: 'Gymnasium',
    room: 'Near CAS Office',
    priority: 'Low',
    status: 'resolved',
    statusLabel: 'Fixed',
    category: 'Cleaning & Aesthetics',
    description: 'Spray paint tagging removed from brick exterior near the east side exit of the Gymnasium. Surface scrubbed and repainted.',
    image: '/images/faulty_light_switch.jpg',
    stepIndex: 4,
    reportedDate: 'Aug 10',
    verifiedDate: 'Aug 10',
    assignedDate: 'Aug 11',
    progressDate: 'Aug 11',
    fixedDate: 'Aug 12',
    assignedWorker: {
      name: 'Elena Bautista',
      role: 'Grounds & Sanitation Crew',
    },
    updatesLog: [
      { date: 'Aug 12, 2026', message: 'Wall repainted and site inspection passed' },
      { date: 'Aug 11, 2026', message: 'Sanitization and chemical scrub completed' },
      { date: 'Aug 11, 2026', message: 'Worker assigned: Elena Bautista' },
    ],
  },
];

export default function MyReportsView({
  liveReports = [],
  onNavigate,
  initialSelectedReport = null,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'reported', 'verified', 'worker_assigned', 'in_progress', 'resolved'
  const [selectedReport, setSelectedReport] = useState(initialSelectedReport);

  useEffect(() => {
    if (initialSelectedReport) {
      setSelectedReport(initialSelectedReport);
    }
  }, [initialSelectedReport]);

  // Combine live reports with fallback demo reports if live user has no reported items yet
  const allReports = useMemo(() => {
    if (liveReports && liveReports.length > 0) {
      // Map API reports to MyReports card format
      const mapped = liveReports.map((r) => {
        const rawStatus = (r.status || 'submitted').toLowerCase();
        let statusLabel = 'Reported';
        let stepIdx = 0;
        if (rawStatus === 'resolved' || rawStatus === 'closed') {
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

        const rawPriority = (r.priority || 'medium').toLowerCase();
        let priorityLabel = 'Medium';
        if (rawPriority === 'emergency') priorityLabel = 'Urgent';
        else if (rawPriority === 'high') priorityLabel = 'High';
        else if (rawPriority === 'low') priorityLabel = 'Low';

        const repDate = r.reported_at
          ? new Date(r.reported_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recently';

        return {
          id: r.id,
          ticket_number: r.ticket_number || `FM-2026-00${r.id}`,
          date: repDate,
          formattedDateReported: r.reported_at
            ? new Date(r.reported_at).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : `${repDate} at 2:14 PM`,
          title: r.title,
          location: `${r.building_name || 'Campus'} • ${r.room_number || r.specific_area || 'Facility Area'}`,
          building: r.building_name || 'Campus',
          room: r.room_number || r.specific_area || 'Facility Area',
          priority: priorityLabel,
          status: rawStatus,
          statusLabel,
          category: r.category_name || 'General Facility Defect',
          description: r.description || 'Facility maintenance defect ticket.',
          image: r.primary_photo || r.image || '/images/hero_ac_defect.jpg',
          stepIndex: stepIdx,
          assignedWorker: r.assigned_worker_name
            ? {
                name: r.assigned_worker_name,
                role: r.assigned_worker_role || 'Facilities Maintenance Team',
              }
            : null,
          updatesLog: [
            ...(stepIdx >= 1
              ? [
                  {
                    date: repDate,
                    message: `Report status updated to ${statusLabel}`,
                  },
                ]
              : []),
            {
              date: repDate,
              message: 'Defect report received and registered in campus queue',
            },
          ],
        };
      });

      // Merge defaults if needed so user has rich examples
      const existingIds = new Set(mapped.map((m) => m.id));
      const fallbackItems = DEFAULT_MY_REPORTS.filter((d) => !existingIds.has(d.id));
      return [...mapped, ...fallbackItems];
    }
    return DEFAULT_MY_REPORTS;
  }, [liveReports]);

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
            <h3 className="myreports-empty-title">No reports found</h3>
            <p className="myreports-empty-desc">
              {searchQuery
                ? `No facility issues match your query "${searchQuery}".`
                : 'You have not submitted any facility issue reports matching this status filter.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="myreports-tab active"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear Search
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
