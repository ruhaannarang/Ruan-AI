import React, { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth, formatModelDisplayName } from '../../services/api';
import './ModelStatus.css';

export default function ModelStatus({
  selectedProvider = 'nvidia_nim',
  onSelectProvider,
  onOpenDiagnostics
}) {
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'ready' | 'degraded' | 'offline'
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await checkHealth();
      if (!result.success) {
        setHealthStatus('offline');
        setHealthData(null);
      } else {
        const data = result.data;
        setHealthData(data);
        const lmStudio = data?.services?.lmStudio;
        const nvidiaNim = data?.services?.nvidiaNim;

        if (selectedProvider === 'nvidia_nim') {
          if (nvidiaNim?.configured) {
            setHealthStatus('ready');
          } else {
            setHealthStatus('degraded');
          }
        } else {
          if (lmStudio?.status === 'connected' && lmStudio?.modelAvailable) {
            setHealthStatus('ready');
          } else {
            setHealthStatus('degraded');
          }
        }
      }
    } catch {
      setHealthStatus('offline');
      setHealthData(null);
    }
  }, [selectedProvider]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 25000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const lmStudio = healthData?.services?.lmStudio;
  const nvidiaNim = healthData?.services?.nvidiaNim;

  const lmConnected = lmStudio?.status === 'connected';
  const activeLocalModel = lmStudio?.activeModel || 'gemma-4-e2b-it-qat';
  const activeNimModel = nvidiaNim?.activeModel || 'nvidia/nemotron-3.5-bolt-e4b';
  const nimConfigured = Boolean(nvidiaNim?.configured);

  const isNvidia = selectedProvider === 'nvidia_nim';
  const currentModelName = isNvidia ? formatModelDisplayName(activeNimModel) : formatModelDisplayName(activeLocalModel);
  const currentModeTag = isNvidia ? 'Online' : 'Local';

  let dotClass = '';
  if (healthStatus === 'offline') dotClass = 'offline';
  else if (healthStatus === 'degraded') dotClass = 'degraded';

  return (
    <div className="model-status-wrapper" ref={menuRef}>
      <button
        className="model"
        id="model"
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={isNvidia ? 'Active: NVIDIA NIM' : 'Active: LM Studio Local'}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className={`dot ${dotClass}`} />
        <b>{currentModelName}</b>
        <small>{currentModeTag}</small>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Model Selection Menu */}
      <div className={`menu ${menuOpen ? 'open' : ''}`} id="modelMenu" role="menu">
        {/* NVIDIA NIM Option */}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={isNvidia}
          onClick={() => {
            onSelectProvider && onSelectProvider('nvidia_nim');
            setMenuOpen(false);
          }}
        >
          <span className={`dot ${nimConfigured ? '' : 'degraded'}`} />
          <span>
            {formatModelDisplayName(activeNimModel)}
            <br />
            <span className="sub" style={{ margin: 0 }}>
              {nimConfigured ? 'NVIDIA NIM · Online Cloud API' : 'Key required in server/.env'}
            </span>
          </span>
          {isNvidia && (
            <svg className="chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-10" />
            </svg>
          )}
        </button>

        {/* Local LM Studio Option */}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={!isNvidia}
          onClick={() => {
            onSelectProvider && onSelectProvider('local');
            setMenuOpen(false);
          }}
        >
          <span className={`dot ${lmConnected ? '' : 'offline'}`} />
          <span>
            {formatModelDisplayName(activeLocalModel)}
            <br />
            <span className="sub" style={{ margin: 0 }}>
              {lmConnected ? 'LM Studio · Ready on GPU' : 'Local LM Studio Offline'}
            </span>
          </span>
          {!isNvidia && (
            <svg className="chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-10" />
            </svg>
          )}
        </button>

        <div className="sep" />

        {onOpenDiagnostics && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onOpenDiagnostics();
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--violet-soft)' }}>
              Open System Diagnostics →
            </span>
          </button>
        )}

        <div className="hint">
          Toggle between online NVIDIA NIM and 100% offline local model.
        </div>
      </div>
    </div>
  );
}
