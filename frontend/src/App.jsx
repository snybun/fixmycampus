import React from 'react';
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

export default function App() {
  return (
    <div className="landing-app">
      <Navbar />
      <main>
        <Hero />
        <StatsStrip />
        <ProcessSteps />
        <RolesSection />
        <LocationFeature />
        <TimelineFeature />
        <AnalyticsFeature />
        <Testimonial />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
f