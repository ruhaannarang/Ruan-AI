import { config } from '../config/index.js';

/**
 * Service adapter for communicating with local LM Studio OpenAI-compatible runtime.
 * Uses native Node.js fetch (ES Modules) with full AbortSignal and streaming support.
 */
class LMStudioService {
  constructor() {
    this.baseUrl = config.lmStudio.baseUrl;
    this.defaultModel = config.lmStudio.model;
    this.timeoutMs = config.lmStudio.timeoutMs;
    this.healthTimeoutMs = config.lmStudio.healthTimeoutMs;
  }

  /**
   * Helper to execute a fetch with an automatic timeout.
   * If an external signal is provided, both signals are respected.
   * 
   * @param {string} url - Target URL
   * @param {RequestInit} options - Fetch options
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<Response>}
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = this.timeoutMs) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`LM Studio request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Merge caller signal with timeout signal
    let combinedSignal = timeoutController.signal;
    let cleanup = () => clearTimeout(timeoutId);

    if (options.signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([options.signal, timeoutController.signal]);
      } else {
        // Fallback for Node runtimes without AbortSignal.any
        const mergedController = new AbortController();
        const onCallerAbort = () => mergedController.abort(options.signal.reason);
        const onTimeoutAbort = () => mergedController.abort(timeoutController.signal.reason);

        options.signal.addEventListener('abort', onCallerAbort, { once: true });
        timeoutController.signal.addEventListener('abort', onTimeoutAbort, { once: true });

        cleanup = () => {
          clearTimeout(timeoutId);
          options.signal.removeEventListener('abort', onCallerAbort);
          timeoutController.signal.removeEventListener('abort', onTimeoutAbort);
        };
        combinedSignal = mergedController.signal;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal
      });
      return response;
    } finally {
      cleanup();
    }
  }

  /**
   * Checks whether LM Studio is reachable and returns subsystem readiness.
   * Designed to execute quickly and never throw an unhandled exception.
   * 
   * @returns {Promise<{
   *   connected: boolean,
   *   activeModel: string,
   *   modelAvailable: boolean,
   *   availableModels: string[],
   *   error: string | null
   * }>}
   */
  async checkHealth() {
    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        },
        this.healthTimeoutMs
      );

      if (!response.ok) {
        return {
          connected: false,
          activeModel: this.defaultModel,
          modelAvailable: false,
          availableModels: [],
          error: `LM Studio returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      const modelList = Array.isArray(data.data) ? data.data : [];
      const availableModelIds = modelList.map((m) => m.id);
      const isModelAvailable = availableModelIds.includes(this.defaultModel);

      return {
        connected: true,
        activeModel: this.defaultModel,
        modelAvailable: isModelAvailable,
        availableModels: availableModelIds,
        error: isModelAvailable
          ? null
          : `Configured model '${this.defaultModel}' is not loaded in LM Studio.`
      };
    } catch (err) {
      const isAbort = err.name === 'AbortError' || err.message?.includes('timed out');
      return {
        connected: false,
        activeModel: this.defaultModel,
        modelAvailable: false,
        availableModels: [],
        error: isAbort
          ? `LM Studio health check timed out after ${this.healthTimeoutMs}ms`
          : `LM Studio unreachable at ${this.baseUrl} (${err.message || 'connection failed'})`
      };
    }
  }

  /**
   * Retrieves list of available model identifiers currently exposed by LM Studio.
   * 
   * @returns {Promise<string[]>}
   */
  async getAvailableModels() {
    const health = await this.checkHealth();
    if (!health.connected) {
      const error = new Error(health.error || 'LM Studio is unreachable');
      error.code = 'LM_STUDIO_UNREACHABLE';
      error.statusCode = 503;
      throw error;
    }
    return health.availableModels;
  }

  /**
   * Initiates a streaming chat completion request with LM Studio.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages - Conversation messages
   * @param {string} [params.model] - Optional model identifier override
   * @param {number} [params.temperature] - Sampling temperature (0.0 to 2.0)
   * @param {number} [params.maxTokens] - Maximum tokens to generate
   * @param {AbortSignal} [params.signal] - Caller AbortSignal for cancellation
   * @returns {Promise<{ stream: ReadableStream, model: string }>}
   */
  async streamChatCompletion({ messages, model, temperature, maxTokens, signal }) {
    const targetModel = model || this.defaultModel;

    // Verify model availability first
    const health = await this.checkHealth();
    if (!health.connected) {
      const error = new Error(`LM Studio is currently unreachable at ${this.baseUrl}. Is LM Studio running with local server enabled?`);
      error.code = 'LM_STUDIO_UNREACHABLE';
      error.statusCode = 503;
      throw error;
    }

    if (!health.availableModels.includes(targetModel)) {
      const error = new Error(
        `Configured model '${targetModel}' is not loaded in LM Studio. Available models: [${health.availableModels.join(', ')}]`
      );
      error.code = 'MODEL_NOT_AVAILABLE';
      error.statusCode = 404;
      error.details = { requestedModel: targetModel, availableModels: health.availableModels };
      throw error;
    }

    const payload = {
      model: targetModel,
      messages,
      stream: true
    };

    if (typeof temperature === 'number') {
      payload.temperature = temperature;
    }
    if (typeof maxTokens === 'number') {
      payload.max_tokens = maxTokens;
    }

    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(payload),
          signal
        },
        this.timeoutMs
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg = errorBody?.error?.message || `LM Studio upstream returned HTTP ${response.status}`;
        const error = new Error(`LM Studio upstream error: ${errorMsg}`);
        error.code = 'LM_STUDIO_UPSTREAM_ERROR';
        error.statusCode = response.status;
        error.details = errorBody;
        throw error;
      }

      if (!response.body) {
        const error = new Error('LM Studio returned empty response body');
        error.code = 'EMPTY_UPSTREAM_RESPONSE';
        error.statusCode = 502;
        throw error;
      }

      return {
        stream: response.body,
        model: targetModel
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const abortErr = new Error('Upstream generation was aborted');
        abortErr.code = 'GENERATION_ABORTED';
        abortErr.statusCode = 499; // Client Closed Request
        throw abortErr;
      }
      throw err;
    }
  }

  /**
   * Initiates a standard non-streaming chat completion with LM Studio.
   * Useful for internal verification, one-shot summarization, or diagnostics.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages
   * @param {string} [params.model]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Object>} Upstream completion object
   */
  async chatCompletion({ messages, model, temperature, maxTokens, signal }) {
    const targetModel = model || this.defaultModel;

    const payload = {
      model: targetModel,
      messages,
      stream: false
    };

    if (typeof temperature === 'number') payload.temperature = temperature;
    if (typeof maxTokens === 'number') payload.max_tokens = maxTokens;

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
      },
      this.timeoutMs
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const error = new Error(errorBody?.error?.message || `LM Studio returned HTTP ${response.status}`);
      error.code = 'LM_STUDIO_UPSTREAM_ERROR';
      error.statusCode = response.status;
      throw error;
    }

    return await response.json();
  }
}

export const lmStudioService = new LMStudioService();
