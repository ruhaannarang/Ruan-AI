import { config } from '../config/index.js';
import { authService } from '../services/authService.js';

/**
 * Controller for Google Authentication, user profile retrieval, and session termination.
 */

/**
 * GET /api/auth/config
 * Returns public OAuth configuration to allow frontend to initialize Google Identity Services.
 */
export function getAuthConfig(req, res) {
  res.status(200).json({
    googleClientId: config.auth.googleClientId || null,
    isConfigured: authService.isConfigured()
  });
}

/**
 * POST /api/auth/google
 * Accepts Google Identity Services ID token credential, verifies with Google,
 * upserts the user profile, issues a secure HttpOnly session cookie, and returns user identity.
 */
export async function handleGoogleAuth(req, res, next) {
  try {
    const { credential } = req.body || {};

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        error: {
          message: "Missing Google ID token 'credential' in request body.",
          code: 'INVALID_CREDENTIAL',
          details: null
        }
      });
    }

    // Verify cryptographic signature and claims with Google
    const verifiedProfile = await authService.verifyGoogleIdToken(credential);

    // Upsert canonical user identity in SQLite
    const user = authService.upsertUserFromGoogle(verifiedProfile);

    // Generate persistent session in SQLite
    const { token } = authService.createSession(user.id);

    // Set secure HttpOnly session cookie
    res.cookie(config.auth.sessionCookieName, token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: config.auth.sessionMaxAgeMs
    });

    return res.status(200).json({
      success: true,
      user: authService.formatUserResponse(user)
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns profile details for the currently authenticated session.
 * Requires requireAuth middleware.
 */
export function getCurrentUser(req, res) {
  return res.status(200).json({
    user: authService.formatUserResponse(req.user)
  });
}

/**
 * POST /api/auth/logout
 * Terminates the active session in SQLite and clears the session cookie.
 */
export function logout(req, res) {
  const token = req.sessionToken || req.cookies?.[config.auth.sessionCookieName];

  if (token) {
    authService.invalidateSession(token);
  }

  res.clearCookie(config.auth.sessionCookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return res.status(200).json({
    success: true,
    message: 'Signed out successfully.'
  });
}
