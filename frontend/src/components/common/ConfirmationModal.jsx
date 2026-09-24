import React, { useEffect } from 'react';
import {
  ClipboardCheck,
  Users,
  RotateCcw,
  Trash2,
  CheckCircle2,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import './modals.css';

export const MODAL_PRESETS = {
  submit_report: {
    id: 'submit_report',
    title: 'Submit Report?',
    message: 'Are you sure you want to submit this maintenance report?',
    icon: ClipboardCheck,
    badgeClass: 'badge-gray',
    cancelText: 'Cancel',
    confirmText: 'Submit',
    confirmClass: 'modal-btn-primary',
  },
  assign_worker: {
    id: 'assign_worker',
    title: 'Assign Maintenance Worker?',
    message: 'Assign Mark Santos to this repair task?',
    icon: Users,
    badgeClass: 'badge-green',
    cancelText: 'Cancel',
    confirmText: 'Assign',
    confirmClass: 'modal-btn-primary',
  },
  update_status: {
    id: 'update_status',
    title: 'Update Report Status?',
    message: 'Change status to Repair Ongoing?',
    icon: RotateCcw,
    badgeClass: 'badge-gray',
    cancelText: 'Cancel',
    confirmText: 'Update',
    confirmClass: 'modal-btn-primary',
  },
  delete_report: {
    id: 'delete_report',
    title: 'Delete Report?',
    message: 'This action cannot be undone. Are you sure?',
    icon: Trash2,
    badgeClass: 'badge-red',
    cancelText: 'Cancel',
    confirmText: 'Delete',
    confirmClass: 'modal-btn-primary',
  },
  mark_fixed: {
    id: 'mark_fixed',
    title: 'Mark Report as Fixed?',
    message: 'Confirm that this issue has been resolved?',
    icon: CheckCircle2,
    badgeClass: 'badge-green',
    cancelText: 'Cancel',
    confirmText: 'Confirm',
    confirmClass: 'modal-btn-primary',
  },
  logout: {
    id: 'logout',
    title: 'Logout?',
    message: 'Are you sure you want to log out of FixMyCampus?',
    icon: LogOut,
    badgeClass: 'badge-gray',
    cancelText: 'Cancel',
    confirmText: 'Log out',
    confirmClass: 'modal-btn-danger',
  },
  start_over: {
    id: 'start_over',
    title: 'Are you sure you want to start over?',
    message: 'Progress might lose when you confirm.',
    icon: AlertTriangle,
    badgeClass: 'badge-red',
    cancelText: 'Cancel',
    confirmText: 'Confirm',
    confirmClass: 'modal-btn-primary',
  },
};

/**
 * Standard Dialog Card (Pure Presentation)
 */
export function ModalCard({
  presetId,
  title,
  message,
  icon: IconOverride,
  badgeClass: badgeClassOverride,
  cancelText = 'Cancel',
  confirmText,
  confirmClass,
  onCancel,
  onConfirm,
  loading = false,
}) {
  const preset = MODAL_PRESETS[presetId] || {};
  const ResolvedIcon = IconOverride || preset.icon || AlertTriangle;
  const resolvedBadgeClass = badgeClassOverride || preset.badgeClass || 'badge-gray';
  const resolvedTitle = title || preset.title || 'Confirm Action';
  const resolvedMessage = message || preset.message || 'Are you sure you want to proceed?';
  const resolvedCancelText = cancelText || preset.cancelText || 'Cancel';
  const resolvedConfirmText = confirmText || preset.confirmText || 'Confirm';
  const resolvedConfirmClass = confirmClass || preset.confirmClass || 'modal-btn-primary';

  return (
    <div className="modal-dialog">
      <div className={`modal-icon-badge ${resolvedBadgeClass}`}>
        <ResolvedIcon size={26} strokeWidth={2.2} />
      </div>

      <h3 className="modal-title">{resolvedTitle}</h3>
      <p className="modal-message">{resolvedMessage}</p>

      <div className="modal-actions">
        <button
          type="button"
          className="modal-btn modal-btn-cancel"
          onClick={onCancel}
          disabled={loading}
        >
          {resolvedCancelText}
        </button>

        <button
          type="button"
          className={`modal-btn ${resolvedConfirmClass}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait...' : resolvedConfirmText}
        </button>
      </div>
    </div>
  );
}

/**
 * Full Overlay Modal with ESC and Backdrop dismissal
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  presetId,
  title,
  message,
  icon,
  badgeClass,
  cancelText,
  confirmText,
  confirmClass,
  loading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <ModalCard
        presetId={presetId}
        title={title}
        message={message}
        icon={icon}
        badgeClass={badgeClass}
        cancelText={cancelText}
        confirmText={confirmText}
        confirmClass={confirmClass}
        onCancel={onClose}
        onConfirm={onConfirm}
        loading={loading}
      />
    </div>
  );
}
