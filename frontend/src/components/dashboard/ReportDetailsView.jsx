import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Shield,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import './reportDetails.css';

export default function ReportDetailsView({
  report,
  onBack,
}) {
  if (!report) return null;

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

  const currentStep = report.stepIndex !== undefined ? report.stepIndex : getStepStatus(report.status);

  // Stepper definition matching user mockup
  const steps = [
    {
      key: 'reported',
      label: 'Reported',
      date: report.reportedDate || report.date || 'Aug 25',
    },
    {
      key: 'verified',
      label: 'Verified',
      date: report.verifiedDate || (currentStep >= 1 ? 'Aug 26' : 'Pending'),
    },
    {
      key: 'assigned',
      label: 'Worker Assigned',
      date: report.assignedDate || (currentStep >= 2 ? 'Aug 26' : 'Pending'),
    },
    {
      key: 'in_progress',
      label: 'Repair Ongoing',
      date: report.progressDate || (currentStep >= 3 ? 'Aug 27' : 'Pending'),
    },
    {
      key: 'fixed',
      label: 'Fixed',
      date: report.fixedDate || (currentStep >= 4 ? 'Aug 28' : 'Pending'),
    },
  ];

  // Worker information
  const worker = report.assignedWorker || {
    name: report.workerName || (currentStep >= 2 ? 'Mark Santos' : 'Pending Assignment'),
    role: report.workerRole || (currentStep >= 2 ? 'Lead HVAC Technician' : 'Facilities Maintenance Department'),
  };

  // Maintenance updates log
  const updatesLog = report.updatesLog || [
    ...(currentStep >= 3
      ? [
          {
            date: 'Aug 27, 2026',
            message: 'Repair scheduled for August 28',
          },
        ]
      : currentStep === 2
      ? [
          {
            date: 'Aug 27, 2026',
            message: 'Repair scheduled for August 28',
          },
        ]
      : []),
    ...(currentStep >= 2
      ? [
          {
            date: 'Aug 26, 2026',
            message: `Worker assigned: ${worker.name}`,
          },
        ]
      : []),
    ...(currentStep >= 1
      ? [
          {
            date: 'Aug 26, 2026',
            message: 'Report verified by admin',
          },
        ]
      : []),
    {
      date: report.date || 'Aug 25, 2026',
      message: 'Defect report received and registered in campus queue',
    },
  ];

  // Priority color styling
  const priorityClass = `priority-${(report.priority || 'medium').toLowerCase()}`;
  const statusClass = `status-${(report.status || 'reported').toLowerCase()}`;

  return (
    <main className="rep-details-page">
      <div className="rep-details-container">
        {/* Top Header / Breadcrumb */}
        <div className="rep-details-header">
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
              MY REPORTS &nbsp;/&nbsp; {report.ticket_number}
            </div>
            <h1 className="rep-details-title">
              Report Details - {report.ticket_number}
            </h1>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="rep-details-grid">
          {/* Left Column: Photo & Issue Description */}
          <div className="rep-details-col-left">
            {/* Defect Photo Banner */}
            <div className="rep-details-photo-box">
              <img
                src={report.image || '/images/hero_ac_defect.jpg'}
                alt={report.title}
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
                  <span className="rep-desc-value">{report.title}</span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Category</span>
                  <span className="rep-desc-value">
                    {report.category || 'Air Conditioning & Ventilation'}
                  </span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Location</span>
                  <span className="rep-desc-value">
                    {report.location || `${report.building || 'PTC Building'} • ${report.room || 'Room 307'}`}
                  </span>
                </div>

                <div className="rep-desc-row">
                  <span className="rep-desc-label">Date Reported</span>
                  <span className="rep-desc-value">
                    {report.formattedDateReported ||
                      (report.date ? `${report.date} at 2:14 PM` : 'August 25, 2026 at 2:14 PM')}
                  </span>
                </div>
              </div>

              <div className="rep-desc-divider" />

              <div className="rep-desc-footer">
                <div className="rep-desc-badge-group">
                  <span className="rep-desc-sublabel">PRIORITY</span>
                  <span className={`rep-priority-badge ${priorityClass}`}>
                    {report.priority || 'Medium'}
                  </span>
                </div>

                <div className="rep-desc-badge-group right-align">
                  <span className="rep-desc-sublabel">REPORTED STATUS</span>
                  <span className={`rep-status-badge ${statusClass}`}>
                    {report.statusLabel || 'Worker Assigned'}
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

                  // Determine connector line status for line below this step
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
