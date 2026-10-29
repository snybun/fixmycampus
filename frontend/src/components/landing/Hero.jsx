import React from 'react';
import HeroUserDashboardDemo from './HeroUserDashboardDemo';

export default function Hero({ onNavigate, onScrollTo, currentUser }) {
  return (
    <section className="landing-hero">
      <div className="hero-content">
        <h1 className="hero-headline">
          Report campus problems in<br />seconds.
        </h1>
        <p className="hero-subheadline">
          FixMyCampus connects students, faculty, and campus maintenance teams to resolve facility defects quickly and transparently.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => onNavigate && onNavigate(currentUser ? 'report-issue' : 'login')}
          >
            Report a defect
          </button>
          <button
            type="button"
            className="btn-hero-secondary"
            onClick={() => onScrollTo ? onScrollTo('process') : document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
          >
            How it works
          </button>
        </div>
      </div>

      {/* Hero Interactive User Dashboard Preview Mockup (Matches Image 2 with Demo Capabilities) */}
      <div className="hero-mockup-wrapper">
        <HeroUserDashboardDemo onNavigate={onNavigate} currentUser={currentUser} />
      </div>
    </section>
  );
}
