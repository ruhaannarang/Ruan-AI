/**
 * Ruan AI — Speech-to-Text (STT) Client Service
 * Communicates with the local Python faster-whisper service.
 */

import { config } from '../../config/index.js';

const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/flac'
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export class STTService {
  constructor() {
    this.baseUrl = config.voice.serviceUrl;
    this.timeoutMs = config.voice.timeoutMs;
  }

  /**
   * Transcribes an uploaded audio buffer.
   * @param {Buffer} buffer - Raw audio file buffer
   * @param {string} originalName - Filename or audio format hint
   * @param {string} mimeType - Audio mime type
   * @returns {Promise<{
   *   text: string,
   *   language: string,
   *   languageProbability: number,
   *   duration: number,
   *   processingTime: number,
   *   rtf: number
   * }>}
   */
  async transcribeAudio(buffer, originalName = 'audio.wav', mimeType = 'audio/wav') {
    if (!buffer || buffer.length === 0) {
      const err = new Error('Audio file is empty');
      err.statusCode = 400;
      err.code = 'EMPTY_AUDIO_FILE';
      throw err;
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      const err = new Error(`Audio file exceeds size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      err.statusCode = 413;
      err.code = 'AUDIO_FILE_TOO_LARGE';
      throw err;
    }

    // Validate MIME type (strip params like codecs)
    const cleanMime = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/wav';
    if (cleanMime && !ALLOWED_MIME_TYPES.has(cleanMime) && cleanMime !== 'application/octet-stream') {
      const err = new Error(`Unsupported audio format '${cleanMime}'. Supported formats: WAV, WebM, OGG, MP3, M4A, FLAC`);
      err.statusCode = 415;
      err.code = 'UNSUPPORTED_AUDIO_TYPE';
      throw err;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: cleanMime || 'audio/wav' });
      formData.append('file', blob, originalName || 'audio.wav');

      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.detail || `Voice service responded with HTTP ${response.status}`;
        const err = new Error(errMsg);
        err.statusCode = response.status >= 500 ? 502 : response.status;
        err.code = 'STT_TRANSCRIPTION_FAILED';
        throw err;
      }

      const data = await response.json();
      return {
        text: data.text || '',
        language: data.language || 'unknown',
        languageProbability: data.language_probability ?? 0,
        duration: data.duration ?? 0,
        processingTime: data.processing_time ?? 0,
        rtf: data.rtf ?? 0,
        segments: data.segments || []
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const abortErr = new Error(`Speech-to-text request timed out after ${this.timeoutMs}ms`);
        abortErr.statusCode = 504;
        abortErr.code = 'STT_TIMEOUT';
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
}

export const sttService = new STTService();

