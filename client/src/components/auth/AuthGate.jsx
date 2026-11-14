import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthGate.css';

/**
 * Authentication Gate component protecting authenticated routes (e.g. /app).
 * When unauthenticated, displays a premium glassmorphic sign-up & sign-in screen.
 * Once verified, seamlessly renders children.
 */
export default function AuthGate({ children, navigateTo, onOpenDiagnostics }) {
  const {
    user,
    status,
    error,
    isConfigured,
    googleClientId,
    isLoggingIn
  } = useAuth();

  const [localError, setLocalError] = useState(null);
  const googleBtnRef = useRef(null);

  // Render official Google Sign-In button when unauthenticated and configured
  useEffect(() => {
    if (status !== 'unauthenticated' || !isConfigured || !googleClientId) return;

    let isMounted = true;

    const renderGoogleButton = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && googleBtnRef.current && isMounted) {
        try {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280
          });
        } catch (err) {
          console.warn('[AuthGate] Failed to render Google button:', err.message);
        }
      }
    };

    renderGoogleButton();
    const timer = setTimeout(renderGoogleButton, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [status, isConfigured, googleClientId]);

  // Trigger Google One Tap prompt on initial display
  useEffect(() => {
    if (status === 'unauthenticated' && isConfigured && typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {}
    }
  }, [status, isConfigured]);

  // Loading state: verifying active session
  if (status === 'loading') {
    return (
      <div className="auth-gate-loading-wrapper" id="auth-gate-loading">
        <div className="auth-gate-loading-halo" />
        <div className="auth-gate-loading-content">
          <div className="auth-gate-brand-icon">
            <svg viewBox="0 0 112 119" width="48" height="48">
              <path d="M56 0 C25 0 0 25 0 56 C0 87 25 112 56 112 C87 112 112 87 112 56 Z" fill="url(#gate-grad)" />
              <defs>
                <linearGradient id="gate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="auth-gate-loading-spinner" />
          <p className="auth-gate-loading-label font-mono">Verifying authentication session...</p>
        </div>
      </div>
    );
  }

  // Authenticated state: grant access to protected children
  if (status === 'authenticated' && user) {
    return <>{children}</>;
  }

  // Unauthenticated: Render dedicated Authentication Wall & Sign-Up Screen
  return (
    <div className="auth-gate-screen" id="auth-gate-screen">
      {/* Background ambient lighting */}
      <div className="auth-gate-glow auth-gate-glow-top" />
      <div className="auth-gate-glow auth-gate-glow-bottom" />

      {/* Top Navigation */}
      <header className="auth-gate-header">
        <button
          className="auth-gate-back-btn font-mono"
          onClick={() => navigateTo ? navigateTo('/') : window.location.assign('/')}
          type="button"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M12.5 8a.75.75 0 01-.75.75H4.81l3.22 3.22a.75.75 0 01-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 1.06L4.81 7.25h6.94a.75.75 0 01.75.75z" />
          </svg>
          Back to Overview
        </button>

        {onOpenDiagnostics && (
          <button
            className="auth-gate-diag-btn font-mono"
            onClick={onOpenDiagnostics}
            type="button"
            title="System Diagnostics"
          >
            Diagnostics
          </button>
        )}
      </header>

      {/* Main Authentication Card */}
      <main className="auth-gate-main">
        <div className="auth-gate-card">
          <div className="auth-gate-card-badge font-mono">
            <span className="badge-dot" />
            <span>AUTHENTICATION REQUIRED</span>
          </div>

          <div className="auth-gate-card-brand">
            <h1 className="auth-gate-title">
              Sign up to unlock <span className="gradient-text">Ruan AI</span>
            </h1>
            <p className="auth-gate-subtitle">
              Sign in with your Google account to access your personal AI assistant, multi-turn history, local voice streaming, and intelligent workflows.
            </p>
          </div>

          {/* Benefits List */}
          <div className="auth-gate-features-grid">
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <div className="feature-text">
                <strong>Private &amp; Local-First</strong>
                <span>All conversation history and memory are stored safely on your own machine.</span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎙️</span>
              <div className="feature-text">
                <strong>Real-Time Voice Assistant</strong>
                <span>Low-latency speech in English, Hindi, and Hinglish powered by Kokoro 82M.</span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div className="feature-text">
                <strong>Dual LLM Power</strong>
                <span>Run completely offline with local Gemma 4 or tap into online NVIDIA NIM models.</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {(error || localError) && (
            <div className="auth-gate-error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error || localError}</span>
            </div>
          )}

          {/* Google Sign-In Action */}
          <div className="auth-gate-action-box">
            {isConfigured ? (
              <div className="auth-gate-google-wrapper">
                {isLoggingIn ? (
                  <div className="auth-gate-logging-in font-mono">
                    <span className="spinner-small" />
                    <span>Signing in with Google...</span>
                  </div>
                ) : (
                  <>
                    <div ref={googleBtnRef} className="google-signin-btn-slot" />
                    <p className="auth-gate-terms-note font-mono">
                      Secure authentication via Google Identity Services. No passwords stored.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="auth-gate-unconfigured-box font-mono">
                <p className="warning-text">⚠️ Google OAuth Not Configured</p>
                <p className="info-text">
                  Please add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your <code>server/.env</code> file to enable account signup.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="auth-gate-footer font-mono">
        <span>Ruan AI • Local-First Personal AI Assistant</span>
      </footer>
    </div>
  );
}

