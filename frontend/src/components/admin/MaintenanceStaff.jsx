import React, { useState } from 'react';
import {
  Plus,
  User,
  X,
  BarChart2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  Mail,
  Phone,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
  Archive,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { fetchStaffStats } from '../../services/api';

export default function MaintenanceStaff({ staff = [], onAddStaff, onRemoveStaff }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee Stats Modal State
  const [selectedStaffForStats, setSelectedStaffForStats] = useState(null);
  const [staffStatsLoading, setStaffStatsLoading] = useState(false);
  const [staffStatsData, setStaffStatsData] = useState(null);
  const [modalJobsPage, setModalJobsPage] = useState(1);
  const modalJobsPageSize = 4;

  // Deletion / Removal Modal State
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('Resignation');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = (member) => {
    setStaffToDelete(member);
    setDeleteReason('Resignation');
    setDeleteNotes('');
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete || !onRemoveStaff) return;
    setIsDeleting(true);
    try {
      const ok = await onRemoveStaff(staffToDelete.id, {
        reason: deleteReason,
        notes: deleteNotes,
      });
      if (ok) {
        setStaffToDelete(null);
        setDeleteNotes('');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const resolvedDept =
      selectedDepartment === 'Others'
        ? (customDepartment.trim() || 'General Maintenance')
        : (selectedDepartment || 'General Maintenance');

    setIsSubmitting(true);
    await onAddStaff({
      full_name: fullName,
      email,
      department: resolvedDept,
      phone_number: phone,
      role_id: 3,
    });
    setIsSubmitting(false);
    handleCloseAddModal();
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setSelectedDepartment('');
    setCustomDepartment('');
    setPhone('');
  };

  const handleOpenStats = async (member) => {
    setSelectedStaffForStats(member);
    setModalJobsPage(1);
    setStaffStatsLoading(true);
    setStaffStatsData(null);

    try {
      const res = await fetchStaffStats(member.id);
      if (res?.success) {
        setStaffStatsData(res);
      } else {
        // Fallback to local member metrics if API call fails
        setStaffStatsData({
          staff: member,
          jobs: [],
          metrics: {
            total_jobs: member.total_jobs ?? (member.active_jobs + member.completed_jobs),
            active_jobs: member.active_jobs ?? 0,
            in_progress_jobs: member.in_progress_jobs ?? 0,
            pending_jobs: member.pending_jobs ?? 0,
            completed_jobs: member.completed_jobs ?? 0,
            completion_rate: member.completion_rate ?? 0,
          },
        });
      }
    } catch (err) {
      console.error('Error loading employee stats:', err);
      setStaffStatsData({
        staff: member,
        jobs: [],
        metrics: {
          total_jobs: member.total_jobs ?? (member.active_jobs + member.completed_jobs),
          active_jobs: member.active_jobs ?? 0,
          in_progress_jobs: member.in_progress_jobs ?? 0,
          pending_jobs: member.pending_jobs ?? 0,
          completed_jobs: member.completed_jobs ?? 0,
          completion_rate: member.completion_rate ?? 0,
        },
      });
    } finally {
      setStaffStatsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Maintenance Staff</h1>
          <p className="admin-header-subtitle">
            Manage and assign tasks to facilities personnel.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-black"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Staff Member
        </button>
      </div>

      {/* Staff Grid or Empty State */}
      {staff.length === 0 ? (
        <div className="admin-staff-empty-state">
          <div className="admin-staff-empty-icon">
            <User size={28} strokeWidth={2} />
          </div>
          <h3 className="admin-staff-empty-title">No Maintenance Personnel Registered</h3>
          <p className="admin-staff-empty-desc">
            Add maintenance workers and technicians to start assigning repair and maintenance tasks across campus buildings.
          </p>
          <button
            type="button"
            className="admin-btn-black"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="admin-staff-grid">
          {staff.map((member) => {
            // Initials
            const initials = member.full_name
              ? member.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
              : 'MC';

            const totalAssigned =
              member.total_jobs ??
              ((member.active_jobs ?? 0) + (member.completed_jobs ?? 0));

            return (
              <div
                key={member.id}
                className="admin-staff-card"
                onClick={() => handleOpenStats(member)}
                title={`Click to view performance statistics for ${member.full_name}`}
              >
                <div className="admin-staff-card-top">
                  <div className="admin-staff-profile">
                    <div className="admin-staff-avatar">{initials}</div>
                    <div className="admin-staff-info">
                      <h3 className="admin-staff-name" title={member.full_name}>
                        {member.full_name}
                      </h3>
                      <p className="admin-staff-spec" title={member.department || 'Physical Plant'}>
                        {member.department || 'Physical Plant'}
                      </p>
                    </div>
                  </div>

                  <div className="admin-staff-actions">
                    {/* View Stats Button */}
                    <button
                      type="button"
                      className="admin-staff-view-stats-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStats(member);
                      }}
                      title={`View stats for ${member.full_name}`}
                    >
                      <BarChart2 size={13} />
                      <span>View Stats</span>
                    </button>

                    {/* Archive Staff Button */}
                    {onRemoveStaff && (
                      <button
                        type="button"
                        className="admin-staff-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteModal(member);
                        }}
                        title={`Archive ${member.full_name}`}
                        aria-label={`Archive ${member.full_name}`}
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-staff-card-bottom">
                  <div className="admin-staff-stat-col">
                    <span className="admin-staff-stat-label">ACTIVE JOBS</span>
                    <span className="admin-staff-stat-num">
                      {member.active_jobs ?? 0}
                    </span>
                  </div>

                  <div className="admin-staff-stat-col">
                    <span className="admin-staff-stat-label">COMPLETED</span>
                    <span className="admin-staff-stat-num" style={{ color: '#059669' }}>
                      {member.completed_jobs ?? 0}
                    </span>
                  </div>

                  <div className="admin-staff-stat-col">
                    <span className="admin-staff-stat-label">TOTAL ASSIGNED</span>
                    <span className="admin-staff-stat-num">
                      {totalAssigned}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------
          EMPLOYEE STATS & WORKLOAD MODAL
          -------------------------------------------------------------------- */}
      {selectedStaffForStats && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedStaffForStats(null)}
        >
          <div
            className="admin-modal-dialog admin-staff-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="admin-modal-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#065f46',
                    flexShrink: 0,
                  }}
                >
                  {selectedStaffForStats.full_name
                    ? selectedStaffForStats.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                    : 'MC'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 className="admin-modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                      {selectedStaffForStats.full_name}
                    </h3>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {selectedStaffForStats.user_identifier || 'STAFF'}
                    </span>
                  </div>

                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    {selectedStaffForStats.department || 'General Maintenance'} &bull;{' '}
                    {selectedStaffForStats.role_display || 'Maintenance Personnel'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedStaffForStats(null)}
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contact Details Quick Pill */}
            <div className="admin-staff-contact-pill">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} style={{ color: '#059669', flexShrink: 0 }} />
                <span>{selectedStaffForStats.email || 'No email on record'}</span>
              </div>
              {selectedStaffForStats.phone_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={14} style={{ color: '#059669', flexShrink: 0 }} />
                  <span>{selectedStaffForStats.phone_number}</span>
                </div>
              )}
            </div>

            {/* Loading Indicator or Stats Grid */}
            {staffStatsLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#64748b' }}>
                <div
                  style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#059669',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '0.75rem',
                  }}
                />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading personnel statistics...</p>
              </div>
            ) : (
              <>
                {/* 4 KPI Metrics Strip */}
                <div className="admin-staff-kpi-grid">
                  {/* Card 1: Total Assigned */}
                  <div className="admin-staff-kpi-card">
                    <div className="admin-staff-kpi-label">
                      Total Assigned
                    </div>
                    <div className="admin-staff-kpi-val">
                      {staffStatsData?.metrics?.total_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 2: Active Workload */}
                  <div className="admin-staff-kpi-card kpi-active">
                    <div className="admin-staff-kpi-label">
                      Active Jobs
                    </div>
                    <div className="admin-staff-kpi-val">
                      {staffStatsData?.metrics?.active_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 3: In Progress */}
                  <div className="admin-staff-kpi-card kpi-progress">
                    <div className="admin-staff-kpi-label">
                      In Progress
                    </div>
                    <div className="admin-staff-kpi-val">
                      {staffStatsData?.metrics?.in_progress_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 4: Completed */}
                  <div className="admin-staff-kpi-card kpi-completed">
                    <div className="admin-staff-kpi-label">
                      Completed
                    </div>
                    <div className="admin-staff-kpi-val">
                      {staffStatsData?.metrics?.completed_jobs ?? 0}
                    </div>
                  </div>
                </div>

                {/* Completion Rate Progress Bar */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                      <TrendingUp size={15} style={{ color: '#059669' }} />
                      <span>Task Completion Rate</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                      {staffStatsData?.metrics?.completion_rate ?? 0}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: '#e2e8f0',
                      borderRadius: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, staffStatsData?.metrics?.completion_rate ?? 0)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        borderRadius: '6px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Assigned Maintenance Tasks History */}
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
                    Assigned Defect &amp; Maintenance Tickets ({staffStatsData?.jobs?.length || 0})
                  </h4>

                  {staffStatsData?.jobs && staffStatsData.jobs.length > 0 ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          minHeight: '120px',
                        }}
                      >
                        {staffStatsData.jobs
                          .slice((modalJobsPage - 1) * modalJobsPageSize, modalJobsPage * modalJobsPageSize)
                          .map((job) => (
                            <div
                              key={job.assignment_id || job.report_id}
                              className="admin-staff-ticket-row"
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {job.ticket_number || `FM-${job.report_id}`}
                                  </span>
                                  <span style={{ color: '#64748b' }}>&bull;</span>
                                  <span style={{ fontWeight: 500, color: '#334155', wordBreak: 'break-word' }}>
                                    {job.title}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                  {job.building_name} &bull; {job.location_name || 'Campus Grounds'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <span
                                  style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    whiteSpace: 'nowrap',
                                    background:
                                      job.assignment_status === 'completed'
                                        ? '#ecfdf5'
                                        : job.assignment_status === 'in_progress'
                                          ? '#fffbeb'
                                          : '#f1f5f9',
                                    color:
                                      job.assignment_status === 'completed'
                                        ? '#065f46'
                                        : job.assignment_status === 'in_progress'
                                          ? '#92400e'
                                          : '#475569',
                                  }}
                                >
                                  {(job.assignment_status || 'pending').replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Pagination Controls for Assigned Defect & Maintenance Tickets */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '0.75rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #f1f5f9',
                          fontSize: '0.75rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          Showing {(modalJobsPage - 1) * modalJobsPageSize + 1}–
                          {Math.min(staffStatsData.jobs.length, modalJobsPage * modalJobsPageSize)} of{' '}
                          {staffStatsData.jobs.length} jobs
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            disabled={modalJobsPage <= 1}
                            onClick={() => setModalJobsPage((p) => Math.max(1, p - 1))}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #e2e8f0',
                              background: modalJobsPage <= 1 ? '#f8fafc' : '#ffffff',
                              color: modalJobsPage <= 1 ? '#94a3b8' : '#334155',
                              cursor: modalJobsPage <= 1 ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <ChevronLeft size={13} /> Prev
                          </button>
                          <span style={{ fontWeight: 600, padding: '0 4px' }}>
                            {modalJobsPage} / {Math.max(1, Math.ceil(staffStatsData.jobs.length / modalJobsPageSize))}
                          </span>
                          <button
                            type="button"
                            disabled={modalJobsPage >= Math.ceil(staffStatsData.jobs.length / modalJobsPageSize)}
                            onClick={() =>
                              setModalJobsPage((p) =>
                                Math.min(Math.ceil(staffStatsData.jobs.length / modalJobsPageSize), p + 1)
                              )
                            }
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #e2e8f0',
                              background:
                                modalJobsPage >= Math.ceil(staffStatsData.jobs.length / modalJobsPageSize)
                                  ? '#f8fafc'
                                  : '#ffffff',
                              color:
                                modalJobsPage >= Math.ceil(staffStatsData.jobs.length / modalJobsPageSize)
                                  ? '#94a3b8'
                                  : '#334155',
                              cursor:
                                modalJobsPage >= Math.ceil(staffStatsData.jobs.length / modalJobsPageSize)
                                  ? 'not-allowed'
                                  : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            Next <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <Briefcase size={22} style={{ color: '#94a3b8', marginBottom: '0.35rem', display: 'inline-block' }} />
                      <p style={{ margin: 0 }}>No maintenance tickets currently assigned to this personnel.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="admin-modal-footer admin-staff-modal-footer">
              {onRemoveStaff && (
                <button
                  type="button"
                  className="admin-staff-modal-remove-btn"
                  onClick={() => {
                    const target = staffStatsData?.staff || selectedStaffForStats;
                    setSelectedStaffForStats(null);
                    handleOpenDeleteModal(target);
                  }}
                  title="Archive this staff member to History Logs"
                >
                  <Archive size={14} />
                  <span>Archive Staff Member</span>
                </button>
              )}

              <button
                type="button"
                className="admin-btn-black"
                onClick={() => setSelectedStaffForStats(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          ADD STAFF MEMBER MODAL
          -------------------------------------------------------------------- */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={handleCloseAddModal}>
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Add Staff Member</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={handleCloseAddModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label className="admin-form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Institutional Email *</label>
                <input
                  type="email"
                  required
                  className="admin-select-input"
                  placeholder="e.g. worker.juan@phinmaed.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Department / Specialization *</label>
                <select
                  className="admin-select-input"
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    if (e.target.value !== 'Others') {
                      setCustomDepartment('');
                    }
                  }}
                  required
                >
                  <option value="">Select Specialization / Role</option>
                  <option value="Electrical">Electrical (Lighting, Wiring, Power)</option>
                  <option value="HVAC / Air Conditioning">HVAC / Air Conditioning (Cooling & Ventilation)</option>
                  <option value="Plumbing">Plumbing (Water Systems, Restroom & Drainage)</option>
                  <option value="Carpentry & Woodwork">Carpentry & Woodwork (Furniture, Doors & Locks)</option>
                  <option value="Painting & Masonry">Painting & Masonry (Walls, Floors & Finishes)</option>
                  <option value="Audio-Visual & Classroom Tech">Audio-Visual & Classroom Tech (Projectors, Sounds)</option>
                  <option value="Network & Telecommunications">Network & Telecommunications (Wi-Fi & Cabling)</option>
                  <option value="Janitorial & Sanitation">Janitorial & Sanitation (Cleaning & Waste)</option>
                  <option value="Grounds & Landscaping">Grounds & Landscaping (Campus Grounds)</option>
                  <option value="General Maintenance">General Maintenance (Physical Plant)</option>
                  <option value="Others">Others</option>
                </select>

                {selectedDepartment === 'Others' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      required
                      className="admin-select-input"
                      placeholder="Please specify role / specialization..."
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Phone Number</label>
                <input
                  type="text"
                  className="admin-select-input"
                  placeholder="e.g. +63 912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleCloseAddModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-black"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Personnel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          ARCHIVE MAINTENANCE STAFF MODAL
          -------------------------------------------------------------------- */}
      {staffToDelete && (
        <div
          className="admin-modal-backdrop"
          onClick={() => {
            if (!isDeleting) setStaffToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="admin-modal-header" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                    flexShrink: 0,
                  }}
                >
                  <Archive size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="admin-modal-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                    Archive Maintenance Staff
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                    Archive worker to History Logs (can be restored when they return)
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => {
                  if (!isDeleting) setStaffToDelete(null);
                }}
                disabled={isDeleting}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              <div style={{ padding: '4px 0 16px 0' }}>
                {/* Staff Member Info Banner */}
                <div className="admin-staff-delete-banner">
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#334155',
                      fontSize: '0.95rem',
                      flexShrink: 0,
                    }}
                  >
                    {staffToDelete.full_name
                      ? staffToDelete.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                      : 'MC'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                        {staffToDelete.full_name}
                      </span>
                      {staffToDelete.user_identifier && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontWeight: 600,
                          }}
                        >
                          {staffToDelete.user_identifier}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      {staffToDelete.department || 'General Maintenance'} · {staffToDelete.email}
                    </p>
                  </div>
                </div>

                {/* Work Order Warning Callout if active jobs */}
                {staffToDelete.active_jobs > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      fontSize: '0.83rem',
                      color: '#92400e',
                      lineHeight: '1.45',
                    }}
                  >
                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>{staffToDelete.active_jobs} Active Work Order(s) Assigned:</strong>
                      <p style={{ margin: '4px 0 0 0' }}>
                        Archiving this personnel will automatically unassign their active repair tickets and return them to
                        {' '}<em>Under Review</em> so they can be reassigned to other workers.
                      </p>
                    </div>
                  </div>
                )}

                {/* Reason Selection */}
                <div className="admin-form-group">
                  <label className="admin-form-label" style={{ fontWeight: 600 }}>
                    Circumstance / Reason for Archiving *
                  </label>
                  <select
                    className="admin-select-input"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                  >
                    <option value="Resignation">Staff Resignation (Notice Tendered)</option>
                    <option value="On Leave / Temporary Absence">On Leave / Temporary Absence</option>
                    <option value="End of Contract">Contract Concluded / End of Term</option>
                    <option value="Transferred">Transferred to Another Department / Branch</option>
                    <option value="Disciplinary Action">Administrative / Disciplinary Circumstances</option>
                    <option value="Other">Other Operational Circumstances</option>
                  </select>
                </div>

                {/* Optional Notes */}
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label className="admin-form-label">
                    Additional Notes / Handover Remarks (Optional)
                  </label>
                  <textarea
                    className="admin-select-input"
                    rows={3}
                    placeholder="e.g. Effective immediately; can be restored from History Logs upon return."
                    value={deleteNotes}
                    onChange={(e) => setDeleteNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div
                className="admin-modal-footer"
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setStaffToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-danger"
                  disabled={isDeleting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#d97706',
                    borderColor: '#d97706',
                    color: '#ffffff',
                  }}
                >
                  <Archive size={15} />
                  <span>{isDeleting ? 'Archiving Staff...' : 'Confirm & Archive Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
