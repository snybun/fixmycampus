import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, X, DoorOpen } from 'lucide-react';

export default function BuildingsAndRooms({
  buildings = [],
  locations = [],
  onAddBuilding,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBuildingRooms, setSelectedBuildingRooms] = useState(null);
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

  // Rooms for selected building
  const activeRooms = selectedBuildingRooms
    ? locations.filter((loc) => Number(loc.building_id) === Number(selectedBuildingRooms.id))
    : [];

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
                  <span className="admin-b-stat-label">ROOMS</span>
                  <span className="admin-b-stat-num">{b.rooms_count || 0}</span>
                </div>

                <div className="admin-b-stat-col">
                  <span className="admin-b-stat-label">REPORTS</span>
                  <span className="admin-b-stat-num green">
                    {b.reports_count || 0}
                  </span>
                </div>
              </div>

              <div className="admin-building-footer">
                <button
                  type="button"
                  className="admin-manage-rooms-btn"
                  onClick={() => setSelectedBuildingRooms(b)}
                >
                  Manage Rooms <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manage Rooms Modal */}
      {selectedBuildingRooms && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedBuildingRooms(null)}
        >
          <div
            className="admin-modal-dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">
                  Rooms in {selectedBuildingRooms.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                  Code: {selectedBuildingRooms.code} &bull; Total Registered Rooms: {activeRooms.length}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedBuildingRooms(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {activeRooms.length === 0 ? (
                <p style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>
                  No designated rooms recorded in this building yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DoorOpen size={16} color="#64748b" />
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                            {room.room_number || 'Room'}
                          </strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: 8 }}>
                            {room.name}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          background: '#e2e8f0',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: 4,
                          textTransform: 'capitalize',
                        }}
                      >
                        {room.type || 'Facility'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-black"
                onClick={() => setSelectedBuildingRooms(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
