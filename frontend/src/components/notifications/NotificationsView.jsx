import React, { useState, useEffect } from 'react';
import {
  Info,
  Check,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/api';
import './notifications.css';

export default function NotificationsView({
  onNavigate,
  onSelectReport,
  unreadCount,
  setUnreadCount,
}) {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      ticket_number: 'FM-2026-00153',
      type: 'verified',
      title: 'Your report FM-2026-00153 has been verified.',
      time_ago: '2 hours ago',
      is_read: 0,
    },
    {
      id: 2,
      ticket_number: 'FM-2026-00153',
      type: 'assignment',
      title: 'Maintenance worker Mark Santos has been assigned to your report FM-2026-00153.',
      time_ago: '1 day ago',
      is_read: 0,
    },
    {
      id: 3,
      ticket_number: 'FM-2026-00139',
      type: 'fixed',
      title: 'Your reported air conditioner issue FM-2026-00139 is now fixed!',
      time_ago: '3 days ago',
      is_read: 1,
    },
    {
      id: 4,
      ticket_number: 'FM-2026-00148',
      type: 'update',
      title: 'Your report FM-2026-00148 has been updated with new schedule information.',
      time_ago: '5 days ago',
      is_read: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Fetch real notifications on mount
  useEffect(() => {
    let isMounted = true;
    fetchNotifications().then((res) => {
      if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setNotifications(res.data);
        if (typeof setUnreadCount === 'function' && typeof res.unread_count === 'number') {
          setUnreadCount(res.unread_count);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [setUnreadCount]);

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
      await markAllNotificationsRead();
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
        await markNotificationRead(notif.id);
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // If report click handler provided, can navigate to reports
    if (typeof onSelectReport === 'function' && notif.ticket_number) {
      onSelectReport(notif.ticket_number);
    }
  };

  // Render icon based on notification type
  const renderIconBadge = (type) => {
    switch (type) {
      case 'fixed':
      case 'resolved':
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
      case 'verified':
      case 'assignment':
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
            <h1 className="notif-title">Notifications</h1>
            <p className="notif-subtitle">
              Stay up to date with activity and progress on facility requests.
            </p>
          </div>

          <button
            type="button"
            className="notif-mark-read-btn"
            onClick={handleMarkAllRead}
            disabled={!hasUnread || isMarkingAll}
            id="notif-mark-all-read-btn"
          >
            <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
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
                      <span className="notif-card-time">{item.time_ago}</span>
                    </div>
                  </div>

                  <div className="notif-card-right">
                    {isUnread && (
                      <span
                        className="notif-unread-dot"
                        aria-label="Unread notification indicator"
                      />
                    )}
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
      </div>
    </div>
  );
}
