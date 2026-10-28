import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Archive,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  unarchiveNotification,
  archiveAllNotifications,
} from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';

const NOTIF_FILTER_OPTIONS = [
  { key: 'all', label: 'All Alerts', color: '#64748b' },
  { key: 'unread', label: 'Unread', color: '#059669' },
  { key: 'emergency', label: 'Urgent & Safety', color: '#dc2626' },
  { key: 'new_report', label: 'New Defect Reports', color: '#f59e0b' },
  { key: 'work_order', label: 'Dispatches & Tasks', color: '#3b82f6' },
  { key: 'archived', label: 'Archived Alerts', color: '#c2410c' },
];

const getPageNumbers = (current, total) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

export default function AdminNotificationsView({
  reports = [],
  onViewReport = null,
  showToast = null,
  onUnreadChange = null,
  currentUser = null,
}) {
  const effectiveAdminId = currentUser?.id || 1;
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'emergency', 'new_report', 'work_order', 'archived'
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showArchiveAllModal, setShowArchiveAllModal] = useState(false);
  const [isArchivingAll, setIsArchivingAll] = useState(false);
  const [showArchiveSingleModal, setShowArchiveSingleModal] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);
  const [isArchivingSingle, setIsArchivingSingle] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(effectiveAdminId, 'admin');
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
  }, [effectiveAdminId]);

  const activeNotifications = useMemo(() => {
    return notifications.filter((n) => !n.is_archived);
  }, [notifications]);

  const archivedNotifications = useMemo(() => {
    return notifications.filter((n) => Boolean(n.is_archived));
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.is_read).length;
  }, [activeNotifications]);

  useEffect(() => {
    if (typeof onUnreadChange === 'function') {
      onUnreadChange(unreadCount);
    }
  }, [unreadCount, onUnreadChange]);

  const urgentCount = useMemo(() => {
    return activeNotifications.filter(
      (n) => n.type === 'emergency' || n.priority === 'emergency' || n.priority === 'high'
    ).length;
  }, [activeNotifications]);

  const newReportsCount = useMemo(() => {
    return activeNotifications.filter(
      (n) => n.type === 'new_report' || n.type === 'submitted'
    ).length;
  }, [activeNotifications]);

  const workOrdersCount = useMemo(() => {
    return activeNotifications.filter(
      (n) => n.type === 'work_order' || n.type === 'assignment'
    ).length;
  }, [activeNotifications]);

  const filterTabsCounts = {
    all: activeNotifications.length,
    unread: unreadCount,
    emergency: urgentCount,
    new_report: newReportsCount,
    work_order: workOrdersCount,
    archived: archivedNotifications.length,
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (!n.is_archived ? { ...n, is_read: 1 } : n))
    );

    if (typeof showToast === 'function') {
      showToast('All notifications marked as read.');
    }

    try {
      await markAllNotificationsRead(effectiveAdminId, 'admin');
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
        await markNotificationRead(notif.id, effectiveAdminId, 'admin');
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

    // Optimistic archive update
    setNotifications((prev) =>
      prev.map((n) => (n.id === targetId ? { ...n, is_archived: 1 } : n))
    );
    if (typeof showToast === 'function') {
      showToast('Notification archived.');
    }

    try {
      await archiveNotification(targetId, effectiveAdminId, 'admin');
    } catch (err) {
      console.error('Error archiving notification:', err);
    } finally {
      setIsArchivingSingle(false);
      setShowArchiveSingleModal(false);
      setItemToArchive(null);
    }
  };

  // Restore individual notification from archive
  const handleUnarchiveSingle = async (notif, e) => {
    if (e) e.stopPropagation();
    const targetId = notif.id;

    // Optimistic unarchive update
    setNotifications((prev) =>
      prev.map((n) => (n.id === targetId ? { ...n, is_archived: 0 } : n))
    );
    if (typeof showToast === 'function') {
      showToast('Notification restored from archive.');
    }

    try {
      await unarchiveNotification(targetId, effectiveAdminId, 'admin');
    } catch (err) {
      console.error('Error restoring notification:', err);
    }
  };

  // Archive all notifications
  const handleConfirmArchiveAll = async () => {
    setIsArchivingAll(true);
    try {
      await archiveAllNotifications(effectiveAdminId, 'admin');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_archived: 1 })));
      if (typeof showToast === 'function') {
        showToast('All notifications archived.');
      }
    } catch (err) {
      console.error('Error archiving all notifications:', err);
    } finally {
      setIsArchivingAll(false);
      setShowArchiveAllModal(false);
    }
  };

  // Click card or "View Report" button
  const handleOpenReport = (notif) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
      );
      markNotificationRead(notif.id, effectiveAdminId, 'admin').catch(() => {});
    }

    if (typeof onViewReport === 'function') {
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
      if (filterType === 'archived') {
        if (!item.is_archived) return false;
      } else {
        if (item.is_archived) return false;
        if (filterType === 'unread' && item.is_read) return false;
        if (filterType === 'emergency' && item.type !== 'emergency' && item.priority !== 'emergency' && item.priority !== 'high') return false;
        if (filterType === 'new_report' && item.type !== 'new_report' && item.type !== 'submitted') return false;
        if (filterType === 'work_order' && item.type !== 'work_order' && item.type !== 'assignment') return false;
      }

      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesTicket = item.ticket_number?.toLowerCase().includes(q);
        return Boolean(matchesTitle || matchesMsg || matchesLoc || matchesTicket);
      }

      return true;
    });
  }, [notifications, filterType, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, startIndex, pageSize]);

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
            id="admin-notif-archive-all-btn"
            onClick={() => setShowArchiveAllModal(true)}
            disabled={activeNotifications.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #fed7aa',
              backgroundColor: activeNotifications.length === 0 ? '#f8fafc' : '#fff7ed',
              color: activeNotifications.length === 0 ? '#cbd5e1' : '#c2410c',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: activeNotifications.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={activeNotifications.length === 0 ? 'No active notifications to archive' : 'Archive all notifications'}
          >
            <Archive size={15} />
            <span>Archive All</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="admin-stat-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">TOTAL ACTIVE NOTIFICATIONS</span>
            <span className="admin-stat-value">{activeNotifications.length}</span>
          </div>
          <div className="admin-stat-icon indigo" title="Total Active Alerts">
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
            <span className="admin-stat-value blue">{newReportsCount + workOrdersCount}</span>
          </div>
          <div className="admin-stat-icon blue" title="New Dispatches">
            <Wrench size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar: Search input, Green Search button, Category Dropdown, Upper Pagination */}
      <div className="admin-filter-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            className="admin-search-row"
            style={{ flex: '1 1 360px', maxWidth: 540, margin: 0, flexWrap: 'wrap' }}
          >
            <div className="admin-search-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search ticket, room, keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <button type="submit" className="admin-btn-black">
              Search
            </button>
            {appliedSearch && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}

            {/* Filter Symbol Button & Dropdown Menu */}
            <div className="admin-filter-dropdown-wrap" ref={filterDropdownRef}>
              <button
                type="button"
                className={`admin-filter-btn ${isFilterOpen ? 'open' : ''} ${filterType !== 'all' ? 'has-active' : ''}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-expanded={isFilterOpen}
                title="Filter alerts by category"
                id="admin-notif-filter-btn"
              >
                <Filter size={15} />
                <span className="admin-filter-btn-text">
                  {filterType === 'all'
                    ? 'Filter'
                    : (NOTIF_FILTER_OPTIONS.find((o) => o.key === filterType)?.label || 'Filter')}
                </span>
                {filterType !== 'all' && (
                  <span className="admin-filter-badge">
                    {filterTabsCounts[filterType] ?? 0}
                  </span>
                )}
                <ChevronDown size={14} className={`admin-filter-chevron ${isFilterOpen ? 'rotate' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="admin-filter-menu" role="menu">
                  <div className="admin-filter-menu-header">
                    <span>Filter by Category</span>
                    {filterType !== 'all' && (
                      <button
                        type="button"
                        className="admin-filter-reset-btn"
                        onClick={() => {
                          setFilterType('all');
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-menu-list">
                    {NOTIF_FILTER_OPTIONS.map((opt) => {
                      const isActive = filterType === opt.key;
                      const count = filterTabsCounts[opt.key] ?? 0;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`admin-filter-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setFilterType(opt.key);
                            setIsFilterOpen(false);
                            setCurrentPage(1);
                          }}
                          role="menuitem"
                        >
                          <span className="admin-filter-item-dot" style={{ backgroundColor: opt.color }} />
                          <span className="admin-filter-item-label">{opt.label}</span>
                          <span className="admin-filter-item-count">{count}</span>
                          {isActive && <Check size={14} className="admin-filter-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>
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
        ) : paginatedNotifications.length > 0 ? (
          paginatedNotifications.map((item) => {
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
                  opacity: item.is_archived ? 0.75 : 1,
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

                      {item.is_archived === 1 && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #fed7aa',
                            padding: '2px 8px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Archive size={11} />
                          Archived
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

                  {item.is_archived === 1 ? (
                    <button
                      type="button"
                      className="admin-notif-card-archive-btn"
                      onClick={(e) => handleUnarchiveSingle(item, e)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Restore notification from archive"
                    >
                      <RotateCcw size={13} />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-notif-card-archive-btn"
                      onClick={(e) => handleRequestArchiveSingle(item, e)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #fed7aa',
                        backgroundColor: '#fff7ed',
                        color: '#c2410c',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                      title="Archive notification"
                    >
                      <Archive size={14} />
                    </button>
                  )}
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
              {appliedSearch
                ? `No alerts match your search query "${appliedSearch}".`
                : filterType === 'unread'
                ? 'All caught up! There are no unread system notifications.'
                : filterType === 'archived'
                ? 'No archived notifications found.'
                : 'All clear! No alerts exist in this category right now.'}
            </p>
            {(filterType !== 'all' || appliedSearch) && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  handleClearSearch();
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

      {/* Bottom Pagination Bar */}
      <div className="admin-pagination-bar" aria-label="Notifications pagination">
        <div className="admin-pagination-info">
          <span>
            Showing {filteredNotifications.length === 0 ? 0 : startIndex + 1}–{Math.min(filteredNotifications.length, startIndex + pageSize)} of {filteredNotifications.length} alert{filteredNotifications.length === 1 ? '' : 's'}
          </span>
          <div className="admin-pagination-limit">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="admin-pagination-select"
              aria-label="Alerts per page"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="admin-pagination-btns">
          <button
            type="button"
            className="admin-page-box arrow-btn"
            disabled={currentPage <= 1 || totalPages <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {totalPages === 0 ? (
            <button type="button" className="admin-page-box active" disabled>
              1
            </button>
          ) : (
            getPageNumbers(currentPage, totalPages).map((pg, idx) =>
              pg === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="admin-page-ellipsis"
                >
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pg}`}
                  type="button"
                  className={`admin-page-box ${currentPage === pg ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pg)}
                  title={`Page ${pg}`}
                >
                  {pg}
                </button>
              )
            )
          )}

          <button
            type="button"
            className="admin-page-box arrow-btn"
            disabled={currentPage >= totalPages || totalPages <= 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
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
        isOpen={showArchiveAllModal}
        presetId="archive_notifications"
        onConfirm={handleConfirmArchiveAll}
        onCancel={() => setShowArchiveAllModal(false)}
        isLoading={isArchivingAll}
      />
    </div>
  );
}
