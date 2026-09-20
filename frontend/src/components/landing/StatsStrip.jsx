import React from 'react';

export default function StatsStrip() {
  const stats = [
    { value: '1,200+', label: 'Defects resolved to date' },
    { value: '27 min', label: 'Average first response' },
    { value: '98%', label: 'Resolution satisfaction' },
    { value: '99.4%', label: 'Facility uptime maintained' },
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
