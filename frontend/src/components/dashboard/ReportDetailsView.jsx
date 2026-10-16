import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Shield,
  Clock,
  MapPin,
  Calendar,
  Trash2,
} from 'lucide-react';
import { fetchReportDetail } from '../../services/api';
import './reportDetails.css';

export default function ReportDetailsView({
  report,
  onBack,
  onDelete,
  isAdmin = false,
}) {
  if (!report) return null;

  const [detailedReport, setDetailedReport] = useState(report);

  // Sync prop changes
  useEffect(() => {
    setDetailedReport(report);
  }, [report]);

  // Fetch full database details including live status history and worker info
  useEffect(() => {
    let isMounted = true;
    if (report?.id) {
      fetchReportDetail(report.id)
        .then((res) => {
          if (isMounted && res && res.success && res.data) {
            const d = res.data;
            const bldg = d.building_name || report.building || 'Campus';
            const rm = d.room_number || d.specific_area || report.room || 'Facility Area';
            const loc = `${bldg} • ${rm}`;

            const rawStatus = (d.status || report.status || 'submitted').toLowerCase();
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

            const rawPriority = String(d.priority || report.priority || 'medium').toLowerCase();
            let priorityLabel = 'Medium';
            if (rawPriority === 'emergency' || rawPriority === 'urgent') priorityLabel = 'Urgent';
            else if (rawPriority === 'high') priorityLabel = 'High';
            else if (rawPriority === 'low') priorityLabel = 'Low';

            const repDate = d.reported_at
              ? new Date(d.reported_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : (report.date || 'Recently');

            const formattedDate = d.reported_at
              ? new Date(d.reported_at).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : report.formattedDateReported;

            setDetailedReport((prev) => ({
              ...prev,
              ...d,
              title: d.title || prev.title,
              description: d.description || prev.description,
              category: d.category_name || prev.category,
              building: bldg,
              room: rm,
              location: loc,
              priority: priorityLabel,
              status: rawStatus,
              statusLabel,
              stepIndex: stepIdx,
              date: repDate,
              formattedDateReported: formattedDate,
              image: d.image_url || d.primary_photo || prev.image,
              assignedWorker: d.worker_name
                ? {
                    name: d.worker_name,
                    role: d.worker_department ? `${d.worker_department} Staff` : 'Assigned Technician',
                  }
                : prev.assignedWorker,
              status_history: d.status_history || [],
            }));
          }
        })
        .catch((err) => {
          console.error('Failed to fetch detailed report data:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [report?.id]);

  // Derive step index based on status
  // 0: Reported, 1: Verified, 2: Worker Assigned, 3: Repair Ongoing, 4: Fixed
  const getStepStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed' || s === 'fixed') return 4;
    if (s === 'in_progress' || s === 'repair_ongoing' || s === 'ongoing') return 3;
    if (s === 'assigned' || s === 'worker_assigned') return 2;
    if (s === 'under_review' || s === 'verified' || s === 'in_review') return 1;
    return 0; // reported / pending / submitted
  };

  const currentStep = detailedReport.stepIndex !== undefined
    ? detailedReport.stepIndex
    : getStepStatus(detailedReport.status);

  // Worker information from database
  const worker = detailedReport.assignedWorker || (detailedReport.worker_name ? {
    name: detailedReport.worker_name,
    role: detailedReport.worker_department ? `${detailedReport.worker_department} Staff` : 'Assigned Maintenance Staff',
  } : {
    name: 'Pending Assignment',
    role: 'Facilities Maintenance Department',
  });

  const repDateFormatted = detailedReport.reported_at
    ? new Date(detailedReport.reported_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : (detailedReport.date || 'Recent');

  // Map database status history if available
  const historyTimestamps = useMemo(() => {
    const map = {};
    if (detailedReport.status_history && Array.isArray(detailedReport.status_history)) {
      detailedReport.status_history.forEach((h) => {
        if (h.new_status && h.created_at) {
          map[h.new_status] = new Date(h.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        }
      });
    }
    return map;
  }, [detailedReport.status_history]);

  // Dynamic Stepper definition
  const steps = [
    {
      key: 'reported',
      label: 'Reported',
      date: historyTimestamps['submitted'] || repDateFormatted,
    },
    {
      key: 'verified',
      label: 'Verified',
      date: historyTimestamps['under_review'] || (currentStep >= 1 ? repDateFormatted : 'Pending'),
    },
    {
      key: 'assigned',
      label: 'Worker Assigned',
      date: historyTimestamps['assigned'] || (currentStep >= 2 ? repDateFormatted : 'Pending'),
    },
    {
      key: 'in_progress',
      label: 'Repair Ongoing',
      date: historyTimestamps['in_progress'] || (currentStep >= 3 ? repDateFormatted : 'Pending'),
    },
    {
      key: 'fixed',
      label: 'Fixed',
      date: historyTimestamps['resolved'] || historyTimestamps['closed'] || (currentStep >= 4 ? repDateFormatted : 'Pending'),
    },
  ];

  // Dynamic updates log built directly from database history
  const updatesLog = useMemo(() => {
    if (detailedReport.status_history && detailedReport.status_history.length > 0) {
      const rawList = detailedReport.status_history
        .slice()
        .reverse()
        .map((h) => {
          const dStr = h.created_at
            ? new Date(h.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent';

          let msg = h.remarks;
          if (!msg || !msg.trim()) {
            if (h.new_status === 'resolved') msg = 'Repair completed and verified on site';
            else if (h.new_status === 'in_progress') msg = 'Work started by technician';
            else if (h.new_status === 'assigned') msg = `Assigned to ${worker.name}`;
            else if (h.new_status === 'under_review') msg = 'Report verified by campus facilities';
            else msg = 'Report submitted and registered in queue';
          }

          return {
            date: dStr,
            message: msg,
          };
        });

      // Filter out consecutive duplicate entries for clean readability
      const deduplicated = [];
      for (const item of rawList) {
        if (
          deduplicated.length === 0 ||
          deduplicated[deduplicated.length - 1].message !== item.message ||
          deduplicated[deduplicated.length - 1].date !== item.date
        ) {
          deduplicated.push(item);
        }
      }
      return deduplicated;
    }

    const repLongDate = detailedReport.date || 'Recently';
    const logs = [];
    if (currentStep >= 3) {
      logs.push({ date: repLongDate, message: 'Technician dispatched and repair ongoing' });
    }
    if (currentStep >= 2 && worker.name !== 'Pending Assignment') {
      logs.push({ date: repLongDate, message: `Worker assigned: ${worker.name}` });
    }
    if (currentStep >= 1) {
      logs.push({ date: repLongDate, message: 'Report verified by campus facilities inspector' });
    }
    logs.push({
      date: repLongDate,
      message: 'Defect report received and registered in campus queue',
    });
    return logs;
  }, [detailedReport.status_history, currentStep, worker.name, detailedReport.date]);

  // Priority color styling
  const priorityClass = `priority-${(detailedReport.priority || 'medium').toLowerCase()}`;
  const statusClass = `status-${(detailedReport.status || 'reported').toLowerCase()}`;

  // Determine if this report can be deleted (only if no worker is assigned yet)
  const isReportDeletable = (r) => {
    if (!r) return false;
    if (isAdmin) return true;
    const rawStatus = (r.status || '').toLowerCase();
    const hasWorker = Boolean(
      r.worker_name ||
      r.worker_id ||
      r.assignedWorker ||
      rawStatus === 'assigned' ||
      rawStatus === 'in_progress' ||
      rawStatus === 'resolved' ||
      rawStatus === 'closed' ||
      r.statusLabel === 'Worker Assigned' ||
      r.statusLabel === 'Repair Ongoing' ||
      r.statusLabel === 'Fixed'
    );
    return !hasWorker;
  };

  return (
    <main className="rep-details-page">
      <div className="rep-details-container">
        {/* Top Header / Breadcrumb */}
        <div className="rep-details-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <button
              type="button"
              className="rep-details-back-btn"
              onClick={onBack}
              aria-label="Back to My Reports"
              title="Back to My Reports"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>

            <div className="rep-details-header-meta">
              <div className="rep-details-breadcrumb">
                MY REPORTS &nbsp;/&nbsp; {detailedReport.ticket_number}
              </div>
              <h1 className="rep-details-title">
                Report Details - {detailedReport.ticket_number}
              </h1>
            </div>
          </div>

          {isReportDeletable(detailedReport) && onDelete && (
            <button
              type="button"
              className="rep-details-delete-btn"
              onClick={() => onDelete(detailedReport)}
              title="Delete this report"
            >
              <Trash2 size={15} />
              <span>Delete Report</span>
            </button>
          )}
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="rep-details-grid">
          {/* Left Column: Photo & Issue Description */}
          <div className="rep-details-col-left">
            {/* Defect Photo Banner */}
            <div className="rep-details-photo-box">
              <img
                src={detailedReport.image || detailedReport.primary_photo || '/images/hero_ac_defect.jpg'}
                alt={detailedReport.title}
                onError={(e) => {
                  e.target.src = '/images/hero_ac_defect.jpg';
                }}
              />
            </div>

            {/* Issue Description Card */}
            <div className="rep-details-card rep-desc-card">
              <h2 className="rep-details-card-title">Issue Description</h2>

              <div className="rep-desc-table">
                <div className="rep-desc-row">
                  <span className="rep-desc-label">Issue Title</span>
                  <span className="rep-desc-value">{detailedReport.title}</span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Category</span>
                  <span className="rep-desc-value">
                    {detailedReport.category || 'General Facility Defect'}
                  </span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Location</span>
                  <span className="rep-desc-value">
                    {detailedReport.location}
                  </span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Date Reported</span>
                  <span className="rep-desc-value">
                    {detailedReport.formattedDateReported || detailedReport.date || 'Recently'}
                  </span>
                </div>

                {(report.confirmation_count > 1 || report.is_confirmed) && (
                  <div className="rep-desc-row">
                    <span className="rep-desc-label">Student Impact</span>
                    <span className="rep-desc-value" style={{ color: '#059669', fontWeight: 600 }}>
                      👥 {report.confirmation_count || 1} student{report.confirmation_count > 1 ? 's' : ''} confirmed {report.is_confirmed ? '(including you)' : ''}
                    </span>
                  </div>
                )}
              </div>

              {detailedReport.description && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                  <span className="rep-desc-label" style={{ display: 'block', marginBottom: 6 }}>
                    Notes / Description
                  </span>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                    {detailedReport.description}
                  </p>
                </div>
              )}

              <div className="rep-desc-divider" />

              <div className="rep-desc-footer">
                <div className="rep-desc-badge-group">
                  <span className="rep-desc-sublabel">PRIORITY</span>
                  <span className={`rep-priority-badge ${priorityClass}`}>
                    {detailedReport.priority || 'Medium'}
                  </span>
                </div>

                <div className="rep-desc-badge-group right-align">
                  <span className="rep-desc-sublabel">REPORTED STATUS</span>
                  <span className={`rep-status-badge ${statusClass}`}>
                    {detailedReport.statusLabel || 'Worker Assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Repair Progress, Worker Card, Updates Log */}
          <div className="rep-details-col-right">
            {/* Live Repair Progress */}
            <div className="rep-details-card rep-progress-card">
              <h2 className="rep-details-card-title">Live Repair Progress</h2>

              <div className="rep-stepper">
                {steps.map((step, idx) => {
                  const isCompleted = currentStep > idx;
                  const isActive = currentStep === idx;
                  const isPending = currentStep < idx;

                  const lineCompleted = currentStep > idx;
                  const lineActive = currentStep === idx;

                  return (
                    <div key={step.key} className="rep-step-node">
                      <div className="rep-step-indicator-col">
                        {/* Circle marker */}
                        {isCompleted ? (
                          <div className="rep-step-circle completed">
                            <CheckCircle2 size={20} strokeWidth={2.4} />
                          </div>
                        ) : isActive ? (
                          <div className="rep-step-circle active">
                            <span className="rep-step-inner-dot" />
                          </div>
                        ) : (
                          <div className="rep-step-circle pending" />
                        )}

                        {/* Connector line underneath (except last item) */}
                        {idx < steps.length - 1 && (
                          <div
                            className={`rep-step-line ${
                              lineCompleted ? 'line-completed' : lineActive ? 'line-active' : 'line-pending'
                            }`}
                          />
                        )}
                      </div>

                      {/* Text label & date */}
                      <div className="rep-step-content">
                        <div
                          className={`rep-step-label ${
                            isCompleted || isActive ? 'step-text-active' : 'step-text-pending'
                          }`}
                        >
                          {step.label}
                        </div>
                        <div
                          className={`rep-step-date ${
                            isCompleted || isActive ? 'step-date-active' : 'step-date-pending'
                          }`}
                        >
                          {isPending ? 'Pending' : step.date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assigned Maintenance Worker */}
            <div className="rep-details-card rep-worker-card">
              <div className="rep-worker-sublabel">
                ASSIGNED MAINTENANCE WORKER
              </div>
              <div className="rep-worker-row">
                <div className="rep-worker-avatar">
                  <User size={22} className="rep-worker-avatar-icon" />
                </div>
                <div className="rep-worker-meta">
                  <div className="rep-worker-name">{worker.name}</div>
                  <div className="rep-worker-role">{worker.role}</div>
                </div>
              </div>
            </div>

            {/* Maintenance Updates Log */}
            <div className="rep-details-card rep-logs-card">
              <h2 className="rep-details-card-title">Maintenance Updates Log</h2>

              <div className="rep-logs-list">
                {updatesLog.map((log, index) => (
                  <div key={index} className="rep-log-entry">
                    <div className="rep-log-date">{log.date}</div>
                    <div className="rep-log-message">{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
