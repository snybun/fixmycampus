import React from 'react';

export default function StatCard({ label, value, meta, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={18} style={{ color: 'var(--color-text-muted)' }} />}
      </div>
      <span className="stat-number">{value}</span>
      {meta && <span className="stat-meta">{meta}</span>}
    </div>
  );
}
