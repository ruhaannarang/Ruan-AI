import { config } from '../config/index.js';

/**
 * Ruan AI — Image Generation Service
 * Supports dual-engine generation:
 * 1. Cloud (Flux / SDXL via Pollinations): Instant, zero VRAM usage, no API key required.
 * 2. Local (Automatic1111 / Forge / ComfyUI / Diffusers): 100% offline on local GPU.
 */
export class ImageGenerationService {
  constructor() {
    this.defaultProvider = config.imageGen?.provider || 'cloud';
    this.cloudModel = config.imageGen?.cloudModel || 'flux';
    this.localUrl = (config.imageGen?.localUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');
    this.timeoutMs = config.imageGen?.timeoutMs || 60000;
  }

  /**
   * Resolves the active provider ('cloud' | 'local')
   * @param {string} [requested] 
   * @returns {'cloud' | 'local'}
   */
  resolveProvider(requested) {
    if (requested) {
      const norm = requested.toLowerCase().trim();
      if (norm === 'local' || norm === 'offline' || norm === 'gpu') return 'local';
      if (norm === 'cloud' || norm === 'flux' || norm === 'online') return 'cloud';
    }
    return this.defaultProvider === 'local' ? 'local' : 'cloud';
  }

  /**
   * Generates an image using the selected provider.
   * 
   * @param {Object} params
   * @param {string} params.prompt - Image description
   * @param {string} [params.provider] - 'cloud' | 'local'
   * @param {string} [params.model] - Model name (e.g. 'flux', 'turbo')
   * @param {number} [params.width=1024]
   * @param {number} [params.height=1024]
   * @param {number} [params.seed]
   * @param {string} [params.negativePrompt]
   * @returns {Promise<{
   *   imageUrl: string,
   *   prompt: string,
   *   provider: 'cloud' | 'local',
   *   model: string,
   *   width: number,
   *   height: number,
   *   seed: number,
   *   durationMs: number
   * }>}
   */
  async generateImage({
    prompt,
    provider,
    model,
    width = 1024,
    height = 1024,
    seed,
    negativePrompt
  }) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      const err = new Error('Prompt is required for image generation');
      err.code = 'INVALID_PROMPT';
      err.statusCode = 400;
      throw err;
    }

    const cleanPrompt = prompt.trim();
    const activeProvider = this.resolveProvider(provider);
    const chosenSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 2147483647);
    const startTime = performance.now();

    if (activeProvider === 'local') {
      try {
        return await this._generateLocal({
          prompt: cleanPrompt,
          negativePrompt,
          width,
          height,
          seed: chosenSeed,
          startTime
        });
      } catch (localErr) {
        console.warn(`[ImageGen] Local generation failed (${localErr.message}). Checking fallback.`);
        // If caller allowed fallback or if local server offline, rethrow with actionable context
        throw localErr;
      }
    }

    // Default: Cloud (Flux / Pollinations)
    return await this._generateCloud({
      prompt: cleanPrompt,
      model: model || this.cloudModel,
      width,
      height,
      seed: chosenSeed,
      negativePrompt,
      startTime
    });
  }

  /**
   * Generates image via cloud Flux engine
   */
  async _generateCloud({ prompt, model, width, height, seed, negativePrompt, startTime }) {
    const encodedPrompt = encodeURIComponent(prompt);
    const cloudModel = model || 'flux';

    // Construct high-speed Pollinations API URL
    const url = new URL(`https://image.pollinations.ai/prompt/${encodedPrompt}`);
    url.searchParams.set('width', String(Math.min(width, 1440)));
    url.searchParams.set('height', String(Math.min(height, 1440)));
    url.searchParams.set('model', cloudModel);
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('nologo', 'true');
    if (negativePrompt) {
      url.searchParams.set('negative', negativePrompt);
    }

    const imageUrl = url.toString();

    // Verify availability or fetch as base64 to ensure immediate caching
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(imageUrl, {
        method: 'GET',
        headers: { 'Accept': 'image/*' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Cloud image service returned HTTP ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const base64Data = Buffer.from(buffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64Data}`;

      const durationMs = Math.round(performance.now() - startTime);

      return {
        imageUrl: dataUrl,
        directUrl: imageUrl,
        prompt,
        provider: 'cloud',
        model: cloudModel,
        width,
        height,
        seed,
        durationMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const error = new Error(
        isAbort
          ? `Image generation timed out after ${this.timeoutMs}ms`
          : `Failed to generate image via cloud: ${err.message}`
      );
      error.code = isAbort ? 'IMAGE_TIMEOUT' : 'IMAGE_GEN_FAILED';
      throw error;
    }
  }

  /**
   * Generates image via local Automatic1111 / Forge / ComfyUI txt2img API
   */
  async _generateLocal({ prompt, negativePrompt, width, height, seed, startTime }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Limit local dimensions to protect 6GB GPU VRAM
    const targetWidth = Math.min(width, 768);
    const targetHeight = Math.min(height, 768);

    const payload = {
      prompt,
      negative_prompt: negativePrompt || 'low quality, blurry, distorted, watermark',
      steps: 20,
      width: targetWidth,
      height: targetHeight,
      seed,
      cfg_scale: 7.0,
      sampler_name: 'DPM++ 2M Karras'
    };

    try {
      const res = await fetch(`${this.localUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Local SD server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.images || data.images.length === 0) {
        throw new Error('Local SD server returned empty image list');
      }

      const base64Img = data.images[0];
      const dataUrl = `data:image/png;base64,${base64Img}`;
      const durationMs = Math.round(performance.now() - startTime);

      return {
        imageUrl: dataUrl,
        directUrl: null,
        prompt,
        provider: 'local',
        model: 'stable-diffusion-local',
        width: targetWidth,
        height: targetHeight,
        seed,
        durationMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const error = new Error(
        isAbort
          ? `Local image generation timed out after ${this.timeoutMs}ms`
          : `Local Stable Diffusion is not reachable at ${this.localUrl}. Is your local SD WebUI running with --api enabled?`
      );
      error.code = isAbort ? 'LOCAL_IMAGE_TIMEOUT' : 'LOCAL_SD_UNREACHABLE';
      error.details = { localUrl: this.localUrl };
      throw error;
    }
  }

  /**
   * Modifies/transforms an existing image (Image-to-Image / img2img).
   * 
   * @param {Object} params
   * @param {string} params.image - Image as data URL or base64 string
   * @param {string} params.prompt - Desired change, style, or instruction
   * @param {string} [params.provider] - 'cloud' | 'local'
   * @param {string} [params.model] - Model name (e.g. 'flux')
   * @param {number} [params.strength=0.65] - Transformation intensity (0.1 to 0.95)
   * @param {string} [params.negativePrompt]
   * @returns {Promise<{
   *   imageUrl: string,
   *   prompt: string,
   *   provider: 'cloud' | 'local',
   *   model: string,
   *   durationMs: number
   * }>}
   */
  async editImage({
    image,
    prompt,
    provider,
    model,
    strength = 0.65,
    negativePrompt
  }) {
    if (!image) {
      const err = new Error('Input image is required for image editing');
      err.code = 'IMAGE_REQUIRED';
      err.statusCode = 400;
      throw err;
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      const err = new Error('Prompt instruction is required for image editing');
      err.code = 'INVALID_PROMPT';
      err.statusCode = 400;
      throw err;
    }

    const cleanPrompt = prompt.trim();
    const activeProvider = this.resolveProvider(provider);
    const startTime = performance.now();

    if (activeProvider === 'local') {
      return await this._editLocal({
        image,
        prompt: cleanPrompt,
        strength,
        negativePrompt,
        startTime
      });
    }

    // Default: Cloud (Flux / Pollinations)
    return await this._editCloud({
      image,
      prompt: cleanPrompt,
      model: model || this.cloudModel,
      negativePrompt,
      startTime
    });
  }

  /**
   * Modifies image via Pollinations Flux img2img POST API
   */
  async _editCloud({ image, prompt, model, negativePrompt, startTime }) {
    const cloudModel = model || 'flux';
    const encodedPrompt = encodeURIComponent(prompt);
    const postUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    // Normalize image to data URL format
    const dataUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;

    const payload = {
      prompt,
      model: cloudModel,
      image: dataUrl,
      nologo: true,
      enhance: false
    };

    if (negativePrompt) {
      payload.negative_prompt = negativePrompt;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'image/*'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Cloud image editing returned HTTP ${res.status}: ${res.statusText}`);
      }

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const base64Data = Buffer.from(buffer).toString('base64');
      const resultDataUrl = `data:${contentType};base64,${base64Data}`;
      const durationMs = Math.round(performance.now() - startTime);

      return {
        imageUrl: resultDataUrl,
        prompt,
        provider: 'cloud',
        model: cloudModel,
        durationMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const error = new Error(
        isAbort
          ? `Image editing timed out after ${this.timeoutMs}ms`
          : `Failed to edit image via cloud: ${err.message}`
      );
      error.code = isAbort ? 'IMAGE_TIMEOUT' : 'IMAGE_EDIT_FAILED';
      throw error;
    }
  }

  /**
   * Modifies image via Local Automatic1111 / Forge / ComfyUI img2img API
   */
  async _editLocal({ image, prompt, strength, negativePrompt, startTime }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Extract raw base64 string
    const rawBase64 = image.replace(/^data:[^;]+;base64,/, '');

    const payload = {
      init_images: [rawBase64],
      prompt,
      negative_prompt: negativePrompt || 'low quality, blurry, distorted, watermark',
      denoising_strength: Math.min(Math.max(Number(strength) || 0.65, 0.1), 0.95),
      steps: 20,
      width: 768,
      height: 768,
      cfg_scale: 7.0,
      sampler_name: 'DPM++ 2M Karras'
    };

    try {
      const res = await fetch(`${this.localUrl}/sdapi/v1/img2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Local SD server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.images || data.images.length === 0) {
        throw new Error('Local SD server returned empty image list');
      }

      const base64Img = data.images[0];
      const dataUrl = `data:image/png;base64,${base64Img}`;
      const durationMs = Math.round(performance.now() - startTime);

      return {
        imageUrl: dataUrl,
        prompt,
        provider: 'local',
        model: 'stable-diffusion-local',
        durationMs
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const error = new Error(
        isAbort
          ? `Local image editing timed out after ${this.timeoutMs}ms`
          : `Local Stable Diffusion is not reachable at ${this.localUrl}. Is your local SD WebUI running with --api enabled?`
      );
      error.code = isAbort ? 'LOCAL_IMAGE_TIMEOUT' : 'LOCAL_SD_UNREACHABLE';
      error.details = { localUrl: this.localUrl };
      throw error;
    }
  }

  /**
   * Checks health and readiness of image providers
   */
  async checkHealth() {
    let localReady = false;
    let localError = null;

    try {
      const res = await fetch(`${this.localUrl}/sdapi/v1/progress`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      }).catch(() => null);

      if (res && res.ok) {
        localReady = true;
      } else {
        localError = 'Local SD server not responding';
      }
    } catch (e) {
      localError = e.message;
    }

    return {
      activeProvider: this.defaultProvider,
      cloud: {
        available: true,
        model: this.cloudModel
      },
      local: {
        available: localReady,
        endpoint: this.localUrl,
        error: localReady ? null : localError
      }
    };
  }
}

export const imageGenerationService = new ImageGenerationService();

