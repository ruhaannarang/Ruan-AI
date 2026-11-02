/**
 * Ruan AI — Voice Controller
 * Handles HTTP requests for STT transcription, TTS synthesis, and voice health diagnostics.
 */

import { sttService } from '../services/voice/sttService.js';
import { ttsService } from '../services/voice/ttsService.js';
import { voiceService } from '../services/voice/voiceService.js';

/**
 * POST /api/voice/transcribe
 * Accepts multipart audio upload, transcribes locally via faster-whisper, and returns text & metadata.
 */
export async function transcribeAudio(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        error: {
          message: 'No audio file uploaded. Please provide a file in the "file" or "audio" form field.',
          code: 'NO_AUDIO_FILE',
          details: null
        }
      });
    }

    const result = await sttService.transcribeAudio(
      file.buffer,
      file.originalname || 'recording.wav',
      file.mimetype || 'audio/wav'
    );

    res.status(200).json({
      success: true,
      text: result.text,
      language: result.language,
      languageProbability: result.languageProbability,
      duration: result.duration,
      processingTime: result.processingTime,
      rtf: result.rtf,
      segments: result.segments
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/synthesize
 * Accepts text and voice options, synthesizes audio locally via Kokoro, and returns WAV audio buffer.
 */
export async function synthesizeSpeech(req, res, next) {
  try {
    const { text, voice, speed, lang } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        error: {
          message: "'text' must be a non-empty string in request body",
          code: 'INVALID_TEXT_PAYLOAD',
          details: null
        }
      });
    }

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    const { buffer, contentType } = await ttsService.synthesizeSpeech({
      text,
      voice,
      speed: typeof speed === 'number' ? speed : 1.0,
      lang: typeof lang === 'string' ? lang : 'auto',
      signal: abortController.signal
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/voice/health
 * Returns status of local STT and TTS services.
 */
export async function getVoiceHealth(req, res, next) {
  try {
    const health = await voiceService.checkHealth();
    res.status(200).json({
      status: health.connected ? 'ok' : 'degraded',
      services: {
        stt: health.stt,
        tts: health.tts
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/voice/voices
 * Returns available Kokoro voices for user configuration.
 */
export async function getVoices(req, res, next) {
  try {
    const voiceData = await ttsService.getVoices();
    res.status(200).json(voiceData);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/voice/benchmark/prompts
 */
export async function getBenchmarkPrompts(req, res, next) {
  try {
    const data = await voiceService.getBenchmarkPrompts();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/benchmark/compare
 */
export async function compareBenchmarkSample(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        error: {
          message: 'No audio file provided for benchmark comparison',
          code: 'NO_AUDIO_FILE',
          details: null
        }
      });
    }

    const { reference, category, technical_terms } = req.body || {};
    let terms = [];
    if (technical_terms) {
      try {
        terms = typeof technical_terms === 'string' ? JSON.parse(technical_terms) : technical_terms;
      } catch {
        terms = String(technical_terms).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const data = await voiceService.compareBenchmarkSample(
      file.buffer,
      file.originalname || 'sample.wav',
      file.mimetype || 'audio/wav',
      reference || '',
      category || 'Unspecified',
      terms
    );

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/voice/benchmark/save
 */
export async function saveBenchmarkSample(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        error: {
          message: 'No audio file provided to save benchmark sample',
          code: 'NO_AUDIO_FILE',
          details: null
        }
      });
    }

    const { sample_id, reference, category, evaluation_json } = req.body || {};
    const data = await voiceService.saveBenchmarkSample(
      file.buffer,
      file.originalname || 'sample.wav',
      file.mimetype || 'audio/wav',
      sample_id || 'sample',
      reference || '',
      category || 'Unspecified',
      evaluation_json
    );

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/voice/benchmark/history
 */
export async function getBenchmarkHistory(req, res, next) {
  try {
    const data = await voiceService.getBenchmarkHistory();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/voice/benchmark/history
 */
export async function clearBenchmarkHistory(req, res, next) {
  try {
    const data = await voiceService.clearBenchmarkHistory();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}


