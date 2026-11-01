import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserMenu.css';

/**
 * Polished, native account identity and Google authentication component for Ruan AI.
 * 
 * Supports:
 * - Subtle "Sign in with Google" entry point before auth
 * - Official Google Identity Services button integration
 * - Help dialog when GOOGLE_CLIENT_ID is unconfigured
 * - Profile avatar with fallback initial letters
 * - Sleek glassmorphic account details popover with sign-out
 */
export default function UserMenu({ compact = false }) {
  const {
    user,
    status,
    isConfigured,
    googleClientId,
    isLoggingIn,
    loginWithCredential,
    signOut
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const menuRef = useRef(null);
  const googleBtnContainerRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Reset avatar error state when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.picture]);

  // Render official Google Sign-In button into hidden/custom container when configured
  useEffect(() => {
    if (status !== 'unauthenticated' || !isConfigured || !googleClientId) return;

    const renderBtn = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'medium',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left'
          });
        } catch (err) {
          console.warn('[UserMenu] Error rendering Google button:', err.message);
        }
      }
    };

    renderBtn();
    const timer = setTimeout(renderBtn, 500);
    return () => clearTimeout(timer);
  }, [status, isConfigured, googleClientId]);

  // Trigger Google One Tap or prompt
  const handleSignInClick = () => {
    if (!isConfigured) {
      setShowConfigModal(true);
      return;
    }

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If One Tap is skipped or dismissed, click the rendered button container
            const btn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
            if (btn) btn.click();
          }
        });
      } catch {
        const btn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
        if (btn) btn.click();
      }
    }
  };

  // Generate fallback avatar initials
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Format date helper
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  // 1. Loading state: sleek skeleton placeholder to avoid layout shift
  if (status === 'loading') {
    return (
      <div className="ruan-user-menu-wrapper" aria-busy="true">
        <div className="user-menu-skeleton" title="Loading authentication status" />
      </div>
    );
  }

  // 2. Authenticated state: User avatar with dropdown popover
  if (status === 'authenticated' && user) {
    const initials = getInitials(user.name, user.email);

    return (
      <div className="ruan-user-menu-wrapper" ref={menuRef}>
        <button
          className={`user-avatar-trigger-btn ${compact ? 'compact' : 'full-profile'} ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`Account menu for ${user.name}`}
          title={`${user.name} (${user.email})`}
          type="button"
        >
          {compact ? (
            <>
              {user.picture && !avatarError ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="user-avatar-img"
                  onError={() => setAvatarError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="user-avatar-fallback font-mono" aria-hidden="true">
                  {initials}
                </span>
              )}
              <span className="user-online-pip" title="Active session" />
            </>
          ) : (
            <>
              <div className="user-avatar-pip-wrapper">
                {user.picture && !avatarError ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="user-avatar-img"
                    onError={() => setAvatarError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="user-avatar-fallback font-mono" aria-hidden="true">
                    {initials}
                  </span>
                )}
                <span className="user-online-pip" title="Active session" />
              </div>

              <div className="user-trigger-info">
                <span className="user-trigger-name" title={user.name}>
                  {user.name}
                </span>
                {user.email && (
                  <span className="user-trigger-email" title={user.email}>
                    {user.email}
                  </span>
                )}
              </div>

              <svg viewBox="0 0 16 16" fill="currentColor" className="user-trigger-chevron" aria-hidden="true">
                <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 01-1.06 0L8 7.06 5.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06z" />
              </svg>
            </>
          )}
        </button>

        {/* Polished Glassmorphic Dropdown Popover */}
        {isOpen && (
          <div className="user-dropdown-popover" role="dialog" aria-label="Account details">
            {/* Popover Header with Identity */}
            <div className="dropdown-identity-header">
              <div className="identity-avatar-container">
                {user.picture && !avatarError ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="identity-large-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="identity-large-fallback font-mono">
                    {initials}
                  </div>
                )}
              </div>
              <div className="identity-text-group">
                <div className="identity-full-name" title={user.name}>
                  {user.name}
                </div>
                <div className="identity-email" title={user.email}>
                  {user.email}
                </div>
                <div className="identity-status-badge">
                  <span className="status-badge-dot" />
                  <span className="status-badge-text font-mono">Google Verified</span>
                </div>
              </div>
            </div>

            <div className="dropdown-divider" />

            {/* Account Metadata */}
            <div className="dropdown-telemetry-section">
              <div className="telemetry-item">
                <span className="telemetry-label font-mono">CONNECTED</span>
                <span className="telemetry-value font-mono">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>

            <div className="dropdown-divider" />

            {/* Dropdown Action: Sign Out */}
            <div className="dropdown-actions-section">
              <button
                className="dropdown-signout-btn"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                type="button"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="signout-icon">
                  <path fillRule="evenodd" d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5H6.75a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72z" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Unauthenticated state: Subtle "Sign in with Google" button
  return (
    <div className="ruan-user-menu-wrapper" ref={menuRef}>
      {/* Hidden offscreen container holding Google's native button */}
      <div 
        ref={googleBtnContainerRef} 
        style={{ display: 'none' }} 
        aria-hidden="true" 
      />

      <button
        className="google-signin-btn font-mono"
        onClick={handleSignInClick}
        disabled={isLoggingIn}
        title={isConfigured ? 'Sign in with your Google Account' : 'Setup Google Authentication'}
        type="button"
      >
        {isLoggingIn ? (
          <>
            <span className="signin-spinner" aria-hidden="true" />
            <span className="signin-text">Connecting...</span>
          </>
        ) : (
          <>
            {/* Official Google G Logo Mark SVG */}
            <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="signin-text">{compact ? 'Sign in' : 'Sign in with Google'}</span>
          </>
        )}
      </button>

      {/* Helpful Configuration Guidance Modal if Google OAuth is unconfigured */}
      {showConfigModal && (
        <div className="auth-config-modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="auth-config-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="modal-title">
            <div className="config-modal-header">
              <div className="config-modal-icon-wrap" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="key-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <h3 className="config-modal-title" id="modal-title">Google Authentication Setup</h3>
                <p className="config-modal-subtitle">Configure your Google Cloud OAuth Client ID to activate local sign-in.</p>
              </div>
              <button 
                className="config-modal-close" 
                onClick={() => setShowConfigModal(false)}
                aria-label="Close dialog"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="config-modal-body">
              <p className="config-step-intro">
                Ruan AI is ready for Google OAuth 2.0. Follow these three quick steps in your local setup:
              </p>

              <ol className="config-steps-list">
                <li>
                  <strong>Create OAuth Client:</strong> In the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>, create a <em>Web Application</em> OAuth 2.0 Client ID.
                </li>
                <li>
                  <strong>Add Authorized Origins:</strong> Add <code>http://localhost:5173</code> and <code>http://127.0.0.1:5173</code> to <em>Authorized JavaScript Origins</em>.
                </li>
                <li>
                  <strong>Set Environment Variable:</strong> Paste your client ID into <code>c:\Ruan-AI\server\.env</code>:
                  <pre className="config-code-snippet font-mono">GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com</pre>
                </li>
              </ol>

              <p className="config-footer-note">
                Once configured, restart the backend server. Your Google profile picture, name, and email will display automatically upon signing in.
              </p>
            </div>

            <div className="config-modal-actions">
              <button 
                className="config-modal-btn font-mono" 
                onClick={() => setShowConfigModal(false)}
                type="button"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
