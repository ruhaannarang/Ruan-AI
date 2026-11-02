/**
 * Ruan AI — Text-to-Speech (TTS) Client Service
 * Communicates with the local Python Kokoro 82M service.
 */

import { config } from '../../config/index.js';

export class TTSService {
  constructor() {
    this.baseUrl = config.voice.serviceUrl;
    this.timeoutMs = config.voice.timeoutMs;
    this.defaultVoice = config.voice.ttsVoice;
  }

  /**
   * Synthesizes text to speech audio buffer.
   * @param {Object} options
   * @param {string} options.text - Input text to synthesize
   * @param {string} [options.voice] - Optional voice name (e.g. 'hf_alpha', 'af_heart')
   * @param {number} [options.speed] - Speed multiplier (0.5 to 2.0)
   * @param {string} [options.lang] - Language code ('hi', 'en-us', or 'auto')
   * @param {AbortSignal} [options.signal] - Optional external AbortSignal for user cancellation
   * @returns {Promise<{ buffer: Buffer, contentType: string }>}
   */
  async synthesizeSpeech({ text, voice, speed = 1.0, lang = 'auto', signal }) {
    const cleanText = text?.trim();
    if (!cleanText) {
      const err = new Error('Text parameter is required for speech synthesis');
      err.statusCode = 400;
      err.code = 'EMPTY_TTS_TEXT';
      throw err;
    }

    if (cleanText.length > 8000) {
      const err = new Error('Text exceeds maximum length of 8000 characters');
      err.statusCode = 400;
      err.code = 'TTS_TEXT_TOO_LONG';
      throw err;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    // Chain external abort signal if provided
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(`${this.baseUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          voice: voice || this.defaultVoice,
          speed: Math.max(0.5, Math.min(speed || 1.0, 2.0)),
          lang: lang || 'auto'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.detail || `TTS synthesis failed with HTTP ${response.status}`;
        const err = new Error(errMsg);
        err.statusCode = response.status >= 500 ? 502 : response.status;
        err.code = 'TTS_SYNTHESIS_FAILED';
        throw err;
      }

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const contentType = response.headers.get('content-type') || 'audio/wav';

      return { buffer, contentType };
    } catch (err) {
      if (err.name === 'AbortError') {
        const abortErr = new Error('Speech synthesis was cancelled or timed out');
        abortErr.statusCode = 499;
        abortErr.code = 'TTS_ABORTED';
        throw abortErr;
      }
      if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
        const connErr = new Error('Local voice service is unavailable. Please ensure the Python voice service is running on 127.0.0.1:8008.');
        connErr.statusCode = 503;
        connErr.code = 'VOICE_SERVICE_OFFLINE';
        throw connErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Retrieves available voices from the local TTS provider.
   * @returns {Promise<{ defaultVoice: string, voices: string[] }>}
   */
  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        return { defaultVoice: this.defaultVoice, voices: [] };
      }
      return await response.json();
    } catch {
      return { defaultVoice: this.defaultVoice, voices: [] };
    }
  }
}

export const ttsService = new TTSService();

