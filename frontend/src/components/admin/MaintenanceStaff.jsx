import React, { useState } from 'react';
import { Plus, User, X } from 'lucide-react';

export default function MaintenanceStaff({ staff = [], onAddStaff }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('3'); // 3 = technician
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          const availClass = (member.availability || 'Available')
            .toLowerCase()
            .replace(' ', '-');

          // Initials
          const initials = member.full_name
            ? member.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
            : 'MC';

          return (
            <div key={member.id} className="admin-staff-card">
              <div className="admin-staff-card-top">
                <div className="admin-staff-profile">
                  <div className="admin-staff-avatar">
                    {initials}
                  </div>
                  <div>
                    <h3 className="admin-staff-name">{member.full_name}</h3>
                    <p className="admin-staff-spec">
                      {member.department || 'Physical Plant'}
                    </p>
                  </div>
                </div>

                <span className={`admin-staff-availability ${availClass}`}>
                  {member.availability || 'Available'}
                </span>
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
                  <span className="admin-staff-stat-num">
                    {member.completed_jobs ?? 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Member Modal */}
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
