import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Archive,
  Trash2,
  RotateCcw,
  Camera,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';
import ReportFeedback from '../feedback/ReportFeedback';
import { getRecommendedWorker } from '../../utils/recommendedWorker';
import { fetchReportDetail, updateReportPhoto } from '../../services/api';

export default function ReportDetails({
  report,
  staff = [],
  returnTab = 'reports',
  onBack,
  onAssignSubmit,
  onStatusSubmit,
  onArchive,
  onRestore,
  onDelete,
  onPhotoUpdated,
}) {
  const [detailedReport, setDetailedReport] = useState(report || null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Photo editing state
  const photoInputRef = useRef(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoToast, setPhotoToast] = useState('');
  const [photoError, setPhotoError] = useState('');

  // Sync prop changes and load full database report record
  useEffect(() => {
    setDetailedReport(report);
    if (!report?.id) return;

    let isMounted = true;
    setLoadingDetails(true);

    fetchReportDetail(report.id)
      .then((res) => {
        if (isMounted && res?.success && res.data) {
          setDetailedReport((prev) => ({
            ...(prev || {}),
            ...res.data,
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch detailed report data in ReportDetails:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [report?.id]);

  const activeReport = detailedReport || report;

  const handlePhotoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Image size cannot exceed 8MB.');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      setNewPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!newPhotoPreview || !activeReport?.id) return;
    setIsSavingPhoto(true);
    setPhotoError('');
    try {
      const res = await updateReportPhoto(activeReport.id, newPhotoPreview);
      if (res?.success) {
        const newUrl = res.image_url || newPhotoPreview;
        setDetailedReport((prev) => (prev ? {
          ...prev,
          image_url: newUrl,
          primary_photo: newUrl,
        } : null));
        setNewPhotoPreview(null);
        setPhotoToast('Report picture updated successfully!');
        setTimeout(() => setPhotoToast(''), 4000);
        if (onPhotoUpdated) {
          onPhotoUpdated(activeReport.id, newUrl);
        }
        if (photoInputRef.current) photoInputRef.current.value = '';
      } else {
        setPhotoError(res?.message || 'Failed to update photo.');
      }
    } catch (err) {
      console.error('Error saving photo:', err);
      setPhotoError('Network error while saving photo.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleCancelPhoto = () => {
    setNewPhotoPreview(null);
    setPhotoError('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const recommendedStaff = useMemo(
    () => getRecommendedWorker(activeReport, staff),
    [activeReport, staff]
  );

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    if (activeReport?.worker_id) return String(activeReport.worker_id);
    const rec = getRecommendedWorker(activeReport, staff);
    return rec ? String(rec.id) : (staff[0] ? String(staff[0].id) : '');
  });

  useEffect(() => {
    if (activeReport?.worker_id) {
      setSelectedStaffId(String(activeReport.worker_id));
    } else if (recommendedStaff) {
      setSelectedStaffId(String(recommendedStaff.id));
    }
  }, [activeReport?.id, activeReport?.worker_id, recommendedStaff]);

  const [selectedStatus, setSelectedStatus] = useState(activeReport?.status || 'in_progress');
  const [selectedPriority, setSelectedPriority] = useState(activeReport?.priority || 'medium');
  const [remarks, setRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [uploadProofDone, setUploadProofDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (activeReport?.status) {
      setSelectedStatus(activeReport.status);
    }
    if (activeReport?.priority) {
      setSelectedPriority(activeReport.priority);
    }
  }, [activeReport?.status, activeReport?.priority]);

  if (!activeReport) {
    return (
      <div>
        <button type="button" className="admin-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {returnTab === 'history-logs' ? 'History Logs' : 'Reports'}
        </button>
        <p style={{ marginTop: 24, color: '#64748b' }}>No report selected.</p>
      </div>
    );
  }

  const isArchived = Boolean(activeReport.is_archived);
  const rawStatus = (activeReport.status || '').toLowerCase();
  const isFixed = rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed';
  const hasAssignedWorker = Boolean(activeReport.worker_id);
  const assignmentLocked = isFixed || hasAssignedWorker || isArchived;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (assignmentLocked || !selectedStaffId) return;
    setIsAssigning(true);
    try {
      await onAssignSubmit({
        report_id: activeReport.id,
        assigned_to: Number(selectedStaffId),
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (isFixed || isArchived) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsUpdating(true);
    try {
      await onStatusSubmit({
        report_id: activeReport.id,
        status: selectedStatus,
        priority: selectedPriority,
        remarks,
      });
      setDetailedReport((prev) => (prev ? { ...prev, status: selectedStatus, priority: selectedPriority } : null));
    } finally {
      setIsUpdating(false);
      setShowConfirmModal(false);
    }
  };

  const handleRestoreClick = async () => {
    if (!onRestore || isRestoring) return;
    setIsRestoring(true);
    try {
      await onRestore(activeReport);
      setDetailedReport((prev) => (prev ? { ...prev, is_archived: 0, archived_at: null } : null));
    } finally {
      setIsRestoring(false);
    }
  };

  const dateFormatted = activeReport.reported_at
    ? new Date(activeReport.reported_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently Logged';

  const locationFormatted = `${activeReport.building_name || 'Campus Building'}${
    activeReport.room_number ? ` • Room ${activeReport.room_number}` : activeReport.specific_area ? ` • ${activeReport.specific_area}` : ''
  }`;

  const reporterInfo = `${activeReport.reporter_name || 'Campus Reporter'}${
    activeReport.reporter_identifier ? ` (${activeReport.reporter_identifier})` : ''
  }`;

  return (
    <div>
      {/* Back button */}
      <button type="button" className="admin-back-btn" onClick={onBack} id="admin-details-back-btn">
        <ArrowLeft size={16} /> Back to {returnTab === 'history-logs' ? 'History Logs' : 'Reports'}
      </button>

      {/* Archived Notice Banner */}
      {isArchived && (
        <div className="admin-archived-banner">
          <div className="admin-archived-banner-content">
            <Archive size={22} className="admin-archived-banner-icon" />
            <div>
              <h4 className="admin-archived-banner-title">Archived Defect Record</h4>
              <p className="admin-archived-banner-desc">
                This report was resolved and archived to History Logs{activeReport.archived_at ? ` on ${new Date(activeReport.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}. It is preserved for facility audit and compliance records.
              </p>
            </div>
          </div>
          {onRestore && (
            <button
              type="button"
              className="admin-btn-restore-action"
              onClick={handleRestoreClick}
              disabled={isRestoring}
              id="admin-restore-report-banner-btn"
            >
              <RotateCcw size={15} />
              <span>{isRestoring ? 'Restoring...' : 'Restore to Active Reports'}</span>
            </button>
          )}
        </div>
      )}

      {/* Title & Ticket Badge Header */}
      <div className="admin-details-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="admin-header-title" style={{ marginBottom: 0 }}>
            Report Details
          </h1>
          <span className="admin-ticket-badge-lg">
            {activeReport.ticket_number || `FM-${activeReport.id}`}
          </span>
          {isArchived && (
            <span className="admin-archived-pill">
              <Archive size={13} /> Archived Record
            </span>
          )}
        </div>

        {isArchived && onRestore ? (
          <button
            type="button"
            className="admin-btn-restore-report"
            onClick={handleRestoreClick}
            disabled={isRestoring}
            title="Restore this archived report back to active reports"
            id="admin-restore-report-header-btn"
          >
            <RotateCcw size={16} />
            <span>{isRestoring ? 'Restoring...' : 'Restore Report'}</span>
          </button>
        ) : !isArchived && (activeReport.status === 'resolved' || activeReport.status === 'closed') && (onArchive || onDelete) ? (
          <button
            type="button"
            className="admin-btn-archive-report"
            onClick={() => (onArchive || onDelete)(activeReport)}
            title="Archive fixed report into History Logs"
            id="admin-archive-report-header-btn"
          >
            <Archive size={16} />
            <span>Archive Fixed Report</span>
          </button>
        ) : null}
      </div>

      {/* 2-Column Grid */}
      <div className="admin-details-grid">
        {/* Left Column: Photo & Specifications */}
        <div>
          {/* Photo Card */}
          {/* Photo Card */}
          <div className="admin-photo-card">
            <input
              type="file"
              ref={photoInputRef}
              style={{ display: 'none' }}
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handlePhotoFileSelect}
            />

            <div className="admin-photo-card-header">
              <h3 className="admin-action-card-title" style={{ margin: 0 }}>
                Reported Photo
              </h3>
              {!newPhotoPreview && (
                <button
                  type="button"
                  className="admin-edit-photo-trigger-btn"
                  onClick={() => photoInputRef.current?.click()}
                  id="admin-edit-photo-trigger-btn"
                  title="Upload and replace this defect report's photo"
                >
                  <Camera size={14} />
                  <span>Edit Picture</span>
                </button>
              )}
            </div>

            <div className="admin-photo-container">
              <img
                src={newPhotoPreview || activeReport.image_url || activeReport.primary_photo || '/images/hero_ac_defect.jpg'}
                alt={activeReport.title || 'Report defect photo'}
                onError={(e) => {
                  e.target.src = '/images/hero_ac_defect.jpg';
                }}
              />
              {newPhotoPreview && (
                <div className="admin-photo-preview-badge">
                  <span>New Image Preview (Unsaved)</span>
                </div>
              )}
            </div>

            {newPhotoPreview && (
              <div className="admin-photo-action-bar">
                <button
                  type="button"
                  className="admin-save-photo-btn"
                  onClick={handleSavePhoto}
                  disabled={isSavingPhoto}
                  id="admin-save-photo-btn"
                >
                  {isSavingPhoto ? <RefreshCw size={14} className="spin-anim" /> : <Check size={14} />}
                  <span>{isSavingPhoto ? 'Saving Picture...' : 'Save Picture'}</span>
                </button>
                <button
                  type="button"
                  className="admin-cancel-photo-btn"
                  onClick={handleCancelPhoto}
                  disabled={isSavingPhoto}
                  id="admin-cancel-photo-btn"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {photoToast && (
              <div className="admin-photo-toast-success">
                <CheckCircle2 size={15} />
                <span>{photoToast}</span>
              </div>
            )}

            {photoError && (
              <div className="admin-photo-toast-error">
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* Incident Specifications */}
          <div className="admin-specs-card">
            <h3 className="admin-action-card-title">Incident Specifications</h3>

            <div className="admin-specs-grid">
              <span className="admin-spec-label">Issue Type</span>
              <span className="admin-spec-value">{activeReport.title || 'Facility Defect'}</span>

              <span className="admin-spec-label">Category</span>
              <span className="admin-spec-value">
                {activeReport.category_name || 'General Maintenance'}
              </span>

              <span className="admin-spec-label">Location</span>
              <span className="admin-spec-value">{locationFormatted}</span>

              <span className="admin-spec-label">Reporter</span>
              <span className="admin-spec-value">{reporterInfo}</span>

              <span className="admin-spec-label">Submitted Date</span>
              <span className="admin-spec-value">{dateFormatted}</span>

              <span className="admin-spec-label">Priority Level</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`admin-badge ${activeReport.priority || 'medium'}`}>
                  {activeReport.priority ? `${activeReport.priority.toUpperCase()} PRIORITY` : 'MEDIUM PRIORITY'}
                </span>
              </div>
            </div>

            <div className="admin-specs-divider" />

            <h4 className="admin-desc-title">Detailed Description</h4>
            <p className="admin-desc-text">
              {activeReport.description || 'No additional description provided.'}
            </p>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div>
          {isFixed && (
            <div style={{ marginBottom: 24 }}>
              <ReportFeedback key={activeReport.id} reportId={activeReport.id} />
            </div>
          )}

          {/* Card 1: Assign Maintenance Worker */}
          <div
            className="admin-action-card"
            style={assignmentLocked ? { opacity: 0.85, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : {}}
          >
            <h3 className="admin-action-card-title">Assign Maintenance Worker</h3>

            <form onSubmit={handleAssign}>
              <div className="admin-form-group">
                <label className="admin-form-label">
                  {assignmentLocked ? 'Assigned Staff Member' : 'Select Staff Member'}
                </label>
                <select
                  className="admin-select-input"
                  value={hasAssignedWorker ? String(activeReport.worker_id) : selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={assignmentLocked || isAssigning}
                  style={assignmentLocked ? { cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                >
                  <option value="">-- Choose maintenance technician --</option>
                  {hasAssignedWorker && !staff.some((member) => String(member.id) === String(activeReport.worker_id)) && (
                    <option value={String(activeReport.worker_id)}>
                      {activeReport.worker_name || 'Assigned worker'}
                    </option>
                  )}
                  {staff.map((member) => {
                    const isRec =
                      !hasAssignedWorker &&
                      recommendedStaff &&
                      String(recommendedStaff.id) === String(member.id);
                    return (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                        {isRec ? ' (Recommended)' : ''}
                        {member.department ? ` (${member.department})` : ''}
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
                {isArchived
                  ? 'Assignment Locked (Archived Record)'
                  : isFixed
                  ? 'Assignment Locked (Issue Fixed)'
                  : hasAssignedWorker
                  ? 'Worker Assigned'
                  : isAssigning
                  ? 'Assigning...'
                  : 'Assign Worker'}
              </button>
            </form>
          </div>

          {/* Card 2: Update Incident Status & Priority */}
          <div
            className="admin-action-card"
            style={isFixed || isArchived ? { opacity: 0.85, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : {}}
          >
            <h3 className="admin-action-card-title">Update Status & Priority</h3>

            <form onSubmit={handleUpdate}>
              <div className="admin-form-group">
                <label className="admin-form-label">
                  {isArchived ? 'Archived Priority' : 'Priority Level'}
                </label>
                <select
                  className="admin-select-input"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  disabled={isFixed || isArchived || isUpdating}
                  style={isFixed || isArchived ? { cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                  id="admin-details-priority-select"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="emergency">Urgent / Emergency</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  {isArchived ? 'Archived Status' : isFixed ? 'Incident Status' : 'Select New Status'}
                </label>
                <select
                  className="admin-select-input"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isFixed || isArchived || isUpdating}
                  style={isFixed || isArchived ? { cursor: 'not-allowed', backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                  title={isArchived ? 'Status is locked because report is archived' : isFixed ? 'Status is locked because this report is already fixed / resolved' : ''}
                  id="admin-details-status-select"
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
                  if (!isFixed && !isArchived) setUploadProofDone(!uploadProofDone);
                }}
                style={isFixed || isArchived ? { cursor: 'not-allowed', opacity: 0.65, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' } : {}}
                title={isFixed || isArchived ? 'Completion photo is locked for resolved incidents' : 'Click to simulate completion proof photo upload'}
              >
                <UploadCloud size={28} />
                <span className="admin-upload-label">
                  {isFixed || isArchived
                    ? 'Completion Evidence Attached & Verified'
                    : uploadProofDone
                    ? 'Photo Attached: proof_repair.jpg'
                    : 'Upload Completion Photo'}
                </span>
                <span className="admin-upload-subtext">
                  {isFixed || isArchived ? 'Verified Fixed & Resolved' : 'Completion Evidence Required'}
                </span>
              </div>

              <button
                type="submit"
                className="admin-btn-black"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  ...(isFixed || isArchived ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}),
                }}
                disabled={isFixed || isArchived || isUpdating}
                title={isArchived ? 'Status locked: Archived record' : isFixed ? 'Status is locked because this report is already fixed / resolved' : ''}
              >
                {isArchived
                  ? 'Status Locked (Archived Record)'
                  : isFixed
                  ? 'Status Locked (Issue Fixed)'
                  : isUpdating
                  ? 'Updating...'
                  : 'Update Report'}
              </button>
            </form>
          </div>

          {/* Card 3: Archive or Restore Incident */}
          {isArchived ? (
            <div className="admin-action-card admin-action-card-archived-status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Archive size={18} color="#b45309" />
                <h3 className="admin-action-card-title" style={{ margin: 0, color: '#92400e' }}>
                  Archived Record
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14, lineHeight: 1.45 }}>
                This report is stored in History Logs. You can restore it anytime to move it back to active report management.
              </p>
              {onRestore && (
                <button
                  type="button"
                  className="admin-btn-restore-action"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                  id="admin-restore-report-card-btn"
                >
                  <RotateCcw size={16} />
                  <span>{isRestoring ? 'Restoring Report...' : 'Restore to Active Reports'}</span>
                </button>
              )}
            </div>
          ) : (activeReport.status === 'resolved' || activeReport.status === 'closed') && (onArchive || onDelete) ? (
            <div className="admin-action-card admin-action-card-archive">
              <h3 className="admin-action-card-title">Archive Incident</h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14 }}>
                This report is marked as fixed. You can archive it to safely remove it from active lists and store it in History Logs.
              </p>
              <button
                type="button"
                className="admin-btn-archive-report"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => (onArchive || onDelete)(activeReport)}
                id="admin-archive-report-card-btn"
              >
                <Archive size={16} />
                <span>Archive Fixed Report</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          presetId="update_status"
          title="Are you sure?"
          message={
            selectedStatus === 'resolved' || selectedStatus === 'closed'
              ? `Are you sure you want to mark ticket #${activeReport.ticket_number || `FM-${activeReport.id}`} (${activeReport.title}) as Fixed / Resolved?`
              : `Are you sure you want to update ticket #${activeReport.ticket_number || `FM-${activeReport.id}`} to status "${selectedStatus.replace('_', ' ')}" with ${selectedPriority.toUpperCase()} priority?`
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
