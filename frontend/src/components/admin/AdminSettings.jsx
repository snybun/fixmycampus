import React from 'react';
import { Sliders, ShieldCheck, Bell, Database } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">System Settings</h1>
          <p className="admin-header-subtitle">
            Configure FixMyCampus campus portal policies, SLA thresholds, and email dispatching.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        <div className="admin-widget-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sliders size={20} color="#0f172a" />
            <h3 className="admin-widget-header" style={{ margin: 0 }}>
              SLA &amp; Priority Rules
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
            Set standard response deadlines based on incident severity.
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem' }}>Emergency Hazard SLA</span>
              <strong style={{ fontSize: '0.88rem', color: '#dc2626' }}>6 Hours</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem' }}>High Priority (AC/Plumbing)</span>
              <strong style={{ fontSize: '0.88rem', color: '#d97706' }}>24 Hours</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem' }}>Medium Priority (Furniture/Light)</span>
              <strong style={{ fontSize: '0.88rem', color: '#2563eb' }}>48 Hours</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem' }}>Low Priority (Paint/Aesthetics)</span>
              <strong style={{ fontSize: '0.88rem', color: '#16a34a' }}>72 Hours</strong>
            </div>
          </div>
        </div>

        <div className="admin-widget-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ShieldCheck size={20} color="#0f172a" />
            <h3 className="admin-widget-header" style={{ margin: 0 }}>
              Domain &amp; Security Verification
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
            Restrict registration and Google Single Sign-On to Phinma institutional email domains.
          </p>
          <div style={{ marginTop: 20 }}>
            <label className="admin-form-label">Authorized Domain Restriction</label>
            <input
              type="text"
              readOnly
              className="admin-select-input"
              value="@phinmaed.com"
              style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}
            />
            <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: 8 }}>
              &check; Active domain enforcement enabled across all student and faculty registrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
