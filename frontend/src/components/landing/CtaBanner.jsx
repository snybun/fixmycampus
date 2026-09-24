import React from 'react';

export default function CtaBanner({ onNavigate }) {
  return (
    <section className="landing-cta-banner">
      <div className="cta-container reveal-on-scroll">
        <span className="cta-eyebrow">START REPORTING TODAY</span>
        <h2 className="cta-headline">
          A better campus starts with one<br />clear report.
        </h2>
        <p className="cta-subtitle">
          Join thousands of students, faculty, and maintenance staff keeping university facilities safe and working every day.
        </p>

        <div className="cta-action">
          <button
            type="button"
            className="btn-cta-white"
            onClick={() => onNavigate && onNavigate('report-issue')}
          >
            Report a defect
          </button>
        </div>
      </div>
    </section>
  );
}
