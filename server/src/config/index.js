import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const config = {
  version: '0.1.0-alpha.4',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '127.0.0.1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    model: process.env.LM_STUDIO_MODEL || 'gemma-4-e2b-it-qat',
    timeoutMs: parseInt(process.env.LM_STUDIO_TIMEOUT_MS || '60000', 10),
    healthTimeoutMs: parseInt(process.env.LM_STUDIO_HEALTH_TIMEOUT_MS || '2500', 10)
  },
  voice: {
    sttCandidate: process.env.STT_CANDIDATE || 'faster-whisper',
    ttsCandidate: process.env.TTS_CANDIDATE || 'piper'
  },
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'ruan_session',
    sessionSecret: process.env.SESSION_SECRET || 'ruan-auth-dev-secret-key-change-in-production',
    sessionMaxAgeMs: parseInt(process.env.SESSION_MAX_AGE_MS || String(7 * 24 * 60 * 60 * 1000), 10)
  }
};
