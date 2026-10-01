import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function BuildingsAndRooms({
  buildings = [],
  locations = [],
  onAddBuilding,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [floorsCount, setFloorsCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) return;

    setIsSubmitting(true);
    await onAddBuilding({
      name,
      code,
      description,
      floors_count: Number(floorsCount),
    });
    setIsSubmitting(false);
    setShowAddModal(false);
    setName('');
    setCode('');
    setDescription('');
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Buildings &amp; Rooms</h1>
          <p className="admin-header-subtitle">
            Monitor facility counts and reports across university properties.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-black"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Building
        </button>
      </div>

      {/* Buildings Grid */}
      <div className="admin-buildings-grid">
        {buildings.map((b) => (
          <div key={b.id} className="admin-building-card">
            <div className="admin-building-img">
              <img
                src={b.image_url || '/images/campus_courtyard.jpg'}
                alt={b.name}
                loading="lazy"
                onError={(e) => {
                  e.target.src = '/images/campus_courtyard.jpg';
                }}
              />
            </div>

            <div className="admin-building-body">
              <div className="admin-building-header">
                <h3 className="admin-building-title">{b.name}</h3>
                <div className="admin-building-actions">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    title="Edit Building Details"
                    onClick={() => alert(`Edit ${b.name}`)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    title="Delete Building"
                    onClick={() => alert(`Delete ${b.name}`)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="admin-building-stats-row">
                <div className="admin-b-stat-col">
                  <span className="admin-b-stat-label">FLOORS</span>
                  <span className="admin-b-stat-num">{b.floors_count || 1}</span>
                </div>

                <div className="admin-b-stat-col">
                  <span className="admin-b-stat-label">REPORTS</span>
                  <span className="admin-b-stat-num green">
                    {b.reports_count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Building Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Register Campus Building</h3>
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
                <label className="admin-form-label">Building Name *</label>
                <input
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. Health Sciences Building"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Building Code *</label>
                <input
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. HSB-MAIN"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Number of Floors</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="admin-select-input"
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea
                  className="admin-select-input"
                  rows="3"
                  placeholder="e.g. Classrooms, nursing laboratories, and faculty offices"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                  {isSubmitting ? 'Registering...' : 'Add Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
