import React, { useState } from 'react';
import { Wrench, ArrowLeft, CheckCircle2 } from 'lucide-react';
import ConfirmationModal, { MODAL_PRESETS, ModalCard } from './ConfirmationModal';
import EmptyState, { EMPTY_STATE_PRESETS } from './EmptyState';
import './modals.css';

export default function ModalsGalleryView({ onBackToDashboard }) {
  const [activeTab, setActiveTab] = useState('modals'); // 'modals' | 'empty-states'
  const [activeLiveModal, setActiveLiveModal] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const modalKeys = Object.keys(MODAL_PRESETS);
  const emptyStateKeys = Object.keys(EMPTY_STATE_PRESETS);

  const handleTestModal = (key) => {
    setActiveLiveModal(key);
  };

  const handleConfirmAction = () => {
    const preset = MODAL_PRESETS[activeLiveModal];
    setFeedbackMsg(`Action confirmed for: "${preset?.title || activeLiveModal}"`);
    setActiveLiveModal(null);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  return (
    <div className="modals-collection-page">
      {/* Top Banner Bar matching mockups 2 and 3 */}
      <div className="modals-header-bar">
        <div className="modals-header-left">
          <div className="modals-header-brand">
            <div
              style={{
                width: 32,
                height: 32,
                background: '#111827',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Wrench size={18} />
            </div>
            <span>FixMyCampus</span>
          </div>

          <div className="modals-header-title-box">
            <h2>
              {activeTab === 'modals'
                ? 'Confirmation Modals Collection'
                : 'Empty States Registry'}
            </h2>
            <p>
              {activeTab === 'modals'
                ? 'Standardized safety dialogues for state transitions and destructive operations'
                : 'Consistent fallbacks for dashboard sections, results, and notifications'}
            </p>
          </div>
        </div>

        <div className="modals-header-right">
          {/* Switch Tab Button */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="modal-btn"
              style={{
                height: 34,
                padding: '0 14px',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'modals' ? '#111827' : '#ffffff',
                color: activeTab === 'modals' ? '#ffffff' : '#374151',
                border: '1px solid #e5e7eb',
              }}
              onClick={() => setActiveTab('modals')}
            >
              Modals (7)
            </button>
            <button
              type="button"
              className="modal-btn"
              style={{
                height: 34,
                padding: '0 14px',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'empty-states' ? '#111827' : '#ffffff',
                color: activeTab === 'empty-states' ? '#ffffff' : '#374151',
                border: '1px solid #e5e7eb',
              }}
              onClick={() => setActiveTab('empty-states')}
            >
              Empty States (4)
            </button>
          </div>

          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', display: 'flex', gap: 6 }}
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <div className="modals-header-user">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#374151',
                overflow: 'hidden',
              }}
            >
              <img
                src="/images/campus_courtyard.jpg"
                alt="Admin"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="modals-header-user-info">
              <span className="user-name">Admin Console</span>
              <span className="user-sub">System States</span>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto 16px auto',
            padding: '12px 16px',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* View 1: 7 Confirmation Modals Collection Grid */}
      {activeTab === 'modals' && (
        <div className="modals-collection-grid">
          {modalKeys.map((key) => {
            const preset = MODAL_PRESETS[key];
            return (
              <div key={key} className="modal-preview-wrapper">
                <ModalCard
                  presetId={key}
                  onCancel={() => handleTestModal(key)}
                  onConfirm={() => handleTestModal(key)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Empty States Registry Grid */}
      {activeTab === 'empty-states' && (
        <div className="empty-states-grid">
          {emptyStateKeys.map((key) => (
            <EmptyState
              key={key}
              presetId={key}
              onAction={() => {
                if (key === 'no-notifications') {
                  onBackToDashboard();
                } else {
                  setFeedbackMsg(`Clicked action for empty state: "${EMPTY_STATE_PRESETS[key].title}"`);
                  setTimeout(() => setFeedbackMsg(''), 3000);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Live Interactive Modal Trigger */}
      {activeLiveModal && (
        <ConfirmationModal
          isOpen={Boolean(activeLiveModal)}
          presetId={activeLiveModal}
          onClose={() => setActiveLiveModal(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
