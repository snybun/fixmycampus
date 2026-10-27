import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, UploadCloud, CheckCircle2, Archive, Trash2 } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import ReportFeedback from '../feedback/ReportFeedback';
import { getRecommendedWorker } from '../../utils/recommendedWorker';

export default function ReportDetails({
  report,
  staff = [],
  onBack,
  onAssignSubmit,
  onStatusSubmit,
  onArchive,
  onDelete,
}) {
  const recommendedStaff = useMemo(() => getRecommendedWorker(report, staff), [report, staff]);

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    if (report?.worker_id) return String(report.worker_id);
    const rec = getRecommendedWorker(report, staff);
    return rec ? String(rec.id) : (staff[0] ? String(staff[0].id) : '');
  });

  useEffect(() => {
    if (report?.worker_id) {
      setSelectedStaffId(String(report.worker_id));
    } else if (recommendedStaff) {
      setSelectedStaffId(String(recommendedStaff.id));
    }
  }, [report?.id, report?.worker_id, recommendedStaff]);

  const [selectedStatus, setSelectedStatus] = useState(report?.status || 'in_progress');
  const [remarks, setRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadProofDone, setUploadProofDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!report) {
    return (
      <div>
        <button type="button" className="admin-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Reports
        </button>
        <p style={{ marginTop: 24, color: '#64748b' }}>No report selected.</p>
      </div>
    );
  }

  const rawStatus = (report?.status || '').toLowerCase();
  const isFixed = rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed';
  const hasAssignedWorker = Boolean(report.worker_id);
  const assignmentLocked = isFixed || hasAssignedWorker;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (assignmentLocked || !selectedStaffId) return;
    setIsAssigning(true);
    try {
      await onAssignSubmit({
        report_id: report.id,
        assigned_to: Number(selectedStaffId),
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (isFixed) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsUpdating(true);
    await onStatusSubmit({
      report_id: report.id,
      status: selectedStatus,
      remarks,
    });
    setIsUpdating(false);
    setShowConfirmModal(false);
  };

  const dateFormatted = report.reported_at
    ? new Date(report.reported_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'August 25, 2026';

  const locationFormatted = `${report.building_name || 'Campus Building'}${
    report.room_number ? ` • Room ${report.room_number}` : ''
  }`;

  const reporterInfo = `${report.reporter_name || 'Campus Reporter'}${
    report.reporter_identifier ? ` (${report.reporter_identifier})` : ''
  }`;

  return (
    <div>
      {/* Back button */}
      <button type="button" className="admin-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Reports
      </button>

      {/* Title & Ticket Badge */}
      <div className="admin-details-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="admin-header-title" style={{ marginBottom: 0 }}>
            Report Details
          </h1>
          <span className="admin-ticket-badge-lg">
            {report.ticket_number || `FM-${report.id}`}
          </span>
        </div>

        {(report.status === 'resolved' || report.status === 'closed') && (onArchive || onDelete) && (
          <button
            type="button"
            className="admin-btn-archive-report"
            onClick={() => (onArchive || onDelete)(report)}
            title="Archive fixed report into History Logs"
            id="admin-archive-report-header-btn"
          >
            <Archive size={16} />
            <span>Archive Fixed Report</span>
          </button>
        )}
      </div>

      {/* 2-Column Grid */}
      <div className="admin-details-grid">
        {/* Left Column: Photo & Specifications */}
        <div>
          {/* Photo Card */}
          <div className="admin-photo-card">
            <h3 className="admin-action-card-title">Reported Photo</h3>
            <div className="admin-photo-container">
              <img
                src={report.image_url || '/images/hero_ac_defect.jpg'}
                alt={report.title}
                onError={(e) => {
                  e.target.src = '/images/hero_ac_defect.jpg';
                }}
              />
            </div>
          </div>

          {/* Incident Specifications */}
          <div className="admin-specs-card">
            <h3 className="admin-action-card-title">Incident Specifications</h3>

            <div className="admin-specs-grid">
              <span className="admin-spec-label">Issue Type</span>
              <span className="admin-spec-value">{report.title}</span>

              <span className="admin-spec-label">Category</span>
              <span className="admin-spec-value">
                {report.category_name || 'Facility Defect'}
              </span>

              <span className="admin-spec-label">Location</span>
              <span className="admin-spec-value">{locationFormatted}</span>

              <span className="admin-spec-label">Reporter</span>
              <span className="admin-spec-value">{reporterInfo}</span>

              <span className="admin-spec-label">Submitted Date</span>
              <span className="admin-spec-value">{dateFormatted}</span>

              <span className="admin-spec-label">Priority Level</span>
              <div>
                <span className={`admin-badge ${report.priority}`}>
                  {report.priority ? `${report.priority.toUpperCase()} PRIORITY` : 'MEDIUM PRIORITY'}
                </span>
              </div>
            </div>

            <div className="admin-specs-divider" />

            <h4 className="admin-desc-title">Detailed Description</h4>
            <p className="admin-desc-text">
              {report.description ||
                "The classroom's split-type AC system is completely unresponsive when the remote control is used. Additionally, there are signs of water dripping along the wall below the unit, which might indicate a clogged drain pipe or secondary electrical short. The room is hot and unusable for large lectures."}
            </p>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div>
          {isFixed && <div style={{ marginBottom: 24 }}><ReportFeedback key={report.id} reportId={report.id} /></div>}
          {/* Card 1: Assign Maintenance Worker */}
          <div
            className="admin-action-card"
            style={isFixed ? { opacity: 0.85, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : {}}
          >
            <h3 className="admin-action-card-title">Assign Maintenance Worker</h3>

            <form onSubmit={handleAssign}>
              <div className="admin-form-group">
                <label className="admin-form-label">
                  {assignmentLocked ? 'Assigned Staff Member' : 'Select Staff Member'}
                </label>
                <select
                  className="admin-select-input"
                  value={hasAssignedWorker ? String(report.worker_id) : selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={assignmentLocked || isAssigning}
                  style={assignmentLocked ? { cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                >
                  <option value="">-- Choose maintenance technician --</option>
                  {hasAssignedWorker && !staff.some(member => String(member.id) === String(report.worker_id)) && (
                    <option value={String(report.worker_id)}>{report.worker_name || 'Assigned worker'}</option>
                  )}
                  {staff.map((member) => {
                    const isRec = !hasAssignedWorker && recommendedStaff && String(recommendedStaff.id) === String(member.id);
                    return (
                      <option key={member.id} value={member.id}>
                        {member.full_name}{isRec ? ' (Recommended)' : ''}{member.department ? ` (${member.department})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                className="admin-btn-black"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  ...(assignmentLocked ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}),
                }}
                disabled={assignmentLocked || isAssigning || !selectedStaffId}
                title={assignmentLocked ? 'Worker assignment is locked' : ''}
              >
                {isFixed
                  ? 'Assignment Locked (Issue Fixed)'
                  : hasAssignedWorker
                  ? 'Worker Assigned'
                  : isAssigning
                  ? 'Assigning...'
                  : 'Assign Worker'}
              </button>
            </form>
          </div>

          {/* Card 2: Update Incident Status */}
          <div
            className="admin-action-card"
            style={isFixed ? { opacity: 0.85, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : {}}
          >
            <h3 className="admin-action-card-title">Update Incident Status</h3>

            <form onSubmit={handleUpdate}>
              <div className="admin-form-group">
                <label className="admin-form-label">
                  {isFixed ? 'Incident Status' : 'Select New Status'}
                </label>
                <select
                  className="admin-select-input"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isFixed || isUpdating}
                  style={isFixed ? { cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                  title={isFixed ? 'Status is locked because this report is already fixed / resolved' : ''}
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Fixed / Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Completion Evidence Dropzone */}
              <div
                className="admin-upload-dropzone"
                onClick={() => {
                  if (!isFixed) setUploadProofDone(!uploadProofDone);
                }}
                style={isFixed ? { cursor: 'not-allowed', opacity: 0.65, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' } : {}}
                title={isFixed ? 'Completion photo is locked for resolved incidents' : 'Click to simulate completion proof photo upload'}
              >
                <UploadCloud size={28} />
                <span className="admin-upload-label">
                  {isFixed
                    ? 'Completion Evidence Attached & Verified'
                    : uploadProofDone
                    ? 'Photo Attached: proof_repair.jpg'
                    : 'Upload Completion Photo'}
                </span>
                <span className="admin-upload-subtext">
                  {isFixed ? 'Verified Fixed & Resolved' : 'Completion Evidence Required'}
                </span>
              </div>

              <button
                type="submit"
                className="admin-btn-black"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  ...(isFixed ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}),
                }}
                disabled={isFixed || isUpdating}
                title={isFixed ? 'Status is locked because this report is already fixed / resolved' : ''}
              >
                {isFixed
                  ? 'Status Locked (Issue Fixed)'
                  : isUpdating
                  ? 'Updating...'
                  : 'Update Report'}
              </button>
            </form>
          </div>

          {/* Card 3: Archive Fixed Report */}
          {(report.status === 'resolved' || report.status === 'closed') && (onArchive || onDelete) && (
            <div className="admin-action-card admin-action-card-archive">
              <h3 className="admin-action-card-title">Archive Incident</h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14 }}>
                This report is marked as fixed. You can archive it to safely remove it from active lists and store it in History Logs.
              </p>
              <button
                type="button"
                className="admin-btn-archive-report"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => (onArchive || onDelete)(report)}
                id="admin-archive-report-card-btn"
              >
                <Archive size={16} />
                <span>Archive Fixed Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          presetId="update_status"
          title="Are you sure?"
          message={
            selectedStatus === 'resolved' || selectedStatus === 'closed'
              ? `Are you sure you want to mark ticket #${report.ticket_number || `FM-${report.id}`} (${report.title}) as Fixed / Resolved?`
              : `Are you sure you want to update the status of ticket #${report.ticket_number || `FM-${report.id}`} to "${selectedStatus.replace('_', ' ')}"?`
          }
          confirmText="Yes, Update Report"
          cancelText="Di pa 'ko ready"
          loading={isUpdating}
          onClose={() => {
            if (!isUpdating) setShowConfirmModal(false);
          }}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
