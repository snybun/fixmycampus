import React from 'react';
import { GraduationCap, Wrench, ShieldCheck } from 'lucide-react';

export default function RolesSection() {
  const roles = [
    {
      icon: GraduationCap,
      title: 'Students & Faculty',
      desc: 'No more guessing who manages what. Submit issues in seconds and receive automated updates as your defect moves from review to resolution.',
    },
    {
      icon: Wrench,
      title: 'Maintenance Staff',
      desc: 'Clear work orders delivered with precise room numbers, photo evidence, and replacement parts notes. Update ticket stages directly on-site.',
    },
    {
      icon: ShieldCheck,
      title: 'Campus Leadership',
      desc: 'Full visibility over building conditions, recurring equipment failures, vendor costs, and response SLAs across all physical plant operations.',
    },
  ];

  return (
    <section className="landing-section" id="roles" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="section-container">
        <div className="section-header">
          <span className="section-eyebrow">DESIGNED FOR CAMPUS LIFE</span>
          <h2 className="section-title">
            One shared system. Better<br />outcomes for everyone.
          </h2>
        </div>

        <div className="roles-grid">
          {roles.map((role, idx) => {
            const Icon = role.icon;
            return (
              <div className="role-card" key={idx}>
                <div className="role-icon-box">
                  <Icon size={20} />
                </div>
                <h3 className="role-card-title">{role.title}</h3>
                <p className="role-card-desc">{role.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
