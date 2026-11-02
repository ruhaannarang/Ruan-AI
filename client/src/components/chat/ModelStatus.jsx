import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from '../../services/api';
import './ModelStatus.css';

export default function ModelStatus({ onOpenDiagnostics }) {
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'ready' | 'degraded' | 'offline'
  const [latency, setLatency] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await checkHealth();
      setLatency(result.latencyMs);

      if (!result.success) {
        setHealthStatus('offline');
        setHealthData(null);
      } else {
        const data = result.data;
        setHealthData(data);
        const lmStudio = data?.services?.lmStudio;
        if (lmStudio?.status === 'connected' && lmStudio?.modelAvailable) {
          setHealthStatus('ready');
        } else if (lmStudio?.status === 'connected') {
          setHealthStatus('degraded');
        } else {
          setHealthStatus('degraded');
        }
      }
    } catch {
      setHealthStatus('offline');
      setHealthData(null);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Poll every 20 seconds (avoid excessively frequent polling)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [popoverOpen]);

  const lmConnected = healthData?.services?.lmStudio?.status === 'connected';
  const modelAvailable = healthData?.services?.lmStudio?.modelAvailable;
  const activeModel = healthData?.services?.lmStudio?.activeModel || 'gemma-4-e2b-it-qat';

  return (
    <div className="model-status-wrapper" ref={popoverRef}>
      <button
        className={`model-status-pill status-${healthStatus}`}
        onClick={() => setPopoverOpen(!popoverOpen)}
        aria-label="View AI system connection status"
        aria-expanded={popoverOpen}
        type="button"
      >
        <span className="status-indicator-dot" aria-hidden="true" />
        <span className="status-pill-text font-mono">
          {healthStatus === 'ready' && `${activeModel} • Local`}
          {healthStatus === 'degraded' && (!lmConnected ? 'LM Studio Offline' : 'Model Standby')}
          {healthStatus === 'offline' && 'Backend Offline'}
          {healthStatus === 'checking' && 'Connecting...'}
        </span>
        <svg className="pill-chevron" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" />
        </svg>
      </button>

      {/* Popover Breakdown */}
      {popoverOpen && (
        <div className="model-status-popover" role="dialog" aria-label="System Connectivity Details">
          <div className="popover-header">
            <span className="popover-title">Local Runtime Status</span>
            <button
              className={`popover-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={fetchStatus}
              title="Refresh status"
              type="button"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="refresh-icon">
                <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z" />
                <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z" />
              </svg>
            </button>
          </div>

          <div className="popover-items">
            {/* Express Server */}
            <div className="popover-item">
              <div className="item-label-row">
                <span className={`mini-dot ${healthStatus !== 'offline' ? 'connected' : 'disconnected'}`} />
                <span className="item-name">Express Backend</span>
              </div>
              <span className="item-value font-mono">
                {healthStatus !== 'offline' ? `127.0.0.1:5000 (${latency || 0}ms)` : 'Unreachable'}
              </span>
            </div>

            {/* LM Studio */}
            <div className="popover-item">
              <div className="item-label-row">
                <span className={`mini-dot ${lmConnected ? 'connected' : 'disconnected'}`} />
                <span className="item-name">LM Studio Gateway</span>
              </div>
              <span className="item-value font-mono">
                {lmConnected ? 'localhost:1234/v1' : 'Offline / Stopped'}
              </span>
            </div>

            {/* Active Model */}
            <div className="popover-item">
              <div className="item-label-row">
                <span className={`mini-dot ${modelAvailable ? 'connected' : 'disconnected'}`} />
                <span className="item-name">Model</span>
              </div>
              <span className="item-value font-mono">
                {activeModel} {modelAvailable ? '(Ready)' : '(Unavailable)'}
              </span>
            </div>

            {/* STT Engine */}
            <div className="popover-item">
              <div className="item-label-row">
                <span className={`mini-dot ${healthData?.services?.stt?.status === 'ready' ? 'connected' : 'disconnected'}`} />
                <span className="item-name">STT (faster-whisper)</span>
              </div>
              <span className="item-value font-mono">
                {healthData?.services?.stt?.status === 'ready' ? `${healthData?.services?.stt?.model || 'small'} (Ready)` : 'Offline'}
              </span>
            </div>

            {/* TTS Engine */}
            <div className="popover-item">
              <div className="item-label-row">
                <span className={`mini-dot ${healthData?.services?.tts?.status === 'ready' ? 'connected' : 'disconnected'}`} />
                <span className="item-name">TTS (Kokoro 82M)</span>
              </div>
              <span className="item-value font-mono">
                {healthData?.services?.tts?.status === 'ready' ? `${healthData?.services?.tts?.voice || 'hf_alpha'} (Ready)` : 'Offline'}
              </span>
            </div>
          </div>

          {onOpenDiagnostics && (
            <div className="popover-footer">
              <button
                type="button"
                className="popover-diagnostics-btn font-mono"
                onClick={() => {
                  setPopoverOpen(false);
                  onOpenDiagnostics();
                }}
              >
                Open Full System Diagnostics →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
