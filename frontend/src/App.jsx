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
import LoadingScreen from './components/common/LoadingScreen';

import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import DashboardPage from './components/dashboard/DashboardPage';
import AdminDashboard from './components/admin/AdminDashboard';
import { fetchAuthMe, logoutUser } from './services/api';

export default function App() {
  // Sync view from URL hash if present (#login, #register, #forgot-password, #dashboard, #admin)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin'].includes(hash)) {
      return hash;
    }
    return 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Accessing FixMyCampus Portal...');

  // Check existing session on mount
  useEffect(() => {
    fetchAuthMe().then((res) => {
      if (res && res.authenticated && res.user) {
        setCurrentUser(res.user);
        const hash = window.location.hash.replace('#', '');
        if (hash === 'dashboard' || hash === 'admin') {
          if (res.user.role_name === 'admin' || res.user.role_id === 1 || hash === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('dashboard');
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['login', 'register', 'forgot-password', 'dashboard', 'admin'].includes(hash)) {
        setCurrentView(hash);
      } else if (!hash || hash === 'landing') {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const handleNavigate = (view) => {
    if (view === currentView) return;

    // Show loading screen when navigating to auth views, dashboard, admin or returning home
    if (['login', 'register', 'forgot-password', 'dashboard', 'admin'].includes(view)) {
      setLoadingMessage(
        view === 'admin'
          ? 'Accessing Super Administrator Portal...'
          : view === 'register'
          ? 'Opening Student Registration...'
          : view === 'dashboard'
          ? 'Opening FixMyCampus Dashboard...'
          : 'Accessing FixMyCampus Portal...'
      );
      setIsLoading(true);

      setTimeout(() => {
        setCurrentView(view);
        window.location.hash = view;
        window.scrollTo({ top: 0 });

        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }, 550);
    } else {
      setIsLoading(true);
      setLoadingMessage('Returning to Home...');

      setTimeout(() => {
        setCurrentView('landing');
        window.history.pushState(null, '', window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          setIsLoading(false);
        }, 250);
      }, 400);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user?.role_name === 'admin' || user?.role_id === 1) {
      handleNavigate('admin');
    } else {
      handleNavigate('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout request completed with warning:', e);
    }
    setCurrentUser(null);
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

  const isAdminView =
    currentView === 'admin' ||
    (currentView === 'dashboard' && (currentUser?.role_name === 'admin' || currentUser?.role_id === 1));

  return (
    <>
      <LoadingScreen isVisible={isLoading} message={loadingMessage} />

      {/* Super Administrator Facilities Dashboard */}
      {isAdminView && (
        <AdminDashboard
          currentUser={
            currentUser || {
              full_name: 'Admin User',
              role_display: 'Super Administrator',
              role_name: 'admin',
              id: 1,
            }
          }
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Student / Faculty / Reporter Dashboard */}
      {currentView === 'dashboard' && !isAdminView && (
        <DashboardPage
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
      )}
    </>
  );
}