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
import ChatPage from './pages/ChatPage';

import './styles/App.css';

/**
 * Explicitly resolves the active route from window pathname.
 * Permitted canonical routes:
 *   '/' -> 'home'
 *   '/app' -> 'app'
 * Any unrecognized route -> 'not-found'
 * 
 * @param {string} pathname
 * @returns {{ type: 'home' | 'app' | 'not-found', path: string }}
 */
function resolveRoute(pathname = '/') {
  // Strip search parameters, hash fragments, and trailing slashes
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') {
    return { type: 'home', path: '/' };
  }
  if (clean === '/app') {
    return { type: 'app', path: '/app' };
  }
  return { type: 'not-found', path: clean };
}

export default function App() {
  // Explicit route resolution: 'home' | 'app' | 'not-found'
  const [routeInfo, setRouteInfo] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return resolveRoute(window.location.pathname);
      }
    } catch {}
    return { type: 'home', path: '/' };
  });

  const [isInitialized, setIsInitialized] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const resolved = resolveRoute(window.location.pathname);
        if (resolved.type === 'app') return true;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const alreadyVisited = sessionStorage.getItem('ruan_initialized') === 'true';
        return prefersReducedMotion || alreadyVisited;
      }
    } catch {}
    return false;
  });
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Sync state with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setRouteInfo(resolveRoute(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setRouteInfo(resolveRoute(path));
      window.scrollTo(0, 0);
    }
  }, []);

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
      {/* Route 1: /app (Dedicated Conversation Application) */}
      {routeInfo.type === 'app' && (
        <ChatPage
          navigateTo={navigateTo}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}

      {/* Route 2: / (Canonical Public Landing Page) */}
      {routeInfo.type === 'home' && (
        <>
          {/* Cinematic Animated Initialization Screen (Landing Page only) */}
          {!isInitialized && (
            <LoadingScreen onComplete={() => setIsInitialized(true)} />
          )}

          {/* Main Website Experience */}
          <div className={`site-content ${isInitialized ? 'visible' : 'initial-hidden'}`}>
            {/* Navigation */}
            <Navbar 
              onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
              onLaunchApp={() => navigateTo('/app')}
            />

            <main id="main-content">
              {/* Section 2: Hero */}
              <Hero 
                onExploreDocs={handleScrollToDocs}
                onExploreCapabilities={handleScrollToCapabilities}
                onLaunchApp={() => navigateTo('/app')}
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
                onLaunchApp={() => navigateTo('/app')}
              />
            </main>

            {/* Section 10: Footer */}
            <Footer onExploreDocs={handleScrollToDocs} />
          </div>
        </>
      )}

      {/* Route 3: Deliberate 404 Fallback for Unrecognized Paths */}
      {routeInfo.type === 'not-found' && (
        <div className="route-fallback-screen" role="alert">
          <div className="fallback-badge font-mono">404 • UNRECOGNIZED ROUTE</div>
          <h1 className="fallback-heading">Route Not Found</h1>
          <p className="fallback-description">
            The path <code className="fallback-path-code font-mono">{routeInfo.path}</code> does not map to any active application route in Ruan AI.
          </p>
          <div className="fallback-actions">
            <button
              className="fallback-btn-primary"
              onClick={() => navigateTo('/')}
              type="button"
            >
              Return to Overview (/)
            </button>
            <button
              className="fallback-btn-secondary"
              onClick={() => navigateTo('/app')}
              type="button"
            >
              Open Ruan AI App (/app)
            </button>
          </div>
        </div>
      )}

      {/* Live Diagnostics Modal - Rendered outside transformed container for correct viewport positioning */}
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
  );
}
