import React from 'react';
import { Check } from 'lucide-react';

export default function LocationFeature() {
  const points = [
    'Structured building, floor, and room hierarchy',
    'Pinpoint specific spots (e.g. 2nd row seat 18, near projector)',
    'Automatic routing directly to assigned physical plant staff',
  ];

  return (
    <section className="landing-section">
      <div className="section-container">
        <div className="split-layout">
          {/* Text Column */}
          <div className="split-text-col reveal-on-scroll">
            <span className="section-eyebrow">PRECISE LOCATION TRACKING</span>
            <h2 className="section-title">
              Every report has a clear home.
            </h2>
            <p className="section-p">
              Vague reports waste valuable maintenance hours. FixMyCampus anchors every defect to verified campus buildings, floors, and rooms so workers arrive prepared with the right tools.
            </p>

            <div className="checklist">
              {points.map((pt, idx) => (
                <div className="checklist-item" key={idx}>
                  <div className="checklist-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="checklist-label">{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Mockup Column */}
          <div className="split-visual-col">
            <div className="preview-card reveal-on-scroll">
              <div className="preview-card-header">
                <span className="badge-pill badge-amber">IN PROGRESS</span>
                <span className="preview-card-id">#FMC-202609-0002</span>
              </div>

              <div className="preview-card-img-box">
                <img
                  src="/images/classroom_chairs.jpg"
                  alt="Lecture Hall broken desk report"
                  className="preview-card-img"
                />
              </div>

              <div className="preview-card-details">
                <h4 className="preview-card-title">Broken Tablet Armrest</h4>
                <p className="preview-card-loc">Engineering Complex &bull; Room 101</p>
                <div className="preview-card-footer">
                  <span>Assigned to Carlos Ramos (Carpentry)</span>
                  <span className="preview-badge-subtle">SLA: 48h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
