import React from 'react';
import { Camera, Compass, Wrench, CheckCircle2 } from 'lucide-react';

export default function ProcessSteps() {
  const steps = [
    {
      num: '01',
      title: 'Spot & Snap',
      desc: 'Submit a photo with exact building and room details in under 30 seconds from any phone.',
      icon: Camera,
    },
    {
      num: '02',
      title: 'Smart Dispatch',
      desc: 'Requests are instantly categorized and assigned to the right zone technician.',
      icon: Compass,
    },
    {
      num: '03',
      title: 'Active Repair',
      desc: 'Track live progress with technician status updates, parts logs, and estimated SLA times.',
      icon: Wrench,
    },
    {
      num: '04',
      title: 'Verified Fix',
      desc: 'Technicians upload completion photos, followed by maintenance staff verification and student sign-off.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="landing-section" id="process">
      <div id="demo" style={{ position: 'relative', top: '-80px' }} />
      <div className="section-container">
        <div className="section-header reveal-on-scroll">
          <span className="section-eyebrow">THE FIXMYCAMPUS PROCESS</span>
          <h2 className="section-title">
            From report to resolution,<br />without the runaround.
          </h2>
          <p className="section-subtitle">
            A transparent 4-step workflow that keeps students, faculty, and maintenance teams aligned from first report to final sign-off.
          </p>
        </div>

        <div className="process-grid reveal-on-scroll reveal-stagger">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div className="process-card" key={idx}>
                <div className="process-card-top">
                  <span className="process-num">{step.num}</span>
                  <div className="process-icon-box">
                    <Icon size={18} />
                  </div>
                </div>
                <h3 className="process-card-title">{step.title}</h3>
                <p className="process-card-desc">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
