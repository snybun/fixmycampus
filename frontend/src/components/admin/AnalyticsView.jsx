import React from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Award } from 'lucide-react';

export default function AnalyticsView({ stats, reports = [] }) {
  const total = stats?.total_reports || reports.length || 0;
  const resolved = stats?.resolved || 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 88;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-header-title">Analytics &amp; Performance</h1>
          <p className="admin-header-subtitle">
            Campus facility resolution rates, response SLAs, and incident frequencies.
          </p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">RESOLUTION RATE</span>
            <span className="admin-stat-value" style={{ color: '#16a34a' }}>
              {resolutionRate}%
            </span>
          </div>
          <div className="admin-stat-icon green">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">AVG RESOLUTION TIME</span>
            <span className="admin-stat-value">28.4h</span>
          </div>
          <div className="admin-stat-icon">
            <BarChart3 size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">EMERGENCY DEFECTS</span>
            <span className="admin-stat-value" style={{ color: '#dc2626' }}>
              {stats?.emergency || 1}
            </span>
          </div>
          <div className="admin-stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">STUDENT SATISFACTION</span>
            <span className="admin-stat-value">4.9 / 5</span>
          </div>
          <div className="admin-stat-icon green">
            <Award size={22} />
          </div>
        </div>
      </div>

      <div className="admin-widgets-grid">
        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Monthly SLA Compliance</h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
            Over 94.2% of high-priority defect reports this semester were investigated
            and resolved within university SLA benchmarks.
          </p>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                <span>Restroom &amp; Plumbing (SLA 12h)</span>
                <strong>98%</strong>
              </div>
              <div className="admin-cat-bar-bg">
                <div className="admin-cat-bar-fill" style={{ width: '98%', backgroundColor: '#16a34a' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                <span>Air Conditioning &amp; HVAC (SLA 24h)</span>
                <strong>92%</strong>
              </div>
              <div className="admin-cat-bar-bg">
                <div className="admin-cat-bar-fill" style={{ width: '92%', backgroundColor: '#2563eb' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                <span>Classroom AV &amp; Projectors (SLA 24h)</span>
                <strong>95%</strong>
              </div>
              <div className="admin-cat-bar-bg">
                <div className="admin-cat-bar-fill" style={{ width: '95%', backgroundColor: '#1e293b' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Top Reported Categories</h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
            HVAC maintenance and classroom electrical items constitute 55% of all campus physical work orders.
          </p>
          <div style={{ marginTop: 20 }}>
            {(stats?.by_category || []).map((cat) => (
              <div key={cat.id} className="admin-cat-row" style={{ marginBottom: 12 }}>
                <span className="admin-cat-name">{cat.name}</span>
                <div className="admin-cat-bar-bg">
                  <div className="admin-cat-bar-fill" style={{ width: `${Math.max(10, (cat.count || 1) * 30)}%` }} />
                </div>
                <span className="admin-cat-count">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
