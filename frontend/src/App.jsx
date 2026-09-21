import React, { useState, useEffect } from 'react';
import Navbar from './components/landing/Navbar';
import Hero from './components/landing/Hero';
import StatsStrip from './components/landing/StatsStrip';
import ProcessSteps from './components/landing/ProcessSteps';
import RolesSection from './components/landing/RolesSection';
import LocationFeature from './components/landing/LocationFeature';
import TimelineFeature from './components/landing/TimelineFeature';
import AnalyticsFeature from './components/landing/AnalyticsFeature';
import Testimonial from './components/landing/Testimonial';
import CtaBanner from './components/landing/CtaBanner';
import Footer from './components/landing/Footer';

import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';

export default function App() {
  // Sync view from URL hash if present (#login, #register, #forgot-password)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'register', 'forgot-password'].includes(hash)) {
      return hash;
    }
    return 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['login', 'register', 'forgot-password'].includes(hash)) {
        setCurrentView(hash);
      } else if (!hash || hash === 'landing') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'landing') {
      window.history.pushState(null, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = view;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollTo = (sectionId) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      window.history.pushState(null, '', window.location.pathname);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Render Auth Views
  if (currentView === 'login') {
    return <LoginPage onNavigate={handleNavigate} />;
  }

  if (currentView === 'register') {
    return <RegisterPage onNavigate={handleNavigate} />;
  }

  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage onNavigate={handleNavigate} />;
  }

  // Render Landing Page
  return (
    <div className="landing-app">
      <Navbar onNavigate={handleNavigate} onScrollTo={handleScrollTo} />
      <main>
        <Hero onNavigate={handleNavigate} onScrollTo={handleScrollTo} />
        <StatsStrip />
        <ProcessSteps />
        <RolesSection />
        <LocationFeature />
        <TimelineFeature />
        <AnalyticsFeature />
        <Testimonial />
        <CtaBanner onNavigate={handleNavigate} />
      </main>
      <Footer onScrollTo={handleScrollTo} />
    </div>
  );
}