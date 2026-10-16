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
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { fetchStaffStats } from '../../services/api';

export default function MaintenanceStaff({ staff = [], onAddStaff }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('3'); // 3 = technician
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee Stats Modal State
  const [selectedStaffForStats, setSelectedStaffForStats] = useState(null);
  const [staffStatsLoading, setStaffStatsLoading] = useState(false);
  const [staffStatsData, setStaffStatsData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email) return;

    setIsSubmitting(true);
    await onAddStaff({
      full_name: fullName,
      email,
      department: department || 'General Maintenance',
      phone_number: phone,
      role_id: Number(roleId),
    });
    setIsSubmitting(false);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setDepartment('');
    setPhone('');
  };

  const handleOpenStats = async (member) => {
    setSelectedStaffForStats(member);
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

      {/* Staff Grid */}
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
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenStats(member)}
              title={`Click to view performance statistics for ${member.full_name}`}
            >
              <div className="admin-staff-card-top">
                <div className="admin-staff-profile">
                  <div className="admin-staff-avatar">{initials}</div>
                  <div>
                    <h3 className="admin-staff-name">{member.full_name}</h3>
                    <p className="admin-staff-spec">
                      {member.department || 'Physical Plant'}
                    </p>
                  </div>
                </div>

                {/* View Stats Button (Replaces removed 'Available' badge as requested) */}
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
              </div>

              <div
                className="admin-staff-card-bottom"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
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

      {/* --------------------------------------------------------------------
          EMPLOYEE STATS & WORKLOAD MODAL
          -------------------------------------------------------------------- */}
      {selectedStaffForStats && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedStaffForStats(null)}
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#475569',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} style={{ color: '#059669' }} />
                <span>{selectedStaffForStats.email || 'No email on record'}</span>
              </div>
              {selectedStaffForStats.phone_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={14} style={{ color: '#059669' }} />
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {/* Card 1: Total Assigned */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.85rem 0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Total Assigned
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                      {staffStatsData?.metrics?.total_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 2: Active Workload */}
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '0.85rem 0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
                      Active Jobs
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1e40af', marginTop: '0.2rem' }}>
                      {staffStatsData?.metrics?.active_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 3: In Progress */}
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '0.85rem 0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                      In Progress
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#b45309', marginTop: '0.2rem' }}>
                      {staffStatsData?.metrics?.in_progress_jobs ?? 0}
                    </div>
                  </div>

                  {/* Card 4: Completed */}
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '10px',
                      padding: '0.85rem 0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#065f46', textTransform: 'uppercase' }}>
                      Completed
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
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
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      {staffStatsData.jobs.map((job) => (
                        <div
                          key={job.assignment_id || job.report_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {job.ticket_number || `FM-${job.report_id}`}
                              </span>
                              <span style={{ color: '#64748b' }}>&bull;</span>
                              <span style={{ fontWeight: 500, color: '#334155' }}>
                                {job.title}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                              {job.building_name} &bull; {job.location_name || 'Campus Grounds'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
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
            <div className="admin-modal-footer" style={{ marginTop: '1.5rem' }}>
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
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Add Staff Member</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowAddModal(false)}
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
                  placeholder="e.g. worker.juan@fixmycampus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Department / Specialization</label>
                <input
                  type="text"
                  className="admin-select-input"
                  placeholder="e.g. Electrical, HVAC, Plumbing, Carpentry"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
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

              <div className="admin-form-group">
                <label className="admin-form-label">Role</label>
                <select
                  className="admin-select-input"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="3">Maintenance Technician</option>
                  <option value="2">Maintenance Staff</option>
                </select>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
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
    </div>
  );
}
