import React from 'react';

export default function AnalyticsFeature() {
  const categories = [
    { label: 'HVAC & Climate Control', pct: 38, width: '85%' },
    { label: 'Electrical & Lighting', pct: 24, width: '62%' },
    { label: 'Restroom & Plumbing', pct: 18, width: '46%' },
    { label: 'Furniture & Armchairs', pct: 12, width: '32%' },
    { label: 'Grounds & Landscaping', pct: 8, width: '20%' },
  ];

  return (
    <section className="landing-section" id="impact">
      <div className="section-container">
        <div className="section-header reveal-on-scroll">
          <span className="section-eyebrow">CAMPUS-WIDE INSIGHTS</span>
          <h2 className="section-title">
            See the campus clearly. Act earlier.
          </h2>
          <p className="section-subtitle">
            Aggregated defect trends help facility directors identify systemic issues before small leaks turn into costly structural repairs.
          </p>
        </div>

        <div className="analytics-card reveal-on-scroll">
          <div className="analytics-metrics-col">
            <div className="analytics-stat">
              <span className="analytics-stat-label">AVERAGE RESOLUTION TIME</span>
              <div className="analytics-stat-val">1.8 days</div>
              <span className="analytics-stat-meta">Across all 11 defect categories</span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">ON-TIME SLA COMPLIANCE</span>
              <div className="analytics-stat-val">94%</div>
              <span className="analytics-stat-meta">Completed within target hours</span>
            </div>

            <div className="analytics-stat">
              <span className="analytics-stat-label">EMERGENCY RESPONSE</span>
              <div className="analytics-stat-val">6 hours</div>
              <span className="analytics-stat-meta">Average dispatch to fix turnaround</span>
            </div>
          </div>

          {/* Bar Charts Column */}
          <div className="analytics-bars-col">
            <div className="bars-header">
              <span className="bars-title">Defect Distribution by Facility Category</span>
              <span className="bars-badge">Active Academic Year</span>
            </div>

            <div className="bars-list">
              {categories.map((cat, idx) => (
                <div className="bar-row" key={idx}>
                  <div className="bar-info">
                    <span className="bar-label">{cat.label}</span>
                    <span className="bar-pct">{cat.pct}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ '--bar-width': cat.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
