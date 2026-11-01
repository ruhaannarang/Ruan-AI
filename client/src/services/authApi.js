// authApi.js - Frontend client API for Ruan AI Authentication

const BASE_URL = '/api/auth';

/**
 * Retrieves public Google OAuth client configuration.
 * 
 * @returns {Promise<{ googleClientId: string | null, isConfigured: boolean }>}
 */
export async function fetchAuthConfig() {
  try {
    const res = await fetch(`${BASE_URL}/config`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) {
      return { googleClientId: null, isConfigured: false };
    }
    return await res.json();
  } catch (err) {
    console.warn('[authApi] Failed to fetch auth configuration:', err.message);
    return { googleClientId: null, isConfigured: false };
  }
}

/**
 * Retrieves the currently authenticated user profile from session cookie.
 * 
 * @returns {Promise<{ user: Object | null, error?: Object }>}
 */
export async function fetchCurrentUser() {
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });

    if (res.status === 401) {
      // Unauthenticated - normal initial state
      return { user: null };
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      return {
        user: null,
        error: errorJson?.error || { message: `HTTP ${res.status}` }
      };
    }

    const data = await res.json();
    return { user: data.user || null };
  } catch (err) {
    console.warn('[authApi] Network error fetching current user:', err.message);
    return { user: null, error: { message: err.message, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Submits verified Google Identity Services ID token credential to backend.
 * Backend verifies the token with Google and sets the HttpOnly session cookie.
 * 
 * @param {string} credential - Google ID Token JWT
 * @returns {Promise<{ success: boolean, user?: Object, error?: Object }>}
 */
export async function signInWithGoogle(credential) {
  try {
    const res = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ credential })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || {
          message: `Authentication failed (HTTP ${res.status})`,
          code: 'AUTH_FAILED'
        }
      };
    }

    return {
      success: true,
      user: data.user
    };
  } catch (err) {
    return {
      success: false,
      error: {
        message: err.message || 'Network error during Google authentication',
        code: 'NETWORK_ERROR'
      }
    };
  }
}

/**
 * Terminates the authenticated session and clears the session cookie.
 * 
 * @returns {Promise<{ success: boolean }>}
 */
export async function signOut() {
  try {
    const res = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    return { success: res.ok };
  } catch (err) {
    console.warn('[authApi] Error during sign out:', err.message);
    return { success: false };
  }
}
