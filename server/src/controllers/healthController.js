import { config } from '../config/index.js';
import { lmStudioService } from '../services/lmStudioService.js';
import { voiceService } from '../services/voice/voiceService.js';

const startTime = Date.now();

/**
 * GET /api/health
 * Returns Express server health and dynamic readiness of decoupled AI dependencies.
 * Never fails or returns 500 solely because an external AI dependency is offline.
 */
export const getHealth = async (req, res, next) => {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const [lmHealth, voiceHealth] = await Promise.all([
      lmStudioService.checkHealth(),
      voiceService.checkHealth()
    ]);

    const healthPayload = {
      status: 'ok',
      version: config.version,
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      services: {
        lmStudio: {
          status: lmHealth.connected ? 'connected' : 'disconnected',
          endpoint: config.lmStudio.baseUrl,
          activeModel: config.lmStudio.model,
          modelAvailable: lmHealth.modelAvailable,
          availableModels: lmHealth.availableModels,
          error: lmHealth.error
        },
        stt: voiceHealth.stt,
        tts: voiceHealth.tts
      }
    };

    res.status(200).json(healthPayload);
  } catch (err) {
    next(err);
  }
};
