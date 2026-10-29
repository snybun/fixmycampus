import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { fetchStats } from '../../services/api';

export default function AnalyticsView({ stats: initialStats, reports = [] }) {
  const [stats, setStats] = useState(initialStats || null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetchStats().then((res) => {
        if (active && res && res.success && res.data) {
          setStats(res.data);
        }
      });
    };
    load();
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.removeEventListener('focus', load);
    };
  }, []);

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const total = stats?.total_reports ?? (reports.length || 0);
  const resolved = stats?.resolved ?? 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Real Average Resolution Time from DB
  const avgResolutionHours = stats?.avg_resolution_hours;
  const avgResolutionDisplay = avgResolutionHours != null ? `${avgResolutionHours}h` : 'N/A';

  // Real Emergency Defects from DB
  const emergencyDefects = stats?.emergency ?? 0;

  // Real Student Satisfaction from report_feedback table
  const studentSatisfaction = stats?.student_satisfaction != null
    ? `${Number(stats.student_satisfaction).toFixed(1)} / 5`
    : 'N/A';

  // Real SLA Compliance Breakdown & Rate
  const overallSlaRate = stats?.overall_sla_rate != null ? stats.overall_sla_rate : 100;
  const allSlaCategories = stats?.sla_categories || [];
  const activeSlaCategories = allSlaCategories.filter((c) => c.total_reports > 0);
  const displaySlaCategories = activeSlaCategories.length > 0
    ? activeSlaCategories
    : allSlaCategories.slice(0, 3);

  const slaSubtitle = total > 0
    ? `Over ${overallSlaRate}% of defect reports were investigated and resolved within university SLA benchmarks.`
    : 'University SLA target benchmarks by facility category.';

  // Real Top Reported Categories
  const categoryList = stats?.by_category || [];
  const reportedCategories = categoryList.filter((c) => Number(c.count) > 0);
  let topCatSubtitle = 'HVAC maintenance and classroom electrical items constitute physical work orders.';
  if (reportedCategories.length >= 2 && total > 0) {
    const top1 = reportedCategories[0];
    const top2 = reportedCategories[1];
    const combinedPct = Math.round(((Number(top1.count) + Number(top2.count)) / total) * 100);
    topCatSubtitle = `${top1.name} and ${top2.name} items constitute ${combinedPct}% of all campus physical work orders.`;
  } else if (reportedCategories.length === 1 && total > 0) {
    const top1 = reportedCategories[0];
    const pct = Math.round((Number(top1.count) / total) * 100);
    topCatSubtitle = `${top1.name} items constitute ${pct}% of all campus physical work orders.`;
  } else if (total === 0) {
    topCatSubtitle = 'No campus work orders have been submitted yet.';
  }

  const maxCount = Math.max(1, ...categoryList.map((c) => Number(c.count) || 0));

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
            <span className="admin-stat-value">{avgResolutionDisplay}</span>
          </div>
          <div className="admin-stat-icon">
            <BarChart3 size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">EMERGENCY DEFECTS</span>
            <span className="admin-stat-value" style={{ color: emergencyDefects > 0 ? '#dc2626' : '#64748b' }}>
              {emergencyDefects}
            </span>
          </div>
          <div className="admin-stat-icon" style={{ background: emergencyDefects > 0 ? '#fee2e2' : '#f1f5f9', color: emergencyDefects > 0 ? '#dc2626' : '#64748b' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-meta">
            <span className="admin-stat-title">STUDENT SATISFACTION</span>
            <span className="admin-stat-value">{studentSatisfaction}</span>
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
            {slaSubtitle}
          </p>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displaySlaCategories.map((cat, idx) => {
              const compliance = Number(cat.compliance_rate) || 0;
              const barColor = compliance >= 80 ? '#16a34a' : compliance >= 50 ? '#2563eb' : '#1e293b';

              return (
                <div key={cat.id || idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                    <span>{cat.name} (SLA {cat.sla_hours}h)</span>
                    <strong>{compliance}%</strong>
                  </div>
                  <div className="admin-cat-bar-bg">
                    <div className="admin-cat-bar-fill" style={{ width: `${compliance}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-widget-card">
          <h3 className="admin-widget-header">Top Reported Categories</h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
            {topCatSubtitle}
          </p>
          <div style={{ marginTop: 20 }}>
            {categoryList.map((cat) => {
              const count = Number(cat.count) || 0;
              const barWidth = count === 0 ? '0%' : `${Math.min(100, Math.max(8, (count / maxCount) * 100))}%`;

              return (
                <div key={cat.id} className="admin-cat-row" style={{ marginBottom: 12 }}>
                  <span className="admin-cat-name">{cat.name}</span>
                  <div className="admin-cat-bar-bg">
                    <div
                      className="admin-cat-bar-fill"
                      style={{ width: barWidth }}
                    />
                  </div>
                  <span className={`admin-cat-count ${count > 0 ? 'has-reports' : ''}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

