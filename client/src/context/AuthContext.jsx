import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthConfig, fetchCurrentUser, signInWithGoogle, signOut } from '../services/authApi';

const AuthContext = createContext(null);

/**
 * Provider managing global Google Authentication state, user profile restoration,
 * Google Identity Services script lifecycle, and session invalidation.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const gisInitializedRef = useRef(false);

  /**
   * Refreshes the currently active session from the backend.
   */
  const refreshUser = useCallback(async () => {
    try {
      const { user: currentUser, error: userError } = await fetchCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
        setError(null);
      } else {
        setUser(null);
        setStatus('unauthenticated');
        if (userError && userError.code !== 'UNAUTHORIZED') {
          setError(userError.message || null);
        }
      }
    } catch (err) {
      setUser(null);
      setStatus('unauthenticated');
      setError(err.message || 'Failed to verify session');
    }
  }, []);

  /**
   * Authenticates using a Google Identity Services ID token credential.
   */
  const loginWithCredential = useCallback(async (credential) => {
    if (!credential) return { success: false, error: 'Empty credential' };

    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await signInWithGoogle(credential);
      if (result.success && result.user) {
        setUser(result.user);
        setStatus('authenticated');
        setError(null);
        setIsLoggingIn(false);
        return { success: true, user: result.user };
      } else {
        const errorMsg = result.error?.message || 'Google authentication failed';
        setError(errorMsg);
        setIsLoggingIn(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || 'Unexpected authentication error';
      setError(errorMsg);
      setIsLoggingIn(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Signs the user out locally and terminates the backend session.
   */
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('[AuthContext] Error during sign out:', err.message);
    } finally {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.disableAutoSelect();
        } catch {}
      }
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
    }
  }, []);

  // Initial load: Fetch server auth config and restore existing session
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // 1. Fetch server config
        const configData = await fetchAuthConfig();
        if (isMounted) {
          setIsConfigured(Boolean(configData.isConfigured));
          setGoogleClientId(configData.googleClientId || null);
        }

        // 2. Check existing session
        const { user: existingUser } = await fetchCurrentUser();
        if (isMounted) {
          if (existingUser) {
            setUser(existingUser);
            setStatus('authenticated');
          } else {
            setUser(null);
            setStatus('unauthenticated');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[AuthContext] Initialization error:', err);
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load and initialize Google Identity Services script when googleClientId is available
  useEffect(() => {
    if (!googleClientId || gisInitializedRef.current) return;

    if (typeof window === 'undefined') return;

    const scriptId = 'google-identity-services-sdk';
    let script = document.getElementById(scriptId);

    const initGis = () => {
      if (window.google?.accounts?.id && !gisInitializedRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response?.credential) {
                loginWithCredential(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true
          });
          gisInitializedRef.current = true;
        } catch (err) {
          console.warn('[AuthContext] Google Identity Services init warning:', err.message);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.head.appendChild(script);
    } else {
      initGis();
    }
  }, [googleClientId, loginWithCredential]);

  const value = {
    user,
    status,
    error,
    isConfigured,
    googleClientId,
    isLoggingIn,
    loginWithCredential,
    signOut: handleSignOut,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access Ruan AI authentication context.
 * Returns safe defaults if accessed outside provider (e.g. isolated test environments).
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      status: 'unauthenticated',
      error: null,
      isConfigured: false,
      googleClientId: null,
      isLoggingIn: false,
      loginWithCredential: async () => ({ success: false, error: 'Auth not initialized' }),
      signOut: async () => ({ success: true }),
      refreshUser: async () => {}
    };
  }
  return context;
}
