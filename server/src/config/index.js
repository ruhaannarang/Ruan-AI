import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '127.0.0.1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    model: process.env.LM_STUDIO_MODEL || 'default'
  },
  voice: {
    sttCandidate: process.env.STT_CANDIDATE || 'faster-whisper',
    ttsCandidate: process.env.TTS_CANDIDATE || 'piper'
  }
};
