import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  UserCheck,
  Wrench,
  LogOut,
  User,
  Menu,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Bell,
  History,
  Archive,
  MessageSquareQuote,
} from 'lucide-react';
import { getRecommendedWorker } from '../../utils/recommendedWorker';
import {
  fetchStats,
  fetchReports,
  fetchStaff,
  fetchBuildings,
  fetchCategories,
  fetchNotifications,
  assignReport,
  updateReportStatus,
  deleteReport,
  archiveReport,
  restoreReport,
  addStaffMember,
  removeStaffMember,
  restoreStaffMember,
  addBuilding,
  updateBuilding,
  deleteBuilding,
} from '../../services/api';

import ConfirmationModal from '../common/ConfirmationModal';

import FacilitiesDashboard from './FacilitiesDashboard';
import ReportManagement from './ReportManagement';
import ReportDetails from './ReportDetails';
import MaintenanceStaff from './MaintenanceStaff';
import BuildingsAndRooms from './BuildingsAndRooms';
import UsersView from './UsersView';
import AdminNotificationsView from './AdminNotificationsView';
import HistoryLogView from './HistoryLogView';
import AdminFeedbackView from './AdminFeedbackView';
import ModalsGalleryView from '../common/ModalsGalleryView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import './admin.css';

export default function AdminDashboard({ currentUser, onNavigate, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reports' | 'report-details' | 'staff' | 'buildings' | 'users' | 'settings'
  const [returnTab, setReturnTab] = useState('reports');
  const [selectedReport, setSelectedReport] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real Database Entities
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Quick modals for table actions
  const [quickAssignModal, setQuickAssignModal] = useState(null);
  const [quickUpdateModal, setQuickUpdateModal] = useState(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [selectedNewStatus, setSelectedNewStatus] = useState('in_progress');
  const [selectedNewPriority, setSelectedNewPriority] = useState('medium');
  const [reportToArchive, setReportToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load all real data on mount
  const refreshData = async () => {
    try {
      const [statsRes, reportsRes, staffRes, buildingsRes, catRes, notifRes] = await Promise.all([
        fetchStats(),
        fetchReports({ limit: 100 }),
        fetchStaff(),
        fetchBuildings(),
        fetchCategories(),
        fetchNotifications(currentUser?.id || 1, 'admin'),
      ]);

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (reportsRes?.success && reportsRes.data) {
        setReports(reportsRes.data);
      }
      if (staffRes?.success && staffRes.data) {
        setStaff(staffRes.data);
      }
      if (buildingsRes?.success) {
        setBuildings(buildingsRes.buildings || []);
        setLocations(buildingsRes.locations || []);
      }
      if (catRes?.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (notifRes?.success && typeof notifRes.unread_count === 'number') {
        setUnreadNotifCount(notifRes.unread_count);
      }
    } catch (err) {
      console.error('Error refreshing admin dashboard data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Close mobile drawer on Escape key or desktop resize
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleNavTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // View Report in Details View
  const handleViewReport = (report, fromTab = null) => {
    setSelectedReport(report);
    if (fromTab) {
      setReturnTab(fromTab);
    } else if (activeTab !== 'report-details') {
      setReturnTab(activeTab);
    }
    setActiveTab('report-details');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Quick Assign
  const handleOpenAssign = (report) => {
    if (report.worker_id) {
      showToast('A worker is already assigned. This assignment is locked.');
      return;
    }
    setQuickAssignModal(report);
    const recWorker = getRecommendedWorker(report, staff);
    setSelectedTechnicianId(
      report.worker_id
        ? String(report.worker_id)
        : (recWorker ? String(recWorker.id) : (staff[0] ? String(staff[0].id) : ''))
    );
    setSelectedNewPriority(report.priority || 'medium');
  };

  // Submit Worker Assignment
  const handleAssignSubmit = async ({ report_id, assigned_to, priority, notes }) => {
    const res = await assignReport({
      report_id,
      assigned_to,
      priority,
      assigned_by: currentUser?.id || 1,
      expected_admin_id: currentUser?.id,
      notes,
    });

    if (res?.success) {
      showToast(res.message || 'Worker assigned successfully.');
      setQuickAssignModal(null);
      await refreshData();
      if (selectedReport && selectedReport.id === report_id) {
        setSelectedReport((prev) => ({
          ...prev,
          status: res.status || prev.status,
          priority: res.priority || priority || prev.priority,
          worker_id: assigned_to,
          worker_name: res.technician?.full_name,
        }));
      }
    } else {
      alert(res?.message || 'Failed to assign worker.');
      if (res?.error_code === 'ASSIGNMENT_LOCKED') {
        setQuickAssignModal(null);
        await refreshData();
      }
      if (['SESSION_CHANGED', 'UNAUTHENTICATED', 'FORBIDDEN'].includes(res?.error_code)) {
        onNavigate('login');
      }
    }
  };

  // Open Quick Update Status & Priority
  const handleOpenUpdate = (report) => {
    if (!report) return;
    const rawStatus = (report.status || '').toLowerCase();
    const isResolved = rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed';
    if (isResolved) {
      showToast('Status updates are locked because this report is already fixed / resolved.');
      return;
    }
    setQuickUpdateModal(report);
    setSelectedNewStatus(report.status || 'in_progress');
    setSelectedNewPriority(report.priority || 'medium');
  };

  // Submit Status & Priority Update
  const handleStatusSubmit = async ({ report_id, status, priority, remarks }) => {
    const targetReport = reports.find((r) => r.id === report_id) || quickUpdateModal || selectedReport;
    const rawStatus = (targetReport?.status || '').toLowerCase();
    if (rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed') {
      showToast('Status updates are locked because this report is already fixed / resolved.');
      return;
    }
    const res = await updateReportStatus({
      report_id,
      status,
      priority,
      remarks,
      changed_by: currentUser?.id || 1,
    });

    if (res?.success) {
      showToast(res.message || 'Report updated successfully.');
      setQuickUpdateModal(null);
      await refreshData();
      if (selectedReport && selectedReport.id === report_id) {
        setSelectedReport((prev) => ({
          ...prev,
          status,
          ...(priority ? { priority } : {}),
        }));
      }
    } else {
      alert(res?.message || 'Failed to update report.');
    }
  };

  // Archive Fixed Report Handler
  const handleRequestArchiveReport = (report) => {
    if (!report || isArchiving) return;
    const targets = Array.isArray(report) ? report : [report];
    if (targets.length === 0) return;
    if (!targets.every((r) => ['resolved', 'closed', 'fixed'].includes((r.status || '').toLowerCase()))) {
      showToast('Only fixed and resolved reports can be archived.');
      return;
    }
    setReportToArchive(targets);
  };

  const handleConfirmArchiveReport = async () => {
    if (!reportToArchive || isArchiving) return;

    setIsArchiving(true);
    try {
      const archivedIds = new Set();
      for (const report of reportToArchive) {
        try {
          const res = await archiveReport(report.id);
          if (res?.success) archivedIds.add(report.id);
        } catch (err) {
          console.error('Error archiving report:', err);
        }
      }
      const failedCount = reportToArchive.length - archivedIds.size;
      showToast(`${archivedIds.size} report${archivedIds.size === 1 ? '' : 's'} archived to History Logs.${failedCount ? ` ${failedCount} could not be archived. Please retry.` : ''}`);
      if (archivedIds.size > 0) {
        setReports((prev) => prev.filter((r) => !archivedIds.has(r.id)));
        if (selectedReport && archivedIds.has(selectedReport.id)) {
          setSelectedReport(null);
          setActiveTab(returnTab || 'reports');
        }
        refreshData();
      }
    } catch (err) {
      console.error('Error archiving report:', err);
      showToast('Error archiving report.');
    } finally {
      setIsArchiving(false);
      setReportToArchive(null);
    }
  };

  // Restore Archived Report Handler
  const handleRestoreReport = async (report) => {
    if (!report?.id) return;
    try {
      const res = await restoreReport(report.id);
      if (res?.success) {
        showToast(res.message || 'Report restored to active status successfully.');
        setSelectedReport((prev) => (prev ? { ...prev, is_archived: 0, archived_at: null } : null));
        await refreshData();
      } else {
        alert(res?.message || 'Failed to restore report.');
      }
    } catch (err) {
      console.error('Error restoring report:', err);
      showToast('Error restoring report.');
    }
  };

  // Add Staff Member directly into Database
  const handleAddStaff = async (staffData) => {
    const res = await addStaffMember(staffData);
    if (res?.success) {
      showToast(res.message || 'Personnel added successfully.');
      await refreshData();
    } else {
      alert(res?.message || res?.error || 'Failed to add staff member.');
    }
  };

  // Archive Maintenance Staff Member in Database
  const handleRemoveStaff = async (staffId, details) => {
    const res = await removeStaffMember(staffId, details);
    if (res?.success) {
      showToast(res.message || 'Staff member archived successfully.');
      await refreshData();
      return true;
    } else {
      alert(res?.message || res?.error || 'Failed to archive staff member.');
      return false;
    }
  };

  // Restore Archived Maintenance Staff Member in Database
  const handleRestoreStaff = async (staffId, staffName = 'Staff member') => {
    const res = await restoreStaffMember(staffId);
    if (res?.success) {
      showToast(res.message || `${staffName} restored to active maintenance staff.`);
      await refreshData();
      return true;
    } else {
      alert(res?.message || res?.error || 'Failed to restore staff member.');
      return false;
    }
  };

  // Add Building directly into Database
  const handleAddBuilding = async (buildingData) => {
    const res = await addBuilding(buildingData);
    if (res?.success) {
      showToast(res.message || 'Campus building added successfully.');
      await refreshData();
    } else {
      alert(res?.message || res?.error || 'Failed to register building.');
    }
  };

  // Update Building in Database
  const handleUpdateBuilding = async (id, buildingData) => {
    const res = await updateBuilding(id, buildingData);
    if (res?.success) {
      showToast(res.message || 'Campus building updated successfully.');
      await refreshData();
    } else {
      alert(res?.message || res?.error || 'Failed to update building.');
    }
    return res;
  };

  // Delete / Deactivate Building in Database
  const handleDeleteBuilding = async (id, buildingName) => {
    const res = await deleteBuilding(id);
    if (res?.success) {
      showToast(res.message || `Building '${buildingName}' removed successfully.`);
      await refreshData();
    } else {
      alert(res?.message || res?.error || 'Failed to remove building.');
    }
    return res;
  };

  const displayName = currentUser?.full_name || 'Admin User';
  const displayRole = currentUser?.role_display || 'Super Administrator';

  return (
    <div className="admin-layout">
      {/* --------------------------------------------------------------------
          Mobile Header Bar (Visible on mobile <= 900px)
          -------------------------------------------------------------------- */}
      <header className="admin-mobile-header" aria-label="Mobile Navigation Bar">
        <div className="admin-mobile-brand">
          <div className="admin-brand-icon">
            <Wrench size={18} strokeWidth={2.4} />
          </div>
          <div className="admin-brand-text-group">
            <span className="admin-brand-name">FixMyCampus</span>
            <span className="admin-brand-role-badge">
              <span className="admin-brand-role-dot" />
              Administrator
            </span>
          </div>
        </div>

        <div className="admin-mobile-actions">
          <button
            type="button"
            className="admin-header-bell-btn"
            onClick={() => handleNavTabClick('notifications')}
            title="Notifications"
            aria-label="View notifications"
            id="admin-mobile-notif-btn"
          >
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 9999,
                  lineHeight: 1.2,
                }}
              >
                {unreadNotifCount}
              </span>
            )}
          </button>

          <UserProfileDropdown
            currentUser={currentUser}
            onNavigate={onNavigate}
            onHistoryClick={() => handleNavTabClick('history-logs')}
            onSettingsClick={() => onNavigate('settings')}
            onLogout={() => setShowLogoutModal(true)}
            idPrefix="admin-mobile-profile"
          />

          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            id="admin-mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --------------------------------------------------------------------
          Sidebar Navigation (Desktop Sidebar & Mobile Drawer)
          -------------------------------------------------------------------- */}
      <aside
        className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        aria-label="Super Administrator Navigation"
      >
        {/* Brand */}
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">
            <Wrench size={18} strokeWidth={2.4} />
          </div>
          <div className="admin-brand-text-group">
            <span className="admin-brand-name">FixMyCampus</span>
            <span className="admin-brand-role-badge">
              <span className="admin-brand-role-dot" />
              Administrator
            </span>
          </div>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            className="admin-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="admin-sidebar-nav">
          {/* Section 1: Overview */}
          <div className="admin-nav-section">
            <span className="admin-nav-section-title">Overview</span>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('notifications')}
            >
              <Bell size={18} />
              <span>Notifications</span>
              {unreadNotifCount > 0 && (
                <span className="admin-nav-badge">{unreadNotifCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('feedback')}
              id="admin-nav-feedback"
            >
              <MessageSquareQuote size={18} />
              <span>Feedback</span>
            </button>
          </div>

          {/* Section 2: Management */}
          <div className="admin-nav-section">
            <span className="admin-nav-section-title">Management</span>

            <button
              type="button"
              className={`admin-nav-item ${['reports', 'report-details'].includes(activeTab) ? 'active' : ''}`}
              onClick={() => handleNavTabClick('reports')}
            >
              <FileText size={18} />
              <span>Reports</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('staff')}
            >
              <Users size={18} />
              <span>Maintenance Staff</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'buildings' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('buildings')}
            >
              <Building2 size={18} />
              <span>Buildings &amp; Rooms</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('users')}
            >
              <UserCheck size={18} />
              <span>Users</span>
            </button>
          </div>

          {/* Section 3: System */}
          <div className="admin-nav-section">
            <span className="admin-nav-section-title">System</span>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'history-logs' ? 'active' : ''}`}
              onClick={() => handleNavTabClick('history-logs')}
              id="admin-nav-history-logs"
            >
              <History size={18} />
              <span>History Logs</span>
            </button>
          </div>
        </nav>

        {/* Bottom Profile Footer */}
        <div className="admin-sidebar-footer">
          <UserProfileDropdown
            currentUser={currentUser}
            onNavigate={onNavigate}
            onHistoryClick={() => handleNavTabClick('history-logs')}
            onSettingsClick={() => onNavigate('settings')}
            onLogout={() => setShowLogoutModal(true)}
            direction="up"
            fullWidth={true}
            showSubInButton={true}
            subTitle={displayRole}
            idPrefix="admin-sidebar-profile"
          />
        </div>
      </aside>

      {/* --------------------------------------------------------------------
          Main Subview Body
          -------------------------------------------------------------------- */}
      <main className="admin-main">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: 24,
              right: 32,
              zIndex: 1000,
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            }}
          >
            <CheckCircle2 size={18} color="#22c55e" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* View 1: Facilities Dashboard (Image 1) */}
        {activeTab === 'dashboard' && (
          <FacilitiesDashboard
            stats={stats}
            recentReports={reports}
            onViewReport={handleViewReport}
            onAssignReport={handleOpenAssign}
            onArchiveReport={handleRequestArchiveReport}
            onDeleteReport={handleRequestArchiveReport}
          />
        )}

        {/* View 1.5: System Notifications */}
        {activeTab === 'notifications' && (
          <AdminNotificationsView
            reports={reports}
            onViewReport={handleViewReport}
            showToast={showToast}
            onUnreadChange={setUnreadNotifCount}
            currentUser={currentUser}
          />
        )}

        {/* View 2: Report Management (Image 2) */}
        {activeTab === 'reports' && (
          <ReportManagement
            reports={reports}
            buildings={buildings}
            categories={categories}
            onViewReport={handleViewReport}
            onAssignReport={handleOpenAssign}
            onUpdateStatus={handleOpenUpdate}
            onArchiveReport={handleRequestArchiveReport}
            onArchiveReports={handleRequestArchiveReport}
            isArchiving={isArchiving}
            onDeleteReport={handleRequestArchiveReport}
          />
        )}

        {/* View 3: Report Details (Image 3) */}
        {activeTab === 'report-details' && (
          <ReportDetails
            report={selectedReport}
            staff={staff}
            returnTab={returnTab}
            onBack={() => {
              setActiveTab(returnTab || 'reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAssignSubmit={handleAssignSubmit}
            onStatusSubmit={handleStatusSubmit}
            onArchive={handleRequestArchiveReport}
            onRestore={handleRestoreReport}
            onDelete={handleRequestArchiveReport}
            onPhotoUpdated={(repId, newUrl) => {
              setReports((prev) =>
                prev.map((r) =>
                  r.id === repId ? { ...r, image_url: newUrl, primary_photo: newUrl } : r
                )
              );
            }}
          />
        )}

        {/* View 4: Maintenance Staff (Image 4) */}
        {activeTab === 'staff' && (
          <MaintenanceStaff
            staff={staff}
            onAddStaff={handleAddStaff}
            onRemoveStaff={handleRemoveStaff}
          />
        )}

        {/* View 5: Buildings & Rooms (Image 5) */}
        {activeTab === 'buildings' && (
          <BuildingsAndRooms
            buildings={buildings}
            locations={locations}
            onAddBuilding={handleAddBuilding}
            onUpdateBuilding={handleUpdateBuilding}
            onDeleteBuilding={handleDeleteBuilding}
          />
        )}


        {/* View 7: Users */}
        {activeTab === 'users' && <UsersView />}

        {/* View 8: History Logs */}
        {activeTab === 'history-logs' && (
          <HistoryLogView
            onViewReport={(rep, fromTab) => handleViewReport(rep, fromTab || 'history-logs')}
            onRestoreReport={handleRestoreReport}
            onRestoreStaff={handleRestoreStaff}
          />
        )}

        {/* View 9: Repair Feedback & Ratings */}
        {activeTab === 'feedback' && (
          <AdminFeedbackView
            onViewReport={(rep) => handleViewReport(rep, 'feedback')}
          />
        )}

        {/* View 10: System Modals & States Gallery */}
        {activeTab === 'modals-gallery' && (
          <ModalsGalleryView onBackToDashboard={() => setActiveTab('dashboard')} />
        )}
      </main>

      {/* --------------------------------------------------------------------
          Quick Assign Worker Modal (Triggered from tables)
          -------------------------------------------------------------------- */}
      {quickAssignModal && (() => {
        const recommended = getRecommendedWorker(quickAssignModal, staff);
        return (
          <div
            className="admin-modal-backdrop"
            onClick={() => setQuickAssignModal(null)}
          >
            <div
              className="admin-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div>
                  <h3 className="admin-modal-title">Assign Maintenance Worker</h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                    Ticket: {quickAssignModal.ticket_number || `FM-${quickAssignModal.id}`} &bull; {quickAssignModal.title}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setQuickAssignModal(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedTechnicianId) return;
                  handleAssignSubmit({
                    report_id: quickAssignModal.id,
                    assigned_to: Number(selectedTechnicianId),
                    priority: selectedNewPriority,
                  });
                }}
              >
                <div className="admin-form-group">
                  <label className="admin-form-label">Select Staff Member</label>
                  <select
                    className="admin-select-input"
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  >
                    <option value="">-- Choose maintenance personnel --</option>
                    {staff.map((m) => {
                      const isRec = recommended && String(recommended.id) === String(m.id);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.full_name}{isRec ? ' (Recommended)' : ''}{m.department ? ` (${m.department})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Priority Level (Admin Decision)</label>
                  <select
                    className="admin-select-input"
                    value={selectedNewPriority}
                    onChange={(e) => setSelectedNewPriority(e.target.value)}
                    id="admin-quick-assign-priority-select"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="emergency">Urgent / Emergency</option>
                  </select>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setQuickAssignModal(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="admin-btn-black">
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --------------------------------------------------------------------
          Quick Update Status & Priority Modal (Triggered from tables)
          -------------------------------------------------------------------- */}
      {quickUpdateModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setQuickUpdateModal(null)}
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">Update Status & Priority</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                  Ticket: {quickUpdateModal.ticket_number || `FM-${quickUpdateModal.id}`} &bull; {quickUpdateModal.title}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setQuickUpdateModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStatusSubmit({
                  report_id: quickUpdateModal.id,
                  status: selectedNewStatus,
                  priority: selectedNewPriority,
                });
              }}
            >
              <div className="admin-form-group">
                <label className="admin-form-label">Priority Level</label>
                <select
                  className="admin-select-input"
                  value={selectedNewPriority}
                  onChange={(e) => setSelectedNewPriority(e.target.value)}
                  id="admin-modal-priority-select"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="emergency">Urgent / Emergency</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Select New Status</label>
                <select
                  className="admin-select-input"
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  id="admin-modal-status-select"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Fixed / Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setQuickUpdateModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-black">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Fixed Report Confirmation Modal */}
      {reportToArchive && (
        <ConfirmationModal
          isOpen={Boolean(reportToArchive)}
          presetId="archive_report"
          title={reportToArchive.length === 1 ? 'Archive Fixed Report?' : `Archive ${reportToArchive.length} Reports?`}
          message={reportToArchive.length === 1
            ? `Archive report #${reportToArchive[0].ticket_number || reportToArchive[0].id} ("${reportToArchive[0].title}")? It will be stored in History Logs and removed from active defect lists.`
            : `Archive these ${reportToArchive.length} selected reports? They will be stored in History Logs and removed from active defect lists.`}
          confirmText={reportToArchive.length === 1 ? 'Yes, Archive Report' : 'Yes, Archive Reports'}
          cancelText="Cancel"
          loading={isArchiving}
          onClose={() => {
            if (!isArchiving) setReportToArchive(null);
          }}
          onConfirm={handleConfirmArchiveReport}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ConfirmationModal
          isOpen={showLogoutModal}
          presetId="logout"
          title="Logout?"
          message="Are you sure you want to log out of FixMyCampus?"
          confirmText="Log out"
          confirmClass="modal-btn-danger"
          cancelText="Cancel"
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            if (onLogout) onLogout();
          }}
        />
      )}
    </div>
  );
}
