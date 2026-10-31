import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from './services/api';
import './styles/App.css';

export default function App() {
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [healthData, setHealthData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Refs for tracking in-flight requests and preventing race conditions / stale updates
  const activeAbortControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  const fetchHealth = useCallback(async () => {
    // Cancel any previous in-flight request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    // Create a new controller for this request
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    // Track request ID to discard stale responses
    const currentRequestId = ++latestRequestIdRef.current;
    setIsRefreshing(true);

    try {
      const result = await checkHealth(controller.signal);

      // If aborted, do not update component state
      if (result.aborted) {
        return;
      }

      // Ignore responses from outdated / superseded requests
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

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
      // Guard against unexpected runtime exceptions
      if (currentRequestId === latestRequestIdRef.current) {
        setHealthStatus('error');
        setHealthData(null);
        setErrorMessage(err.message || 'An unexpected error occurred while checking health.');
      }
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    // Cleanup: cancel in-flight request when component unmounts
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [fetchHealth]);

  return (
    <div className="app-container" id="app-root">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon" aria-hidden="true">🤖</div>
          <div>
            <h1 className="brand-title">Ruan AI</h1>
            <p className="brand-subtitle">Personal AI Operating Companion</p>
          </div>
        </div>
        <div className="phase-pill" id="phase-indicator">
          <span>●</span> Phase 1: Core Foundation
        </div>
      </header>

      {/* Main Server Connection Status Card */}
      <section className={`status-card ${healthStatus}`} id="server-status-card">
        <div className="status-header">
          <div className="status-indicator-group">
            <span className={`status-dot ${healthStatus}`} aria-hidden="true"></span>
            <div className="status-heading-text">
              <h2>
                {healthStatus === 'connected' && 'Express Backend Connected'}
                {healthStatus === 'checking' && 'Connecting to Backend...'}
                {healthStatus === 'error' && 'Express Backend Disconnected'}
              </h2>
              <p>
                {healthStatus === 'connected' && 'Express API Gateway is verified and actively responding via HTTP /api/health.'}
                {healthStatus === 'checking' && 'Checking local loopback service on port 5000...'}
                {healthStatus === 'error' && 'Failed to communicate with Express service.'}
              </p>
            </div>
          </div>

          <button
            className="refresh-button"
            id="btn-refresh-health"
            onClick={fetchHealth}
            disabled={isRefreshing}
            aria-label="Refresh backend health"
          >
            <span className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} aria-hidden="true">↻</span>
            {isRefreshing ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {/* Server Metrics */}
        <div className="metrics-row">
          <div className="metric-item">
            <span className="metric-label">Server Status</span>
            <span className={`metric-badge ${healthStatus === 'connected' ? 'green' : 'red'}`}>
              {healthStatus === 'connected' ? '200 OK' : 'OFFLINE'}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Roundtrip Latency</span>
            <span className="metric-value">
              {latency !== null ? `${latency} ms` : '—'}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Server Uptime</span>
            <span className="metric-value">
              {healthData?.uptime !== undefined ? `${healthData.uptime}s` : '—'}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Last Checked</span>
            <span className="metric-value">{lastChecked || '—'}</span>
          </div>
        </div>

        {/* Error Details Banner */}
        {healthStatus === 'error' && (
          <div className="error-alert-box" id="error-banner">
            <div className="error-alert-title">Connection Error</div>
            <div className="error-alert-desc">{errorMessage}</div>
            <div className="error-alert-help">
              <strong>Remedy:</strong> Open a terminal in <code>server/</code> and run <code>npm run dev</code>, then click Refresh.
            </div>
          </div>
        )}
      </section>

      {/* Decoupled Services Diagnostics Grid */}
      <section aria-labelledby="services-heading">
        <h3 className="section-heading" id="services-heading">
          Decoupled AI Dependencies
        </h3>
        <p className="dependencies-notice">
          The Express server is online. External AI runtimes (LM Studio, STT, TTS) are architecturally decoupled and are currently <strong>uninitialized</strong> pending Phase 1 integration.
        </p>

        <div className="services-grid">
          {/* LM Studio Card */}
          <div className="service-card" id="card-service-lmstudio">
            <div className="service-card-top">
              <span className="service-card-title">🧠 LM Studio Runtime</span>
              <span className={`service-status-pill ${healthData?.services?.lmStudio?.status || 'uninitialized'}`}>
                {healthData?.services?.lmStudio?.status || 'Uninitialized'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Configured Endpoint</span>
                <strong>{healthData?.services?.lmStudio?.endpoint || 'http://localhost:1234/v1'}</strong>
              </div>
              <div className="service-info-row">
                <span>Model Selection</span>
                <strong>{healthData?.services?.lmStudio?.activeModel || 'Not Finalized (To Be Selected)'}</strong>
              </div>
              <div className="service-info-row">
                <span>Readiness</span>
                <span className="metric-badge amber">Pending Connection</span>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.lmStudio?.note || 'Local LLM runtime connection pending Phase 1 integration.'}
            </div>
          </div>

          {/* STT Candidate Card */}
          <div className="service-card" id="card-service-stt">
            <div className="service-card-top">
              <span className="service-card-title">🎙️ Speech-to-Text (STT)</span>
              <span className={`service-status-pill ${healthData?.services?.stt?.status || 'uninitialized'}`}>
                {healthData?.services?.stt?.status || 'Uninitialized'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Evaluated Candidates</span>
                <strong>faster-whisper / whisper.cpp</strong>
              </div>
              <div className="service-info-row">
                <span>Capture Policy</span>
                <strong>Push-to-Talk (Transient)</strong>
              </div>
              <div className="service-info-row">
                <span>Readiness</span>
                <span className="metric-badge amber">Candidate Standby</span>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.stt?.note || 'Speech-to-text candidate engine pending Phase 1 evaluation.'}
            </div>
          </div>

          {/* TTS Candidate Card */}
          <div className="service-card" id="card-service-tts">
            <div className="service-card-top">
              <span className="service-card-title">🔊 Text-to-Speech (TTS)</span>
              <span className={`service-status-pill ${healthData?.services?.tts?.status || 'uninitialized'}`}>
                {healthData?.services?.tts?.status || 'Uninitialized'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Evaluated Candidates</span>
                <strong>Piper / Kokoro</strong>
              </div>
              <div className="service-info-row">
                <span>Delivery Policy</span>
                <strong>Sentence Chunks + Abort</strong>
              </div>
              <div className="service-info-row">
                <span>Readiness</span>
                <span className="metric-badge amber">Candidate Standby</span>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.tts?.note || 'Text-to-speech candidate engine pending Phase 1 evaluation.'}
            </div>
          </div>
        </div>
      </section>

      {/* Raw Payload Collapsible Section */}
      <section className="payload-accordion">
        <button
          className="payload-toggle-btn"
          id="btn-toggle-payload"
          onClick={() => setShowPayload(!showPayload)}
          aria-expanded={showPayload}
        >
          <span>Raw Diagnostics Payload (<code>GET /api/health</code>)</span>
          <span>{showPayload ? '▲ Hide' : '▼ View JSON'}</span>
        </button>

        {showPayload && (
          <pre className="payload-code-block" id="raw-payload-viewer">
            {healthData
              ? JSON.stringify(healthData, null, 2)
              : '// Backend unreachable. No payload received.'}
          </pre>
        )}
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <p>Ruan AI Foundation — Express API Gateway verified. External AI dependencies are uninitialized awaiting Phase 1 integration.</p>
      </footer>
    </div>
  );
}
