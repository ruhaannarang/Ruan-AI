import { OAuth2Client } from 'google-auth-library';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { getDatabase } from '../db/database.js';

/**
 * Service managing Google OAuth 2.0 verification, user profile lifecycle,
 * and secure persistent session token management for Ruan AI.
 */
class AuthService {
  constructor() {
    this._oauth2Client = null;
  }

  /**
   * Lazily initializes the Google OAuth2 client with configured credentials.
   * 
   * @returns {OAuth2Client}
   */
  getOAuth2Client() {
    if (!this._oauth2Client) {
      this._oauth2Client = new OAuth2Client(
        config.auth.googleClientId,
        config.auth.googleClientSecret,
        config.auth.googleCallbackUrl
      );
    }
    return this._oauth2Client;
  }

  /**
   * Whether Google OAuth credentials are fully configured on the server.
   * 
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(config.auth.googleClientId && config.auth.googleClientId.trim());
  }

  /**
   * Cryptographically verifies an incoming Google ID token using Google Identity Services.
   * Validates audience, signature, expiration, issuer, and email verification status.
   * Never trusts unverified frontend profile inputs.
   * 
   * @param {string} idToken - Raw Google ID token JWT
   * @returns {Promise<{ googleSub: string, email: string, name: string, picture: string | null }>}
   */
  async verifyGoogleIdToken(idToken) {
    if (!this.isConfigured()) {
      const err = new Error(
        'Google Authentication is not configured on the server. Please set GOOGLE_CLIENT_ID in server/.env.'
      );
      err.code = 'GOOGLE_AUTH_NOT_CONFIGURED';
      err.statusCode = 503;
      throw err;
    }

    if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
      const err = new Error("Missing or invalid Google 'credential' token in request body");
      err.code = 'INVALID_CREDENTIAL';
      err.statusCode = 400;
      throw err;
    }

    const client = this.getOAuth2Client();

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: config.auth.googleClientId
      });
    } catch (verifyErr) {
      const err = new Error(`Google token verification failed: ${verifyErr.message}`);
      err.code = 'INVALID_ID_TOKEN';
      err.statusCode = 401;
      throw err;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      const err = new Error("Verified Google token does not contain a valid 'sub' subject claim");
      err.code = 'MALFORMED_TOKEN_PAYLOAD';
      err.statusCode = 401;
      throw err;
    }

    if (!payload.email_verified) {
      const err = new Error('Google account email is not verified');
      err.code = 'EMAIL_NOT_VERIFIED';
      err.statusCode = 403;
      throw err;
    }

    const googleSub = String(payload.sub).trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const name = String(payload.name || email.split('@')[0] || 'Ruan User').trim();
    const picture = payload.picture ? String(payload.picture).trim() : null;

    return {
      googleSub,
      email,
      name,
      picture
    };
  }

  /**
   * Upserts a verified Google identity into the SQLite users repository.
   * Uses Google's stable subject ID (`google_sub`) as canonical key.
   * Updates profile metadata and last login timestamp without creating duplicate accounts.
   * 
   * @param {Object} profile
   * @param {string} profile.googleSub
   * @param {string} profile.email
   * @param {string} profile.name
   * @param {string | null} profile.picture
   * @returns {Object} Database user record
   */
  upsertUserFromGoogle({ googleSub, email, name, picture }) {
    const db = getDatabase();
    const now = Date.now();

    // Look up existing user by stable Google subject ID
    const findStmt = db.prepare('SELECT * FROM users WHERE google_sub = ?');
    const existing = findStmt.get(googleSub);

    if (existing) {
      // Retain existing picture if Google returned null or empty
      const updatedPicture = picture !== null ? picture : existing.picture;

      const updateStmt = db.prepare(`
        UPDATE users 
        SET email = ?, name = ?, picture = ?, last_login_at = ?
        WHERE id = ?
      `);
      updateStmt.run(email, name, updatedPicture, now, existing.id);

      return {
        ...existing,
        email,
        name,
        picture: updatedPicture,
        last_login_at: now
      };
    }

    // Insert new user
    const id = crypto.randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO users (id, google_sub, email, name, picture, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, googleSub, email, name, picture, now, now);

    return {
      id,
      google_sub: googleSub,
      email,
      name,
      picture,
      created_at: now,
      last_login_at: now
    };
  }

  /**
   * Creates a cryptographically secure session token in SQLite.
   * Cleans up expired sessions in background.
   * 
   * @param {string} userId - User's internal ID
   * @returns {{ token: string, expiresAt: number }}
   */
  createSession(userId) {
    const db = getDatabase();
    const now = Date.now();
    const expiresAt = now + config.auth.sessionMaxAgeMs;

    // Hygiene: Purge expired sessions
    try {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    } catch (err) {
      console.warn('[AuthService] Expired session cleanup failed:', err.message);
    }

    // 256-bit cryptographically secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = crypto.randomUUID();

    const insertStmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(sessionId, userId, token, now, expiresAt);

    return {
      token,
      expiresAt
    };
  }

  /**
   * Retrieves the user record associated with an active, unexpired session token.
   * 
   * @param {string} token - Session token from HttpOnly cookie
   * @returns {Object | null}
   */
  getUserBySessionToken(token) {
    if (!token || typeof token !== 'string') return null;

    const db = getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      SELECT 
        u.id, 
        u.google_sub, 
        u.email, 
        u.name, 
        u.picture, 
        u.created_at, 
        u.last_login_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `);

    const user = stmt.get(token, now);
    return user || null;
  }

  /**
   * Invalidates a session token upon logout.
   * 
   * @param {string} token
   */
  invalidateSession(token) {
    if (!token || typeof token !== 'string') return;

    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  }

  /**
   * Formats a user entity for safe client consumption.
   * Explicitly exposes only public profile attributes.
   * 
   * @param {Object} user - Raw database user object
   * @returns {Object}
   */
  formatUserResponse(user) {
    if (!user) return null;
    return {
      id: user.id,
      googleSub: user.google_sub,
      name: user.name,
      email: user.email,
      picture: user.picture || null,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    };
  }
}

export const authService = new AuthService();
