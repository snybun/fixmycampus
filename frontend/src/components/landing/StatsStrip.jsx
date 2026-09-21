import React from 'react';

export default function StatsStrip() {
  const stats = [
    { value: '?', label: 'Defects resolved to date' },
    { value: '?', label: 'Average first response' },
    { value: '?', label: 'Resolution satisfaction' },
    { value: '?', label: 'Facility uptime maintained' },
  ];

  return (
    <section className="landing-stats-strip">
      <div className="stats-strip-container">
        {stats.map((item, idx) => (
          <div className="stats-strip-col" key={idx}>
            <div className="stats-strip-val">{item.value}</div>
            <div className="stats-strip-label">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
