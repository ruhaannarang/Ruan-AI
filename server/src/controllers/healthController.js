import { config } from '../config/index.js';

const startTime = Date.now();

/**
 * GET /api/health
 * Returns server health and independent status of decoupled AI dependencies.
 */
export const getHealth = (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const healthPayload = {
    status: 'ok',
    version: '0.1.0-alpha.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    services: {
      lmStudio: {
        status: 'uninitialized',
        endpoint: config.lmStudio.baseUrl,
        activeModel: null,
        note: 'Local LLM runtime connection pending Phase 1 integration'
      },
      stt: {
        status: 'uninitialized',
        candidate: config.voice.sttCandidate,
        note: 'Speech-to-text candidate engine pending Phase 1 evaluation'
      },
      tts: {
        status: 'uninitialized',
        candidate: config.voice.ttsCandidate,
        note: 'Text-to-speech candidate engine pending Phase 1 evaluation'
      }
    }
  };

  res.status(200).json(healthPayload);
};
