import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from './services/api';

// Components
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Capabilities from './components/Capabilities';
import Architecture from './components/Architecture';
import Privacy from './components/Privacy';
import Documentation from './components/Documentation';
import Roadmap from './components/Roadmap';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import DiagnosticsModal from './components/DiagnosticsModal';

import './styles/App.css';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const alreadyVisited = sessionStorage.getItem('ruan_initialized') === 'true';
        return prefersReducedMotion || alreadyVisited;
      }
    } catch {}
    return false;
  });
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Health and Gateway Telemetry State
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [healthData, setHealthData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const activeAbortControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  const fetchHealth = useCallback(async () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = ++latestRequestIdRef.current;
    setIsRefreshing(true);

    try {
      const result = await checkHealth(controller.signal);

      if (result.aborted) return;
      if (currentRequestId !== latestRequestIdRef.current) return;

      if (result.success) {
        setHealthStatus('connected');
        setHealthData(result.data);
        setLatency(result.latencyMs);
        setErrorMessage(null);
      } else {
        setHealthStatus('error');
        setHealthData(null);
        setLatency(result.latencyMs);
        setErrorMessage(result.error);
      }

      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      if (currentRequestId === latestRequestIdRef.current) {
        setHealthStatus('error');
        setHealthData(null);
        setErrorMessage(err.message || 'An unexpected error occurred while communicating with Express backend.');
      }
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [fetchHealth]);

  const handleScrollToDocs = () => {
    const el = document.getElementById('docs');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToCapabilities = () => {
    const el = document.getElementById('capabilities');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="ruan-app" id="ruan-app-root">
      {/* Cinematic Animated Initialization Screen */}
      {!isInitialized && (
        <LoadingScreen onComplete={() => setIsInitialized(true)} />
      )}

      {/* Main Website Experience */}
      <div className={`site-content ${isInitialized ? 'visible' : 'initial-hidden'}`}>
        {/* Navigation */}
        <Navbar 
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          backendConnected={healthStatus === 'connected'}
          latency={latency}
        />

        <main id="main-content">
          {/* Section 2: Hero */}
          <Hero 
            onExploreDocs={handleScrollToDocs}
            onExploreCapabilities={handleScrollToCapabilities}
          />

          {/* Section 3: About Ruan AI */}
          <About />

          {/* Section 4: Core Capabilities */}
          <Capabilities />

          {/* Section 5: Modular Architecture */}
          <Architecture />

          {/* Section 6: Privacy and Security */}
          <Privacy />

          {/* Section 7: Documentation */}
          <Documentation />

          {/* Section 8: Roadmap */}
          <Roadmap />

          {/* Section 9: Final CTA */}
          <FinalCTA 
            onExploreDocs={handleScrollToDocs}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />
        </main>

        {/* Section 10: Footer */}
        <Footer onExploreDocs={handleScrollToDocs} />

        {/* Live Diagnostics Modal */}
        <DiagnosticsModal 
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
          healthStatus={healthStatus}
          healthData={healthData}
          latency={latency}
          errorMessage={errorMessage}
          isRefreshing={isRefreshing}
          lastChecked={lastChecked}
          onRefresh={fetchHealth}
        />
      </div>
    </div>
  );
}
