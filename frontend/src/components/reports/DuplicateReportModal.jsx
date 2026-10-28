import React from 'react';
import {
  AlertTriangle,
  Check,
  ThumbsUp,
  X,
  Users,
  Wrench,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import './duplicateModal.css';

export default function DuplicateReportModal({
  isOpen,
  duplicate,
  onConfirmDuplicate,
  onDismiss,
  isSubmitting = false,
}) {
  if (!isOpen || !duplicate) return null;

  const count = duplicate.confirmation_count || 1;
  const statusLabel = duplicate.status
    ? duplicate.status.replace(/_/g, ' ').toUpperCase()
    : 'UNDER REVIEW';

  return (
    <div className="dup-modal-overlay" onClick={onDismiss}>
      <div
        className="dup-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="dup-modal-close"
          onClick={onDismiss}
          title="Close and continue filing report"
        >
          <X size={18} />
        </button>

        {/* Header Alert Header */}
        <div className="dup-modal-header">
          <div className="dup-warning-icon-box">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 id="dup-modal-title" className="dup-modal-title">
              Active Report Found in this Room
            </h3>
            <p className="dup-modal-subtitle">
              A defect has already been reported here and is currently in maintenance.
            </p>
          </div>
        </div>

        {/* Existing Defect Preview Card */}
        <div className="dup-defect-card">
          <div className="dup-defect-top">
            {/* Thumbnail */}
            <div className="dup-defect-thumb-box">
              <img
                src={duplicate.primary_photo || duplicate.image_url || '/images/hero_ac_defect.jpg'}
                alt={duplicate.title}
                className="dup-defect-thumb"
                onError={(e) => {
                  e.target.src = '/images/hero_ac_defect.jpg';
                }}
              />
            </div>

            {/* Defect Details */}
            <div className="dup-defect-info">
              <div className="dup-defect-badge-row">
                {duplicate.ticket_number && (
                  <span className="dup-ticket-tag">{duplicate.ticket_number}</span>
                )}
                <span className="dup-status-tag">
                  <Wrench size={12} />
                  {statusLabel}
                </span>
              </div>

              <h4 className="dup-defect-title">{duplicate.title}</h4>
              <p className="dup-defect-location">
                📍 {duplicate.location_summary || duplicate.room_number || 'Campus Location'}
              </p>

              {/* Student Impact Count */}
              <div className="dup-community-count">
                <Users size={14} className="dup-users-icon" />
                <span>
                  <strong>{count} {count === 1 ? 'student' : 'students'}</strong> confirmed this issue
                </span>
              </div>
            </div>
          </div>

          {duplicate.description && (
            <p className="dup-defect-desc">{duplicate.description}</p>
          )}

          {duplicate.assigned_worker && (
            <div className="dup-assigned-worker">
              <ShieldCheck size={14} className="dup-worker-icon" />
              <span>Assigned: <strong>{duplicate.assigned_worker}</strong></span>
            </div>
          )}
        </div>

        {/* Informative Guidance */}
        <div className="dup-guidance-box">
          <p>
            Is this the issue you are reporting? Confirming this ticket notifies maintenance of higher student impact and subscribes you to repair updates without creating extra duplicate tickets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="dup-modal-actions">
          {/* Primary Action: Confirm & Follow */}
          <button
            type="button"
            className="dup-btn-confirm"
            onClick={onConfirmDuplicate}
            disabled={isSubmitting}
          >
            <ThumbsUp size={16} />
            <span>
              {isSubmitting
                ? 'Confirming Report...'
                : 'I Have This Issue Too (Confirm & Follow)'}
            </span>
          </button>

          {/* Secondary Action: Different Issue */}
          <button
            type="button"
            className="dup-btn-dismiss"
            onClick={onDismiss}
            disabled={isSubmitting}
          >
            <span>No, Report a Different Issue in this Room</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
