import React, { useState, useEffect, useRef } from 'react';
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
import LoadingScreen from './components/common/LoadingScreen';

import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import DashboardPage from './components/dashboard/DashboardPage';
import AdminPage from './components/admin/AdminPage';
import ReportIssueWizard from './components/reports/ReportIssueWizard';
import { fetchAuthMe, logoutUser } from './services/api';

export default function App() {
  // Sync view from URL hash if present (#login, #register, #forgot-password, #dashboard, #admin, #report-issue)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue'].includes(hash)) {
      return hash;
    }
    return 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Accessing FixMyCampus Portal...');

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Check existing session on mount
  useEffect(() => {
    fetchAuthMe().then((res) => {
      if (res && res.authenticated && res.user) {
        setCurrentUser(res.user);
        const hash = window.location.hash.replace('#', '');
        if (hash === 'dashboard' || hash === 'report-issue' || hash === 'admin') {
          setCurrentView(hash);
        }
      } else {
        setCurrentUser(null);
        const hash = window.location.hash.replace('#', '');
        if (['dashboard', 'report-issue', 'admin'].includes(hash)) {
          setCurrentView('login');
          window.location.hash = 'login';
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'report-issue', 'admin'].includes(hash) && !currentUser) {
        handleNavigate('login');
        return;
      }
      if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue'].includes(hash)) {
        setCurrentView(hash);
      } else if (!hash || hash === 'landing') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // IntersectionObserver for scroll-driven section and card reveals
  useEffect(() => {
    if (currentView !== 'landing') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [currentView]);

  const handleNavigate = (view, userOverride = null) => {
    const activeUser = userOverride || currentUserRef.current || currentUser;

    // Route guard: if trying to access dashboard, report-issue, or admin while logged out, redirect to login
    let targetView = view;
    if (['dashboard', 'report-issue', 'admin'].includes(view) && !activeUser) {
      targetView = 'login';
    }

    if (targetView === currentView && !userOverride) return;

    // Show loading screen when navigating to auth views, dashboard, admin, report-issue, or returning home
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue'].includes(targetView)) {
      setLoadingMessage(
        targetView === 'register'
          ? 'Opening Student Registration...'
          : targetView === 'dashboard'
          ? 'Opening FixMyCampus Dashboard...'
          : targetView === 'admin'
          ? 'Accessing FixMyCampus Admin Console...'
          : targetView === 'report-issue'
          ? 'Opening Report Issue Wizard...'
          : targetView === 'login' && !activeUser && ['dashboard', 'report-issue', 'admin'].includes(view)
          ? 'Please log in to FixMyCampus to continue...'
          : 'Accessing FixMyCampus Portal...'
      );
      setIsLoading(true);

      setTimeout(() => {
        setCurrentView(targetView);
        window.location.hash = targetView;
        window.scrollTo({ top: 0 });

        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }, 350);
    } else {
      setIsLoading(true);
      setLoadingMessage('Returning to Home...');

      setTimeout(() => {
        setCurrentView('landing');
        window.history.pushState(null, '', window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }, 350);
    }
  };

  const handleLoginSuccess = (user) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    handleNavigate('dashboard', user);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout request completed with warning:', e);
    }
    currentUserRef.current = null;
    setCurrentUser(null);
    window.location.hash = '';
    handleNavigate('landing');
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

  return (
    <>
      <LoadingScreen isVisible={isLoading} message={loadingMessage} />

      {currentView === 'dashboard' && (
        <DashboardPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'report-issue' && (
        <ReportIssueWizard
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'admin' && (
        <AdminPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'login' && (
        <LoginPage
          onNavigate={handleNavigate}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'register' && (
        <RegisterPage
          onNavigate={handleNavigate}
          onRegisterSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'forgot-password' && (
        <ForgotPasswordPage onNavigate={handleNavigate} />
      )}

      {currentView === 'landing' && (
        <div className="landing-app">
          <Navbar onNavigate={handleNavigate} onScrollTo={handleScrollTo} currentUser={currentUser} />
          <main>
            <Hero onNavigate={handleNavigate} onScrollTo={handleScrollTo} currentUser={currentUser} />
            <StatsStrip />
            <ProcessSteps />
            <RolesSection />
            <LocationFeature />
            <TimelineFeature />
            <AnalyticsFeature />
            <Testimonial />
            <CtaBanner onNavigate={handleNavigate} currentUser={currentUser} />
          </main>
          <Footer onScrollTo={handleScrollTo} />
        </div>
      )}
    </>
  );
}