import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  BarChart2,
  UserCheck,
  Settings,
  Wrench,
  LogOut,
  User,
  Menu,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';
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
  addStaffMember,
  addBuilding,
} from '../../services/api';

import ConfirmationModal from '../common/ConfirmationModal';

import FacilitiesDashboard from './FacilitiesDashboard';
import ReportManagement from './ReportManagement';
import ReportDetails from './ReportDetails';
import MaintenanceStaff from './MaintenanceStaff';
import BuildingsAndRooms from './BuildingsAndRooms';
import AnalyticsView from './AnalyticsView';
import UsersView from './UsersView';
import AdminSettings from './AdminSettings';
import AdminNotificationsView from './AdminNotificationsView';
import ModalsGalleryView from '../common/ModalsGalleryView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import './admin.css';

export default function AdminDashboard({ currentUser, onNavigate, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reports' | 'report-details' | 'staff' | 'buildings' | 'analytics' | 'users' | 'settings'
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
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
        fetchNotifications(),
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
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setActiveTab('report-details');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Quick Assign
  const handleOpenAssign = (report) => {
    setQuickAssignModal(report);
    setSelectedTechnicianId(report.worker_id ? String(report.worker_id) : (staff[0] ? String(staff[0].id) : ''));
  };

  // Submit Worker Assignment
  const handleAssignSubmit = async ({ report_id, assigned_to, notes }) => {
    const res = await assignReport({
      report_id,
      assigned_to,
      assigned_by: currentUser?.id || 1,
      notes,
    });

    if (res?.success) {
      showToast(res.message || 'Worker assigned successfully.');
      setQuickAssignModal(null);
      await refreshData();
      if (selectedReport && selectedReport.id === report_id) {
        setSelectedReport((prev) => ({
          ...prev,
          status: 'assigned',
          worker_id: assigned_to,
          worker_name: res.technician?.full_name,
        }));
      }
    } else {
      alert(res?.message || 'Failed to assign worker.');
    }
  };

  // Open Quick Update Status
  const handleOpenUpdate = (report) => {
    setQuickUpdateModal(report);
    setSelectedNewStatus(report.status || 'in_progress');
  };

  // Submit Status Update
  const handleStatusSubmit = async ({ report_id, status, remarks }) => {
    const res = await updateReportStatus({
      report_id,
      status,
      remarks,
      changed_by: currentUser?.id || 1,
    });

    if (res?.success) {
      showToast(res.message || 'Report status updated successfully.');
      setQuickUpdateModal(null);
      await refreshData();
      if (selectedReport && selectedReport.id === report_id) {
        setSelectedReport((prev) => ({ ...prev, status }));
      }
    } else {
      alert(res?.message || 'Failed to update report status.');
    }
  };

  // Delete Fixed Report Handler
  const handleRequestDeleteReport = (report) => {
    if (!report) return;
    const rawStatus = (report.status || '').toLowerCase();
    const isFixed = rawStatus === 'resolved' || rawStatus === 'closed' || rawStatus === 'fixed';
    if (!isFixed) {
      showToast('Only fixed and resolved reports can be deleted from the database.');
      return;
    }
    setReportToDelete(report);
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;
    const targetId = reportToDelete.id;

    setIsDeleting(true);
    try {
      const res = await deleteReport(targetId);
      if (res?.success) {
        showToast(`Report #${reportToDelete.ticket_number || targetId} deleted from database.`);
        setReports((prev) => prev.filter((r) => r.id !== targetId));
        if (selectedReport?.id === targetId) {
          setSelectedReport(null);
          setActiveTab('reports');
        }
        refreshData();
      } else {
        showToast(res?.message || 'Failed to delete report.');
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      showToast('Error deleting report from database.');
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
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
          <span className="admin-brand-name">FixMyCampus</span>
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
            onSettingsClick={() => handleNavTabClick('settings')}
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
          <span className="admin-brand-name">FixMyCampus</span>

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
            className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavTabClick('analytics')}
          >
            <BarChart2 size={18} />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleNavTabClick('users')}
          >
            <UserCheck size={18} />
            <span>Users</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavTabClick('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'modals-gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('modals-gallery')}
          >
            <SlidersHorizontal size={18} />
            <span>Modals &amp; States (7)</span>
          </button>
        </nav>

        {/* Bottom Profile Footer */}
        <div className="admin-sidebar-footer">
          <UserProfileDropdown
            currentUser={currentUser}
            onNavigate={onNavigate}
            onSettingsClick={() => handleNavTabClick('settings')}
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
            onDeleteReport={handleRequestDeleteReport}
          />
        )}

        {/* View 1.5: System Notifications */}
        {activeTab === 'notifications' && (
          <AdminNotificationsView
            reports={reports}
            onViewReport={handleViewReport}
            showToast={showToast}
            onUnreadChange={setUnreadNotifCount}
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
            onDeleteReport={handleRequestDeleteReport}
          />
        )}

        {/* View 3: Report Details (Image 3) */}
        {activeTab === 'report-details' && (
          <ReportDetails
            report={selectedReport}
            staff={staff}
            onBack={() => setActiveTab('reports')}
            onAssignSubmit={handleAssignSubmit}
            onStatusSubmit={handleStatusSubmit}
            onDelete={handleRequestDeleteReport}
          />
        )}

        {/* View 4: Maintenance Staff (Image 4) */}
        {activeTab === 'staff' && (
          <MaintenanceStaff
            staff={staff}
            onAddStaff={handleAddStaff}
          />
        )}

        {/* View 5: Buildings & Rooms (Image 5) */}
        {activeTab === 'buildings' && (
          <BuildingsAndRooms
            buildings={buildings}
            locations={locations}
            onAddBuilding={handleAddBuilding}
          />
        )}

        {/* View 6: Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsView stats={stats} reports={reports} />
        )}

        {/* View 7: Users */}
        {activeTab === 'users' && <UsersView />}

        {/* View 8: Settings */}
        {activeTab === 'settings' && <AdminSettings />}

        {/* View 9: System Modals & States Gallery */}
        {activeTab === 'modals-gallery' && (
          <ModalsGalleryView onBackToDashboard={() => setActiveTab('dashboard')} />
        )}
      </main>

      {/* --------------------------------------------------------------------
          Quick Assign Worker Modal (Triggered from tables)
          -------------------------------------------------------------------- */}
      {quickAssignModal && (
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
                  {staff.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.department})
                    </option>
                  ))}
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
      )}

      {/* --------------------------------------------------------------------
          Quick Update Status Modal (Triggered from tables)
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
                <h3 className="admin-modal-title">Update Report Status</h3>
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
                });
              }}
            >
              <div className="admin-form-group">
                <label className="admin-form-label">Select New Status</label>
                <select
                  className="admin-select-input"
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
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
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Fixed Report Confirmation Modal */}
      {reportToDelete && (
        <ConfirmationModal
          isOpen={Boolean(reportToDelete)}
          presetId="delete_report"
          title="Delete Fixed Report?"
          message={`Are you sure you want to permanently delete report #${reportToDelete.ticket_number || reportToDelete.id} ("${reportToDelete.title}") from the database? This action will remove the record to keep your database tidy and cannot be undone.`}
          confirmText="Yes, Delete Report"
          cancelText="Cancel"
          loading={isDeleting}
          onClose={() => {
            if (!isDeleting) setReportToDelete(null);
          }}
          onConfirm={handleConfirmDeleteReport}
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
