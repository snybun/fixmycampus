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
import SettingsPage from './components/dashboard/SettingsPage';
import AccessDeniedView from './components/common/AccessDeniedView';
import MaintenanceStaffDashboard from './components/maintenance/MaintenanceStaffDashboard';
import { fetchAuthMe, logoutUser } from './services/api';

// Role validation helper: Only user records with role_name 'admin' or role_id 1 are administrators
const isUserAdmin = (user) => Boolean(user && (user.role_name === 'admin' || user.role_id === 1));

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
  // Sync view from URL hash if present (#login, #register, #forgot-password, #dashboard, #my-reports, #admin, #report-issue, #settings, #access-denied, #maintenance)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'register', 'forgot-password', 'dashboard', 'my-reports', 'notifications', 'admin', 'report-issue', 'settings', 'access-denied', 'maintenance'].includes(hash)) {
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
        currentUserRef.current = res.user;
        setCurrentUser(res.user);
        const hash = window.location.hash.replace('#', '');
        if (hash === 'admin') {
          if (isUserAdmin(res.user)) {
            setCurrentView('admin');
          } else {
            // Server-side RBAC guard: student or maintenance role cannot access #admin
            setCurrentView('access-denied');
            window.location.hash = 'access-denied';
          }
        } else if (hash === 'dashboard' || hash === 'my-reports' || hash === 'notifications' || hash === 'report-issue' || hash === 'settings' || hash === 'maintenance') {
          if (isUserAdmin(res.user) && (hash === 'dashboard' || hash === 'my-reports')) {
            setCurrentView('admin');
            window.location.hash = 'admin';
          } else if (isMaintenanceStaffUser(res.user) && (hash === 'dashboard' || hash === 'my-reports' || hash === 'maintenance')) {
            setCurrentView('maintenance');
            window.location.hash = 'maintenance';
          } else {
            setCurrentView(hash);
          }
        }
      } else {
        setCurrentUser(null);
        currentUserRef.current = null;
        const hash = window.location.hash.replace('#', '');
        if (['dashboard', 'my-reports', 'report-issue', 'admin', 'settings', 'maintenance', 'access-denied'].includes(hash)) {
          setCurrentView('login');
          window.location.hash = 'login';
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const activeUser = currentUserRef.current || currentUser;

      if (['dashboard', 'my-reports', 'notifications', 'report-issue', 'admin', 'settings', 'maintenance', 'access-denied'].includes(hash) && !activeUser) {
        handleNavigate('login');
        return;
      }

      if (hash === 'admin') {
        if (!isUserAdmin(activeUser)) {
          // Block unauthorized role from #admin URL bypass
          setCurrentView('access-denied');
          window.location.hash = 'access-denied';
          return;
        }
      }

      if (['login', 'register', 'forgot-password', 'dashboard', 'my-reports', 'notifications', 'admin', 'report-issue', 'settings', 'maintenance', 'access-denied'].includes(hash)) {
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

    // Route guard: if trying to access protected views while logged out, redirect to login
    let targetView = view;
    if (['dashboard', 'my-reports', 'report-issue', 'admin', 'settings', 'maintenance', 'access-denied'].includes(view) && !activeUser) {
      targetView = 'login';
    } else if (view === 'admin' && !isUserAdmin(activeUser)) {
      // Non-admin attempting to access #admin is blocked by RBAC
      targetView = 'access-denied';
    } else if (view === 'dashboard' && isMaintenanceStaffUser(activeUser)) {
      targetView = 'maintenance';
    } else if (view === 'dashboard' && isUserAdmin(activeUser)) {
      targetView = 'admin';
    }

    if (targetView === currentView && !userOverride) return;

    // Show loading screen when navigating to auth views, dashboard, my-reports, admin, report-issue, settings, maintenance, or returning home
    if (['login', 'register', 'forgot-password', 'dashboard', 'my-reports', 'admin', 'report-issue', 'settings', 'maintenance', 'access-denied'].includes(targetView)) {
      setLoadingMessage(
        customLoadingMessage ||
        (targetView === 'admin'
          ? 'Verifying Administrator Authorization...'
          : targetView === 'access-denied'
          ? 'Enforcing Role-Based Access Control...'
          : targetView === 'maintenance'
          ? 'Opening Maintenance Staff Dashboard...'
          : targetView === 'register'
          ? 'Opening Student Registration...'
          : targetView === 'dashboard'
          ? 'Opening FixMyCampus Dashboard...'
          : targetView === 'my-reports'
          ? 'Opening My Reports...'
          : targetView === 'report-issue'
          ? 'Opening Report Issue Wizard...'
          : targetView === 'settings'
          ? 'Opening Profile & Account Settings...'
          : targetView === 'login' && !activeUser && ['dashboard', 'my-reports', 'report-issue', 'admin', 'settings', 'maintenance'].includes(view)
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
    if (isUserAdmin(user)) {
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

  const isAdmin = isUserAdmin(currentUser);
  const isAdminView = currentView === 'admin' && isAdmin;

  const isMaintenanceView =
    currentView === 'maintenance' ||
    (currentView === 'dashboard' && isMaintenanceStaffUser(currentUser));

  return (
    <>
      <LoadingScreen isVisible={isLoading} message={loadingMessage} />

      {/* Super Administrator Facilities Dashboard - Strictly Protected by RBAC */}
      {isAdminView && (
        <AdminDashboard
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* 403 Forbidden Access Denied View for Unauthorized #admin Access Attempts */}
      {(currentView === 'access-denied' || (currentView === 'admin' && !isAdmin)) && (
        <AccessDeniedView
          currentUser={currentUser}
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

      {/* Student / Faculty / Reporter Dashboard, My Reports & Notifications */}
      {(currentView === 'dashboard' || currentView === 'my-reports' || currentView === 'notifications') && !isAdminView && !isMaintenanceView && (
        <DashboardPage
          currentUser={currentUser}
          initialTab={currentView === 'my-reports' ? 'my-reports' : currentView === 'notifications' ? 'notifications' : 'home'}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Account Profile & Settings */}
      {currentView === 'settings' && (
        <SettingsPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            currentUserRef.current = updatedUser;
          }}
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