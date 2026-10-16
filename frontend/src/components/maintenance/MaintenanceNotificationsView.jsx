import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Package,
  CheckCircle2,
  Clock,
  Check,
  CheckCheck,
  Search,
  Filter,
  MapPin,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Layers,
  Sparkles,
  Inbox,
  Eye,
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

export default function MaintenanceNotificationsView({
  onViewJob,
  onStartRepair,
  jobs = [],
  currentUser = null,
  onUnreadChange = null,
  showToast = null,
}) {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'emergency', 'work_order', 'parts', 'verified'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Sync notifications from API if available
  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications(currentUser?.id);
      if (res && res.success && Array.isArray(res.data)) {
        // Map API notifications and merge with linked job details
        const mapped = res.data.map((item) => {
          // Attempt to link to a local job if ticket_number or report_id matches
          const matchedJob = jobs.find(
            (j) =>
              (item.ticket_number && j.ticket_number && j.ticket_number.toUpperCase() === item.ticket_number.toUpperCase()) ||
              (item.ticket_number && String(j.id) === String(item.ticket_number.replace(/\D/g, ''))) ||
              (item.report_id && j.id === item.report_id)
          );

          let badgeLabel = item.badge_label || 'Notification';
          const type = item.type || 'info';
          if (!item.badge_label) {
            if (type === 'emergency') badgeLabel = 'Safety Emergency';
            else if (type === 'work_order' || type === 'assignment') badgeLabel = 'Work Order Dispatch';
            else if (type === 'in_progress') badgeLabel = 'Repair In Progress';
            else if (type === 'parts') badgeLabel = 'Requisition Ready';
            else if (type === 'sla_warning') badgeLabel = 'SLA Notice';
            else if (type === 'verified' || type === 'fixed' || type === 'resolved') badgeLabel = 'Issue Fixed';
            else if (type === 'schedule') badgeLabel = 'Maintenance Schedule';
          }

          return {
            ...item,
            job_id: matchedJob ? matchedJob.id : (item.report_id || null),
            location: matchedJob ? matchedJob.location_summary : (item.location || 'Campus Facilities'),
            priority: matchedJob ? matchedJob.priority : (item.priority || (type === 'emergency' ? 'emergency' : type === 'work_order' ? 'high' : 'medium')),
            badge_label: badgeLabel,
          };
        });

        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.warn('Could not load remote notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Compute unread count and propagate to parent
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  useEffect(() => {
    if (typeof onUnreadChange === 'function') {
      onUnreadChange(unreadCount);
    }
  }, [unreadCount, onUnreadChange]);

  // Metric counts
  const emergencyCount = useMemo(() => {
    return notifications.filter(
      (n) => n.type === 'emergency' || n.priority === 'emergency' || n.priority === 'high'
    ).length;
  }, [notifications]);

  const workOrdersCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'work_order' || n.type === 'parts').length;
  }, [notifications]);

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    // Optimistic state update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));

    if (typeof showToast === 'function') {
      showToast('All maintenance notifications marked as read.');
    }

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Toggle single notification read status
  const handleToggleRead = async (notif, e) => {
    if (e) e.stopPropagation();
    const newStatus = notif.is_read ? 0 : 1;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: newStatus } : n))
    );

    if (newStatus === 1) {
      try {
        await markNotificationRead(notif.id);
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
  };

  // Delete individual notification
  const handleDeleteSingle = async (notif, e) => {
    if (e) e.stopPropagation();
    const targetId = notif.id;

    // Optimistically remove from state
    setNotifications((prev) => prev.filter((n) => n.id !== targetId));

    if (typeof showToast === 'function') {
      showToast('Notification deleted.');
    }

    try {
      await deleteNotification(targetId);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Delete all notifications
  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllNotifications();
      setNotifications([]);
      if (typeof showToast === 'function') {
        showToast('All notifications deleted.');
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  // Handle click on "View Job" or card
  const handleOpenJob = (notif) => {
    // If not read, mark as read
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
      );
      markNotificationRead(notif.id).catch(() => {});
    }

    if (notif.job_id && typeof onViewJob === 'function') {
      onViewJob(notif.job_id);
    } else if (notif.ticket_number && typeof onViewJob === 'function') {
      // Find matching job in jobs array
      const matched = jobs.find(
        (j) => j.ticket_number && j.ticket_number.toUpperCase() === notif.ticket_number.toUpperCase()
      );
      if (matched) {
        onViewJob(matched.id);
      }
    }
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Status/Type filter
      if (filterType === 'unread' && item.is_read) return false;
      if (filterType === 'emergency' && item.type !== 'emergency' && item.priority !== 'emergency') return false;
      if (filterType === 'work_order' && item.type !== 'work_order' && item.type !== 'assignment') return false;
      if (filterType === 'in_progress' && item.type !== 'in_progress') return false;
      if (filterType === 'parts' && item.type !== 'parts') return false;
      if (filterType === 'verified' && item.type !== 'verified' && item.type !== 'fixed' && item.type !== 'resolved') return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesTicket = item.ticket_number?.toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesLoc || matchesTicket;
      }

      return true;
    });
  }, [notifications, filterType, searchQuery]);

  // Helper for notification type icon and styling
  const getTypeConfig = (type) => {
    switch (type) {
      case 'emergency':
        return {
          icon: <AlertOctagon size={20} />,
          badgeClass: 'emergency',
          iconBoxClass: 'emergency',
          borderClass: 'border-emergency',
        };
      case 'in_progress':
        return {
          icon: <Clock size={20} />,
          badgeClass: 'in-progress',
          iconBoxClass: 'in-progress',
          borderClass: 'border-in-progress',
        };
      case 'work_order':
      case 'assignment':
        return {
          icon: <Wrench size={20} />,
          badgeClass: 'work-order',
          iconBoxClass: 'work-order',
          borderClass: 'border-work-order',
        };
      case 'parts':
        return {
          icon: <Package size={20} />,
          badgeClass: 'parts',
          iconBoxClass: 'parts',
          borderClass: 'border-parts',
        };
      case 'sla_warning':
        return {
          icon: <Clock size={20} />,
          badgeClass: 'sla',
          iconBoxClass: 'sla',
          borderClass: 'border-sla',
        };
      case 'verified':
      case 'fixed':
      case 'resolved':
        return {
          icon: <CheckCircle2 size={20} />,
          badgeClass: 'verified',
          iconBoxClass: 'verified',
          borderClass: 'border-verified',
        };
      case 'schedule':
      default:
        return {
          icon: <Bell size={20} />,
          badgeClass: 'info',
          iconBoxClass: 'info',
          borderClass: 'border-info',
        };
    }
  };

  return (
    <div className="maint-notif-container">
      {/* ====================================================================
          1. Header Section
          ==================================================================== */}
      <div className="maint-notif-header">
        <div>
          <div className="maint-notif-title-row">
            <h1 className="maint-greeting">Maintenance Notifications</h1>
            {unreadCount > 0 && (
              <span className="maint-notif-badge-pill">
                {unreadCount} Unread Alert{unreadCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="maint-subtext">
            Work order dispatches, priority hazard alerts, parts requisitions, and supervisor sign-offs.
          </p>
        </div>

        {/* Header Actions */}
        <div className="maint-notif-actions-header">
          <button
            type="button"
            className="maint-notif-btn-secondary"
            onClick={loadNotifications}
            title="Refresh notifications"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'maint-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className={`maint-notif-btn-mark-all ${unreadCount === 0 ? 'disabled' : ''}`}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            title={unreadCount === 0 ? 'No unread notifications' : 'Mark all notifications as read'}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>

          <button
            type="button"
            id="maint-notif-delete-all-btn"
            className="maint-notif-btn-delete-all"
            onClick={() => setShowDeleteAllModal(true)}
            disabled={notifications.length === 0}
            title={notifications.length === 0 ? 'No notifications to delete' : 'Delete all notifications'}
          >
            <Trash2 size={15} />
            <span>Delete All</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. Maintenance Notification Stats (Consistent with Dashboard Cards)
          ==================================================================== */}
      <div className="maint-stats-grid">
        {/* Total Alerts */}
        <div className="maint-stat-card">
          <div className="maint-stat-top">
            <span className="maint-stat-label">TOTAL ALERTS</span>
            <div className="maint-stat-icon gray">
              <Layers size={18} />
            </div>
          </div>
          <div className="maint-stat-value">{notifications.length}</div>
        </div>

        {/* Unread Alerts */}
        <div className="maint-stat-card">
          <div className="maint-stat-top">
            <span className="maint-stat-label">UNREAD ALERTS</span>
            <div className="maint-stat-icon orange">
              <Bell size={18} />
            </div>
          </div>
          <div className="maint-stat-value">{unreadCount}</div>
        </div>

        {/* Urgent / Emergency */}
        <div className="maint-stat-card">
          <div className="maint-stat-top">
            <span className="maint-stat-label">URGENT & HAZARDS</span>
            <div className="maint-stat-icon red">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="maint-stat-value">{emergencyCount}</div>
        </div>

        {/* Work Orders & Parts */}
        <div className="maint-stat-card">
          <div className="maint-stat-top">
            <span className="maint-stat-label">DISPATCH & PARTS</span>
            <div className="maint-stat-icon green">
              <Package size={18} />
            </div>
          </div>
          <div className="maint-stat-value">{workOrdersCount}</div>
        </div>
      </div>

      {/* ====================================================================
          3. Filter Tabs & Search Bar
          ==================================================================== */}
      <div className="maint-notif-toolbar">
        {/* Filter Pills */}
        <div className="maint-filter-tabs maint-notif-pills">
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterType('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'emergency' ? 'active' : ''}`}
            onClick={() => setFilterType('emergency')}
          >
            Urgent & Safety
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'work_order' ? 'active' : ''}`}
            onClick={() => setFilterType('work_order')}
          >
            Work Orders
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilterType('in_progress')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'parts' ? 'active' : ''}`}
            onClick={() => setFilterType('parts')}
          >
            Parts & Supplies
          </button>
          <button
            type="button"
            className={`maint-filter-tab ${filterType === 'verified' ? 'active' : ''}`}
            onClick={() => setFilterType('verified')}
          >
            Verified Sign-offs
          </button>
        </div>

        {/* Search Input */}
        <div className="maint-notif-search-box">
          <Search size={15} className="maint-notif-search-icon" />
          <input
            type="text"
            className="maint-notif-search-input"
            placeholder="Search by ticket (e.g. FM-102), room, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="maint-notif-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          4. Notifications List
          ==================================================================== */}
      <div className="maint-notif-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => {
            const config = getTypeConfig(item.type);
            const isUnread = !item.is_read;
            const hasLinkedJob = Boolean(item.job_id || item.ticket_number);

            return (
              <div
                key={item.id}
                className={`maint-notif-card ${config.borderClass} ${isUnread ? 'is-unread' : 'is-read'}`}
                onClick={() => {
                  if (hasLinkedJob) {
                    handleOpenJob(item);
                  }
                }}
              >
                {/* Left Section: Icon Container & Content */}
                <div className="maint-notif-card-left">
                  {/* Category / Type Icon Box */}
                  <div className={`maint-notif-icon-box ${config.iconBoxClass}`}>
                    {config.icon}
                  </div>

                  {/* Body Content */}
                  <div className="maint-notif-body">
                    {/* Top Row: Type Pill, Priority Badge, Unread Dot, Timestamp */}
                    <div className="maint-notif-meta-top">
                      <div className="maint-notif-tags">
                        <span className={`maint-notif-type-pill ${config.badgeClass}`}>
                          {item.badge_label || 'Notice'}
                        </span>

                        {item.priority && (
                          <span className={`maint-priority-badge ${item.priority}`}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        )}

                        {item.ticket_number && (
                          <span className="maint-notif-ticket-badge">
                            {item.ticket_number}
                          </span>
                        )}
                      </div>

                      <div className="maint-notif-time-row">
                        {isUnread && (
                          <span
                            className="maint-notif-unread-dot"
                            title="Unread notification"
                            aria-label="Unread"
                          />
                        )}
                        <span className="maint-notif-time">
                          <Clock size={12} />
                          {item.time_ago || 'Recently'}
                        </span>
                      </div>
                    </div>

                    {/* Notification Title */}
                    <h3 className="maint-notif-title">{item.title}</h3>

                    {/* Notification Description Message */}
                    <p className="maint-notif-desc">{item.message}</p>

                    {/* Bottom Metadata: Location */}
                    {item.location && (
                      <div className="maint-notif-location-row">
                        <MapPin size={13} className="maint-notif-loc-pin" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Section: Action Controls */}
                <div
                  className="maint-notif-card-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* View Job / Work Order Button */}
                  {hasLinkedJob && (
                    <button
                      type="button"
                      className="maint-notif-btn-open"
                      onClick={() => handleOpenJob(item)}
                      title="Open job details and work order view"
                    >
                      <span>View Job</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {/* Mark Read / Unread Toggle */}
                  <button
                    type="button"
                    className={`maint-notif-btn-toggle-read ${isUnread ? 'unread' : 'read'}`}
                    onClick={(e) => handleToggleRead(item, e)}
                    title={isUnread ? 'Mark as read' : 'Mark as unread'}
                  >
                    <Check size={14} />
                    <span>{isUnread ? 'Mark Read' : 'Read'}</span>
                  </button>

                  {/* Delete Single Notification */}
                  <button
                    type="button"
                    className="maint-notif-btn-delete"
                    onClick={(e) => handleDeleteSingle(item, e)}
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="maint-notif-empty-state">
            <div className="maint-notif-empty-icon">
              <Inbox size={42} strokeWidth={1.5} />
            </div>
            <h3 className="maint-notif-empty-title">No notifications found</h3>
            <p className="maint-notif-empty-sub">
              {searchQuery
                ? `No alerts match your search query "${searchQuery}".`
                : filterType === 'unread'
                ? 'Great job! You have read all your maintenance alerts.'
                : 'There are no maintenance alerts in this category.'}
            </p>
            {(filterType !== 'all' || searchQuery) && (
              <button
                type="button"
                className="maint-btn-details"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setFilterType('all');
                  setSearchQuery('');
                }}
              >
                Show All Notifications
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAllModal}
        presetId="delete_notifications"
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setShowDeleteAllModal(false)}
        isLoading={isDeletingAll}
      />
    </div>
  );
}
