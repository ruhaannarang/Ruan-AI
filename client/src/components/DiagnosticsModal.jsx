import React, { useState } from 'react';
import { playClickSound } from '../services/sound';
import './DiagnosticsModal.css';

export default function DiagnosticsModal({
  isOpen,
  onClose,
  healthStatus,
  healthData,
  latency,
  errorMessage,
  isRefreshing,
  lastChecked,
  onRefresh
}) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!isOpen) return null;

  return (
    <div 
      className="diag-modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diag-modal-title"
    >
      <div 
        className="diag-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="diag-modal-header">
          <div className="diag-header-info">
            <span className="diag-badge font-mono">SYSTEM TELEMETRY // LOCAL NODE</span>
            <h3 id="diag-modal-title" className="diag-title">Express Gateway &amp; AI Subsystems</h3>
          </div>
          <button 
            className="diag-close-btn"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            aria-label="Close diagnostics modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="diag-modal-body">
          {/* Main Status Strip */}
          <div className={`diag-status-strip ${healthStatus}`}>
            <div className="status-meta">
              <span className={`status-dot-indicator ${healthStatus}`}></span>
              <div>
                <h4>
                  {healthStatus === 'connected' && 'Express Backend Gateway Connected'}
                  {healthStatus === 'checking' && 'Connecting to Local Express Gateway...'}
                  {healthStatus === 'error' && 'Express Gateway Disconnected'}
                </h4>
                <p>
                  {healthStatus === 'connected' && 'Express API service is actively listening on local port 5000.'}
                  {healthStatus === 'checking' && 'Verifying local loopback on 127.0.0.1:5000...'}
                  {healthStatus === 'error' && errorMessage}
                </p>
              </div>
            </div>

            <button 
              className="btn-refresh-diag"
              onClick={() => {
                playClickSound();
                onRefresh();
              }}
              disabled={isRefreshing}
            >
              <span className={`refresh-glyph ${isRefreshing ? 'spinning' : ''}`}>↻</span>
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="diag-metrics-grid font-mono">
            <div className="diag-metric-box">
              <span className="m-label">GATEWAY CODE</span>
              <strong className={healthStatus === 'connected' ? 'green' : 'amber'}>
                {healthStatus === 'connected' ? '200 OK' : 'STANDBY'}
              </strong>
            </div>
            <div className="diag-metric-box">
              <span className="m-label">LOOPBACK LATENCY</span>
              <strong>{latency !== null ? `${latency} ms` : '—'}</strong>
            </div>
            <div className="diag-metric-box">
              <span className="m-label">UPTIME</span>
              <strong>{healthData?.uptime !== undefined ? `${healthData.uptime}s` : '—'}</strong>
            </div>
            <div className="diag-metric-box">
              <span className="m-label">LAST CHECKED</span>
              <strong>{lastChecked || '—'}</strong>
            </div>
          </div>

          {/* Decoupled Subsystems Grid */}
          <div className="subsystems-section">
            <h4 className="subsystems-heading font-mono">DECOUPLED AI SUBSYSTEM READINESS</h4>
            <div className="subsystems-grid">
              {/* LM Studio */}
              <div className="subsystem-card">
                <div className="subsystem-top font-mono">
                  <span>🧠 LM STUDIO RUNTIME</span>
                  <span className={`pill ${healthData?.services?.lmStudio?.status || 'uninitialized'}`}>
                    {healthData?.services?.lmStudio?.status === 'connected' ? '● ONLINE' : (healthData?.services?.lmStudio?.status?.toUpperCase() || 'UNINITIALIZED')}
                  </span>
                </div>
                <div className="subsystem-props font-mono">
                  <div><span>ENDPOINT:</span> <strong>{healthData?.services?.lmStudio?.endpoint || 'http://localhost:1234/v1'}</strong></div>
                  <div>
                    <span>ACTIVE MODEL:</span> 
                    <strong className={healthData?.services?.lmStudio?.modelAvailable ? 'green' : 'amber'}>
                      {healthData?.services?.lmStudio?.activeModel || 'gemma-4-e2b-it-qat'} {healthData?.services?.lmStudio?.modelAvailable ? '✓' : '(UNLOADED)'}
                    </strong>
                  </div>
                </div>
                <p className="subsystem-note">
                  {healthData?.services?.lmStudio?.error || (healthData?.services?.lmStudio?.status === 'connected' ? 'Model verified and active in LM Studio. Ready for streaming inference.' : 'Local LLM runtime connection pending Phase 1 integration.')}
                </p>
              </div>

              {/* STT */}
              <div className="subsystem-card">
                <div className="subsystem-top font-mono">
                  <span>🎙️ SPEECH-TO-TEXT</span>
                  <span className={`pill ${healthData?.services?.stt?.status === 'ready' ? 'connected' : (healthData?.services?.stt?.status || 'uninitialized')}`}>
                    {healthData?.services?.stt?.status === 'ready' ? '● READY' : (healthData?.services?.stt?.status?.toUpperCase() || 'UNINITIALIZED')}
                  </span>
                </div>
                <div className="subsystem-props font-mono">
                  <div><span>ENGINE:</span> <strong>{healthData?.services?.stt?.candidate || 'faster-whisper'} ({healthData?.services?.stt?.model || 'small'}, {healthData?.services?.stt?.computeType || 'int8'})</strong></div>
                  <div><span>DEVICE:</span> <strong>CPU ({healthData?.services?.stt?.device || 'cpu'}) • Push-to-Talk</strong></div>
                </div>
                <p className="subsystem-note">
                  {healthData?.services?.stt?.error || (healthData?.services?.stt?.status === 'ready' ? 'faster-whisper active with auto-multilingual Hinglish & English transcription.' : 'Speech-to-text service offline or uninitialized.')}
                </p>
              </div>

              {/* TTS */}
              <div className="subsystem-card">
                <div className="subsystem-top font-mono">
                  <span>🔊 TEXT-TO-SPEECH</span>
                  <span className={`pill ${healthData?.services?.tts?.status === 'ready' ? 'connected' : (healthData?.services?.tts?.status || 'uninitialized')}`}>
                    {healthData?.services?.tts?.status === 'ready' ? '● READY' : (healthData?.services?.tts?.status?.toUpperCase() || 'UNINITIALIZED')}
                  </span>
                </div>
                <div className="subsystem-props font-mono">
                  <div><span>ENGINE:</span> <strong>{healthData?.services?.tts?.provider || 'Kokoro 82M'}</strong></div>
                  <div><span>VOICE:</span> <strong>{healthData?.services?.tts?.voice || 'hf_alpha'} (Hinglish/Hindi/English)</strong></div>
                </div>
                <p className="subsystem-note">
                  {healthData?.services?.tts?.error || (healthData?.services?.tts?.status === 'ready' ? 'Kokoro-82M ONNX active with sentence chunking and interruption support.' : 'Text-to-speech service offline or uninitialized.')}
                </p>
              </div>
            </div>
          </div>

          {/* Raw JSON Payload Collapsible */}
          <div className="raw-payload-box">
            <button 
              className="btn-toggle-json font-mono"
              onClick={() => {
                playClickSound();
                setShowRawJson(!showRawJson);
              }}
            >
              <span>Raw Health JSON Payload</span>
              <span>{showRawJson ? '▲ Hide' : '▼ View Payload'}</span>
            </button>

            {showRawJson && (
              <pre className="json-block font-mono">
                {healthData 
                  ? JSON.stringify(healthData, null, 2) 
                  : '// Gateway unreachable. Ensure server is running on port 5000.'}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="diag-modal-footer font-mono">
          <span>ENDPOINT: GET /api/health (BINDING: 127.0.0.1:5000)</span>
          <button 
            className="btn-diag-done"
            onClick={() => {
              playClickSound();
              onClose();
            }}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
