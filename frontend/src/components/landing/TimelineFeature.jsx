import React from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

export default function TimelineFeature() {
  const steps = [
    {
      title: 'Report Submitted',
      sub: 'Dr. Sarah Smith &bull; Yesterday at 9:15 AM',
      status: 'done',
    },
    {
      title: 'Supervisor Reviewed & Assigned',
      sub: 'Assigned to Technician John Miller (HVAC)',
      status: 'done',
    },
    {
      title: 'Repair In Progress',
      sub: 'On-site: condensation pipe cleared, filter replaced',
      status: 'current',
    },
    {
      title: 'Verified & Resolved',
      sub: 'Completion proof photo and reporter sign-off',
      status: 'pending',
    },
  ];

  return (
    <section className="landing-section-dark">
      <div className="section-container">
        <div className="split-layout">
          {/* Dark Timeline Card on Left */}
          <div className="split-visual-col">
            <div className="dark-timeline-card reveal-on-scroll">
              <div className="dark-card-header">
                <span className="dark-card-title">Audit &amp; Lifecycle Status</span>
                <span className="badge-pill badge-amber-dark">IN PROGRESS</span>
              </div>

              <div className="timeline-list">
                {steps.map((step, idx) => (
                  <div className={`timeline-item ${step.status}`} key={idx}>
                    <div className="timeline-marker">
                      {step.status === 'done' ? (
                        <div className="marker-dot done">
                          <CheckCircle2 size={14} />
                        </div>
                      ) : step.status === 'current' ? (
                        <div className="marker-dot current">
                          <span className="pulse-dot" />
                        </div>
                      ) : (
                        <div className="marker-dot pending">
                          <Circle size={10} />
                        </div>
                      )}
                      {idx < steps.length - 1 && <div className="timeline-line" />}
                    </div>

                    <div className="timeline-body">
                      <div className="timeline-title">{step.title}</div>
                      <div
                        className="timeline-sub"
                        dangerouslySetInnerHTML={{ __html: step.sub }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Text on Right */}
          <div className="split-text-col dark-text-col reveal-on-scroll">
            <span className="section-eyebrow-dark">TRANSPARENT LIFECYCLE</span>
            <h2 className="section-title-dark">
              Stay informed from first<br />report to final fix.
            </h2>
            <p className="section-p-dark">
              Eliminate the black hole of maintenance requests. Automated notifications keep reporters, technicians, and physical plant supervisors informed at every milestone without manual follow-up emails.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
