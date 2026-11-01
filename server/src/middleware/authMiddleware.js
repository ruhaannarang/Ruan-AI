import { config } from '../config/index.js';
import { authService } from '../services/authService.js';

/**
 * Middleware requiring an active, verified session cookie.
 * Injects authenticated user into `req.user`.
 * Rejects unauthenticated or expired requests with standard 401.
 */
export function requireAuth(req, res, next) {
  const cookieName = config.auth.sessionCookieName;
  const token = req.cookies?.[cookieName];

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Authentication required. Please sign in with your Google account.',
        code: 'AUTH_REQUIRED',
        details: null
      }
    });
  }

  const user = authService.getUserBySessionToken(token);

  if (!user) {
    // Clear stale or expired session cookie
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production'
    });

    return res.status(401).json({
      error: {
        message: 'Your session has expired. Please sign in again.',
        code: 'SESSION_EXPIRED',
        details: null
      }
    });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

/**
 * Optional authentication middleware.
 * Attaches user to `req.user` if a valid session exists, but allows unauthenticated requests to proceed.
 */
export function optionalAuth(req, res, next) {
  const cookieName = config.auth.sessionCookieName;
  const token = req.cookies?.[cookieName];

  if (token) {
    const user = authService.getUserBySessionToken(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}
