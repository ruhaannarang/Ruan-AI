import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const config = {
  version: '0.1.0-alpha.3',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '127.0.0.1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    model: process.env.LM_STUDIO_MODEL || 'ling-3.0-tiny',
    timeoutMs: parseInt(process.env.LM_STUDIO_TIMEOUT_MS || '60000', 10),
    healthTimeoutMs: parseInt(process.env.LM_STUDIO_HEALTH_TIMEOUT_MS || '2500', 10)
  },
  voice: {
    sttCandidate: process.env.STT_CANDIDATE || 'faster-whisper',
    ttsCandidate: process.env.TTS_CANDIDATE || 'piper'
  }
};
