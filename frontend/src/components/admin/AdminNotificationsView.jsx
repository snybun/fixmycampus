import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  CheckCircle2,
  Clock,
  Check,
  CheckCheck,
  Search,
  MapPin,
  RefreshCw,
  ArrowRight,
  Layers,
  Inbox,
  ShieldAlert,
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

export default function AdminNotificationsView({
  reports = [],
  onViewReport = null,
  showToast = null,
  onUnreadChange = null,
}) {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'emergency', 'new_report', 'work_order'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications();
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  useEffect(() => {
    if (typeof onUnreadChange === 'function') {
      onUnreadChange(unreadCount);
    }
  }, [unreadCount, onUnreadChange]);

  const urgentCount = useMemo(() => {
    return notifications.filter(
      (n) => n.type === 'emergency' || n.priority === 'emergency' || n.priority === 'high'
    ).length;
  }, [notifications]);

  const newReportsCount = useMemo(() => {
    return notifications.filter(
      (n) => n.type === 'new_report' || n.type === 'submitted' || n.type === 'work_order'
    ).length;
  }, [notifications]);

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));

    if (typeof showToast === 'function') {
      showToast('All notifications marked as read.');
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

    // Optimistic removal
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

  // Click card or "View Report" button
  const handleOpenReport = (notif) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
      );
      markNotificationRead(notif.id).catch(() => {});
    }

    if (typeof onViewReport === 'function') {
      // Find matching report in reports state
      const matched = reports.find(
        (r) =>
          (notif.report_id && r.id === notif.report_id) ||
          (notif.ticket_number && r.ticket_number && r.ticket_number.toUpperCase() === notif.ticket_number.toUpperCase()) ||
          (notif.ticket_number && String(r.id) === String(notif.ticket_number.replace(/\D/g, '')))
      );

      if (matched) {
        onViewReport(matched);
      } else if (notif.report_id) {
        onViewReport({
          id: notif.report_id,
          ticket_number: notif.ticket_number || `FMC-${notif.report_id}`,
          title: notif.title,
          description: notif.message,
          priority: notif.priority || 'medium',
          status: 'submitted',
          building_name: notif.location?.split('•')[0]?.trim() || 'Campus Facilities',
        });
      }
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filterType === 'unread' && item.is_read) return false;
      if (filterType === 'emergency' && item.type !== 'emergency' && item.priority !== 'emergency' && item.priority !== 'high') return false;
      if (filterType === 'new_report' && item.type !== 'new_report' && item.type !== 'submitted') return false;
      if (filterType === 'work_order' && item.type !== 'work_order' && item.type !== 'assignment') return false;

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

  const getTypeConfig = (type) => {
    switch (type) {
      case 'emergency':
        return {
          icon: <AlertOctagon size={18} />,
          badgeStyle: { backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' },
          borderLeft: '4px solid #ef4444',
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
        };
      case 'work_order':
      case 'assignment':
        return {
          icon: <Wrench size={18} />,
          badgeStyle: { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' },
          borderLeft: '4px solid #3b82f6',
          iconBg: '#dbeafe',
          iconColor: '#1d4ed8',
        };
      case 'verified':
      case 'fixed':
      case 'resolved':
        return {
          icon: <CheckCircle2 size={18} />,
          badgeStyle: { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' },
          borderLeft: '4px solid #10b981',
          iconBg: '#ecfdf5',
          iconColor: '#059669',
        };
      case 'new_report':
      case 'submitted':
        return {
          icon: <ShieldAlert size={18} />,
          badgeStyle: { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' },
          borderLeft: '4px solid #f59e0b',
          iconBg: '#fef3c7',
          iconColor: '#d97706',
        };
      default:
        return {
          icon: <Bell size={18} />,
          badgeStyle: { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' },
          borderLeft: '4px solid #94a3b8',
          iconBg: '#f1f5f9',
          iconColor: '#64748b',
        };
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="admin-header-title" style={{ margin: 0 }}>
              System Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  border: '1px solid #fca5a5',
                }}
              >
                {unreadCount} Unread Alert{unreadCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="admin-header-subtitle" style={{ margin: '6px 0 0 0' }}>
            Real-time campus defect dispatches, worker assignments, hazard alerts, and resolution notices.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="maint-notif-btn-secondary"
            onClick={loadNotifications}
            disabled={loading}
            title="Refresh notifications"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'maint-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: unreadCount === 0 ? '#e2e8f0' : '#059669',
              color: unreadCount === 0 ? '#94a3b8' : '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            title={unreadCount === 0 ? 'No unread alerts' : 'Mark all notifications as read'}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>

          <button
            type="button"
            id="admin-notif-delete-all-btn"
            onClick={() => setShowDeleteAllModal(true)}
            disabled={notifications.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #fee2e2',
              backgroundColor: notifications.length === 0 ? '#f8fafc' : '#fef2f2',
              color: notifications.length === 0 ? '#cbd5e1' : '#dc2626',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={notifications.length === 0 ? 'No notifications to delete' : 'Delete all notifications'}
          >
            <Trash2 size={15} />
            <span>Delete All</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="admin-stat-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">TOTAL NOTIFICATIONS</span>
            <span className="admin-stat-value">{notifications.length}</span>
          </div>
          <div className="admin-stat-icon indigo" title="Total Alerts">
            <Layers size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">UNREAD ALERTS</span>
            <span className="admin-stat-value amber">{unreadCount}</span>
          </div>
          <div className="admin-stat-icon amber" title="Unread Alerts">
            <Bell size={20} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">URGENT &amp; HAZARDS</span>
            <span className="admin-stat-value" style={{ color: '#dc2626' }}>{urgentCount}</span>
          </div>
          <div className="admin-stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }} title="Urgent Alerts">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">NEW REPORTS &amp; DISPATCH</span>
            <span className="admin-stat-value blue">{newReportsCount}</span>
          </div>
          <div className="admin-stat-icon blue" title="New Dispatches">
            <Wrench size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`admin-filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 500,
              border: filterType === 'all' ? '1px solid #059669' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'all' ? '#059669' : '#f8fafc',
              color: filterType === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            All Alerts ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('unread')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 500,
              border: filterType === 'unread' ? '1px solid #d97706' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'unread' ? '#d97706' : '#f8fafc',
              color: filterType === 'unread' ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            Unread ({unreadCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('emergency')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 500,
              border: filterType === 'emergency' ? '1px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'emergency' ? '#dc2626' : '#f8fafc',
              color: filterType === 'emergency' ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            Urgent &amp; Safety
          </button>

          <button
            type="button"
            onClick={() => setFilterType('new_report')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 500,
              border: filterType === 'new_report' ? '1px solid #059669' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'new_report' ? '#059669' : '#f8fafc',
              color: filterType === 'new_report' ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            New Defect Reports
          </button>

          <button
            type="button"
            onClick={() => setFilterType('work_order')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 500,
              border: filterType === 'work_order' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'work_order' ? '#2563eb' : '#f8fafc',
              color: filterType === 'work_order' ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            Dispatches &amp; Tasks
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search ticket, room, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 32px 7px 34px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && notifications.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <RefreshCw size={28} className="maint-spin" style={{ color: '#059669', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Loading Notifications...
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Fetching latest updates from MySQL database.
            </p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => {
            const config = getTypeConfig(item.type);
            const isUnread = !item.is_read;
            const hasReport = Boolean(item.report_id || item.ticket_number);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (hasReport) handleOpenReport(item);
                }}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  border: isUnread ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                  borderLeft: config.borderLeft,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  cursor: hasReport ? 'pointer' : 'default',
                  boxShadow: isUnread
                    ? '0 2px 8px rgba(0,0,0,0.03)'
                    : '0 1px 2px rgba(0,0,0,0.01)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left Side */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: config.iconBg,
                      color: config.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tags row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid',
                          ...config.badgeStyle,
                        }}
                      >
                        {item.badge_label || 'Notification'}
                      </span>

                      {item.priority && (
                        <span
                          className={`maint-priority-badge ${item.priority}`}
                          style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 6 }}
                        >
                          {item.priority.toUpperCase()}
                        </span>
                      )}

                      {item.ticket_number && (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 7px',
                            borderRadius: 4,
                          }}
                        >
                          {item.ticket_number}
                        </span>
                      )}

                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <Clock size={12} />
                        {item.time_ago || 'Recently'}
                      </span>

                      {isUnread && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#059669',
                            boxShadow: '0 0 0 3px rgba(5,150,105,0.2)',
                          }}
                          title="Unread alert"
                        />
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: isUnread ? 700 : 600,
                        color: isUnread ? '#0f172a' : '#334155',
                        margin: '0 0 4px 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </h3>

                    {/* Message */}
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: '#64748b',
                        margin: '0 0 8px 0',
                        lineHeight: 1.45,
                      }}
                    >
                      {item.message}
                    </p>

                    {/* Location */}
                    {item.location && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.8rem',
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <MapPin size={12} color="#059669" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Actions */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {hasReport && (
                    <button
                      type="button"
                      onClick={() => handleOpenReport(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: '1px solid #059669',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Open full defect report details"
                    >
                      <span>View Report</span>
                      <ArrowRight size={13} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(item, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: isUnread ? '#f8fafc' : '#ffffff',
                      color: isUnread ? '#059669' : '#94a3b8',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title={isUnread ? 'Mark as read' : 'Mark as unread'}
                  >
                    <Check size={13} />
                    <span>{isUnread ? 'Mark Read' : 'Read'}</span>
                  </button>

                  <button
                    type="button"
                    className="admin-notif-card-delete-btn"
                    onClick={(e) => handleDeleteSingle(item, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1px solid #fee2e2',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Inbox size={26} strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              No Notifications Found
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '6px 0 0 0' }}>
              {searchQuery
                ? `No alerts match your search query "${searchQuery}".`
                : filterType === 'unread'
                ? 'All caught up! There are no unread system notifications.'
                : 'All clear! No alerts exist in this category right now.'}
            </p>
            {(filterType !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  setSearchQuery('');
                }}
                style={{
                  marginTop: 16,
                  padding: '7px 18px',
                  borderRadius: 8,
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
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
