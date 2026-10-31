import React, { useState, useEffect } from 'react';
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

  const fetchHealth = async () => {
    setIsRefreshing(true);
    const result = await checkHealth();

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
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

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
                {healthStatus === 'connected' && 'API Gateway is online and responding via HTTP /api/health.'}
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
            <span className="metric-label">Status Code</span>
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
          Decoupled AI Services Architecture
        </h3>

        <div className="services-grid">
          {/* LM Studio Card */}
          <div className="service-card" id="card-service-lmstudio">
            <div className="service-card-top">
              <span className="service-card-title">🧠 LM Studio Runtime</span>
              <span className="service-status-pill standby">
                {healthData?.services?.lmStudio?.status || 'Standby'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Endpoint</span>
                <strong>{healthData?.services?.lmStudio?.endpoint || 'http://localhost:1234/v1'}</strong>
              </div>
              <div className="service-info-row">
                <span>Model Profile</span>
                <strong>Configurable (7B Q4)</strong>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.lmStudio?.note || 'Pending Phase 1 streaming integration.'}
            </div>
          </div>

          {/* STT Candidate Card */}
          <div className="service-card" id="card-service-stt">
            <div className="service-card-top">
              <span className="service-card-title">🎙️ Speech-to-Text</span>
              <span className="service-status-pill standby">
                {healthData?.services?.stt?.status || 'Candidate Standby'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Candidates</span>
                <strong>faster-whisper / whisper.cpp</strong>
              </div>
              <div className="service-info-row">
                <span>Capture Mode</span>
                <strong>Push-to-Talk (Transient)</strong>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.stt?.note || 'Awaiting Phase 1 local hardware benchmark.'}
            </div>
          </div>

          {/* TTS Candidate Card */}
          <div className="service-card" id="card-service-tts">
            <div className="service-card-top">
              <span className="service-card-title">🔊 Text-to-Speech</span>
              <span className="service-status-pill standby">
                {healthData?.services?.tts?.status || 'Candidate Standby'}
              </span>
            </div>
            <div className="service-info-list">
              <div className="service-info-row">
                <span>Candidates</span>
                <strong>Piper / Kokoro</strong>
              </div>
              <div className="service-info-row">
                <span>Output Mode</span>
                <strong>Sentence Chunks + Abort</strong>
              </div>
            </div>
            <div className="service-note">
              {healthData?.services?.tts?.note || 'Awaiting Phase 1 latency evaluation.'}
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
        <p>Ruan AI Foundation — Monorepo Architecture verified. Ready for Phase 1 streaming & voice integration.</p>
      </footer>
    </div>
  );
}
