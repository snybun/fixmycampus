import React from 'react';
import { Clock } from 'lucide-react';

export default function CategoryGrid({ categories = [] }) {
  return (
    <section className="card" id="categories">
      <div className="card-header">
        <div>
          <h2 className="card-title">Defect Categories &amp; Resolution SLA</h2>
          <p className="card-subtitle">
            Defined response benchmarks configured in <code>fixmycampus_db.categories</code>
          </p>
        </div>
      </div>

      <div className="category-grid">
        {categories.map((cat) => (
          <div className="category-card" key={cat.id || cat.slug}>
            <div>
              <h4 className="category-title">{cat.name}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                {cat.description || 'Facility maintenance service classification'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                <Clock size={12} />
                <span>Target Resolution: {cat.sla_hours} hours</span>
              </div>
            </div>
            <span className="badge badge-neutral">{cat.sla_hours}h SLA</span>
          </div>
        ))}
      </div>
    </section>
  );
}
