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
import AdminDashboard from './components/admin/AdminDashboard';
import ReportIssueWizard from './components/reports/ReportIssueWizard';
import MaintenanceStaffDashboard from './components/maintenance/MaintenanceStaffDashboard';
import { fetchAuthMe, logoutUser } from './services/api';

const isMaintenanceStaffUser = (u) => {
  if (!u) return false;
  return (
    u.role_name === 'supervisor' ||
    u.role_name === 'technician' ||
    u.role_id === 2 ||
    u.role_id === 3
  );
};

export default function App() {
  // Sync view from URL hash if present (#login, #register, #forgot-password, #dashboard, #admin, #report-issue, #maintenance)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue', 'maintenance'].includes(hash)) {
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
        if (hash === 'dashboard' || hash === 'report-issue' || hash === 'admin' || hash === 'maintenance') {
          if ((res.user.role_name === 'admin' || res.user.role_id === 1) && hash === 'dashboard') {
            setCurrentView('admin');
          } else if (isMaintenanceStaffUser(res.user) && (hash === 'dashboard' || hash === 'maintenance')) {
            setCurrentView('maintenance');
          } else {
            setCurrentView(hash);
          }
        }
      } else {
        setCurrentUser(null);
        const hash = window.location.hash.replace('#', '');
        if (['dashboard', 'report-issue', 'admin', 'maintenance'].includes(hash)) {
          setCurrentView('login');
          window.location.hash = 'login';
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'report-issue', 'admin', 'maintenance'].includes(hash) && !currentUser) {
        handleNavigate('login');
        return;
      }
      if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue', 'maintenance'].includes(hash)) {
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

  const handleNavigate = (view, userOverride = null, customLoadingMessage = null) => {
    const activeUser = userOverride || currentUserRef.current || currentUser;

    // Route guard: if trying to access dashboard, report-issue, admin, or maintenance while logged out, redirect to login
    let targetView = view;
    if (['dashboard', 'report-issue', 'admin', 'maintenance'].includes(view) && !activeUser) {
      targetView = 'login';
    }

    if (targetView === currentView && !userOverride) return;

    // Show loading screen when navigating to auth views, dashboard, admin, report-issue, maintenance, or returning home
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin', 'report-issue', 'maintenance'].includes(targetView)) {
      setLoadingMessage(
        customLoadingMessage ||
        (targetView === 'admin'
          ? 'Accessing Super Administrator Portal...'
          : targetView === 'maintenance'
          ? 'Opening Maintenance Staff Dashboard...'
          : targetView === 'register'
          ? 'Opening Student Registration...'
          : targetView === 'dashboard'
          ? 'Opening FixMyCampus Dashboard...'
          : targetView === 'report-issue'
          ? 'Opening Report Issue Wizard...'
          : targetView === 'login' && !activeUser && ['dashboard', 'report-issue', 'admin', 'maintenance'].includes(view)
          ? 'Please log in to FixMyCampus to continue...'
          : 'Accessing FixMyCampus Portal...')
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
      setLoadingMessage(customLoadingMessage || 'Returning to Home...');

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
    if (user?.role_name === 'admin' || user?.role_id === 1) {
      handleNavigate('admin', user);
    } else if (isMaintenanceStaffUser(user)) {
      handleNavigate('maintenance', user);
    } else {
      handleNavigate('dashboard', user);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout request completed with warning:', e);
    }
    currentUserRef.current = null;
    setCurrentUser(null);
    handleNavigate('login', null, 'Signing out of FixMyCampus...');
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

  const isAdminView =
    currentView === 'admin' ||
    (currentView === 'dashboard' && (currentUser?.role_name === 'admin' || currentUser?.role_id === 1));

  const isMaintenanceView =
    currentView === 'maintenance' ||
    (currentView === 'dashboard' && isMaintenanceStaffUser(currentUser));

  return (
    <>
      <LoadingScreen isVisible={isLoading} message={loadingMessage} />

      {/* Super Administrator Facilities Dashboard */}
      {isAdminView && (
        <AdminDashboard
          currentUser={
            currentUser || {
              full_name: 'Campus Administrator',
              role_display: 'Super Administrator',
              role_name: 'admin',
              id: 1,
            }
          }
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Maintenance Staff Dashboard & Job Details */}
      {isMaintenanceView && !isAdminView && (
        <MaintenanceStaffDashboard
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Student / Faculty / Reporter Dashboard */}
      {currentView === 'dashboard' && !isAdminView && !isMaintenanceView && (
        <DashboardPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Report Issue Wizard */}
      {currentView === 'report-issue' && (
        <ReportIssueWizard
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