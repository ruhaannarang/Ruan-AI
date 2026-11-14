import { config } from '../config/index.js';
import { lmStudioService } from '../services/lmStudioService.js';
import { nvidiaNimService } from '../services/nvidiaNimService.js';
import { voiceService } from '../services/voice/voiceService.js';
import { llmCoordinator } from '../services/llmCoordinator.js';
import { imageGenerationService } from '../services/imageGenerationService.js';

const startTime = Date.now();

/**
 * GET /api/health
 * Returns Express server health and dynamic readiness of decoupled AI dependencies.
 * Never fails or returns 500 solely because an external AI dependency is offline.
 */
export const getHealth = async (req, res, next) => {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const [lmHealth, nimHealth, voiceHealth, imgHealth] = await Promise.all([
      lmStudioService.checkHealth(),
      nvidiaNimService.checkHealth(),
      voiceService.checkHealth(),
      imageGenerationService.checkHealth()
    ]);

    const activeProvider = llmCoordinator.resolveProvider();

    const healthPayload = {
      status: 'ok',
      version: config.version,
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      llm: {
        activeProvider,
        defaultModel: activeProvider === 'nvidia_nim' ? config.nvidiaNim.model : config.lmStudio.model
      },
      services: {
        lmStudio: {
          status: lmHealth.connected ? 'connected' : 'disconnected',
          endpoint: config.lmStudio.baseUrl,
          activeModel: config.lmStudio.model,
          modelAvailable: lmHealth.modelAvailable,
          availableModels: lmHealth.availableModels,
          error: lmHealth.error
        },
        nvidiaNim: {
          status: nimHealth.connected ? 'connected' : (nimHealth.configured ? 'error' : 'unconfigured'),
          configured: nimHealth.configured,
          endpoint: config.nvidiaNim.baseUrl,
          activeModel: config.nvidiaNim.model,
          availableModels: nimHealth.availableModels || [],
          error: nimHealth.error
        },
        stt: voiceHealth.stt,
        tts: voiceHealth.tts,
        imageGen: imgHealth
      }
    };

    res.status(200).json(healthPayload);
  } catch (err) {
    next(err);
  }
};
