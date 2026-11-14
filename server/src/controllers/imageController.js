import { imageGenerationService } from '../services/imageGenerationService.js';

/**
 * POST /api/image/generate
 * Generates an image using either Cloud (Flux) or Local (RTX 3050 Stable Diffusion).
 */
export async function generateImage(req, res, next) {
  try {
    const { prompt, provider, model, width, height, seed, negativePrompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: {
          message: "'prompt' must be a non-empty string",
          code: 'INVALID_PROMPT',
          details: null
        }
      });
    }

    const result = await imageGenerationService.generateImage({
      prompt: prompt.trim(),
      provider,
      model,
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      seed: seed !== undefined ? parseInt(seed, 10) : undefined,
      negativePrompt
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    const status = err.statusCode || (err.code === 'LOCAL_SD_UNREACHABLE' ? 503 : 500);
    return res.status(status).json({
      error: {
        message: err.message,
        code: err.code || 'IMAGE_GENERATION_FAILED',
        details: err.details || null
      }
    });
  }
}

/**
 * POST /api/image/edit
 * Edits/transforms an existing image (img2img).
 */
export async function editImage(req, res, next) {
  try {
    const { image, prompt, provider, model, strength, negativePrompt } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: {
          message: "'image' (data URL or base64 string) is required",
          code: 'IMAGE_REQUIRED',
          details: null
        }
      });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: {
          message: "'prompt' must be a non-empty string",
          code: 'INVALID_PROMPT',
          details: null
        }
      });
    }

    const result = await imageGenerationService.editImage({
      image,
      prompt: prompt.trim(),
      provider,
      model,
      strength: strength !== undefined ? parseFloat(strength) : 0.65,
      negativePrompt
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    const status = err.statusCode || (err.code === 'LOCAL_SD_UNREACHABLE' ? 503 : 500);
    return res.status(status).json({
      error: {
        message: err.message,
        code: err.code || 'IMAGE_EDIT_FAILED',
        details: err.details || null
      }
    });
  }
}

/**
 * GET /api/image/status
 * Returns availability of image generation providers.
 */
export async function getImageStatus(req, res) {
  try {
    const status = await imageGenerationService.checkHealth();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    return res.status(500).json({
      error: {
        message: err.message,
        code: 'IMAGE_STATUS_ERROR',
        details: null
      }
    });
  }
}

