import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Building2, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BuildingsAndRooms({
  buildings = [],
  locations = [],
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
}) {
  // Add Building Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [floorsCount, setFloorsCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Building Modal State
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editFloorsCount, setEditFloorsCount] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Building Confirmation Modal State
  const [buildingToDelete, setBuildingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  const handleOpenEditModal = (building) => {
    setEditingBuilding(building);
    setEditName(building.name || '');
    setEditCode(building.code || '');
    setEditFloorsCount(building.floors_count || 1);
    setEditError('');
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingBuilding) return;

    const trimmedName = editName.trim();
    const trimmedCode = editCode.trim().toUpperCase();
    const floorsNum = parseInt(editFloorsCount, 10);

    if (!trimmedName) {
      setEditError('Building Name is required.');
      return;
    }
    if (!trimmedCode) {
      setEditError('Building Code is required.');
      return;
    }
    if (isNaN(floorsNum) || floorsNum < 1 || floorsNum > 50) {
      setEditError('Number of floors must be between 1 and 50.');
      return;
    }

    setIsUpdating(true);
    setEditError('');

    try {
      if (onUpdateBuilding) {
        const res = await onUpdateBuilding(editingBuilding.id, {
          name: trimmedName,
          code: trimmedCode,
          floors_count: floorsNum,
        });

        if (res?.success) {
          setEditingBuilding(null);
        } else if (res?.message) {
          setEditError(res.message);
        }
      } else {
        setEditingBuilding(null);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update building details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) return;

    setIsSubmitting(true);
    setAddError('');
    try {
      if (onAddBuilding) {
        await onAddBuilding({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          floors_count: Number(floorsCount),
        });
      }
      setShowAddModal(false);
      setName('');
      setCode('');
      setDescription('');
      setFloorsCount(3);
    } catch (err) {
      setAddError(err.message || 'Failed to add building.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!buildingToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteBuilding) {
        await onDeleteBuilding(buildingToDelete.id, buildingToDelete.name);
      }
      setBuildingToDelete(null);
    } catch (err) {
      console.error('Delete building error:', err);
    } finally {
      setIsDeleting(false);
    }
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
          onClick={() => {
            setAddError('');
            setShowAddModal(true);
          }}
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
                    title={`Edit ${b.name} details`}
                    onClick={() => handleOpenEditModal(b)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    title={`Remove ${b.name}`}
                    onClick={() => setBuildingToDelete(b)}
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

      {/* --------------------------------------------------------------------
          EDIT BUILDING MODAL (Rename Building & Number of Floors)
          -------------------------------------------------------------------- */}
      {editingBuilding && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !isUpdating && setEditingBuilding(null)}
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                    Edit Building Details
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Code: <strong style={{ color: '#0f172a' }}>{editingBuilding.code}</strong> &bull; ID #{editingBuilding.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingBuilding(null)}
                disabled={isUpdating}
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
                role="alert"
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit}>
              {/* Field 1: Building Name */}
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="edit-building-name">
                  Building Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="edit-building-name"
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. PTC Building"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isUpdating}
                  autoFocus
                />
              </div>

              {/* Field 2: Building Code */}
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="edit-building-code">
                  Building Code / Abbreviation <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="edit-building-code"
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. PTC"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  disabled={isUpdating}
                />
              </div>

              {/* Field 3: Number of Floors */}
              <div className="admin-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="admin-form-label" htmlFor="edit-building-floors" style={{ margin: 0 }}>
                    Number of Floors <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    1st Floor through {editFloorsCount === 1 ? '1st Floor' : `${editFloorsCount}th Floor`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setEditFloorsCount((prev) => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                    disabled={isUpdating || Number(editFloorsCount) <= 1}
                    style={{ padding: '0.45rem 0.85rem', fontWeight: 700 }}
                  >
                    -
                  </button>

                  <input
                    id="edit-building-floors"
                    type="number"
                    min="1"
                    max="50"
                    required
                    className="admin-select-input"
                    value={editFloorsCount}
                    onChange={(e) => setEditFloorsCount(e.target.value)}
                    disabled={isUpdating}
                    style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.95rem' }}
                  />

                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setEditFloorsCount((prev) => Math.min(50, (parseInt(prev, 10) || 1) + 1))}
                    disabled={isUpdating || Number(editFloorsCount) >= 50}
                    style={{ padding: '0.45rem 0.85rem', fontWeight: 700 }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Information pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '7px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem',
                  color: '#475569',
                  marginTop: '0.85rem',
                }}
              >
                <Layers size={15} style={{ color: '#059669', flexShrink: 0 }} />
                <span>
                  Currently has <strong>{editingBuilding.rooms_count || 0} registered rooms</strong> and <strong>{editingBuilding.reports_count || 0} maintenance reports</strong>.
                </span>
              </div>

              {/* Modal Footer Actions */}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setEditingBuilding(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-black"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          DELETE CONFIRMATION MODAL
          -------------------------------------------------------------------- */}
      {buildingToDelete && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !isDeleting && setBuildingToDelete(null)}
        >
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div className="admin-modal-header">
              <h3 className="admin-modal-title" style={{ color: '#991b1b' }}>
                Remove Building
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setBuildingToDelete(null)}
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{buildingToDelete.name}</strong> ({buildingToDelete.code})? Its historical maintenance tickets and room inventory will be preserved.
            </p>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setBuildingToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-black"
                style={{ background: '#dc2626' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          ADD BUILDING MODAL
          -------------------------------------------------------------------- */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => !isSubmitting && setShowAddModal(false)}>
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
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
                role="alert"
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div className="admin-form-group">
                <label className="admin-form-label">Building Name *</label>
                <input
                  type="text"
                  required
                  className="admin-select-input"
                  placeholder="e.g. Health Sciences Building"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Number of Floors</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="admin-select-input"
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(e.target.value)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
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
