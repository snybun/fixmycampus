import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  X,
  MapPin,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Layers,
  Sparkles,
  Inbox,
  Eye,
  Archive,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  archiveAllNotifications,
} from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Alerts', color: '#64748b' },
  { key: 'unread', label: 'Unread', color: '#059669' },
  { key: 'emergency', label: 'Urgent & Safety', color: '#ef4444' },
  { key: 'work_order', label: 'Work Orders', color: '#10b981' },
  { key: 'in_progress', label: 'In Progress', color: '#f97316' },
  { key: 'parts', label: 'Parts & Supplies', color: '#8b5cf6' },
  { key: 'verified', label: 'Verified Sign-offs', color: '#047857' },
];

export default function MaintenanceNotificationsView({
  onViewJob,
  onStartRepair,
  jobs = [],
  currentUser = null,
  onUnreadChange = null,
  showToast = null,
}) {
  const effectiveMaintId = currentUser?.id || null;
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'emergency', 'work_order', 'parts', 'verified'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showArchiveSingleModal, setShowArchiveSingleModal] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);
  const [isArchivingSingle, setIsArchivingSingle] = useState(false);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Sync notifications from API if available
  const loadNotifications = async () => {
    if (!effectiveMaintId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchNotifications(effectiveMaintId, 'maintenance');
      if (res && res.success && Array.isArray(res.data)) {
        // Map API notifications and merge with linked job details
        const mapped = res.data.map((item) => {
          // Attempt to link to a local job if ticket_number or report_id matches
          const matchedJob = jobs.find(
            (j) =>
              (item.ticket_number && j.ticket_number && j.ticket_number.toUpperCase() === item.ticket_number.toUpperCase()) ||
              (item.report_id && String(j.id) === String(item.report_id))
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

  // Dynamic counts for each filter category
  const filterCounts = useMemo(() => {
    return {
      all: notifications.length,
      unread: unreadCount,
      emergency: notifications.filter((n) => n.type === 'emergency' || n.priority === 'emergency').length,
      work_order: notifications.filter((n) => n.type === 'work_order' || n.type === 'assignment').length,
      in_progress: notifications.filter((n) => n.type === 'in_progress').length,
      parts: notifications.filter((n) => n.type === 'parts').length,
      verified: notifications.filter((n) => n.type === 'verified' || n.type === 'fixed' || n.type === 'resolved').length,
    };
  }, [notifications, unreadCount]);

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
      await markAllNotificationsRead(effectiveMaintId, 'maintenance');
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
        await markNotificationRead(notif.id, effectiveMaintId, 'maintenance');
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
  };

  // Trigger confirmation modal for single notification archive
  const handleRequestArchiveSingle = (notif, e) => {
    if (e) e.stopPropagation();
    setItemToArchive(notif);
    setShowArchiveSingleModal(true);
  };

  // Confirm and execute single notification archive
  const handleConfirmArchiveSingle = async () => {
    if (!itemToArchive) return;
    setIsArchivingSingle(true);
    const targetId = itemToArchive.id;

    // Optimistically remove from state
    setNotifications((prev) => prev.filter((n) => n.id !== targetId));

    if (typeof showToast === 'function') {
      showToast('Notification archived.');
    }

    try {
      await archiveNotification(targetId, effectiveMaintId, 'maintenance');
    } catch (err) {
      console.error('Error archiving notification:', err);
    } finally {
      setIsArchivingSingle(false);
      setShowArchiveSingleModal(false);
      setItemToArchive(null);
    }
  };

  // Archive all notifications
  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await archiveAllNotifications(effectiveMaintId, 'maintenance');
      setNotifications([]);
      if (typeof showToast === 'function') {
        showToast('All notifications archived.');
      }
    } catch (err) {
      console.error('Error archiving all notifications:', err);
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
      markNotificationRead(notif.id, effectiveMaintId, 'maintenance').catch(() => {});
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
            Work order dispatches, priority alerts, and updates for jobs assigned to you.
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
            title={notifications.length === 0 ? 'No notifications to archive' : 'Archive all notifications'}
          >
            <Archive size={15} />
            <span>Archive All</span>
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
          3. Filter & Search Toolbar
          ==================================================================== */}
      <div className="maint-notif-toolbar">
        {/* Left: Summary Count & Active Filter Indicator */}
        <div className="maint-notif-toolbar-left">
          <span className="maint-notif-count-text">
            Showing <strong>{filteredNotifications.length}</strong> of {notifications.length} alerts
          </span>
          {filterType !== 'all' && (
            <div className="maint-notif-active-pill">
              <span>{FILTER_OPTIONS.find((o) => o.key === filterType)?.label}</span>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                title="Clear filter"
                aria-label="Clear filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Search Bar & Filter Button (docked together) */}
        <div className="maint-notif-toolbar-controls">
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
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Button & Dropdown Menu */}
          <div className="maint-notif-filter-dropdown-wrap" ref={filterDropdownRef}>
            <button
              type="button"
              className={`maint-notif-filter-btn ${isFilterOpen ? 'open' : ''} ${filterType !== 'all' ? 'has-active' : ''}`}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              aria-expanded={isFilterOpen}
              title="Filter alerts by category"
              id="maint-notif-filter-btn"
            >
              <Filter size={15} />
              <span className="maint-notif-filter-btn-text">
                {filterType === 'all' ? 'Filter' : (FILTER_OPTIONS.find((o) => o.key === filterType)?.label || 'Filter')}
              </span>
              {filterType !== 'all' && (
                <span className="maint-notif-filter-badge">
                  {filterCounts[filterType] ?? 0}
                </span>
              )}
              <ChevronDown size={14} className={`maint-notif-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="maint-notif-filter-menu" role="menu">
                <div className="maint-notif-filter-menu-header">
                  <span>Filter by Category</span>
                  {filterType !== 'all' && (
                    <button
                      type="button"
                      className="maint-notif-filter-reset-btn"
                      onClick={() => {
                        setFilterType('all');
                        setIsFilterOpen(false);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="maint-notif-filter-menu-list">
                  {FILTER_OPTIONS.map((opt) => {
                    const isActive = filterType === opt.key;
                    const count = filterCounts[opt.key] ?? 0;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`maint-notif-filter-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setFilterType(opt.key);
                          setIsFilterOpen(false);
                        }}
                        role="menuitem"
                      >
                        <span
                          className="maint-notif-filter-item-dot"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="maint-notif-filter-item-label">{opt.label}</span>
                        <span className="maint-notif-filter-item-count">{count}</span>
                        {isActive && <Check size={14} className="maint-notif-filter-item-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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

                {/* Right Section: Action Controls & Timestamp (Horizontally Organized) */}
                <div
                  className="maint-notif-card-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="maint-notif-time-row">
                    {isUnread && (
                      <span
                        className="maint-notif-unread-dot"
                        title="Unread notification"
                        aria-label="Unread"
                      />
                    )}
                    <span className="maint-notif-time">
                      <Clock size={13} />
                      {item.time_ago || 'Recently'}
                    </span>
                  </div>

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

                  {/* Archive Single Notification */}
                  <button
                    type="button"
                    className="maint-notif-btn-delete"
                    onClick={(e) => handleRequestArchiveSingle(item, e)}
                    title="Archive notification"
                  >
                    <Archive size={14} />
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

      {/* Archive Single Confirmation Modal */}
      {showArchiveSingleModal && (
        <ConfirmationModal
          isOpen={showArchiveSingleModal}
          presetId="archive_notification"
          title="Archive Notification?"
          message={
            itemToArchive?.title
              ? `Are you sure you want to archive "${itemToArchive.title}"?`
              : 'Are you sure you want to archive this notification?'
          }
          onConfirm={handleConfirmArchiveSingle}
          onCancel={() => {
            if (!isArchivingSingle) {
              setShowArchiveSingleModal(false);
              setItemToArchive(null);
            }
          }}
          isLoading={isArchivingSingle}
        />
      )}

      {/* Archive All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAllModal}
        presetId="archive_notifications"
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setShowDeleteAllModal(false)}
        isLoading={isDeletingAll}
      />
    </div>
  );
}
