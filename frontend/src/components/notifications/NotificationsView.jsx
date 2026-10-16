import React, { useState, useEffect } from 'react';
import {
  Info,
  Check,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wrench,
  AlertOctagon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications,
} from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import './notifications.css';

export default function NotificationsView({
  onNavigate,
  onSelectReport,
  unreadCount,
  setUnreadCount,
  currentUser = null,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications(currentUser?.id, 'student');
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
        if (typeof setUnreadCount === 'function' && typeof res.unread_count === 'number') {
          setUnreadCount(res.unread_count);
        }
      } else {
        setNotifications([]);
        if (typeof setUnreadCount === 'function') {
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real notifications on mount and poll periodically
  useEffect(() => {
    setLoading(true);
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [setUnreadCount, currentUser?.id]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: 1 }))
    );
    if (typeof setUnreadCount === 'function') {
      setUnreadCount(0);
    }

    try {
      await markAllNotificationsRead(currentUser?.id, 'student');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Mark individual item as read
  const handleCardClick = async (notif) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, is_read: 1 } : item))
      );
      if (typeof setUnreadCount === 'function') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
        await markNotificationRead(notif.id, currentUser?.id, 'student');
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // If report click handler provided, can navigate to reports
    if (typeof onSelectReport === 'function' && notif.ticket_number) {
      onSelectReport(notif.ticket_number);
    }
  };

  // Delete individual notification
  const handleDeleteSingle = async (item, e) => {
    if (e) e.stopPropagation();
    const targetId = item.id;
    const wasUnread = !item.is_read;

    // Optimistic UI removal
    setNotifications((prev) => prev.filter((n) => n.id !== targetId));
    if (wasUnread && typeof setUnreadCount === 'function') {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await deleteNotification(targetId, currentUser?.id, 'student');
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Delete all notifications
  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllNotifications(currentUser?.id, 'student');
      setNotifications([]);
      if (typeof setUnreadCount === 'function') {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  // Render icon based on notification type
  const renderIconBadge = (type) => {
    switch (type) {
      case 'emergency':
        return (
          <div className="notif-icon-badge notif-badge-emergency" title="Emergency Hazard">
            <AlertOctagon size={20} strokeWidth={2.4} />
          </div>
        );
      case 'in_progress':
        return (
          <div className="notif-icon-badge notif-badge-in-progress" title="Repair In Progress">
            <Clock size={20} strokeWidth={2.4} />
          </div>
        );
      case 'work_order':
      case 'assignment':
        return (
          <div className="notif-icon-badge notif-badge-assignment" title="Work Assignment">
            <Wrench size={20} strokeWidth={2.2} />
          </div>
        );
      case 'fixed':
      case 'resolved':
      case 'verified':
        return (
          <div className="notif-icon-badge notif-badge-fixed" title="Resolved Issue">
            <Check size={20} strokeWidth={2.6} />
          </div>
        );
      case 'update':
      case 'warning':
        return (
          <div className="notif-icon-badge notif-badge-update" title="Schedule Update">
            <AlertTriangle size={20} strokeWidth={2.4} />
          </div>
        );
      case 'new_report':
      case 'submitted':
      case 'info':
      default:
        return (
          <div className="notif-icon-badge notif-badge-info" title="Information Notice">
            <Info size={20} strokeWidth={2.2} />
          </div>
        );
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="notif-page-wrapper">
      <div className="notif-container">
        {/* Header Row */}
        <div className="notif-header-row">
          <div className="notif-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="notif-title">Notifications</h1>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 9999,
                  }}
                >
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="notif-subtitle">
              Stay up to date with activity and progress on facility requests.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="notif-mark-read-btn"
              onClick={loadNotifications}
              disabled={loading}
              title="Refresh notifications"
              style={{ color: '#4b5563' }}
            >
              <RefreshCw size={14} className={loading ? 'maint-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="notif-mark-read-btn"
              onClick={handleMarkAllRead}
              disabled={!hasUnread || isMarkingAll}
              id="notif-mark-all-read-btn"
            >
              <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
            </button>

            <button
              type="button"
              className="notif-delete-all-btn"
              onClick={() => setShowDeleteAllModal(true)}
              disabled={notifications.length === 0 || isDeletingAll}
              id="notif-delete-all-btn"
              title="Delete all notifications"
            >
              <Trash2 size={14} />
              <span>Delete all</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="notif-empty-state" style={{ padding: '48px 20px' }}>
            <RefreshCw size={26} className="maint-spin" style={{ color: '#059669' }} />
            <h3 className="notif-empty-title" style={{ marginTop: 8 }}>Loading Notifications...</h3>
            <p className="notif-empty-desc">Fetching latest campus updates from system.</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="notif-list">
            {notifications.map((item) => {
              const isUnread = !item.is_read;
              return (
                <div
                  key={item.id}
                  className={`notif-card ${isUnread ? 'is-unread' : 'is-read'}`}
                  onClick={() => handleCardClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(item);
                    }
                  }}
                  id={`notif-item-${item.id}`}
                >
                  <div className="notif-card-left">
                    {renderIconBadge(item.type)}
                    <div className="notif-card-content">
                      <p className="notif-card-title">{item.title}</p>
                      {item.message && <p className="notif-card-desc">{item.message}</p>}
                      <div className="notif-card-meta">
                        <span className="notif-card-time">{item.time_ago}</span>
                        {item.badge_label && (
                          <span className={`notif-status-pill notif-status-${item.type || 'info'}`}>
                            {item.badge_label}
                          </span>
                        )}
                        {item.location && <span className="notif-card-location">• {item.location}</span>}
                        {item.ticket_number && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: '#059669',
                              backgroundColor: '#ecfdf5',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {item.ticket_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="notif-card-right" onClick={(e) => e.stopPropagation()}>
                    {isUnread && (
                      <span
                        className="notif-unread-dot"
                        aria-label="Unread notification indicator"
                      />
                    )}
                    <button
                      type="button"
                      className="notif-card-delete-btn"
                      onClick={(e) => handleDeleteSingle(item, e)}
                      title="Delete notification"
                      aria-label="Delete this notification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="notif-empty-title">All Caught Up!</h3>
            <p className="notif-empty-desc">
              You do not have any new facility updates or notifications right now.
            </p>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllModal && (
          <ConfirmationModal
            isOpen={showDeleteAllModal}
            presetId="delete_notifications"
            loading={isDeletingAll}
            onClose={() => {
              if (!isDeletingAll) setShowDeleteAllModal(false);
            }}
            onConfirm={handleConfirmDeleteAll}
          />
        )}
      </div>
    </div>
  );
}

