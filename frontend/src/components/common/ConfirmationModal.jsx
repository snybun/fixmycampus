import React, { useEffect } from 'react';
import {
  ClipboardCheck,
  Users,
  RotateCcw,
  Trash2,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  Wrench,
  Archive,
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
  delete_notifications: {
    id: 'delete_notifications',
    title: 'Delete All Notifications?',
    message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
    icon: Trash2,
    badgeClass: 'badge-red',
    cancelText: 'Cancel',
    confirmText: 'Delete All',
    confirmClass: 'modal-btn-danger',
  },
  archive_notifications: {
    id: 'archive_notifications',
    title: 'Archive All Notifications?',
    message: 'Are you sure you want to archive all notifications? Archived alerts can be viewed anytime by filtering by Archived.',
    icon: Archive,
    badgeClass: 'badge-amber',
    cancelText: 'Cancel',
    confirmText: 'Archive All',
    confirmClass: 'modal-btn-primary',
  },
  start_repair: {
    id: 'start_repair',
    title: 'Start Repair?',
    message: 'Are you sure you want to start this repair? Once started, this action cannot be undone.',
    icon: Wrench,
    badgeClass: 'badge-amber',
    cancelText: 'Cancel',
    confirmText: 'Yes, Start Repair',
    confirmClass: 'modal-btn-primary',
  },
  archive_report: {
    id: 'archive_report',
    title: 'Archive Report?',
    message: 'Are you sure you want to archive this report? It will be safely moved from active reports to the History Logs.',
    icon: Archive,
    badgeClass: 'badge-amber',
    cancelText: 'Cancel',
    confirmText: 'Yes, Archive Report',
    confirmClass: 'modal-btn-primary',
  },
  delete_log: {
    id: 'delete_log',
    title: 'Delete History Log?',
    message: 'Are you sure you want to permanently delete this history log record? This action cannot be undone.',
    icon: Trash2,
    badgeClass: 'badge-red',
    cancelText: 'Cancel',
    confirmText: 'Yes, Delete Log',
    confirmClass: 'modal-btn-danger',
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
  onCancel,
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
  isLoading = false,
}) {
  const handleClose = onClose || onCancel || (() => {});
  const isBusy = loading || isLoading;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
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
        onCancel={handleClose}
        onConfirm={onConfirm}
        loading={isBusy}
      />
    </div>
  );
}
