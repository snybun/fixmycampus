import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Send,
  MapPin,
  Settings,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search
} from 'lucide-react';

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

      {/* Hero Dashboard Preview Mockup */}
      <div className="hero-mockup-wrapper">
        <div className="hero-mockup-frame">
          {/* Mockup Sidebar */}
          <div className="mockup-sidebar">
            <div className="mockup-search-icon">
              <Search size={15} />
            </div>

            <nav className="mockup-nav">
              <div className="mockup-nav-item active">
                <LayoutDashboard size={15} />
                <span>Overview</span>
              </div>
              <div className="mockup-nav-item">
                <FileText size={15} />
                <span>Reports</span>
              </div>
              <div className="mockup-nav-item">
                <Send size={15} />
                <span>Dispatch</span>
              </div>
              <div className="mockup-nav-item">
                <MapPin size={15} />
                <span>Campus</span>
              </div>
              <div className="mockup-nav-item" style={{ marginTop: 'auto' }}>
                <Settings size={15} />
                <span>Settings</span>
              </div>
            </nav>
          </div>

          {/* Mockup Main Canvas */}
          <div className="mockup-main">
            {/* Top Bar inside mockup */}
            <div className="mockup-topbar">
              <div>
                <h3 className="mockup-greeting">Good morning, Maya</h3>
                <p className="mockup-subtext">Here's what needs attention across campus facilities today.</p>
              </div>
              <button
                type="button"
                className="mockup-action-btn"
                onClick={() => onNavigate && onNavigate(currentUser ? 'report-issue' : 'login')}
              >
                <Plus size={14} />
                <span>New Report</span>
              </button>
            </div>

            {/* Mockup Split Grid */}
            <div className="mockup-body-grid">
              {/* Featured Defect Card */}
              <div className="mockup-defect-card">
                <div className="mockup-card-header">
                  <span className="badge-pill badge-amber">HIGH PRIORITY</span>
                  <span className="mockup-card-ref">#FMC-202609-0001</span>
                </div>

                <div className="mockup-image-box">
                  <img
                    src="/images/hero_ac_defect.jpg"
                    alt="Broken Air Conditioner Unit"
                    className="mockup-defect-img"
                  />
                </div>

                <div className="mockup-defect-info">
                  <h4 className="mockup-defect-title">Broken Air Conditioner Unit</h4>
                  <p className="mockup-defect-loc">Science Hall &bull; Room 302 (Physics Lab)</p>
                  <div className="mockup-defect-meta">
                    <span>Reported 2h ago by Dr. Sarah Smith</span>
                    <span className="mockup-sla-tag">SLA: 24h</span>
                  </div>
                </div>
              </div>

              {/* Right Side Activity Panel */}
              <div className="mockup-side-panel">
                <span className="mockup-panel-title">Recent Activity</span>

                <div className="mockup-activity-list">
                  <div className="mockup-activity-item">
                    <span className="activity-dot dot-amber" />
                    <div>
                      <div className="activity-text">AC Leak reported</div>
                      <div className="activity-sub">Science Lab 4 &bull; 2h ago</div>
                    </div>
                  </div>

                  <div className="mockup-activity-item">
                    <span className="activity-dot dot-blue" />
                    <div>
                      <div className="activity-text">Desk repair assigned</div>
                      <div className="activity-sub">Carlos Ramos &bull; 4h ago</div>
                    </div>
                  </div>

                  <div className="mockup-activity-item">
                    <span className="activity-dot dot-green" />
                    <div>
                      <div className="activity-text">Restroom faucet fixed</div>
                      <div className="activity-sub">Verified &bull; Yesterday</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
