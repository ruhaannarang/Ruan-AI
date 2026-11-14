import { config } from '../config/index.js';

/**
 * Service adapter for communicating with online NVIDIA NIM (NVIDIA Inference Microservice) API.
 * Uses native Node.js fetch (ES Modules) with full AbortSignal and SSE streaming support.
 * Standard OpenAI-compatible API schema targeting https://integrate.api.nvidia.com/v1.
 */
class NvidiaNimService {
  constructor() {
    this.baseUrl = config.nvidiaNim.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.nvidiaNim.apiKey?.trim() || '';
    this.defaultModel = config.nvidiaNim.model || 'nvidia/nemotron-3.5-bolt-e4b';
    this.timeoutMs = config.nvidiaNim.timeoutMs;
    this.healthTimeoutMs = config.nvidiaNim.healthTimeoutMs;
  }

  /**
   * Helper to execute a fetch with an automatic timeout.
   * Merges caller AbortSignal with timeout signal.
   * 
   * @param {string} url
   * @param {RequestInit} options
   * @param {number} timeoutMs
   * @returns {Promise<Response>}
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = this.timeoutMs) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`NVIDIA NIM request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    let combinedSignal = timeoutController.signal;
    let cleanup = () => clearTimeout(timeoutId);

    if (options.signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([options.signal, timeoutController.signal]);
      } else {
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
   * Checks whether NVIDIA NIM API key is configured and endpoint is reachable.
   * Never throws an unhandled exception.
   * 
   * @returns {Promise<{
   *   connected: boolean,
   *   configured: boolean,
   *   activeModel: string,
   *   availableModels: string[],
   *   error: string | null
   * }>}
   */
  async checkHealth() {
    // If no API key configured, report as unconfigured (clean decoupled state)
    if (!this.apiKey) {
      return {
        connected: false,
        configured: false,
        activeModel: this.defaultModel,
        availableModels: [],
        error: null
      };
    }

    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        },
        this.healthTimeoutMs
      );

      if (!response.ok) {
        return {
          connected: false,
          configured: true,
          activeModel: this.defaultModel,
          availableModels: [],
          error: `NVIDIA NIM returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      const modelList = Array.isArray(data.data) ? data.data : [];
      const availableModelIds = modelList.map((m) => m.id);

      return {
        connected: true,
        configured: true,
        activeModel: this.defaultModel,
        availableModels: availableModelIds,
        error: null
      };
    } catch (err) {
      const isAbort = err.name === 'AbortError' || err.message?.includes('timed out');
      return {
        connected: false,
        configured: true,
        activeModel: this.defaultModel,
        availableModels: [],
        error: isAbort
          ? `NVIDIA NIM health check timed out after ${this.healthTimeoutMs}ms`
          : `NVIDIA NIM unreachable: ${err.message || 'connection failed'}`
      };
    }
  }

  /**
   * Initiates a streaming chat completion request with NVIDIA NIM API.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages - Conversation messages
   * @param {string} [params.model] - Optional model override
   * @param {number} [params.temperature] - Sampling temperature (0.0 to 2.0)
   * @param {number} [params.maxTokens] - Maximum tokens limit
   * @param {AbortSignal} [params.signal] - Caller AbortSignal for cancellation
   * @returns {Promise<{ stream: ReadableStream, model: string, provider: string }>}
   */
  async streamChatCompletion({ messages, model, temperature, maxTokens, signal }) {
    if (!this.apiKey) {
      const error = new Error(
        'NVIDIA NIM API key is not configured. Please add NVIDIA_NIM_API_KEY to your server/.env file to use online NVIDIA models.'
      );
      error.code = 'NVIDIA_NIM_KEY_MISSING';
      error.statusCode = 400;
      throw error;
    }

    const targetModel = model || this.defaultModel;

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
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(payload),
          signal
        },
        this.timeoutMs
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg = errorBody?.error?.message || errorBody?.detail || `NVIDIA NIM returned HTTP ${response.status}`;
        const error = new Error(`NVIDIA NIM upstream error: ${errorMsg}`);
        error.code = 'NVIDIA_NIM_UPSTREAM_ERROR';
        error.statusCode = response.status;
        error.details = errorBody;
        throw error;
      }

      if (!response.body) {
        const error = new Error('NVIDIA NIM returned empty response body');
        error.code = 'EMPTY_UPSTREAM_RESPONSE';
        error.statusCode = 502;
        throw error;
      }

      return {
        stream: response.body,
        model: targetModel,
        provider: 'nvidia_nim'
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const abortErr = new Error('NVIDIA NIM generation was aborted');
        abortErr.code = 'GENERATION_ABORTED';
        abortErr.statusCode = 499;
        throw abortErr;
      }
      throw err;
    }
  }

  /**
   * Non-streaming chat completion with NVIDIA NIM API.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages
   * @param {string} [params.model]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Object>}
   */
  async chatCompletion({ messages, model, temperature, maxTokens, signal }) {
    if (!this.apiKey) {
      const error = new Error('NVIDIA NIM API key is not configured in server/.env');
      error.code = 'NVIDIA_NIM_KEY_MISSING';
      error.statusCode = 400;
      throw error;
    }

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
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal
      },
      this.timeoutMs
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const error = new Error(errorBody?.error?.message || `NVIDIA NIM returned HTTP ${response.status}`);
      error.code = 'NVIDIA_NIM_UPSTREAM_ERROR';
      error.statusCode = response.status;
      throw error;
    }

    return await response.json();
  }
}

export const nvidiaNimService = new NvidiaNimService();
