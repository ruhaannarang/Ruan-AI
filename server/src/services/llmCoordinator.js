import { config } from '../config/index.js';
import { lmStudioService } from './lmStudioService.js';
import { nvidiaNimService } from './nvidiaNimService.js';

/**
 * Ruan AI — LLM Coordinator Service
 * Orchestrates local (LM Studio) and optional online cloud (NVIDIA NIM) LLM providers.
 * Enforces local-first default while allowing seamless, decoupled switching when configured.
 */
export class LLMCoordinator {
  constructor() {
    this.defaultProvider = config.llm.provider || 'local';
  }

  /**
   * Resolves the target LLM provider based on request parameter, environment, and availability.
   * @param {string} [requestedProvider] - 'local' | 'nvidia_nim' | 'online'
   * @returns {'local' | 'nvidia_nim'}
   */
  resolveProvider(requestedProvider) {
    if (requestedProvider) {
      const normalized = requestedProvider.toLowerCase().trim();
      if (normalized === 'nvidia_nim' || normalized === 'online' || normalized === 'nim') {
        return 'nvidia_nim';
      }
      if (normalized === 'local' || normalized === 'lm_studio' || normalized === 'lmstudio') {
        return 'local';
      }
    }

    // Default to configured environment provider or local fallback
    if (this.defaultProvider === 'nvidia_nim' && config.nvidiaNim.apiKey) {
      return 'nvidia_nim';
    }

    return 'local';
  }

  /**
   * Dispatches a streaming chat completion to the resolved provider.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages
   * @param {string} [params.model]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {string} [params.provider] - 'local' | 'nvidia_nim'
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<{ stream: ReadableStream, model: string, provider: 'local' | 'nvidia_nim' }>}
   */
  async streamChatCompletion({ messages, model, temperature, maxTokens, signal, provider }) {
    const activeProvider = this.resolveProvider(provider);

    if (activeProvider === 'nvidia_nim') {
      const result = await nvidiaNimService.streamChatCompletion({
        messages,
        model,
        temperature,
        maxTokens,
        signal
      });
      return {
        stream: result.stream,
        model: result.model,
        provider: 'nvidia_nim'
      };
    }

    // Local LM Studio provider (Default)
    const result = await lmStudioService.streamChatCompletion({
      messages,
      model,
      temperature,
      maxTokens,
      signal
    });

    return {
      stream: result.stream,
      model: result.model,
      provider: 'local'
    };
  }

  /**
   * Dispatches a non-streaming chat completion to the resolved provider.
   */
  async chatCompletion({ messages, model, temperature, maxTokens, signal, provider }) {
    const activeProvider = this.resolveProvider(provider);

    if (activeProvider === 'nvidia_nim') {
      return await nvidiaNimService.chatCompletion({
        messages,
        model,
        temperature,
        maxTokens,
        signal
      });
    }

    return await lmStudioService.chatCompletion({
      messages,
      model,
      temperature,
      maxTokens,
      signal
    });
  }

  /**
   * Checks health status across all configured LLM providers.
   * @returns {Promise<{
   *   activeProvider: 'local' | 'nvidia_nim',
   *   lmStudio: Object,
   *   nvidiaNim: Object
   * }>}
   */
  async checkHealth() {
    const [lmStudio, nvidiaNim] = await Promise.all([
      lmStudioService.checkHealth(),
      nvidiaNimService.checkHealth()
    ]);

    return {
      activeProvider: this.resolveProvider(),
      lmStudio,
      nvidiaNim
    };
  }
}

export const llmCoordinator = new LLMCoordinator();

