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
  X,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchStats,
  fetchReports,
  fetchStaff,
  fetchBuildings,
  fetchCategories,
  assignReport,
  updateReportStatus,
  addStaffMember,
  addBuilding,
} from '../../services/api';

import FacilitiesDashboard from './FacilitiesDashboard';
import ReportManagement from './ReportManagement';
import ReportDetails from './ReportDetails';
import MaintenanceStaff from './MaintenanceStaff';
import BuildingsAndRooms from './BuildingsAndRooms';
import AnalyticsView from './AnalyticsView';
import UsersView from './UsersView';
import AdminSettings from './AdminSettings';
import ModalsGalleryView from '../common/ModalsGalleryView';
import UserProfileDropdown from '../common/UserProfileDropdown';
import './admin.css';

export default function AdminDashboard({ currentUser, onNavigate, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reports' | 'report-details' | 'staff' | 'buildings' | 'analytics' | 'users' | 'settings'
  const [selectedReport, setSelectedReport] = useState(null);

  // Real Database Entities
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Quick modals for table actions
  const [quickAssignModal, setQuickAssignModal] = useState(null);
  const [quickUpdateModal, setQuickUpdateModal] = useState(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [selectedNewStatus, setSelectedNewStatus] = useState('in_progress');

  // Load all real data on mount
  const refreshData = async () => {
    try {
      const [statsRes, reportsRes, staffRes, buildingsRes, catRes] = await Promise.all([
        fetchStats(),
        fetchReports({ limit: 100 }),
        fetchStaff(),
        fetchBuildings(),
        fetchCategories(),
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
    } catch (err) {
      console.error('Error refreshing admin dashboard data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // View Report in Details View
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setActiveTab('report-details');
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

  // Add Staff Member directly into Database
  const handleAddStaff = async (staffData) => {
    const res = await addStaffMember(staffData);
    if (res?.success) {
      showToast(res.message || 'Personnel added successfully.');
      await refreshData();
    } else {
      alert(res?.message || 'Failed to add staff member.');
    }
  };

  // Add Building directly into Database
  const handleAddBuilding = async (buildingData) => {
    const res = await addBuilding(buildingData);
    if (res?.success) {
      showToast(res.message || 'Campus building added successfully.');
      await refreshData();
    } else {
      alert(res?.message || 'Failed to register building.');
    }
  };

  const displayName = currentUser?.full_name || 'Admin User';
  const displayRole = currentUser?.role_display || 'Super Administrator';

  return (
    <div className="admin-layout">
      {/* --------------------------------------------------------------------
          Sidebar Navigation (Matches Image 1-5 Left Nav)
          -------------------------------------------------------------------- */}
      <aside className="admin-sidebar" aria-label="Super Administrator Navigation">
        {/* Brand */}
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">
            <Wrench size={18} strokeWidth={2.4} />
          </div>
          <span className="admin-brand-name">FixMyCampus</span>
        </div>

        {/* Nav Items */}
        <nav className="admin-sidebar-nav">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${['reports', 'report-details'].includes(activeTab) ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={18} />
            <span>Reports</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Users size={18} />
            <span>Maintenance Staff</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'buildings' ? 'active' : ''}`}
            onClick={() => setActiveTab('buildings')}
          >
            <Building2 size={18} />
            <span>Buildings &amp; Rooms</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={18} />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UserCheck size={18} />
            <span>Users</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
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
            onSettingsClick={() => setActiveTab('settings')}
            onLogout={onLogout}
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
    </div>
  );
}
