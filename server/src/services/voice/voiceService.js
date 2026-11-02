/**
 * Ruan AI — Voice Service Coordinator
 * Manages health checks, service discovery, and engine configuration.
 */

import { config } from '../../config/index.js';

export class VoiceService {
  constructor() {
    this.baseUrl = config.voice.serviceUrl;
    this.healthTimeoutMs = 2500;
  }

  /**
   * Checks the health and readiness of the local Python voice microservice.
   * Never throws; returns normalized status object.
   */
  async checkHealth() {
    if (!config.voice.enabled) {
      return {
        connected: false,
        stt: {
          status: 'disabled',
          candidate: config.voice.sttCandidate,
          error: 'Voice features are disabled in configuration'
        },
        tts: {
          status: 'disabled',
          candidate: config.voice.ttsCandidate,
          error: 'Voice features are disabled in configuration'
        }
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.healthTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          connected: false,
          stt: {
            status: 'disconnected',
            candidate: config.voice.sttCandidate,
            error: `Voice service returned HTTP ${response.status}`
          },
          tts: {
            status: 'disconnected',
            candidate: config.voice.ttsCandidate,
            error: `Voice service returned HTTP ${response.status}`
          }
        };
      }

      const data = await response.json();
      return {
        connected: true,
        stt: {
          status: data.stt?.status === 'ready' ? 'ready' : 'disconnected',
          candidate: config.voice.sttCandidate,
          model: data.stt?.model || config.voice.sttModel,
          device: data.stt?.device || config.voice.sttDevice,
          computeType: data.stt?.compute_type || config.voice.sttComputeType,
          error: data.stt?.error || null
        },
        tts: {
          status: data.tts?.status === 'ready' ? 'ready' : 'disconnected',
          candidate: config.voice.ttsCandidate,
          voice: data.tts?.default_voice || config.voice.ttsVoice,
          provider: data.tts?.provider || 'kokoro-82m',
          error: data.tts?.error || null
        }
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout
        ? `Health check timed out after ${this.healthTimeoutMs}ms`
        : 'Cannot connect to Python voice service on 127.0.0.1:8008';

      return {
        connected: false,
        stt: {
          status: 'disconnected',
          candidate: config.voice.sttCandidate,
          error: errMsg
        },
        tts: {
          status: 'disconnected',
          candidate: config.voice.ttsCandidate,
          error: errMsg
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetches the standard Hinglish benchmark prompts.
   */
  async getBenchmarkPrompts() {
    const response = await fetch(`${this.baseUrl}/benchmark/prompts`);
    if (!response.ok) {
      throw new Error(`Voice service returned HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Runs comparative benchmark on uploaded audio file.
   */
  async compareBenchmarkSample(buffer, filename, mimeType, reference, category, technicalTerms) {
    const formData = new FormData();
    const cleanMime = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/wav';
    const blob = new Blob([buffer], { type: cleanMime || 'audio/wav' });
    formData.append('file', blob, filename || 'sample.wav');
    formData.append('reference', reference || '');
    formData.append('category', category || 'Unspecified');
    formData.append('technical_terms', JSON.stringify(technicalTerms || []));

    const response = await fetch(`${this.baseUrl}/benchmark/compare`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.detail || `Benchmark comparison failed with status ${response.status}`);
    }
    return response.json();
  }

  /**
   * Saves benchmark sample and evaluation result.
   */
  async saveBenchmarkSample(buffer, filename, mimeType, sampleId, reference, category, evaluationJson) {
    const formData = new FormData();
    const cleanMime = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/wav';
    const blob = new Blob([buffer], { type: cleanMime || 'audio/wav' });
    formData.append('file', blob, filename || 'sample.wav');
    formData.append('sample_id', sampleId || 'sample');
    formData.append('reference', reference || '');
    formData.append('category', category || 'Unspecified');
    formData.append('evaluation_json', typeof evaluationJson === 'string' ? evaluationJson : JSON.stringify(evaluationJson));

    const response = await fetch(`${this.baseUrl}/benchmark/save`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.detail || `Failed to save benchmark sample: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetches stored benchmark history.
   */
  async getBenchmarkHistory() {
    const response = await fetch(`${this.baseUrl}/benchmark/history`);
    if (!response.ok) {
      throw new Error(`Voice service returned HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Clears saved benchmark history.
   */
  async clearBenchmarkHistory() {
    const response = await fetch(`${this.baseUrl}/benchmark/history`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Voice service returned HTTP ${response.status}`);
    }
    return response.json();
  }
}

export const voiceService = new VoiceService();

